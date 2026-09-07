import { useEffect, useRef } from 'react'
import { drawSubtitle } from '../lib/render.js'
import { PRESETS, presetStyle } from '../lib/style.js'

// A curated, color-varied slice of the real preset list, cycled continuously.
// This is the actual render pipeline, not a mockup screenshot.
const CYCLE_NAMES = ['Hormozi', 'Pop Box', 'Karaoke', 'Candy', 'Fire', 'Neon']
const CYCLE = CYCLE_NAMES.map((name) => PRESETS.find((p) => p.name === name)).filter(Boolean)
const DWELL = 2.4 // seconds each style is shown

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return [0, 0, 0]
  return [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
}

export default function HeroPreview() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let start = null

    function frame(now) {
      if (start === null) start = now
      const elapsed = (now - start) / 1000

      const wrap = canvas.parentElement
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(wrap.clientWidth * dpr))
      const height = Math.max(1, Math.round(wrap.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const index = Math.floor(elapsed / DWELL) % CYCLE.length
      const cyclePos = elapsed % DWELL
      const preset = CYCLE[index]
      const style = presetStyle(preset)
      const [r, g, b] = hexToRgb(style.highlightColor ?? style.color)

      // Backdrop mood shifts subtly with the active style's own color.
      const bg = ctx.createLinearGradient(0, 0, 0, height)
      bg.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.16)`)
      bg.addColorStop(0.55, 'rgba(15, 15, 20, 1)')
      bg.addColorStop(1, 'rgba(8, 8, 11, 1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      const vignette = ctx.createRadialGradient(
        width / 2, height * 0.42, height * 0.15,
        width / 2, height * 0.42, height * 0.75,
      )
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      const words = preset.sample.split(/\s+/).filter(Boolean)
      const wordDwell = DWELL / words.length
      const cue = {
        start: 0,
        end: DWELL,
        text: preset.sample,
        words: words.map((word, i) => ({
          word,
          start: i * wordDwell,
          end: (i + 1) * wordDwell,
        })),
      }

      drawSubtitle(ctx, cue, style, width, height, cyclePos)

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hero-visual">
      <div className="phone">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
