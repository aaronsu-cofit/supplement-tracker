import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Initialize Eruda for mobile debugging
if (import.meta.env.VITE_ENABLE_ERUDA === 'true') {
  import('eruda').then(({ default: eruda }) => {
    eruda.init()
  })
}

const root = document.getElementById('root')

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
