import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { LayoutDashboard, CreditCard, FileText, Globe, FolderOpen, FileSignature, MessageSquare, Activity, LogOut, Menu, X } from 'lucide-react'
const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/plan',      icon: CreditCard,      label: 'My Plan'    },
  { to: '/invoices',  icon: FileText,        label: 'Invoices'   },
  { to: '/website',   icon: Globe,           label: 'My Website' },
  { to: '/documents', icon: FolderOpen,      label: 'Documents'  },
  { to: '/contracts', icon: FileSignature,   label: 'Contracts'  },
  { to: '/support',   icon: MessageSquare,   label: 'Support'    },
  { to: '/activity',  icon: Activity,        label: 'Activity'   },
]

export default function Sidebar() {
  const { instance, accounts } = useMsal()
  const user = accounts[0]
  const [open, setOpen]           = useState(false)
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 768)
  const [profilePhoto, setProfilePhoto] = useState(null)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        const tokenRes = await instance.acquireTokenSilent({ scopes: ['User.Read'], account: accounts[0] })
        const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
          headers: { Authorization: `Bearer ${tokenRes.accessToken}` }
        })
        if (res.ok) setProfilePhoto(URL.createObjectURL(await res.blob()))
      } catch {}
    }
    if (accounts[0]) fetchPhoto()
  }, [accounts[0]])

  const handleNav = () => { if (isMobile) setOpen(false) }

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px', zIndex: 200,
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
        }}>
          <button onClick={() => setOpen(p => !p)} style={{
            background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: '8px', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text)', cursor: 'pointer', flexShrink: 0,
          }}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="DH Website Services" style={{ height: '26px', width: 'auto', objectFit: 'contain', filter: 'var(--logo-filter)' }} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
            {user?.name?.charAt(0) ?? 'C'}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isMobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 149, backdropFilter: 'blur(2px)' }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: '220px', minHeight: '100vh',
        background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 150,
        transform: isMobile && !open ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.25s ease',
        boxShadow: isMobile && open ? '4px 0 24px rgba(0,0,0,0.2)' : 'none',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <img src="/logo.png" alt="DH Website Services" style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'var(--logo-filter)' }} />
            {isMobile && <button onClick={() => setOpen(false)} style={{ background: 'none', color: 'var(--sub)', display: 'flex', cursor: 'pointer' }}><X size={16} /></button>}
          </div>
        </div>

        <nav style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={handleNav}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 11px', borderRadius: 8, marginBottom: 2,
                fontSize: 13, fontWeight: 500,
                color: isActive ? 'var(--accent)' : 'var(--sub)',
                background: isActive ? 'rgba(26,86,219,0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.12s', textDecoration: 'none',
              })}
            >
              <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{user?.name?.charAt(0) ?? 'C'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{user?.name ?? 'Client'}</div>
            <div style={{ fontSize: 10, color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username ?? ''}</div>
          </div>
          <button onClick={() => instance.logoutRedirect()} title="Sign out" style={{ background: 'transparent', color: 'var(--sub)', padding: '4px', borderRadius: 6, flexShrink: 0, display: 'flex', cursor: 'pointer' }}>
            <LogOut size={14} />
          </button>
        </div>
      </aside>
    </>
  )
}
