import React from 'react'
import ReactDOM from 'react-dom/client'
import ResizeObserverPolyfill from 'resize-observer-polyfill'
import App from '@/App.jsx'
import '@/index.css'

// iOS/Safari 12 (still used on older iPads in the field) predates both of
// these APIs. Without them the app doesn't throw a visible error — it fails
// silently mid-render (ResizeObserver, used by every recharts chart on the
// Dashboard) or mid-save (crypto.randomUUID, used across ~15 insert call
// sites for row ids), which looks like "the app doesn't open".
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverPolyfill
}
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = function randomUUID() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
