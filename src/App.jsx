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
    <>
      <Bar me={me} onSignOut={signOut} />
      <main className="wrap page">
        {me.admin ? <Staff me={me} /> : <ClientApp me={me} />}
      </main>
    </>
  )
}
