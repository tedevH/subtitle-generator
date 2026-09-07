import { extractAudio } from './audio.js'

export const MODELS = [
  { value: 'onnx-community/whisper-tiny.en_timestamped', label: 'Tiny (fastest, ~40 MB)' },
  { value: 'onnx-community/whisper-base.en_timestamped', label: 'Base (balanced, ~80 MB)' },
  { value: 'onnx-community/whisper-small.en_timestamped', label: 'Small (best, ~250 MB)' },
]

export const DEFAULT_MODEL = MODELS[1].value

let worker = null
function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../whisper.worker.js', import.meta.url), {
      type: 'module',
    })
  }
  return worker
}

async function pickDevice() {
  if (!navigator.gpu) return 'wasm'
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

/**
 * Transcribe entirely in the browser.
 * @returns {Promise<{word: string, start: number, end: number}[]>}
 */
export async function transcribeInBrowser(file, model, onProgress) {
  onProgress?.({ phase: 'audio', message: 'Extracting audio', progress: null })
  const audio = await extractAudio(file)

  const device = await pickDevice()
  const w = getWorker()

  return new Promise((resolve, reject) => {
    function cleanup() {
      w.removeEventListener('message', handle)
      w.removeEventListener('error', fail)
    }
    function handle(event) {
      const msg = event.data
      if (msg.type === 'download') {
        onProgress?.({
          phase: 'model',
          message: `Downloading model (${device})`,
          progress: msg.progress,
        })
      } else if (msg.type === 'status') {
        onProgress?.({ phase: 'transcribe', message: msg.message, progress: null })
      } else if (msg.type === 'progress') {
        onProgress?.({ phase: 'transcribe', message: msg.message, progress: msg.percent / 100 })
      } else if (msg.type === 'done') {
        cleanup()
        resolve(msg.words)
      } else if (msg.type === 'error') {
        cleanup()
        reject(new Error(msg.message))
      }
    }
    function fail(event) {
      cleanup()
      reject(new Error(event.message || 'Worker crashed'))
    }

    w.addEventListener('message', handle)
    w.addEventListener('error', fail)
    w.postMessage({ audio, model, device })
  })
}
