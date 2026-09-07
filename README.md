# Subtitle Generator

Upload a video, get word-accurate subtitles, edit and style them, and download
an MP4 with them burned in. Everything runs in the browser — the video never
leaves the machine.

## Run it

```bash
cd frontend
npm install
npm run dev
```

That's the whole app. There is no backend: everything, including
transcription, runs in the browser tab.

## How it works

```
video file
  ↓  Web Audio decode → 16 kHz mono          src/lib/audio.js
  ↓  Whisper in a worker (WebGPU or WASM)    src/whisper.worker.js
words + timestamps
  ↓  segmentation                            src/lib/subtitles.js
cues: [{ id, start, end, text }]
  ↓  React state                             src/App.jsx
  ↓  edited via list / timeline / style panel
  ↓  canvas draw + WebCodecs encode + MP4 mux  src/lib/export.js
final.mp4
```

The cue array is the hub. The subtitle list, the timeline, and the video
overlay are three views onto the same data — editing through any of them
updates the other two.

### Files

| Path | Responsibility |
|---|---|
| `lib/subtitles.js` | words → cues, plus split/merge/delete/shift. No DOM. |
| `lib/render.js` | draws a cue onto a canvas. Used by preview *and* export. |
| `lib/export.js` | seek → draw → encode → mux. Produces the MP4. |
| `lib/audio.js` | video file → PCM, via Web Audio only. |
| `lib/transcribe.js` | extracts audio, talks to the Whisper worker. |
| `lib/style.js` | style defaults and the short-form presets. |
| `lib/format.js` | timecodes, SRT/VTT, downloads. |

`render.js` being shared is what makes the export WYSIWYG: the preview overlay
and the burned-in frames run the same drawing code, just at different scales.
All style sizes are percentages of frame height, so a style looks identical at
540p and 4K.

### Captions

Cues carry their own word timings, so the renderer draws words individually and
can highlight the one currently being spoken — the defining TikTok / Shorts
look.

Sixteen presets ship in `lib/style.js`: Clean, Hormozi, Pop Box, Karaoke, Pill,
Neon, Beast, Bubble, Cinema, Podcast, Marker, Fire, Mint, Typewriter, Candy and
Soft. Each preset button in the Style panel renders its own live preview by
calling the same `drawSubtitle`, so a button can never drift from what it
actually produces. Adding a preset is one entry in the `PRESETS` array — the
preview comes for free.

Editing a cue's text invalidates Whisper's word timings. Rather than dropping
the highlight, `cueWords()` falls back to sharing the cue's duration evenly
across the new words, so edited captions still animate.

### Transcription progress

Whisper's own chunked mode hides progress inside one call, so
`whisper.worker.js` splits the audio into fixed 20-second windows itself and
transcribes them one at a time. That trades away the pipeline's built-in
overlap stitching (a boundary word can occasionally be cut awkwardly) for a
real percentage: the UI reports actual chunks-completed progress during
transcription, not just a spinner.

## Browser support

Transcription works anywhere. **Burning in requires WebCodecs** — Chrome or
Edge. Elsewhere the app still exports `.srt` and `.vtt`, and the UI says so.

WebGPU is used for Whisper when available and falls back to WASM otherwise.

> Cross-origin isolation (COOP/COEP) is deliberately **not** enabled in
> `vite.config.js`. It would unlock multi-threaded WASM but would also block
> the Hugging Face CDN the model weights come from.
