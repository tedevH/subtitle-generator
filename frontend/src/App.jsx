import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import Landing from './components/Landing.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import VideoStage from './components/VideoStage.jsx'
import SubtitleList from './components/SubtitleList.jsx'
import Timeline from './components/Timeline.jsx'
import StylePanel from './components/StylePanel.jsx'
import ExportPanel from './components/ExportPanel.jsx'

import { DEFAULT_STYLE } from './lib/style.js'
import {
  DEFAULT_SEGMENT_OPTIONS,
  activeCueIndex,
  clampToDuration,
  deleteCue,
  insertCue,
  mergeWithNext,
  segmentWords,
  shiftAll,
  sortCues,
  splitCue,
  updateCue,
} from './lib/subtitles.js'
import { DEFAULT_MODEL, MODELS, transcribeInBrowser } from './lib/transcribe.js'

export default function App() {
  const videoRef = useRef(null)

  const [file, setFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [meta, setMeta] = useState(null)

  const [words, setWords] = useState([])
  const [cues, setCues] = useState([])
  const [segmentOptions, setSegmentOptions] = useState(DEFAULT_SEGMENT_OPTIONS)
  const [style, setStyle] = useState(DEFAULT_STYLE)

  const [currentTime, setCurrentTime] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  const [model, setModel] = useState(DEFAULT_MODEL)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  // Free the old object URL whenever the video is replaced.
  useEffect(() => {
    if (!videoUrl) return
    return () => URL.revokeObjectURL(videoUrl)
  }, [videoUrl])

  const activeIndex = useMemo(() => activeCueIndex(cues, currentTime), [cues, currentTime])

  function loadFile(selected) {
    if (!selected) return

    setFile(selected)
    setVideoUrl(URL.createObjectURL(selected))
    setMeta(null)
    setWords([])
    setCues([])
    setSelectedId(null)
    setCurrentTime(0)
    setError(null)
    setStatus(null)
  }

  function handleFile(event) {
    loadFile(event.target.files?.[0])
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    loadFile(event.dataTransfer.files?.[0])
  }

  async function transcribe() {
    if (!file) return
    setError(null)
    setStatus({ phase: 'start', message: 'Starting', progress: null })

    try {
      const result = await transcribeInBrowser(file, model, setStatus)

      setWords(result)
      setCues(clampToDuration(segmentWords(result, segmentOptions), meta?.duration))
      setStatus({ phase: 'done', message: `${result.length} words transcribed`, progress: 1 })
    } catch (e) {
      setError(e.message)
      setStatus(null)
    }
  }

  /** Re-run segmentation from the stored words -- discards manual text edits. */
  function resegment(options) {
    setSegmentOptions(options)
    if (words.length > 0) {
      setCues(clampToDuration(segmentWords(words, options), meta?.duration))
    }
  }

  function seek(time) {
    if (videoRef.current) videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const editCue = (id, patch) => setCues((prev) => sortCues(updateCue(prev, id, patch)))

  const busy = status !== null && status.phase !== 'done'

  return (
    <div className="app">
      <Landing />

      <section className="uploader" id="tool">
        <label
          className={`dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="video/*" onChange={handleFile} />
          <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 15V4M12 4L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {file ? (
            <>
              <span className="dropzone-title">{file.name}</span>
              <span className="dropzone-sub">Click or drop a file to choose a different video</span>
            </>
          ) : (
            <>
              <span className="dropzone-title">Choose a video</span>
              <span className="dropzone-sub">or drag and drop it here</span>
            </>
          )}
        </label>

        {file && (
          <div className="controls">
            <label className="field inline">
              <span>Model</span>
              <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy}>
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="primary" onClick={transcribe} disabled={busy}>
              {busy ? 'Working…' : cues.length ? 'Re-transcribe' : 'Generate subtitles'}
            </button>
          </div>
        )}

        {status && (
          <div className="progress">
            <div className="bar">
              <span
                style={{
                  width: status.progress == null ? '100%' : `${Math.round(status.progress * 100)}%`,
                  opacity: status.progress == null ? 0.4 : 1,
                }}
              />
            </div>
            <div className="progress-label">
              <small>{status.message}</small>
              {status.progress != null && (
                <small className="progress-pct">{Math.round(status.progress * 100)}%</small>
              )}
            </div>
          </div>
        )}

        {error && <p className="warn">{error}</p>}
      </section>

      {videoUrl && (
        <>
          <div className="workspace">
            <div className="left">
              <VideoStage
                videoRef={videoRef}
                videoUrl={videoUrl}
                cues={cues}
                style={style}
                currentTime={currentTime}
                meta={meta}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) =>
                  setMeta({
                    width: e.target.videoWidth,
                    height: e.target.videoHeight,
                    duration: e.target.duration,
                  })
                }
              />

              <Timeline
                duration={meta?.duration ?? 0}
                cues={cues}
                currentTime={currentTime}
                selectedId={selectedId}
                onSeek={seek}
                onSelect={setSelectedId}
                onChange={editCue}
              />
            </div>

            <aside className="right">
              <section className="panel">
                <h2>Subtitles</h2>

                <div className="presets">
                  <button type="button" onClick={() => setCues((c) => insertCue(c, currentTime))}>
                    + at playhead
                  </button>
                  <button type="button" onClick={() => setCues((c) => shiftAll(c, -0.1))}>
                    −0.1s all
                  </button>
                  <button type="button" onClick={() => setCues((c) => shiftAll(c, 0.1))}>
                    +0.1s all
                  </button>
                </div>

                {words.length > 0 && (
                  <div className="resegment">
                    <label className="field">
                      <span>
                        Words per line<em>{segmentOptions.maxWords}</em>
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={segmentOptions.maxWords}
                        onChange={(e) =>
                          resegment({ ...segmentOptions, maxWords: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="field inline">
                      <span>Break on punctuation</span>
                      <input
                        type="checkbox"
                        checked={segmentOptions.breakOnPunctuation}
                        onChange={(e) =>
                          resegment({ ...segmentOptions, breakOnPunctuation: e.target.checked })
                        }
                      />
                    </label>
                    <small className="note">Re-segmenting rebuilds cues and drops text edits.</small>
                  </div>
                )}

                <SubtitleList
                  cues={cues}
                  activeIndex={activeIndex}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onSeek={seek}
                  onChange={editCue}
                  onDelete={(id) => setCues((c) => deleteCue(c, id))}
                  onMerge={(id) => setCues((c) => mergeWithNext(c, id))}
                  onSplit={(id) =>
                    setCues((c) => {
                      const cue = c.find((x) => x.id === id)
                      const count = cue?.text.split(/\s+/).filter(Boolean).length ?? 0
                      return count > 1 ? splitCue(c, id, Math.floor(count / 2)) : c
                    })
                  }
                />
              </section>

              <StylePanel style={style} onChange={setStyle} />
              <ExportPanel file={file} cues={cues} style={style} />
            </aside>
          </div>
        </>
      )}

      <SiteFooter />
    </div>
  )
}
