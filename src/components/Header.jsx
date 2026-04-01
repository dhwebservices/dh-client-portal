import { useState, useEffect, useRef } from 'react'
import { Bell, Sun, Moon } from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const titles = {
  '/dashboard': 'Dashboard',
  '/plan':      'My Plan',
  '/invoices':  'Invoices',
  '/website':   'My Website',
  '/documents': 'Documents',
  '/support':   'Support',
  '/activity':  'Activity',
}

export default function Header({ darkMode, onToggleDark, isMobile }) {
  const { clientEmail } = useAuth()
  const { accounts, instance } = useMsal()
  const user = accounts[0]
  const loc  = useLocation()
  const nav  = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]         = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState(null)
  const notifRef = useRef()

  useEffect(() => { if (user?.username) { fetchProfilePhoto() } }, [user])
  useEffect(() => { if (clientEmail) fetchNotifs() }, [clientEmail])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-notifications-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_email=eq.${clientEmail}` }, fetchNotifs)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchProfilePhoto = async () => {
    try {
      const tokenRes = await instance.acquireTokenSilent({ scopes: ['User.Read'], account: user })
      const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${tokenRes.accessToken}` }
      })
      if (res.ok) {
        const blob = await res.blob()
        setProfilePhoto(URL.createObjectURL(blob))
      }
    } catch (e) { /* no photo */ }
  }

  useEffect(() => {
    const handler = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifs = async () => {
    if (!clientEmail) return
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_email', clientEmail)
      .order('created_at', { ascending: false }).limit(15)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }

  const markAllRead = async () => {
    if (!clientEmail) return
    await supabase.from('notifications').update({ read: true }).eq('user_email', clientEmail)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: isMobile ? 0 : '220px', right: 0, height: isMobile ? '56px' : '64px',
      background: darkMode ? 'rgba(15,22,40,0.92)' : 'rgba(248,250,255,0.92)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
      display: isMobile ? 'none' : 'flex', alignItems: 'center', padding: '0 28px', gap: '14px', zIndex: 150,
      transition: 'background 0.2s',
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, flex: 1, color: 'var(--text)' }}>
        {titles[loc.pathname] || 'Client Portal'}
      </h1>

      <div style={{ fontSize: '13px', color: 'var(--sub)' }}>
        Welcome back, <strong style={{ color: 'var(--text)' }}>{user?.name?.split(' ')[0] ?? 'there'}</strong>
      </div>

      {/* Dark/light toggle */}
      <button onClick={onToggleDark} style={{
        background: 'var(--bg-muted)', border: '1px solid var(--border)',
        borderRadius: '8px', width: '36px', height: '36px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--sub)', cursor: 'pointer', transition: 'color 0.15s',
      }} title={darkMode ? 'Light mode' : 'Dark mode'}>
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button onClick={() => { setShowNotifs(p => !p); markAllRead() }} style={{
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          borderRadius: '8px', width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sub)', cursor: 'pointer', position: 'relative',
        }}>
          <Bell size={15} />
          {unread > 0 && <span style={{ position: 'absolute', top: '7px', right: '7px', width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', border: '1.5px solid var(--bg-card)' }} />}
        </button>

        {showNotifs && (
          <div style={{
            position: 'absolute', top: '44px', right: 0, width: '300px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Notifications</span>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--sub)', fontSize: '13px' }}>No notifications yet</div>
            ) : notifications.slice(0, 8).map((n, i) => (
              <div key={n.id} onClick={() => { if (n.link) nav(n.link); setShowNotifs(false) }} style={{
                padding: '12px 16px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(26,86,219,0.04)',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(26,86,219,0.04)'}
              >
                <div style={{ fontSize: '13px', fontWeight: n.read ? 400 : 600, color: 'var(--text)', marginBottom: '2px' }}>{n.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--sub)' }}>{new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar */}
      {profilePhoto ? (
        <img src={profilePhoto} alt={user?.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
      ) : (
        <div style={{ width: '34px', height: '34px', background: 'var(--grad)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
          {user?.name?.charAt(0) ?? 'C'}
        </div>
      )}
    </header>
  )
}
