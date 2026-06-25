import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import "../node_modules/bootstrap/dist/css/bootstrap.css"
import "../node_modules/bootstrap/dist/js/bootstrap.bundle.js"
import "../node_modules/bootstrap-icons/font/bootstrap-icons.css"
import "../node_modules/@fortawesome/fontawesome-free/css/all.min.css"

if (import.meta.env.PROD && typeof window !== 'undefined') {
  const noop = () => {};
  window.console.log = noop;
  window.console.debug = noop;
  window.console.info = noop;
  window.console.warn = noop;
  window.console.error = noop;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
