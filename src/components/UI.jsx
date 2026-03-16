export function Card({ children, style = {} }) {
  return (
    <div className="fade" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '22px', boxShadow: 'var(--shadow)', ...style,
    }}>{children}</div>
  )
}

export function Badge({ children, variant = 'default' }) {
  const s = {
    active:    { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
    paid:      { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
    pending:   { bg: '#FEF9C3', color: '#A16207', border: '#FDE047' },
    unpaid:    { bg: '#FEF9C3', color: '#A16207', border: '#FDE047' },
    building:  { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
    complete:  { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
    cancelled: { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
    open:      { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D' },
    resolved:  { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
    default:   { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  }[variant] || { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
    }}>{children}</span>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', icon: Icon, disabled, style = {} }) {
  const sizes = { sm: { padding: '6px 14px', fontSize: '12.5px' }, md: { padding: '10px 20px', fontSize: '14px' }, lg: { padding: '13px 28px', fontSize: '15px' } }
  const variants = {
    primary:   { background: 'var(--grad)', color: '#fff', boxShadow: '0 2px 8px rgba(26,86,219,0.3)' },
    secondary: { background: 'var(--bg-muted)', color: 'var(--text)', border: '1px solid var(--border)' },
    ghost:     { background: 'transparent', color: 'var(--sub)', border: '1px solid var(--border)' },
    danger:    { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      fontWeight: 600, borderRadius: '9px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
      ...sizes[size], ...variants[variant], ...style,
    }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.opacity = '0.85' }}
      onMouseOut={e => { if (!disabled) e.currentTarget.style.opacity = '1' }}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} strokeWidth={2} />}
      {children}
    </button>
  )
}

export function StatusTracker({ status }) {
  const stages = [
    { key: 'accepted',     label: 'Order Accepted',   icon: '✓' },
    { key: 'building',     label: 'Being Built',       icon: '⚙' },
    { key: 'nearly_there', label: 'Nearly There',      icon: '◎' },
    { key: 'ready',        label: 'Ready to Launch',   icon: '🚀' },
  ]
  const idx = stages.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative', padding: '8px 0' }}>
      {stages.map((s, i) => {
        const done    = i <= idx
        const current = i === idx
        return (
          <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < stages.length - 1 && (
              <div style={{
                position: 'absolute', top: '19px', left: '50%', width: '100%', height: '3px',
                background: i < idx ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: done ? 'var(--accent)' : 'var(--bg-muted)',
              border: `3px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', color: done ? '#fff' : 'var(--faint)',
              boxShadow: current ? '0 0 0 4px rgba(26,86,219,0.15)' : 'none',
              transition: 'all 0.3s', zIndex: 1, position: 'relative',
              fontWeight: 700,
            }}>{s.icon}</div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: current ? 700 : 500, color: done ? 'var(--accent)' : 'var(--sub)', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = '500px' }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 400, padding: '20px', boxSizing: 'border-box',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px', width, maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease', border: '1px solid var(--border)', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', zIndex: 1 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'var(--bg-muted)', color: 'var(--sub)', width: 28, height: 28, borderRadius: 6, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '22px' }}>{children}</div>
      </div>
    </div>
  )
}

export function Input({ label, value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && <label style={{ fontSize: '13px', color: 'var(--sub)', fontWeight: 600 }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
        background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '9px',
        padding: '10px 14px', color: 'var(--text)', fontSize: '13.5px', transition: 'border-color 0.15s',
      }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}
