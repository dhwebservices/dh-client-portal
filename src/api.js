// Every write sends x-dhc: 1, which the API requires (a cross-site form can't).
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-dhc': '1' },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.status = res.status
    throw err
  }
  return data
}

export const money = (pence) => `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const date = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const ymd = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export const fileUrl = (id, download = false) => `/api/files/${id}${download ? '?download=1' : ''}`
export const bytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
export const ago = (ms) => {
  const s = (Date.now() - ms) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`
  return date(ms)
}

// Upload one file (raw body), reporting progress. Resolves to { id, name, ... }.
export function upload(file, clientId, { announce = false, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) return reject(new Error(`${file.name} is over 10 MB. Send us a link for big files.`))
    const x = new XMLHttpRequest()
    const qs = new URLSearchParams({ ...(clientId ? { client: clientId } : {}), ...(announce ? { announce: '1' } : {}) })
    x.open('POST', `/api/files?${qs}`)
    x.setRequestHeader('x-dhc', '1')
    x.setRequestHeader('x-file-name', encodeURIComponent(file.name))
    if (file.type) x.setRequestHeader('content-type', file.type)
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    x.onload = () => {
      let d = {}
      try { d = JSON.parse(x.responseText) } catch { /* empty */ }
      x.status < 300 ? resolve(d.file) : reject(new Error(d.error || 'Upload failed. Please try again.'))
    }
    x.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
    x.send(file)
  })
}
