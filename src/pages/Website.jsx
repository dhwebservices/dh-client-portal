import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const STAGES = [
  { key: 'accepted',    label: 'Order Accepted',   desc: 'Your order has been received and confirmed.',              icon: '✓'  },
  { key: 'building',    label: 'Being Built',       desc: 'Our team is actively building your website.',             icon: '⚙️' },
  { key: 'nearly_there',label: 'Nearly There',      desc: 'Final touches being applied — almost ready for review.',  icon: '🔧' },
  { key: 'ready',       label: 'Ready to Launch',   desc: 'Your website is complete and ready to go live.',          icon: '🚀' },
]

export default function Website() {
  const { user, clientAccount, clientEmail, refreshClientAccount } = useAuth()
  const [client, setClient]   = useState(clientAccount)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (clientEmail) fetchData() }, [clientEmail, clientAccount?.id])

  // Real-time: refresh when deployment_updates or client_accounts change
  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase.channel('website-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deployment_updates', filter: `client_email=eq.${clientEmail}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_accounts', filter: `email=eq.${clientEmail}` }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchData = async () => {
    setLoading(true)
    const clientData = clientAccount || await refreshClientAccount(user?.email)
    const lookupEmail = clientData?.email || clientEmail
    const { data: updatesData } = await supabase.from('deployment_updates')
      .select('*').ilike('client_email', lookupEmail).order('created_at', { ascending: false })
    
    setClient(clientData)
    setUpdates(updatesData || [])
    setLoading(false)
  }

  const currentStage = client?.deployment_status || 'accepted'
  const currentIndex = STAGES.findIndex(s => s.key === currentStage)

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading…</div>

  return (
    <div className="fade">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={fetchData} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Progress tracker */}
      <Card style={{ marginBottom: '20px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '24px' }}>Website Progress</h3>
        <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
          {/* Progress line */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', height: '2px', background: 'var(--border)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: '20px', left: '20px', height: '2px', background: 'var(--accent)', zIndex: 1, width: `${currentIndex === 0 ? 0 : currentIndex === STAGES.length - 1 ? 100 : (currentIndex / (STAGES.length - 1)) * 100}%`, transition: 'width 0.5s ease' }} />

          {STAGES.map((stage, i) => {
            const done    = i < currentIndex
            const current = i === currentIndex
            return (
              <div key={stage.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 2 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'var(--accent)' : current ? 'var(--grad)' : 'var(--bg-muted)',
                  border: `2px solid ${done || current ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: current ? '0 0 0 4px rgba(26,86,219,0.15)' : 'none',
                  transition: 'all 0.3s',
                }}>{done ? '✓' : stage.icon}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: current ? 700 : 500, color: current ? 'var(--text)' : done ? 'var(--sub)' : 'var(--faint)' }}>{stage.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Current stage description */}
        <div style={{ marginTop: '24px', padding: '14px 16px', background: 'rgba(26,86,219,0.06)', borderRadius: '10px', border: '1px solid rgba(26,86,219,0.15)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>Current Stage: {STAGES[currentIndex]?.label}</div>
          <div style={{ fontSize: '13px', color: 'var(--sub)' }}>{STAGES[currentIndex]?.desc}</div>
        </div>
      </Card>

      {/* Updates timeline */}
      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Team Updates</h3>
        {updates.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--sub)', fontSize: '13.5px' }}>
            Your team will post progress updates here as your website is being built.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {updates.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: i < updates.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', marginTop: '5px' }} />
                  {i < updates.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: '4px' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < updates.length - 1 ? '8px' : '0' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{u.title}</div>
                  {u.message && <div style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: 1.5, marginBottom: '4px' }}>{u.message}</div>}
                  <div style={{ fontSize: '11.5px', color: 'var(--faint)' }}>{new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
