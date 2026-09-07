// Burns subtitles into the video and muxes a real MP4, entirely in the browser.
//
// Frames come from seeking a <video> and drawing to a canvas, so any codec
// Chrome can play is a valid input -- no demuxer required. The subtitle is
// drawn with the same drawSubtitle() the preview uses, so export is WYSIWYG.

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { drawSubtitle } from './render.js'
import { activeCueIndex } from './subtitles.js'
import { decodeFullAudio } from './audio.js'

export function hasWebCodecs() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

const VIDEO_CODECS = ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42001f']

async function pickVideoCodec(config) {
  for (const codec of VIDEO_CODECS) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({ ...config, codec })
      if (supported) return codec
    } catch {
      /* try the next one */
    }
  }
  return null
}

async function pickAudioCodec(sampleRate, numberOfChannels) {
  const candidates = [
    { codec: 'mp4a.40.2', muxerCodec: 'aac' },
    { codec: 'opus', muxerCodec: 'opus' },
  ]
  for (const candidate of candidates) {
    try {
      const { supported } = await AudioEncoder.isConfigSupported({
        codec: candidate.codec,
        sampleRate,
        numberOfChannels,
        bitrate: 128000,
      })
      if (supported) return candidate
    } catch {
      /* try the next one */
    }
  }
  return null
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('Could not read that video file'))
  })
}

function seekTo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 1e-4 && video.readyState >= 2) {
      resolve()
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeEventListener('seeked', finish)
      resolve()
    }
    // A seek that lands on the frame we're already showing may not fire an
    // event; don't let that stall the whole export.
    const timer = setTimeout(finish, 3000)
    video.addEventListener('seeked', finish)
    video.currentTime = time
  })
}

function bitrateFor(width, height) {
  const pixels = width * height
  if (pixels >= 1920 * 1080) return 12_000_000
  if (pixels >= 1280 * 720) return 6_000_000
  return 3_000_000
}

/**
 * @returns {Promise<Blob>} an MP4 with the subtitles burned in
 */
export async function exportVideo({ file, cues, style, fps = 30, onProgress, signal }) {
  if (!hasWebCodecs()) throw new Error('This browser has no WebCodecs support')

  const video = await loadVideo(file)
  // H.264 requires even dimensions.
  const width = Math.floor(video.videoWidth / 2) * 2
  const height = Math.floor(video.videoHeight / 2) * 2
  const duration = video.duration

  if (!width || !height || !Number.isFinite(duration)) {
    throw new Error('Could not determine video dimensions or duration')
  }

  const bitrate = bitrateFor(width, height)
  const codec = await pickVideoCodec({ width, height, framerate: fps, bitrate })
  if (!codec) throw new Error('No supported H.264 encoder configuration')

  // --- audio (optional: a silent video just skips this) ---
  let audioBuffer
  try {
    audioBuffer = await decodeFullAudio(file)
  } catch {
    audioBuffer = null
  }

  let audioChoice = null
  let audioChannels = 0
  if (audioBuffer && audioBuffer.length > 0) {
    audioChannels = Math.min(2, audioBuffer.numberOfChannels)
    audioChoice = await pickAudioCodec(audioBuffer.sampleRate, audioChannels)
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height, frameRate: fps },
    audio: audioChoice
      ? {
          codec: audioChoice.muxerCodec,
          numberOfChannels: audioChannels,
          sampleRate: audioBuffer.sampleRate,
        }
      : undefined,
    fastStart: 'in-memory',
  })

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e
    },
  })
  videoEncoder.configure({
    codec,
    width,
    height,
    framerate: fps,
    bitrate,
    latencyMode: 'quality',
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })

  const totalFrames = Math.max(1, Math.floor(duration * fps))
  const frameDuration = 1_000_000 / fps

  for (let i = 0; i < totalFrames; i += 1) {
    if (signal?.aborted) {
      videoEncoder.close()
      throw new Error('Export cancelled')
    }

    const time = i / fps
    await seekTo(video, Math.min(time, duration - 1 / fps))

    ctx.drawImage(video, 0, 0, width, height)

    const index = activeCueIndex(cues, time)
    if (index !== -1) {
      drawSubtitle(ctx, cues[index], style, width, height, time)
    }

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(i * frameDuration),
      duration: Math.round(frameDuration),
    })
    // Keyframe every 2s keeps the file seekable.
    videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()

    // Don't outrun the encoder and balloon memory.
    while (videoEncoder.encodeQueueSize > 8) {
      await new Promise((r) => setTimeout(r, 5))
    }

    if (i % 5 === 0 || i === totalFrames - 1) {
      onProgress?.({
        phase: 'video',
        progress: (i + 1) / totalFrames,
        message: `Rendering frame ${i + 1} of ${totalFrames}`,
      })
    }
  }

  await videoEncoder.flush()
  videoEncoder.close()

  // --- encode audio ---
  if (audioChoice) {
    onProgress?.({ phase: 'audio', progress: 0, message: 'Encoding audio' })

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        throw e
      },
    })
    audioEncoder.configure({
      codec: audioChoice.codec,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioChannels,
      bitrate: 128000,
    })

    const total = audioBuffer.length
    const chunkFrames = 4096
    const channelData = []
    for (let ch = 0; ch < audioChannels; ch += 1) {
      channelData.push(audioBuffer.getChannelData(ch))
    }

    for (let offset = 0; offset < total; offset += chunkFrames) {
      const count = Math.min(chunkFrames, total - offset)
      const planar = new Float32Array(count * audioChannels)
      for (let ch = 0; ch < audioChannels; ch += 1) {
        planar.set(channelData[ch].subarray(offset, offset + count), ch * count)
      }

      const data = new AudioData({
        format: 'f32-planar',
        sampleRate: audioBuffer.sampleRate,
        numberOfFrames: count,
        numberOfChannels: audioChannels,
        timestamp: Math.round((offset / audioBuffer.sampleRate) * 1_000_000),
        data: planar,
      })
      audioEncoder.encode(data)
      data.close()

      while (audioEncoder.encodeQueueSize > 16) {
        await new Promise((r) => setTimeout(r, 5))
      }
      onProgress?.({ phase: 'audio', progress: offset / total, message: 'Encoding audio' })
    }

    await audioEncoder.flush()
    audioEncoder.close()
  }

  onProgress?.({ phase: 'mux', progress: 1, message: 'Writing MP4' })
  muxer.finalize()

  URL.revokeObjectURL(video.src)
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
