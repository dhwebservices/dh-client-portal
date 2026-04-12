const STATUS_STYLES = {
  not_started: {
    label: 'Not started',
    tone: 'var(--sub)',
    background: 'transparent',
    border: 'var(--border)',
  },
  in_progress: {
    label: 'In progress',
    tone: 'var(--amber)',
    background: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.18)',
  },
  submitted: {
    label: 'Submitted',
    tone: 'var(--green)',
    background: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.18)',
  },
}

export default function OnboardingSectionNav({ sections, activeKey, onSelect }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {sections.map((section, index) => {
        const style = STATUS_STYLES[section.status] || STATUS_STYLES.not_started
        const isActive = section.key === activeKey

        return (
          <button
            key={section.key}
            onClick={() => onSelect(section.key)}
            style={{
              textAlign: 'left',
              padding: '16px 16px 15px',
              borderRadius: 16,
              border: `1px solid ${isActive ? 'rgba(26,86,219,0.28)' : 'var(--border)'}`,
              background: isActive ? 'rgba(26,86,219,0.07)' : 'var(--bg-card)',
              boxShadow: isActive ? '0 8px 18px rgba(26,86,219,0.08)' : 'none',
              transition: 'all 0.16s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: isActive ? 'var(--grad)' : 'var(--bg-muted)',
                    color: isActive ? '#fff' : 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{section.label}</div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: style.tone,
                }}
              >
                {style.label}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5 }}>
              {section.description}
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 9px',
                borderRadius: 999,
                background: style.background,
                border: `1px solid ${style.border}`,
                fontSize: 11.5,
                fontWeight: 700,
                color: style.tone,
              }}
            >
              {style.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
