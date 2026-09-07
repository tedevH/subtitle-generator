// All size values are percentages so a style looks the same at 720p and 4K.
// Percentages are of video HEIGHT, except maxWidth which is of video WIDTH.

export const DEFAULT_STYLE = {
  fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
  fontSize: 5.2,
  fontWeight: 800,
  color: '#ffffff',
  uppercase: false,
  lineHeight: 1.18,
  letterSpacing: -0.01, // em, relative to font size

  strokeWidth: 0.5,
  strokeColor: '#000000',
  shadow: true,
  shadowColor: null, // null = plain black drop shadow; a colour = glow
  shadowBlur: 0.22, // relative to font size

  bgEnabled: false,
  bgColor: '#000000',
  bgOpacity: 0.7,
  bgRadius: 0.9,
  bgPadX: 1.4,
  bgPadY: 0.7,

  // Per-word highlight: 'none' | 'color' | 'box'
  highlightMode: 'none',
  highlightColor: '#ffd60a',
  highlightTextColor: '#000000',
  highlightRadius: 0.6,

  pop: false,

  // Short-form apps overlay their own UI along the bottom, so sit above it.
  positionX: 50,
  positionY: 74,
  maxWidth: 84,
}

// The Google Fonts loaded in index.html. Keep this list in sync with the
// families requested there -- a font picked here that isn't actually loaded
// silently falls back to the browser default instead of erroring.
export const FONT_OPTIONS = [
  { label: 'Sans (system)', value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Arial Black', value: "'Arial Black', 'Helvetica Neue', sans-serif" },
  { label: 'Impact', value: "Impact, 'Arial Black', sans-serif" },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: 'ui-monospace, Menlo, Consolas, monospace' },
  { label: 'Anton', value: "'Anton', 'Arial Black', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Arial Narrow', sans-serif" },
  { label: 'Archivo Black', value: "'Archivo Black', 'Arial Black', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', system-ui, sans-serif" },
  { label: 'Poppins', value: "'Poppins', system-ui, sans-serif" },
  { label: 'Oswald', value: "'Oswald', 'Arial Narrow', sans-serif" },
  { label: 'Bangers', value: "'Bangers', 'Comic Sans MS', cursive" },
  { label: 'Permanent Marker', value: "'Permanent Marker', cursive" },
  { label: 'Caveat', value: "'Caveat', cursive" },
]

/**
 * Each preset is a full style plus a `sample` used for its button preview.
 * Two-word samples so the per-word highlight is visible in the preview.
 */
export const PRESETS = [
  {
    name: 'Clean',
    sample: 'clean look',
    style: {},
  },
  {
    name: 'Hormozi',
    sample: 'GO BIG',
    style: {
      fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
      fontSize: 6.4,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -0.02,
      strokeWidth: 0.85,
      highlightMode: 'color',
      highlightColor: '#ffd60a',
      lineHeight: 1.1,
      positionY: 70,
      pop: true,
    },
  },
  {
    name: 'Pop Box',
    sample: 'GET THIS',
    style: {
      fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
      fontSize: 5.9,
      fontWeight: 900,
      uppercase: true,
      strokeWidth: 0.7,
      highlightMode: 'box',
      highlightColor: '#22c55e',
      highlightTextColor: '#000000',
      lineHeight: 1.22,
      positionY: 72,
      pop: true,
    },
  },
  {
    name: 'Karaoke',
    sample: 'sing along',
    style: {
      fontSize: 5.4,
      fontWeight: 800,
      strokeWidth: 0.45,
      highlightMode: 'color',
      highlightColor: '#22d3ee',
      positionY: 76,
    },
  },
  {
    name: 'Pill',
    sample: 'subtle caption',
    style: {
      fontSize: 4.4,
      fontWeight: 600,
      strokeWidth: 0,
      shadow: false,
      bgEnabled: true,
      bgOpacity: 0.78,
      bgRadius: 1.6,
      maxWidth: 76,
      positionY: 78,
    },
  },
  {
    name: 'Neon',
    sample: 'NIGHT MODE',
    style: {
      fontSize: 5.6,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: 0.02,
      strokeWidth: 0,
      color: '#f5d0fe',
      shadow: true,
      shadowColor: '#d946ef',
      shadowBlur: 0.5,
      highlightMode: 'color',
      highlightColor: '#ffffff',
      positionY: 72,
    },
  },
  {
    name: 'Beast',
    sample: 'HUGE NEWS',
    style: {
      fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
      fontSize: 7,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -0.025,
      strokeWidth: 1,
      lineHeight: 1.05,
      highlightMode: 'color',
      highlightColor: '#ff3b30',
      positionY: 68,
      pop: true,
    },
  },
  {
    name: 'Bubble',
    sample: 'tap here',
    style: {
      fontSize: 5.2,
      fontWeight: 800,
      strokeWidth: 0.4,
      highlightMode: 'box',
      highlightColor: '#3b82f6',
      highlightTextColor: '#ffffff',
      highlightRadius: 1.4,
      lineHeight: 1.3,
      positionY: 74,
      pop: true,
    },
  },
  {
    name: 'Cinema',
    sample: 'a quiet moment',
    style: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: 4.1,
      fontWeight: 500,
      letterSpacing: 0.01,
      strokeWidth: 0.2,
      maxWidth: 70,
      positionY: 87,
    },
  },
  {
    name: 'Podcast',
    sample: 'the full story',
    style: {
      fontSize: 4,
      fontWeight: 600,
      strokeWidth: 0,
      shadow: false,
      bgEnabled: true,
      bgOpacity: 0.72,
      bgRadius: 0.7,
      highlightMode: 'color',
      highlightColor: '#22d3ee',
      maxWidth: 74,
      positionY: 84,
    },
  },
  {
    name: 'Marker',
    sample: 'read this',
    style: {
      fontSize: 4.8,
      fontWeight: 800,
      color: '#18181b',
      strokeWidth: 0,
      shadow: false,
      bgEnabled: true,
      bgColor: '#fde047',
      bgOpacity: 1,
      bgRadius: 0.3,
      bgPadX: 1,
      maxWidth: 78,
      positionY: 76,
    },
  },
  {
    name: 'Fire',
    sample: 'TURN UP',
    style: {
      fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif",
      fontSize: 6.2,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -0.015,
      strokeWidth: 0.8,
      highlightMode: 'color',
      highlightColor: '#ff6b00',
      lineHeight: 1.12,
      positionY: 70,
      pop: true,
    },
  },
  {
    name: 'Mint',
    sample: 'so fresh',
    style: {
      fontSize: 5.2,
      fontWeight: 800,
      strokeWidth: 0.35,
      highlightMode: 'box',
      highlightColor: '#a7f3d0',
      highlightTextColor: '#065f46',
      highlightRadius: 0.9,
      lineHeight: 1.28,
      positionY: 75,
    },
  },
  {
    name: 'Typewriter',
    sample: 'plain text',
    style: {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
      fontSize: 3.9,
      fontWeight: 600,
      letterSpacing: 0.015,
      strokeWidth: 0,
      shadow: false,
      bgEnabled: true,
      bgOpacity: 0.85,
      bgRadius: 0.2,
      maxWidth: 78,
      positionY: 80,
    },
  },
  {
    name: 'Candy',
    sample: 'LOVE IT',
    style: {
      fontSize: 5.8,
      fontWeight: 900,
      uppercase: true,
      strokeWidth: 0.6,
      highlightMode: 'box',
      highlightColor: '#ec4899',
      highlightTextColor: '#ffffff',
      highlightRadius: 1,
      lineHeight: 1.25,
      positionY: 72,
      pop: true,
    },
  },
  {
    name: 'Soft',
    sample: 'gentle words',
    style: {
      fontSize: 5,
      fontWeight: 700,
      letterSpacing: 0,
      strokeWidth: 0,
      shadow: true,
      shadowBlur: 0.45,
      lineHeight: 1.3,
      positionY: 78,
    },
  },
]

export function presetStyle(preset) {
  return { ...DEFAULT_STYLE, ...preset.style }
}
