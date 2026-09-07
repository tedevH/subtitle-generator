export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Free Subtitle Generator runs entirely in your browser. Nothing you upload is sent to a
        server.
      </p>
      <nav className="site-footer-links">
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
      </nav>
      <p className="site-footer-fine">
        Speech recognition powered by the open-source Whisper model. Not affiliated with or
        endorsed by OpenAI or Hugging Face.
      </p>
      <p className="site-footer-fine">© {new Date().getFullYear()} Free Subtitle Generator.</p>
    </footer>
  )
}
