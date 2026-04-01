const EMAIL_WORKER_URL = 'https://dh-email-worker.aged-silence-66a7.workers.dev'

export async function sendEmail(type, data) {
  try {
    const res = await fetch(EMAIL_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    })
    const result = await res.json()
    const success = Boolean(result?.success ?? result?.ok)
    if (!success) console.error('Email error:', result.error || result)
    return success
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}
