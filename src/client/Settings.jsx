import { api } from '../api'
import { Saver, useForm } from '../ui'

export default function Settings({ me }) {
  const [form, set] = useForm({ name: me.name || '', notify: me.notify !== false })
  return (
    <div className="stack">
      <section className="section">
        <h2>Your settings</h2>
        <p className="meta" style={{ marginBottom: 14 }}>Signed in as {me.email}</p>
        <Saver onSave={() => api('me/settings', { method: 'PATCH', body: form })}>
          <div className="field"><label htmlFor="nm">Your name</label><input id="nm" value={form.name} onChange={set('name')} /></div>
          <label className="check">
            <input type="checkbox" checked={form.notify} onChange={set('notify')} />
            <span>Email me when there’s something new: updates, replies, invoices, and designs to approve</span>
          </label>
        </Saver>
      </section>
    </div>
  )
}
