import { useState } from 'react'
import { api } from './api'

export default function SignIn({ onDone }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await api('auth/start', { method: 'POST', body: { email } })
      if (r.dev_code) setCode(r.dev_code)
      setStep('code')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api('auth/verify', { method: 'POST', body: { email, code } })
      onDone()
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <main className="signin">
      <div className="signin__box">
        <a className="brand" href="https://www.dhwebsiteservices.co.uk/">
          <img src="/dh-logo-icon.png" alt="" /> DH Website Services
        </a>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <h1>Client area</h1>
            <p className="lead">See your website, ask for changes, and find your invoices and documents. Sign in with the email address we set up for you.</p>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
            {error && <p className="error" role="alert">{error}</p>}
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1>Check your email</h1>
            <p className="lead">If <strong>{email}</strong> is set up for the client area, we have sent it a 6-digit code. It works for 10 minutes.</p>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input id="code" className="code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
            {error && <p className="error" role="alert">{error}</p>}
            <p className="hint" style={{ marginTop: 16 }}>
              No email? Check your junk folder, or <button type="button" className="link" onClick={() => { setStep('email'); setCode(''); setError('') }}>try another address</button>.
            </p>
          </form>
        )}

        <div className="signin__help">
          Not set up yet, or stuck? Email <a href="mailto:clients@dhwebsiteservices.co.uk">clients@dhwebsiteservices.co.uk</a> or ring 01443 805303.
        </div>
      </div>
    </main>
  )
}
