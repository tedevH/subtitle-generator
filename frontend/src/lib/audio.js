// Extracts mono PCM from a video file using only Web Audio -- no ffmpeg needed
// just to feed Whisper.

export const WHISPER_SAMPLE_RATE = 16000

/** @returns {Promise<Float32Array>} mono samples at 16 kHz */
export async function extractAudio(file, sampleRate = WHISPER_SAMPLE_RATE) {
  const bytes = await file.arrayBuffer()

  // decodeAudioData detaches the buffer it's given, so hand it a copy.
  const ctx = new AudioContext()
  let decoded
  try {
    decoded = await ctx.decodeAudioData(bytes.slice(0))
  } finally {
    ctx.close()
  }

  // Resample + downmix to mono by rendering through a 1-channel context.
  const frames = Math.ceil(decoded.duration * sampleRate)
  const offline = new OfflineAudioContext(1, frames, sampleRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  return rendered.getChannelData(0)
}

/** Full-fidelity decode, used by the exporter to re-encode the audio track. */
export async function decodeFullAudio(file) {
  const bytes = await file.arrayBuffer()
  const ctx = new AudioContext()
  try {
    return await ctx.decodeAudioData(bytes.slice(0))
  } finally {
    ctx.close()
  }
}
