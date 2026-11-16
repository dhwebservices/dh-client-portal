import { api, date } from '../api'
import { Uploader, FileGrid } from '../ui'

export default function Files({ data, admin, clientId, reload }) {
  const fromClient = data.files.filter((f) => !f.staff)
  const fromUs = data.files.filter((f) => f.staff)
  const remove = async (f) => { await api(`files/${f.id}`, { method: 'DELETE' }); reload() }

  const theirs = (
    <section className="section">
      <h2>{admin ? 'From the client' : 'From you'}</h2>
      {!admin && <p className="hint" style={{ marginBottom: 12 }}>Logos, photos, menus, price lists: drop them here and we’ll use them on your site. We get an email when you add something.</p>}
      {!admin && <div style={{ marginBottom: 16 }}><Uploader clientId={clientId} announce onDone={reload} /></div>}
      <FileGrid files={fromClient} canRemove={() => true} onRemove={remove} empty={admin ? 'Nothing uploaded yet.' : 'Nothing here yet.'} />
    </section>
  )
  const ours = (
    <section className="section">
      <h2>{admin ? 'From us' : 'From DH'}</h2>
      {admin && <div style={{ marginBottom: 16 }}><Uploader clientId={clientId} announce onDone={reload} label="Add files for the client" /></div>}
      <FileGrid files={fromUs} canRemove={() => admin} onRemove={remove} empty="No files from us yet." />
      {data.documents.length > 0 && (
        <ul className="list" style={{ marginTop: 16 }}>
          {data.documents.map((d) => (
            <li key={d.id} className="row-between">
              <a href={d.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{d.title}</a>
              <span className="meta nowrap">
                {date(d.created_at)}
                {admin && <> · <button className="link" onClick={async () => { await api(`admin/documents/${d.id}`, { method: 'DELETE' }); reload() }}>Remove</button></>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {admin && <DocLink clientId={clientId} reload={reload} />}
    </section>
  )
  return <div className="stack">{admin ? <>{theirs}{ours}</> : <>{ours}{theirs}</>}</div>
}

function DocLink({ clientId, reload }) {
  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    await api('admin/documents', { method: 'POST', body: { client: clientId, title: f.get('title'), url: f.get('url') } }).then(() => { e.target.reset(); reload() }).catch((err) => alertBox(e.target, err.message))
  }
  return (
    <form className="edit" onSubmit={submit}>
      <p className="h3">Or add a link (agreement, Google Drive, etc.)</p>
      <div className="row">
        <div className="field"><label>Name</label><input name="title" placeholder="Website agreement" /></div>
        <div className="field"><label>Link</label><input name="url" placeholder="https://" /></div>
      </div>
      <button className="btn btn--small">Add link</button>
      <p className="error" hidden />
    </form>
  )
}
const alertBox = (form, msg) => { const p = form.querySelector('.error'); p.textContent = msg; p.hidden = false }
