import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The font stylesheet is fetched as a non-blocking `media="print"` sheet (see
// index.html). Switch it on once it has loaded. This replaces an inline
// `onload` attribute, which the Content-Security-Policy does not allow.
const deferredFonts = document.getElementById('deferred-fonts')
if (deferredFonts) {
  const enableFonts = () => { deferredFonts.media = 'all' }
  if (deferredFonts.sheet) enableFonts()
  else deferredFonts.addEventListener('load', enableFonts, { once: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
