// Draws a subtitle onto a 2D canvas context. Used by BOTH the live preview and
// the exporter, so what you see is exactly what gets burned in.
//
// Words are drawn individually rather than as one string, which is what makes
// the short-form "highlight the word being spoken" look possible.

import { cueWords } from './subtitles.js'

/** Resolve a style's percentage units into pixels for a given frame size. */
export function resolve(style, width, height) {
  const pct = (v) => ((v ?? 0) / 100) * height
  const fontSize = pct(style.fontSize)
  return {
    fontSize,
    lineHeight: fontSize * style.lineHeight,
    letterSpacing: fontSize * (style.letterSpacing ?? 0),
    strokeWidth: pct(style.strokeWidth),
    shadowBlur: fontSize * (style.shadowBlur ?? 0.22),
    shadowOffset: fontSize * 0.05,
    bgRadius: pct(style.bgRadius),
    bgPadX: pct(style.bgPadX),
    bgPadY: pct(style.bgPadY),
    hlRadius: pct(style.highlightRadius ?? 0.6),
    hlPadX: fontSize * 0.16,
    hlPadY: fontSize * 0.14,
    centerX: ((style.positionX ?? 50) / 100) * width,
    centerY: pct(style.positionY),
    maxWidth: (style.maxWidth / 100) * width,
  }
}

function applyFont(ctx, style, px) {
  ctx.font = `${style.fontWeight} ${px.fontSize}px ${style.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  // letterSpacing affects measureText too, so it must be set before measuring.
  try {
    ctx.letterSpacing = `${px.letterSpacing}px`
  } catch {
    /* older engines just render without tracking */
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function withAlpha(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Overshooting ease, for the caption "pop" on entry. */
function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** Break the cue's words into lines that fit the style's max width. */
function layoutLines(ctx, tokens, style, px) {
  // A highlight chip is drawn wider than its word, so reserve that overhang in
  // the word gap -- otherwise the chip swallows the space next to it.
  const chipGap = style.highlightMode === 'box' ? px.hlPadX * 1.6 : 0
  const spaceWidth = ctx.measureText(' ').width + chipGap
  const lines = []
  let current = []
  let width = 0

  for (const token of tokens) {
    const text = style.uppercase ? token.word.toUpperCase() : token.word
    const w = ctx.measureText(text).width
    const advance = current.length === 0 ? w : spaceWidth + w

    if (current.length > 0 && width + advance > px.maxWidth) {
      lines.push({ tokens: current, width })
      current = []
      width = 0
    }

    current.push({ ...token, text, width: w })
    width += current.length === 1 ? w : spaceWidth + w
  }
  if (current.length > 0) lines.push({ tokens: current, width })

  return { lines, spaceWidth }
}

/**
 * Shared layout pass used by both drawSubtitle() and measureSubtitleBox() --
 * keeping this in one place means the draggable box shown in the editor can
 * never drift out of sync with what actually gets drawn.
 */
function layoutSubtitle(ctx, cue, style, width, height) {
  const px = resolve(style, width, height)
  applyFont(ctx, style, px)

  const tokens = cueWords(cue)
  const { lines, spaceWidth } = layoutLines(ctx, tokens, style, px)
  if (lines.length === 0) return null

  const blockHeight = lines.length * px.lineHeight
  const firstY = px.centerY - blockHeight / 2 + px.lineHeight / 2
  const blockWidth = Math.max(...lines.map((l) => l.width))

  return { px, lines, spaceWidth, blockHeight, blockWidth, firstY, centerX: px.centerX }
}

/**
 * The on-screen bounding box of a cue's text, in the same pixel space as
 * width/height. Used to place the drag/resize handles over the live preview.
 * @returns {{x: number, y: number, width: number, height: number} | null}
 */
export function measureSubtitleBox(ctx, cue, style, width, height) {
  if (!cue?.text) return null
  const layout = layoutSubtitle(ctx, cue, style, width, height)
  if (!layout) return null

  const px = resolve(style, width, height)
  return {
    x: layout.centerX - layout.blockWidth / 2 - px.bgPadX,
    y: layout.firstY - layout.px.lineHeight / 2 - px.bgPadY,
    width: layout.blockWidth + px.bgPadX * 2,
    height: layout.blockHeight + px.bgPadY * 2,
  }
}

/**
 * @param {object} cue   { start, end, text, words? }
 * @param {number} time  playhead position, used for word highlighting and pop
 */
export function drawSubtitle(ctx, cue, style, width, height, time = 0) {
  if (!cue?.text) return

  const layout = layoutSubtitle(ctx, cue, style, width, height)
  if (!layout) return
  const { px, lines, spaceWidth, firstY, centerX } = layout

  ctx.save()

  // Scale the whole caption up from slightly small as it appears.
  if (style.pop) {
    const age = time - cue.start
    const duration = 0.22
    if (age >= 0 && age < duration) {
      const scale = 0.86 + 0.14 * easeOutBack(age / duration)
      ctx.translate(centerX, px.centerY)
      ctx.scale(scale, scale)
      ctx.translate(-centerX, -px.centerY)
    }
  }

  const highlight = style.highlightMode ?? 'none'

  lines.forEach((line, i) => {
    const y = firstY + i * px.lineHeight

    // Background pill sized to this line.
    if (style.bgEnabled) {
      const w = line.width + px.bgPadX * 2
      const h = px.lineHeight + px.bgPadY * 2
      ctx.fillStyle = withAlpha(style.bgColor, style.bgOpacity)
      roundRect(ctx, centerX - w / 2, y - h / 2, w, h, px.bgRadius)
      ctx.fill()
    }

    let x = centerX - line.width / 2

    for (const token of line.tokens) {
      const isActive = highlight !== 'none' && time >= token.start && time < token.end

      // Filled chip behind the spoken word.
      if (isActive && highlight === 'box') {
        const w = token.width + px.hlPadX * 2
        const h = px.fontSize + px.hlPadY * 2
        ctx.fillStyle = style.highlightColor
        roundRect(ctx, x - px.hlPadX, y - h / 2, w, h, px.hlRadius)
        ctx.fill()
      }

      const fill =
        isActive && highlight === 'color'
          ? style.highlightColor
          : isActive && highlight === 'box'
            ? style.highlightTextColor
            : style.color

      // Glow/shadow rides on the outline when there is one, otherwise on the
      // fill -- that's what makes a stroke-less neon style actually glow.
      const shadowOn = () => {
        if (!style.shadow) return
        ctx.shadowColor = style.shadowColor ?? 'rgba(0, 0, 0, 0.55)'
        ctx.shadowBlur = px.shadowBlur
        ctx.shadowOffsetY = style.shadowColor ? 0 : px.shadowOffset
      }
      const shadowOff = () => {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }

      // A word sitting on a highlight chip gets its contrast from the chip; an
      // outline on top of it just reads as a smudge.
      const strokeThisWord = px.strokeWidth > 0 && !(isActive && highlight === 'box')

      if (strokeThisWord) {
        shadowOn()
        ctx.lineWidth = px.strokeWidth * 2
        ctx.strokeStyle = style.strokeColor
        ctx.lineJoin = 'round'
        ctx.miterLimit = 2
        ctx.strokeText(token.text, x, y)
        shadowOff()
      } else {
        shadowOn()
      }

      ctx.fillStyle = fill
      ctx.fillText(token.text, x, y)
      shadowOff()

      x += token.width + spaceWidth
    }
  })

  ctx.restore()
}
