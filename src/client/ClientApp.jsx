import { useEffect, useState } from 'react'
import { api } from '../api'
import { Tabs, useHashTab } from '../ui'
import Home from './Home'
import Website from './Website'
import Requests from './Requests'
import Files from './Files'
import Project from './Project'
import Billing from './Billing'
import Help from './Help'
import Settings from './Settings'
import Notes from './Notes'

/**
 * Everything for one client. Clients see it for their own business; staff
 * see the same tabs with edit controls (admin), plus private notes.
 */
export default function ClientApp({ me, clientId, admin = false, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = () => api(`overview${clientId ? `?client=${clientId}` : ''}`).then(setData).catch((e) => setError(e.message))
  useEffect(() => { setData(null); load() }, [clientId])

  const keys = ['home', 'website', 'requests', 'files', 'project', 'billing', ...(admin ? ['notes'] : ['help', 'settings'])]
  const [tab, go] = useHashTab(admin ? `c/${clientId}/` : '', keys, 'home')

  if (error) return <p className="error">{error}</p>
  if (!data) return <p className="hint">Loading…</p>

  const { client, requests, invoices, approvals } = data
  const openReq = requests.filter((r) => r.status !== 'done').length
  const due = invoices.filter((i) => i.status === 'due').length
  const pending = approvals.filter((a) => a.status === 'pending').length
  const tabs = [
    ['home', 'Home'],
    ['website', 'Website'],
    ['requests', 'Requests', openReq || null],
    ['files', 'Files'],
    ['project', 'Project', pending || null],
    ['billing', 'Billing', due || null],
    ...(admin ? [['notes', 'Access & notes']] : [['help', 'Help'], ['settings', 'Settings']]),
  ]
  const props = { me, data, admin, clientId: client.id, reload: load, go }

  return (
    <>
      {onBack && <button className="link back" onClick={onBack}>← All clients</button>}
      <div className="page__head">
        <h1>{client.business}</h1>
        {admin && <p>Staff view. Clients see these same tabs, without the edit controls and notes.</p>}
      </div>
      <Tabs tabs={tabs} tab={tab} go={go} label={client.business} />
      {tab === 'home' && <Home {...props} />}
      {tab === 'website' && <Website {...props} />}
      {tab === 'requests' && <Requests {...props} />}
      {tab === 'files' && <Files {...props} />}
      {tab === 'project' && <Project {...props} />}
      {tab === 'billing' && <Billing {...props} />}
      {tab === 'help' && <Help {...props} />}
      {tab === 'settings' && <Settings {...props} />}
      {tab === 'notes' && <Notes {...props} />}
    </>
  )
}
