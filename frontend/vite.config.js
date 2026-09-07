import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Note: deliberately NOT setting COOP/COEP headers. Cross-origin isolation
// would unlock multi-threaded WASM, but it also blocks the Hugging Face CDN
// the model weights are fetched from. Single-threaded WASM (or WebGPU when
// available) is the working trade.
export default defineConfig({
  plugins: [react()],
  // onnxruntime-web ships wasm + top-level await; let it through untouched.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  build: { target: 'esnext' },
  worker: { format: 'es' },
})
