import React from 'react'
import ReactDOM from 'react-dom/client'

// Holding page while the client area is rebuilt (16 Nov 2026). The old
// Microsoft-only portal is in git history.
function Holding() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#FAFBF9', color: '#14181A', fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 460 }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15, marginBottom: 40 }}>
          <img src="/dh-logo-icon.png" alt="" width="28" style={{ filter: 'brightness(0.2)' }} /> DH Website Services
        </p>
        <h1 style={{ fontFamily: "'Archivo', 'Helvetica Neue', Arial, sans-serif", fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>Client area</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#333B3D', marginBottom: 24 }}>
          We are moving the client area to a simpler sign-in. In the meantime, email us and we will sort whatever you need the same working day.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.8 }}>
          <a href="mailto:clients@dhwebsiteservices.co.uk" style={{ color: '#C8102E', fontWeight: 600 }}>clients@dhwebsiteservices.co.uk</a><br />
          01443 805303
        </p>
      </div>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Holding />)
