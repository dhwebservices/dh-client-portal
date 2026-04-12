export default function OnboardingProgress({ completeCount, total, percent, status }) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(26,86,219,0.12) 0%, rgba(14,165,233,0.08) 100%)',
        border: '1px solid rgba(26,86,219,0.14)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
            Onboarding Progress
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>
            {percent}%
          </div>
        </div>
        <div
          style={{
            padding: '7px 12px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.74)',
            border: '1px solid rgba(26,86,219,0.12)',
            color: 'var(--text)',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'capitalize',
          }}
        >
          {status.replace('_', ' ')}
        </div>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(15,23,42,0.08)', overflow: 'hidden', marginBottom: 12 }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: 'var(--grad)',
            borderRadius: 999,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <div style={{ fontSize: 13, color: 'var(--sub)' }}>
        {completeCount} of {total} sections submitted.
      </div>
    </div>
  )
}
