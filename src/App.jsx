import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar        from './components/Sidebar'
import Header         from './components/Header'
import BannerDisplay  from './components/BannerDisplay'
import LoginPage      from './pages/LoginPage'
import Dashboard      from './pages/Dashboard'
import Plan           from './pages/Plan'
import Invoices       from './pages/Invoices'
import Website        from './pages/Website'
import Documents      from './pages/Documents'
import Support        from './pages/Support'
import Activity       from './pages/Activity'

function PortalLayout() {
  const { clientEmail } = useAuth()
  const { accounts } = useMsal()
  const user = accounts[0]
  const [darkMode, setDarkMode] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('dh_client_dark_mode')
    if (saved !== null) setDarkMode(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('dh_client_dark_mode', darkMode)
    if (darkMode) {
      document.documentElement.style.setProperty('--bg',          '#0F1620')
      document.documentElement.style.setProperty('--bg-card',     '#1A2540')
      document.documentElement.style.setProperty('--bg-muted',    '#1E2E45')
      document.documentElement.style.setProperty('--border',      '#2A3A55')
      document.documentElement.style.setProperty('--text',        '#F0F4FF')
      document.documentElement.style.setProperty('--sub',         '#94A9C9')
      document.documentElement.style.setProperty('--faint',       '#4A6080')
      document.documentElement.style.setProperty('--logo-filter', 'brightness(0) invert(1) opacity(0.92)')
    } else {
      document.documentElement.style.setProperty('--bg',          '#F8FAFF')
      document.documentElement.style.setProperty('--bg-card',     '#FFFFFF')
      document.documentElement.style.setProperty('--bg-muted',    '#F1F5FD')
      document.documentElement.style.setProperty('--border',      '#E2E8F4')
      document.documentElement.style.setProperty('--text',        '#0F172A')
      document.documentElement.style.setProperty('--sub',         '#64748B')
      document.documentElement.style.setProperty('--faint',       '#CBD5E1')
      document.documentElement.style.setProperty('--logo-filter', 'none')
    }
  }, [darkMode])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ marginLeft: isMobile ? 0 : '220px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, overflow: 'hidden' }}>
        <Header darkMode={darkMode} onToggleDark={() => setDarkMode(p => !p)} isMobile={isMobile} />
        <main style={{ marginTop: isMobile ? '56px' : '64px', padding: isMobile ? '16px' : '28px', flex: 1, minWidth: 0, overflowX: 'hidden' }}>
          <BannerDisplay userEmail={clientEmail} />
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plan"      element={<Plan />} />
            <Route path="/invoices"  element={<Invoices />} />
            <Route path="/website"   element={<Website />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/support"   element={<Support />} />
            <Route path="/activity"  element={<Activity />} />
            <Route path="*"          element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function AppRoutes() {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress }  = useMsal()
  const { wrongRole, logout } = useAuth()

  if (inProgress !== 'none' && !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '14px' }}>
        <div style={{ width: '44px', height: '44px', background: 'var(--grad)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#fff', animation: 'pulse 1.5s ease infinite' }}>DH</div>
        <div style={{ fontSize: '13px', color: 'var(--sub)' }}>Signing you in…</div>
      </div>
    )
  }

  if (isAuthenticated && wrongRole) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'var(--text)' }}>Wrong Portal</h2>
          <p style={{ color: 'var(--sub)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>Your account is set up as a staff member. Please use the staff portal.</p>
          <a href="https://staff.dhwebsiteservices.co.uk" style={{ display: 'inline-block', padding: '12px 28px', background: 'var(--grad)', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '14px' }}>Go to Staff Portal →</a>
          <br />
          <button onClick={logout} style={{ background: 'none', color: 'var(--sub)', fontSize: '13px', marginTop: '8px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <LoginPage />
  return <Routes><Route path="/*" element={<PortalLayout />} /></Routes>
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
