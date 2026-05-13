import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
// import { OAuthCallback } from './pages/OAuthCallback' // TODO: OAuth2 endpoints not yet implemented in Vitera backend

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/callback" element={<OAuthCallback />} /> */}
      </Routes>
    </BrowserRouter>
  )
}
