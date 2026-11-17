import { useEffect, useState } from 'react'
import { api } from './api'
import SignIn from './SignIn'
import ClientApp from './client/ClientApp'
import Staff from './staff/Staff'

export function Bar({ me, onSignOut }) {
  return (
    <header className="bar">
      <div className="wrap bar__in">
        <a className="brand" href="https://www.dhwebsiteservices.co.uk/">
          <img src="/dh-logo-icon.png" alt="" /> DH Website Services
        </a>
        {me && (
          <div className="bar__who">
            <span className="who-email">{me.email}</span>
            <button className="link" onClick={onSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}

export default function App() {
  const [me, setMe] = useState(undefined)

  const load = () => api('me').then(setMe).catch(() => setMe(null))
  useEffect(() => { load() }, [])

  const signOut = async () => {
    await api('auth/signout', { method: 'POST' }).catch(() => {})
    setMe(null)
  }

  if (me === undefined) return null
  if (!me) return <SignIn onDone={load} />

  return (
    <div className="shell">
      <aside className="side">
        <a className="side__brand" href="https://www.dhwebsiteservices.co.uk/">
          <img src="/dh-logo-icon.png" alt="" />
          <span>DH Website Services<small>{me.admin ? 'Staff' : 'Client area'}</small></span>
        </a>
        <div id="side-nav" className="side__slot" />
        <div className="side__foot">
          {!me.admin && (
            <div className="side__help">
              <span className="side__label">Talk to David or Jack</span>
              <a href="tel:+441443805303">01443 805303</a>
              <a href="mailto:clients@dhwebsiteservices.co.uk">clients@dhwebsiteservices.co.uk</a>
            </div>
          )}
          <div className="side__who">
            <span className="who-email">{me.email}</span>
            <button className="link" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main page">
        {me.admin ? <Staff me={me} /> : <ClientApp me={me} />}
      </main>
    </div>
  )
}
