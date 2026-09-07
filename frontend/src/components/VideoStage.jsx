import { useEffect, useRef } from 'react'
import { drawSubtitle, measureSubtitleBox } from '../lib/render.js'
import { activeCueIndex } from '../lib/subtitles.js'

const MIN_FONT_SIZE = 2
const MAX_FONT_SIZE = 12

/**
 * The video with a canvas overlay on top, plus a draggable box over the
 * active subtitle for repositioning and resizing it directly on the frame.
 * The canvas uses the same drawing code as the exporter, so the preview is
 * a true preview; the drag box is measured with that same code, so it can
 * never drift out of sync with what's actually drawn.
 */
export default function VideoStage({
  videoRef,
  videoUrl,
  cues,
  style,
  onStyleChange,
  currentTime,
  meta,
  onTimeUpdate,
  onLoadedMetadata,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const boxRef = useRef(null)
  const handleRef = useRef(null)
  const drawRef = useRef(null)
  const dragRef = useRef(null)
  const styleRef = useRef(style)
  useEffect(() => {
    styleRef.current = style
  })

  // Sizing lives inside draw() so the backing store can never drift out of
  // sync with the displayed box -- a mismatch would stretch the text.
  function draw() {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const box = boxRef.current
    if (!canvas || !wrap) return

    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(wrap.clientWidth * dpr))
    const height = Math.max(1, Math.round(wrap.clientHeight * dpr))

    // Assigning width/height also clears the canvas, so do it before drawing.
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    const index = activeCueIndex(cues, currentTime)
    const cue = index === -1 ? null : cues[index]
    if (cue) drawSubtitle(ctx, cue, style, width, height, currentTime)

    // Position the drag/resize box over whatever was just drawn, in CSS
    // pixels -- imperative like the canvas itself, so this never fights
    // React's own render cycle or fires during an active drag.
    if (box) {
      const rect = cue ? measureSubtitleBox(ctx, cue, style, width, height) : null
      if (rect && !dragRef.current) {
        box.hidden = false
        box.style.left = `${rect.x / dpr}px`
        box.style.top = `${rect.y / dpr}px`
        box.style.width = `${rect.width / dpr}px`
        box.style.height = `${rect.height / dpr}px`
      } else if (!rect) {
        box.hidden = true
      }
    }
  }

  // Keep the latest closure available to the resize observer, and repaint on
  // every render (cues, style and currentTime all feed the drawing).
  useEffect(() => {
    drawRef.current = draw
    draw()
  })

  // Redraw when the stage is resized while paused.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(() => drawRef.current?.())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  // Drag state lives on window, same pattern as the timeline, so the
  // pointer can leave the handle mid-drag without losing the gesture.
  useEffect(() => {
    function move(event) {
      const drag = dragRef.current
      const wrap = wrapRef.current
      if (!drag || !wrap) return

      const dxPct = ((event.clientX - drag.startX) / wrap.clientWidth) * 100
      const dyPct = ((event.clientY - drag.startY) / wrap.clientHeight) * 100

      if (drag.mode === 'move') {
        onStyleChange({
          ...styleRef.current,
          positionX: clamp(drag.startPositionX + dxPct, 5, 95),
          positionY: clamp(drag.startPositionY + dyPct, 5, 95),
        })
      } else {
        onStyleChange({
          ...styleRef.current,
          fontSize: clamp(drag.startFontSize + dyPct * 0.6, MIN_FONT_SIZE, MAX_FONT_SIZE),
        })
      }
    }
    function up() {
      dragRef.current = null
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [onStyleChange])

  function beginDrag(event, mode) {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startPositionX: styleRef.current.positionX ?? 50,
      startPositionY: styleRef.current.positionY,
      startFontSize: styleRef.current.fontSize,
    }
  }

  return (
    <div
      className="stage"
      ref={wrapRef}
      style={meta ? { aspectRatio: `${meta.width} / ${meta.height}` } : undefined}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
      />
      <canvas ref={canvasRef} className="overlay" />
      {onStyleChange && (
        <div
          ref={boxRef}
          className="caption-drag-box"
          hidden
          onPointerDown={(e) => beginDrag(e, 'move')}
          title="Drag to reposition"
        >
          <span
            ref={handleRef}
            className="caption-resize-handle"
            onPointerDown={(e) => beginDrag(e, 'resize')}
            title="Drag to resize"
          />
        </div>
      )}
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
