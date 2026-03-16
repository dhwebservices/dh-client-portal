import { useAuth } from '../contexts/AuthContext'
import { Shield, Globe, FileText, MessageSquare } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFF 50%, #F0FDF4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{ width: '420px', maxWidth: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', background: 'var(--grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#fff',
            margin: '0 auto 14px', boxShadow: '0 4px 16px rgba(26,86,219,0.3)',
          }}>DH</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>DH Website Services</h1>
          <p style={{ color: 'var(--sub)', fontSize: '14px', marginTop: '4px' }}>Client Portal</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px',
          padding: '36px', boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>Sign in to your portal</h2>
          <p style={{ color: 'var(--sub)', fontSize: '13.5px', marginBottom: '28px', lineHeight: 1.6 }}>
            Access your plan, invoices, website progress, and more — all in one place.
          </p>

          {/* Features */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
            {[
              { icon: Globe,          label: 'Website Status'    },
              { icon: FileText,       label: 'Invoices & Plans'  },
              { icon: MessageSquare,  label: 'Support'           },
              { icon: Shield,         label: 'Secure Login'      },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: '9px',
                border: '1px solid var(--border)', fontSize: '12.5px', color: 'var(--sub)', fontWeight: 500,
              }}>
                <Icon size={14} color="var(--accent)" />
                {label}
              </div>
            ))}
          </div>

          {/* Sign in button */}
          <button onClick={login} style={{
            width: '100%', padding: '13px',
            background: 'var(--grad)', border: 'none', borderRadius: '10px',
            color: '#fff', fontSize: '14.5px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer', transition: 'opacity 0.15s',
            boxShadow: '0 4px 16px rgba(26,86,219,0.3)',
          }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>

          <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--faint)', textAlign: 'center', lineHeight: 1.5 }}>
            Use the email address provided to you by DH Website Services.<br />
            Need access? Contact <span style={{ color: 'var(--sub)' }}>clients@dhwebsiteservices.co.uk</span>
          </p>
        </div>
      </div>
    </div>
  )
}
