import { useEffect, useRef } from 'react'
import { formatClock } from '../lib/format.js'

export default function SubtitleList({
  cues,
  activeIndex,
  selectedId,
  onSelect,
  onSeek,
  onChange,
  onDelete,
  onMerge,
  onSplit,
}) {
  const listRef = useRef(null)
  const activeRef = useRef(null)

  // Follow playback, but only when the user isn't typing in a field.
  useEffect(() => {
    const node = activeRef.current
    if (!node) return
    if (document.activeElement?.closest('.cue')) return
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  if (cues.length === 0) {
    return <p className="empty">No subtitles yet.</p>
  }

  return (
    <div className="cue-list" ref={listRef}>
      {cues.map((cue, i) => {
        const isActive = i === activeIndex
        const isSelected = cue.id === selectedId
        return (
          <div
            key={cue.id}
            ref={isActive ? activeRef : null}
            className={`cue${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}`}
            onClick={() => onSelect(cue.id)}
          >
            <div className="cue-head">
              <button
                type="button"
                className="link"
                onClick={(e) => {
                  e.stopPropagation()
                  onSeek(cue.start)
                }}
                title="Jump to this subtitle"
              >
                {formatClock(cue.start)} → {formatClock(cue.end)}
              </button>

              <div className="cue-actions">
                <button type="button" title="Split in half" onClick={(e) => { e.stopPropagation(); onSplit(cue.id) }}>
                  Split
                </button>
                <button
                  type="button"
                  title="Merge with the next subtitle"
                  disabled={i === cues.length - 1}
                  onClick={(e) => { e.stopPropagation(); onMerge(cue.id) }}
                >
                  Merge
                </button>
                <button type="button" className="danger" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(cue.id) }}>
                  ✕
                </button>
              </div>
            </div>

            <textarea
              value={cue.text}
              rows={2}
              onChange={(e) => onChange(cue.id, { text: e.target.value })}
              onFocus={() => onSelect(cue.id)}
            />

            <div className="cue-times">
              <label>
                start
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={Number(cue.start.toFixed(2))}
                  onChange={(e) => onChange(cue.id, { start: Number(e.target.value) })}
                />
              </label>
              <label>
                end
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={Number(cue.end.toFixed(2))}
                  onChange={(e) => onChange(cue.id, { end: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        )
      })}
    </div>
  )
}
