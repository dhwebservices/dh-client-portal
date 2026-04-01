import { useState, useEffect } from 'react'
import { FileText, Download, RefreshCw, File } from 'lucide-react'
import { Card } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const fileIcon = (name) => {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (['pdf'].includes(ext))          return { icon: '📄', color: '#EF4444' }
  if (['doc','docx'].includes(ext))   return { icon: '📝', color: '#1A56DB' }
  if (['xls','xlsx'].includes(ext))   return { icon: '📊', color: '#10B981' }
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { icon: '🖼️', color: '#7C3AED' }
  if (['zip','rar'].includes(ext))    return { icon: '📦', color: '#F59E0B' }
  return { icon: '📁', color: 'var(--sub)' }
}

export default function Documents() {
  const { clientEmail } = useAuth()
  const [docs, setDocs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (clientEmail) fetchDocs() }, [clientEmail])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-documents-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_documents', filter: `client_email=eq.${clientEmail}` }, fetchDocs)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchDocs = async () => {
    setLoading(true)
    const { data } = await supabase.from('client_documents')
      .select('*').ilike('client_email', clientEmail).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  return (
    <div className="fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--sub)' }}>
          {docs.length > 0 ? `${docs.length} document${docs.length !== 1 ? 's' : ''} shared with you` : ''}
        </div>
        <button onClick={fetchDocs} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading…</div>
      ) : docs.length === 0 ? (
        <Card>
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, background: 'var(--bg-muted)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <File size={22} color="var(--faint)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: 'var(--text)' }}>No documents yet</div>
            <p style={{ fontSize: '13.5px', color: 'var(--sub)' }}>Documents shared with you by our team — contracts, NDAs, design files — will appear here.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {docs.map(doc => {
            const { icon, color } = fileIcon(doc.file_name || doc.name)
            return (
            <div key={doc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '10px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{doc.file_name || doc.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--sub)' }}>
                    {doc.created_at?.split('T')[0]}
                    {doc.description && ` · ${doc.description}`}
                  </div>
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    background: 'var(--bg-muted)', border: '1px solid var(--border)',
                    borderRadius: '8px', fontSize: '13px', color: 'var(--accent)',
                    fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--border)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                  >
                    <Download size={13} /> Download
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
