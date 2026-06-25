import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App'
import './style/index.css';

if (import.meta.env.PROD && typeof window !== 'undefined') {
  const noop = () => {};
  window.console.log = noop;
  window.console.debug = noop;
  window.console.info = noop;
  window.console.warn = noop;
  window.console.error = noop;
}

ReactDOM
  .createRoot(document.getElementById('root'))
  .render(
    <StrictMode>
      <App />
    </StrictMode>
  )
