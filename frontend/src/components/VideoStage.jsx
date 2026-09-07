import { useEffect, useRef } from 'react'
import { drawSubtitle } from '../lib/render.js'
import { activeCueIndex } from '../lib/subtitles.js'

/**
 * The video with a canvas overlay on top. The overlay uses the same drawing
 * code as the exporter, so the preview is a true preview.
 */
export default function VideoStage({
  videoRef,
  videoUrl,
  cues,
  style,
  currentTime,
  meta,
  onTimeUpdate,
  onLoadedMetadata,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const drawRef = useRef(null)

  // Sizing lives inside draw() so the backing store can never drift out of sync
  // with the displayed box -- a mismatch would stretch the text.
  function draw() {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
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
    if (index === -1) return
    drawSubtitle(ctx, cues[index], style, width, height, currentTime)
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
    </div>
  )
}
