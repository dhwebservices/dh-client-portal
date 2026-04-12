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
          minHeight: 120,
        }}
      />
    </div>
  )
}

export default function SectionProjectGoals({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <TextareaField label="Main goal" value={value.main_goal} onChange={(e) => onChange('main_goal', e.target.value)} placeholder="What should the website achieve first: enquiries, bookings, credibility, sales, recruitment, or something else?" />
      <TextareaField label="Target audience" value={value.target_audience} onChange={(e) => onChange('target_audience', e.target.value)} placeholder="Describe the people you want the site to speak to." />
      <TextareaField label="Key services" value={value.key_services} onChange={(e) => onChange('key_services', e.target.value)} placeholder="List the core services or offers the website needs to present clearly." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <TextareaField label="Competitors" value={value.competitors} onChange={(e) => onChange('competitors', e.target.value)} placeholder="Paste competitor names or URLs." />
        <TextareaField label="Tone of voice" value={value.tone_of_voice} onChange={(e) => onChange('tone_of_voice', e.target.value)} placeholder="Straight-talking, premium, approachable, local, corporate, etc." />
      </div>
      <TextareaField label="Primary call to action" value={value.primary_cta} onChange={(e) => onChange('primary_cta', e.target.value)} placeholder="What do you want visitors to do first?" />
    </div>
  )
}
