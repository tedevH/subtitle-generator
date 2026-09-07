// Turns raw Whisper words into subtitle cues, and provides the edit operations
// the UI needs. Pure logic -- no React, no DOM, no network.

export const DEFAULT_SEGMENT_OPTIONS = {
  maxWords: 4,        // hard cap on words per cue
  maxChars: 42,       // hard cap on characters per cue
  maxDuration: 4,     // seconds a single cue may span
  maxGap: 0.6,        // silence longer than this starts a new cue
  minDuration: 0.5,   // cues shorter than this get stretched if there's room
  breakOnPunctuation: true,
}

let idCounter = 0
export function nextId() {
  idCounter += 1
  return `c${idCounter}`
}

const SENTENCE_END = /[.?!…]["'”’)\]]?$/

/**
 * @param {{word: string, start: number, end: number}[]} words
 * @returns {{id: string, start: number, end: number, text: string}[]}
 */
export function segmentWords(words, options = {}) {
  const o = { ...DEFAULT_SEGMENT_OPTIONS, ...options }
  const cues = []

  let bucket = []
  let bucketStart = null

  function flush() {
    if (bucket.length === 0) return
    const text = bucket.map((w) => w.word.trim()).filter(Boolean).join(' ')
    if (text) {
      cues.push({
        id: nextId(),
        start: bucketStart,
        end: bucket[bucket.length - 1].end,
        text,
        // Kept so the renderer can highlight the word currently being spoken.
        words: bucket.map((w) => ({ word: w.word, start: w.start, end: w.end })),
      })
    }
    bucket = []
    bucketStart = null
  }

  for (const word of words) {
    const clean = (word.word || '').trim()
    if (!clean) continue

    if (bucket.length > 0) {
      const prev = bucket[bucket.length - 1]
      const gap = word.start - prev.end
      const duration = word.end - bucketStart
      const chars = bucket.reduce((n, w) => n + w.word.trim().length + 1, -1)
      const wouldBe = chars + 1 + clean.length

      if (gap > o.maxGap || duration > o.maxDuration || wouldBe > o.maxChars) {
        flush()
      }
    }

    if (bucket.length === 0) bucketStart = word.start
    bucket.push({ ...word, word: clean })

    if (o.breakOnPunctuation && SENTENCE_END.test(clean)) flush()
    else if (bucket.length >= o.maxWords) flush()
  }

  flush()
  return enforceMinDuration(cues, o.minDuration)
}

/** Stretch too-short cues, but never past the next cue's start. */
function enforceMinDuration(cues, minDuration) {
  return cues.map((cue, i) => {
    const duration = cue.end - cue.start
    if (duration >= minDuration) return cue
    const ceiling = i < cues.length - 1 ? cues[i + 1].start : Infinity
    return { ...cue, end: Math.min(cue.start + minDuration, ceiling) }
  })
}

/**
 * The words of a cue, each with its own timing, aligned to the cue's CURRENT
 * text. Whisper's timings are used when they still match; after a manual text
 * edit they no longer do, so the cue's duration is shared out evenly instead.
 * Either way the caller always gets one entry per visible word.
 */
export function cueWords(cue) {
  const tokens = cue.text.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const stored = cue.words
  if (stored && stored.length === tokens.length) {
    return tokens.map((word, i) => ({ word, start: stored[i].start, end: stored[i].end }))
  }

  const span = (cue.end - cue.start) / tokens.length
  return tokens.map((word, i) => ({
    word,
    start: cue.start + i * span,
    end: cue.start + (i + 1) * span,
  }))
}

// --- edit operations: every one returns a new array ---------------------

export function updateCue(cues, id, patch) {
  return cues.map((c) => (c.id === id ? { ...c, ...patch } : c))
}

export function deleteCue(cues, id) {
  return cues.filter((c) => c.id !== id)
}

/** Split a cue's text at a word boundary, dividing its time proportionally. */
export function splitCue(cues, id, wordIndex) {
  const index = cues.findIndex((c) => c.id === id)
  if (index === -1) return cues

  const cue = cues[index]
  const words = cue.text.split(/\s+/).filter(Boolean)
  if (wordIndex <= 0 || wordIndex >= words.length) return cues

  const ratio = wordIndex / words.length
  const boundary = cue.start + (cue.end - cue.start) * ratio

  const first = {
    ...cue,
    end: boundary,
    text: words.slice(0, wordIndex).join(' '),
    words: cue.words?.slice(0, wordIndex),
  }
  const second = {
    id: nextId(),
    start: boundary,
    end: cue.end,
    text: words.slice(wordIndex).join(' '),
    words: cue.words?.slice(wordIndex),
  }
  return [...cues.slice(0, index), first, second, ...cues.slice(index + 1)]
}

/** Merge a cue with the one after it. */
export function mergeWithNext(cues, id) {
  const index = cues.findIndex((c) => c.id === id)
  if (index === -1 || index === cues.length - 1) return cues

  const a = cues[index]
  const b = cues[index + 1]
  const merged = {
    ...a,
    end: b.end,
    text: `${a.text} ${b.text}`.replace(/\s+/g, ' ').trim(),
    words: a.words && b.words ? [...a.words, ...b.words] : undefined,
  }
  return [...cues.slice(0, index), merged, ...cues.slice(index + 2)]
}

export function insertCue(cues, atTime, duration = 1.5) {
  const cue = {
    id: nextId(),
    start: atTime,
    end: atTime + duration,
    text: 'New subtitle',
  }
  return sortCues([...cues, cue])
}

export function shiftAll(cues, offset) {
  return cues.map((c) => ({
    ...c,
    start: Math.max(0, c.start + offset),
    end: Math.max(0, c.end + offset),
  }))
}

/** Whisper can time the final word past the end of the media; trim to fit. */
export function clampToDuration(cues, duration) {
  if (!duration || !Number.isFinite(duration)) return cues
  return cues
    .filter((c) => c.start < duration)
    .map((c) => (c.end > duration ? { ...c, end: duration } : c))
}

export function sortCues(cues) {
  return [...cues].sort((a, b) => a.start - b.start)
}

/** Index of the cue covering `time`, or -1. Cues are assumed sorted. */
export function activeCueIndex(cues, time) {
  for (let i = 0; i < cues.length; i += 1) {
    if (time >= cues[i].start && time <= cues[i].end) return i
  }
  return -1
}
