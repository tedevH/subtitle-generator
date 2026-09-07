// Whisper runs here so transcription never blocks the UI thread.
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false

const SAMPLE_RATE = 16000
// Audio is split into fixed windows and transcribed one at a time -- letting
// the pipeline's own chunk_length_s do this hides progress inside a single
// call. Doing it ourselves means we can report a real percentage between
// chunks, at the cost of the pipeline's built-in overlap stitching.
const CHUNK_SECONDS = 20

let asr = null
let loadedModel = null

async function getPipeline(model, device) {
  if (asr && loadedModel === model) return asr
  if (asr) {
    await asr.dispose()
    asr = null
  }
  asr = await pipeline('automatic-speech-recognition', model, {
    device,
    dtype: device === 'webgpu' ? 'fp32' : 'q8',
    progress_callback: (p) => {
      if (p.status === 'progress' && p.file?.endsWith('.onnx')) {
        self.postMessage({
          type: 'download',
          file: p.file,
          progress: p.total ? p.loaded / p.total : 0,
        })
      } else if (p.status === 'initiate' || p.status === 'ready') {
        self.postMessage({ type: 'status', message: `${p.status} ${p.file ?? ''}`.trim() })
      }
    },
  })
  loadedModel = model
  return asr
}

function wordsFromChunks(chunks, offsetSeconds) {
  return chunks
    .map((chunk, i, all) => {
      const [start, end] = chunk.timestamp
      const next = all[i + 1]
      return {
        word: chunk.text,
        start: (start ?? 0) + offsetSeconds,
        end: (end ?? next?.timestamp?.[0] ?? (start ?? 0) + 0.3) + offsetSeconds,
      }
    })
    .filter((w) => w.word.trim())
}

self.onmessage = async (event) => {
  const { audio, model, device } = event.data
  try {
    self.postMessage({ type: 'status', message: 'Loading model' })
    const pipe = await getPipeline(model, device)

    const chunkSize = CHUNK_SECONDS * SAMPLE_RATE
    const totalChunks = Math.max(1, Math.ceil(audio.length / chunkSize))

    const words = []
    const textParts = []

    for (let i = 0; i < totalChunks; i += 1) {
      const startSample = i * chunkSize
      const endSample = Math.min(startSample + chunkSize, audio.length)
      const slice = audio.subarray(startSample, endSample)

      self.postMessage({
        type: 'progress',
        percent: Math.round((i / totalChunks) * 100),
        message: `Transcribing (chunk ${i + 1} of ${totalChunks})`,
      })

      const output = await pipe(slice, { return_timestamps: 'word' })

      words.push(...wordsFromChunks(output.chunks ?? [], startSample / SAMPLE_RATE))
      if (output.text) textParts.push(output.text.trim())
    }

    self.postMessage({ type: 'progress', percent: 100, message: 'Transcribing (done)' })
    self.postMessage({ type: 'done', words, text: textParts.join(' ') })
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message ?? String(error) })
  }
}
