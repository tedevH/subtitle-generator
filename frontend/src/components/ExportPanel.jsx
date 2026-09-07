import { useRef, useState } from 'react'
import { exportVideo, hasWebCodecs } from '../lib/export.js'
import { baseName, download, toSRT, toVTT } from '../lib/format.js'

export default function ExportPanel({ file, cues, style }) {
  const [fps, setFps] = useState(30)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const supported = hasWebCodecs()
  const name = baseName(file?.name)

  async function handleExport() {
    setError(null)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const blob = await exportVideo({
        file,
        cues,
        style,
        fps,
        signal: controller.signal,
        onProgress: setProgress,
      })
      download(blob, `${name}-subtitled.mp4`)
      setProgress({ phase: 'done', progress: 1, message: 'Saved' })
    } catch (e) {
      setError(e.message)
      setProgress(null)
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <section className="panel">
      <h2>Export</h2>

      <div className="presets">
        <button type="button" onClick={() => download(new Blob([toSRT(cues)], { type: 'text/plain' }), `${name}.srt`)}>
          .srt
        </button>
        <button type="button" onClick={() => download(new Blob([toVTT(cues)], { type: 'text/vtt' }), `${name}.vtt`)}>
          .vtt
        </button>
      </div>

      <label className="field">
        <span>Frame rate</span>
        <select value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={busy}>
          <option value={24}>24 fps</option>
          <option value={25}>25 fps</option>
          <option value={30}>30 fps</option>
          <option value={60}>60 fps</option>
        </select>
      </label>

      {!supported && (
        <p className="warn">
          This browser has no WebCodecs support, so burning in isn&apos;t available. The
          .srt and .vtt downloads still work. Chrome or Edge will do the full export.
        </p>
      )}

      <button type="button" className="primary" disabled={!supported || busy || cues.length === 0} onClick={handleExport}>
        {busy ? 'Rendering…' : 'Burn in and download MP4'}
      </button>

      {busy && (
        <button type="button" onClick={() => abortRef.current?.abort()}>
          Cancel
        </button>
      )}

      {progress && (
        <div className="progress">
          <div className="bar">
            <span style={{ width: `${Math.round((progress.progress ?? 0) * 100)}%` }} />
          </div>
          <div className="progress-label">
            <small>{progress.message}</small>
            <small className="progress-pct">{Math.round((progress.progress ?? 0) * 100)}%</small>
          </div>
        </div>
      )}

      {error && <p className="warn">{error}</p>}
    </section>
  )
}
