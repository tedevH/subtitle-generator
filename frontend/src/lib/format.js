// Timecode formatting and sidecar subtitle-file generation.

/** Compact label for timeline ruler ticks: 0:05, 1:23, 12:04. */
export function formatTick(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function formatClock(seconds) {
  const s = Math.max(0, seconds || 0)
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return `${String(m).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`
}

function stamp(seconds, msSeparator) {
  const s = Math.max(0, seconds || 0)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const ms = Math.round((s - Math.floor(s)) * 1000)
  return (
    `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:` +
    `${String(ss).padStart(2, '0')}${msSeparator}${String(ms).padStart(3, '0')}`
  )
}

export function toSRT(cues) {
  return cues
    .map((cue, i) =>
      `${i + 1}\n${stamp(cue.start, ',')} --> ${stamp(cue.end, ',')}\n${cue.text}\n`
    )
    .join('\n')
}

export function toVTT(cues) {
  const body = cues
    .map((cue) => `${stamp(cue.start, '.')} --> ${stamp(cue.end, '.')}\n${cue.text}\n`)
    .join('\n')
  return `WEBVTT\n\n${body}`
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function baseName(filename) {
  return (filename || 'video').replace(/\.[^.]+$/, '')
}
