const PAGE_OPTIONS = [
  ['homepage', 'Homepage'],
  ['about_page', 'About page'],
  ['services_page', 'Services page'],
  ['contact_page', 'Contact page'],
]

function ToggleCard({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 14,
        border: `1px solid ${checked ? 'rgba(26,86,219,0.24)' : 'var(--border)'}`,
        background: checked ? 'rgba(26,86,219,0.06)' : 'var(--bg-card)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  )
}

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

export default function SectionPagesNeeded({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 600, marginBottom: 10 }}>
          Core pages
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {PAGE_OPTIONS.map(([key, label]) => (
            <ToggleCard key={key} label={label} checked={Boolean(value[key])} onChange={(e) => onChange(key, e.target.checked)} />
          ))}
        </div>
      </div>
      <TextareaField label="Extra pages" value={value.extra_pages} onChange={(e) => onChange('extra_pages', e.target.value)} placeholder="List any additional pages you already know you need, such as case studies, FAQs, pricing, locations, careers, or legal pages." />
      <TextareaField label="Special features" value={value.special_features} onChange={(e) => onChange('special_features', e.target.value)} placeholder="Mention bookings, quote forms, e-commerce, calculators, integrations, portals, gated content, or anything else the build needs." />
    </div>
  )
}
