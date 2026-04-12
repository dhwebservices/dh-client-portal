import { Input } from '../UI'

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

export default function SectionBusinessDetails({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Input label="Business name" value={value.business_name} onChange={(e) => onChange('business_name', e.target.value)} placeholder="David Hooper Home Limited" />
        <Input label="Primary contact" value={value.primary_contact} onChange={(e) => onChange('primary_contact', e.target.value)} placeholder="David Hooper" />
        <Input label="Phone" value={value.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="02920 024 218" />
        <Input label="Service areas" value={value.service_areas} onChange={(e) => onChange('service_areas', e.target.value)} placeholder="Cardiff, South Wales, UK" />
      </div>
      <TextareaField label="Business address" value={value.address} onChange={(e) => onChange('address', e.target.value)} placeholder="If the website should show an address, add it here." />
      <TextareaField label="Opening hours" value={value.opening_hours} onChange={(e) => onChange('opening_hours', e.target.value)} placeholder="Mon-Fri 9am-5pm, weekends by appointment, or anything clients should know." />
    </div>
  )
}
