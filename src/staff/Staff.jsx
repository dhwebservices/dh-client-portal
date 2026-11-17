import { useEffect, useState } from 'react'
import { api } from '../api'
import { SideNav, useHashTab } from '../ui'
import ClientApp from '../client/ClientApp'
import Inbox from './Inbox'
import Clients from './Clients'
import Activity from './Activity'
import Team from './Team'

const clientInHash = () => (location.hash.match(/^#c\/([\w-]+)/) || [])[1] || null

export default function Staff({ me }) {
  const [clientId, setClientId] = useState(clientInHash)
  const [tab, go] = useHashTab('', ['inbox', 'clients', 'activity', 'team'], 'inbox')
  const [counts, setCounts] = useState({})
  useEffect(() => {
    const on = () => setClientId(clientInHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { if (!clientId) api('admin/inbox').then((r) => setCounts({ inbox: r.requests.length + r.approvals.filter((a) => a.status === 'changes').length })).catch(() => {}) }, [clientId, tab])

  const open = (id, sub = 'home') => { location.hash = `c/${id}/${sub}`; setClientId(id); scrollTo(0, 0) }
  if (clientId) return <ClientApp me={me} clientId={clientId} admin onBack={() => { location.hash = 'clients'; setClientId(null) }} />

  return (
    <>
      <SideNav label="Staff" title="DH team" sub="Signed in as staff" tab={tab} go={go} tabs={[['inbox', 'Inbox', counts.inbox || null], ['clients', 'Clients'], ['activity', 'Activity'], ['team', 'Team']]} />
      {tab === 'inbox' && <Inbox open={open} />}
      {tab === 'clients' && <Clients open={open} />}
      {tab === 'activity' && <Activity open={open} />}
      {tab === 'team' && <><div className="page__head"><h1>Team</h1><p>Who can sign in as staff.</p></div><Team me={me} /></>}
    </>
  )
}
