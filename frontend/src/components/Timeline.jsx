import { useEffect, useRef, useState } from 'react'
import { formatTick } from '../lib/format.js'

const MIN_CUE = 0.1

// Steps a viewer reads naturally, in seconds.
const NICE_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]
// Roughly the width of a "12:04" label plus breathing room.
const LABEL_PX = 58

/**
 * Pick a tick interval from the pixels actually available, not from duration
 * alone -- otherwise a long video at zoom 1 stacks its labels on top of
 * each other.
 */
function chooseTickStep(duration, trackWidth) {
  const maxLabels = Math.max(2, Math.floor(trackWidth / LABEL_PX))
  const minStep = duration / maxLabels
  return NICE_STEPS.find((step) => step >= minStep) ?? NICE_STEPS[NICE_STEPS.length - 1]
}

/**
 * A second view onto the same cue array: drag a block to move it, drag an edge
 * to retime it, click the ruler to seek.
 */
export default function Timeline({
  duration,
  cues,
  currentTime,
  selectedId,
  onSeek,
  onSelect,
  onChange,
}) {
  const scrollRef = useRef(null)
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [baseWidth, setBaseWidth] = useState(800)

  // Measure the scroll viewport, never the track itself -- the track's width is
  // derived from this, so measuring it would be circular.
  // Depends on `duration` because this component renders null until the video's
  // metadata loads; without it the effect would run once against a missing node
  // and never re-attach.
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const observer = new ResizeObserver(() => setBaseWidth(node.clientWidth))
    observer.observe(node)
    setBaseWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [duration])

  // Drag state lives on window so the pointer can leave the block mid-drag.
  useEffect(() => {
    function move(event) {
      const drag = dragRef.current
      if (!drag) return

      const delta = (event.clientX - drag.startX) / drag.pxPerSec
      let start = drag.origStart
      let end = drag.origEnd

      if (drag.mode === 'move') {
        const span = end - start
        start = Math.min(Math.max(start + delta, drag.floor), drag.ceiling - span)
        end = start + span
      } else if (drag.mode === 'start') {
        start = Math.min(Math.max(start + delta, drag.floor), end - MIN_CUE)
      } else {
        end = Math.max(Math.min(end + delta, drag.ceiling), start + MIN_CUE)
      }

      drag.onChange(drag.id, { start, end })
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
  }, [])

  if (!duration) return null

  const trackWidth = Math.max(baseWidth * zoom, 200)
  const pxPerSec = trackWidth / duration
  const toPx = (t) => t * pxPerSec

  function beginDrag(event, cue, mode) {
    event.stopPropagation()
    event.preventDefault()

    const index = cues.findIndex((c) => c.id === cue.id)
    dragRef.current = {
      mode,
      id: cue.id,
      pxPerSec,
      onChange,
      startX: event.clientX,
      origStart: cue.start,
      origEnd: cue.end,
      floor: index > 0 ? cues[index - 1].end : 0,
      ceiling: index < cues.length - 1 ? cues[index + 1].start : duration,
    }
    onSelect(cue.id)
  }

  // The track is inside the scroll container, so its bounding rect already
  // accounts for horizontal scrolling -- don't add scrollLeft again.
  function seekFromEvent(event) {
    const rect = trackRef.current.getBoundingClientRect()
    const seconds = (event.clientX - rect.left) / pxPerSec
    onSeek(Math.max(0, Math.min(duration, seconds)))
  }

  const tickStep = chooseTickStep(duration, trackWidth)
  const ticks = []
  for (let t = 0; t <= duration + 1e-6; t += tickStep) ticks.push(t)

  return (
    <section className="timeline">
      <div className="timeline-head">
        <h2>Timeline</h2>
        <label className="zoom">
          zoom
          <input
            type="range"
            min="1"
            max="12"
            step="0.5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-inner" style={{ width: `${trackWidth}px` }}>
          <div className="ruler">
            {ticks.map((t) => {
              // Centre labels, except the ones that would hang off either end.
              const x = toPx(t)
              const shift =
                x < LABEL_PX / 2
                  ? '0'
                  : x > trackWidth - LABEL_PX / 2
                    ? '-100%'
                    : '-50%'
              return (
                <span
                  key={t}
                  className="tick"
                  style={{ left: `${x}px`, transform: `translateX(${shift})` }}
                >
                  {formatTick(t)}
                </span>
              )
            })}
          </div>

          <div className="track" ref={trackRef} onPointerDown={seekFromEvent}>
            {cues.map((cue) => (
              <div
                key={cue.id}
                className={`block${cue.id === selectedId ? ' selected' : ''}`}
                style={{ left: `${toPx(cue.start)}px`, width: `${toPx(cue.end - cue.start)}px` }}
                onPointerDown={(e) => beginDrag(e, cue, 'move')}
                title={cue.text}
              >
                <span className="handle left" onPointerDown={(e) => beginDrag(e, cue, 'start')} />
                <span className="block-text">{cue.text}</span>
                <span className="handle right" onPointerDown={(e) => beginDrag(e, cue, 'end')} />
              </div>
            ))}

            <div className="playhead" style={{ left: `${toPx(currentTime)}px` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
