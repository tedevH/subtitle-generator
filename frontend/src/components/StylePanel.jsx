import { useEffect, useMemo, useRef } from 'react'
import { drawSubtitle } from '../lib/render.js'
import { DEFAULT_STYLE, FONT_OPTIONS, PRESETS, presetStyle } from '../lib/style.js'

// The preview box shows a crop of the caption area rather than a whole frame.
// Style sizes are percentages of frame height, so we render against a VIRTUAL
// frame height chosen to make a mid-range font fill the box -- presets that are
// larger or smaller than that reference still read as larger or smaller.
const REFERENCE_FONT = 5.5
const TARGET_FILL = 0.34

function PresetButton({ preset, selected, onSelect }) {
  const canvasRef = useRef(null)
  const style = useMemo(() => presetStyle(preset), [preset])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth
    const cssHeight = canvas.clientHeight
    if (!cssWidth || !cssHeight) return

    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)

    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#4b4b55')
    gradient.addColorStop(1, '#17171c')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const virtualHeight = (canvas.height * TARGET_FILL * 100) / REFERENCE_FONT

    const words = preset.sample.split(/\s+/).filter(Boolean)
    const cue = {
      start: 0,
      end: 1,
      text: preset.sample,
      words: words.map((word, i) => ({
        word,
        start: i / words.length,
        end: (i + 1) / words.length,
      })),
    }
    // Sit on the last word so any highlight style is visible in the preview.
    const time = 1 - 0.5 / words.length

    ctx.save()
    ctx.translate(0, canvas.height / 2 - virtualHeight / 2)
    drawSubtitle(
      ctx,
      cue,
      { ...style, positionY: 50, maxWidth: 92, pop: false },
      canvas.width,
      virtualHeight,
      time,
    )
    ctx.restore()
  }, [preset, style])

  return (
    <button
      type="button"
      className={`preset${selected ? ' selected' : ''}`}
      onClick={() => onSelect(style)}
      title={preset.name}
    >
      <canvas ref={canvasRef} />
      <span>{preset.name}</span>
    </button>
  )
}

function Slider({ label, value, onChange, min, max, step = 1, suffix = '', format }) {
  return (
    <label className="field">
      <span>
        {label}
        <em>
          {format ? format(value) : value}
          {suffix}
        </em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export default function StylePanel({ style, onChange }) {
  const set = (patch) => onChange({ ...style, ...patch })

  // A preset is "selected" when the current style still matches it exactly.
  const selectedName = useMemo(() => {
    const match = PRESETS.find((preset) => {
      const candidate = presetStyle(preset)
      return Object.keys(candidate).every((key) => candidate[key] === style[key])
    })
    return match?.name ?? null
  }, [style])

  return (
    <section className="panel">
      <h2>Style</h2>

      <div className="preset-grid">
        {PRESETS.map((preset) => (
          <PresetButton
            key={preset.name}
            preset={preset}
            selected={preset.name === selectedName}
            onSelect={onChange}
          />
        ))}
      </div>

      <label className="field">
        <span>Font</span>
        <select value={style.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <Slider label="Size" suffix="%" min={2} max={12} step={0.1} value={style.fontSize} onChange={(v) => set({ fontSize: v })} />
      <Slider label="Weight" min={300} max={900} step={100} value={style.fontWeight} onChange={(v) => set({ fontWeight: v })} />
      <Slider label="Line height" min={0.9} max={2} step={0.02} value={style.lineHeight} onChange={(v) => set({ lineHeight: v })} />
      <Slider
        label="Letter spacing"
        min={-0.06}
        max={0.16}
        step={0.005}
        value={style.letterSpacing}
        format={(v) => v.toFixed(3)}
        suffix="em"
        onChange={(v) => set({ letterSpacing: v })}
      />
      <Slider label="Vertical position" suffix="%" min={5} max={95} step={1} value={style.positionY} onChange={(v) => set({ positionY: v })} />
      <Slider label="Max width" suffix="%" min={30} max={100} step={1} value={style.maxWidth} onChange={(v) => set({ maxWidth: v })} />

      <div className="row">
        <label className="field inline">
          <span>Text</span>
          <input type="color" value={style.color} onChange={(e) => set({ color: e.target.value })} />
        </label>
        <label className="field inline">
          <span>Outline</span>
          <input type="color" value={style.strokeColor} onChange={(e) => set({ strokeColor: e.target.value })} />
        </label>
      </div>

      <Slider label="Outline width" suffix="%" min={0} max={2} step={0.05} value={style.strokeWidth} onChange={(v) => set({ strokeWidth: v })} />

      <div className="toggles">
        <label className="field inline">
          <span>Uppercase</span>
          <input type="checkbox" checked={style.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} />
        </label>
        <label className="field inline">
          <span>Shadow / glow</span>
          <input type="checkbox" checked={style.shadow} onChange={(e) => set({ shadow: e.target.checked })} />
        </label>
        <label className="field inline">
          <span>Pop in</span>
          <input type="checkbox" checked={style.pop} onChange={(e) => set({ pop: e.target.checked })} />
        </label>
      </div>

      <hr />

      <label className="field">
        <span>Highlight spoken word</span>
        <select value={style.highlightMode} onChange={(e) => set({ highlightMode: e.target.value })}>
          <option value="none">Off</option>
          <option value="color">Colour the word</option>
          <option value="box">Chip behind the word</option>
        </select>
      </label>

      {style.highlightMode !== 'none' && (
        <div className="row">
          <label className="field inline">
            <span>Highlight</span>
            <input type="color" value={style.highlightColor} onChange={(e) => set({ highlightColor: e.target.value })} />
          </label>
          {style.highlightMode === 'box' && (
            <label className="field inline">
              <span>On chip</span>
              <input
                type="color"
                value={style.highlightTextColor}
                onChange={(e) => set({ highlightTextColor: e.target.value })}
              />
            </label>
          )}
        </div>
      )}

      <hr />

      <label className="field inline">
        <span>Background box</span>
        <input type="checkbox" checked={style.bgEnabled} onChange={(e) => set({ bgEnabled: e.target.checked })} />
      </label>

      {style.bgEnabled && (
        <>
          <label className="field inline">
            <span>Box colour</span>
            <input type="color" value={style.bgColor} onChange={(e) => set({ bgColor: e.target.value })} />
          </label>
          <Slider label="Box opacity" min={0} max={1} step={0.05} value={style.bgOpacity} onChange={(v) => set({ bgOpacity: v })} />
          <Slider label="Box radius" suffix="%" min={0} max={4} step={0.1} value={style.bgRadius} onChange={(v) => set({ bgRadius: v })} />
        </>
      )}

      <button type="button" className="reset" onClick={() => onChange({ ...DEFAULT_STYLE })}>
        Reset to default
      </button>
    </section>
  )
}
