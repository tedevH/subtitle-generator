import './Landing.css'
import HeroPreview from './HeroPreview.jsx'

const STEPS = [
  {
    title: 'Choose a video',
    body: 'Pick any video file. It loads straight into the player on your own device. Nothing is sent anywhere yet.',
  },
  {
    title: 'AI transcribes it',
    body: 'An on-device speech model listens to the audio and times every word, right there in your browser tab.',
  },
  {
    title: 'Edit and style',
    body: 'Fix a line, drag a timestamp on the timeline, or pick one of 16 caption styles. Changes update instantly.',
  },
  {
    title: 'Export',
    body: 'Download an MP4 with captions burned in, or grab an .srt or .vtt file to use anywhere else.',
  },
]

const FEATURES = [
  {
    title: 'Your video never uploads',
    body: 'Transcription runs on your own device. There is no server processing your footage, so there is nothing to leak.',
  },
  {
    title: 'No account, no watermark',
    body: 'Open the page and use it. No sign-up, no email, no logo stamped on your export.',
  },
  {
    title: 'No length limit',
    body: 'Process a ten-second clip or a two-hour recording. The only limit is your own device.',
  },
  {
    title: '16 caption styles',
    body: 'TikTok-style word highlights, boxed captions, karaoke color fill, clean minimal. Pick a look or design your own.',
  },
  {
    title: 'A real editor, not a one-shot tool',
    body: 'Every caption is editable: text, timing, position. Split a line, merge two, drag it on the timeline.',
  },
  {
    title: 'Completely free',
    body: 'No trial, no tier, no card required. That is the whole product.',
  },
]

const AUDIENCE = [
  'Creators captioning TikToks, Reels, and Shorts',
  'YouTubers who need accurate, editable subtitles',
  'Podcasters turning episodes into video clips',
  'Anyone who needs a transcript without uploading sensitive footage',
]

const FAQS = [
  {
    q: 'Is this actually free?',
    a: 'Yes. Uploading, transcribing, editing, styling, and exporting are all free with no limits and no account. There is no paid tier that unlocks anything you see here.',
  },
  {
    q: 'Do you upload or store my video?',
    a: 'No. Transcription and rendering happen inside your browser tab using your own device. Your video is never sent to a server, and nothing is stored after you close the page.',
  },
  {
    q: 'What languages are supported?',
    a: 'The built-in models currently transcribe English audio. Support for more languages is on the roadmap.',
  },
  {
    q: 'How accurate is the transcription?',
    a: 'It uses OpenAI’s Whisper speech model. Clear, single-speaker audio comes out very accurate; heavy background noise or overlapping speakers reduce accuracy, same as any transcription tool. Every line is editable, so mistakes are a quick fix.',
  },
  {
    q: 'Can I edit the captions?',
    a: 'Yes. This is a full editor, not a one-shot generator. Rewrite any line, drag its start or end time on the timeline, split or merge cues, and shift everything at once if the whole track needs to move.',
  },
  {
    q: 'Can I just download the caption file, not the video?',
    a: 'Yes. Export an .srt or .vtt file directly if you want to bring your own captions into another editor.',
  },
  {
    q: 'Which browsers work?',
    a: 'Transcription and editing work in any modern browser. Burning captions into a downloadable MP4 uses WebCodecs, which needs Chrome or Edge. Other browsers can still export the .srt or .vtt files.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'It runs on mobile browsers, but video transcription is demanding. A laptop or desktop will be noticeably faster and more reliable.',
  },
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">100% free. No upload. No account.</p>
          <h1>Free Subtitle Generator</h1>
          <p className="hero-sub">
            Add accurate, styled captions to any video, right in your browser. Nothing you
            upload ever leaves your device.
          </p>
          <div className="hero-cta">
            <a className="primary" href="#tool">
              Upload a video
            </a>
            <span className="hero-note">No sign-up · No watermark · No length limit</span>
          </div>
        </div>

        <HeroPreview />
      </header>

      <section className="steps" aria-label="How it works">
        <h2>How it works</h2>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="features" aria-label="Features">
        <h2>Why use this over another captioning tool</h2>
        <ul className="feature-list">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="audience" aria-label="Who it's for">
        <h2>Built for</h2>
        <ul>
          {AUDIENCE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="faq" aria-label="Frequently asked questions">
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
