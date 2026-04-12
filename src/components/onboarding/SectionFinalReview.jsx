function TextareaField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 600 }}>{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        style={{
          background: 'var(--bg-muted)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
          color: 'var(--text)',
          fontSize: 13.5,
          resize: 'vertical',
          minHeight: 110,
        }}
      />
    </div>
  )
}

function CheckboxRow({ checked, onChange, label, hint }) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 1fr',
        gap: 12,
        alignItems: 'start',
        padding: '15px 16px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        cursor: 'pointer',
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.55 }}>{hint}</div>
      </div>
    </label>
  )
}

export default function SectionFinalReview({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <TextareaField
        label="Anything still missing?"
        value={value.missing_items}
        onChange={(e) => onChange('missing_items', e.target.value)}
        placeholder="Use this space to call out anything you cannot provide yet, or any assumptions you want the team to know before build starts."
      />
      <CheckboxRow
        checked={Boolean(value.ready_for_build)}
        onChange={(e) => onChange('ready_for_build', e.target.checked)}
        label="This onboarding is ready for build review"
        hint="Tick this when you believe the submitted information is strong enough for the team to start planning or building."
      />
      <CheckboxRow
        checked={Boolean(value.confirm_accuracy)}
        onChange={(e) => onChange('confirm_accuracy', e.target.checked)}
        label="I confirm the information here is accurate"
        hint="The team will use this onboarding to scope pages, content direction, and delivery priorities."
      />
    </div>
  )
}
