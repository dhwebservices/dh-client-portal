import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const eventTypes = {
  invoice_issued:    { icon: '📄', label: 'Invoice Issued',         color: '#7C3AED' },
  invoice_paid:      { icon: '✅', label: 'Invoice Paid',           color: '#10B981' },
  status_updated:    { icon: '🔄', label: 'Website Status Updated', color: '#1A56DB' },
  update_posted:     { icon: '📢', label: 'Update from Team',       color: '#1A56DB' },
  document_uploaded: { icon: '📁', label: 'Document Added',         color: '#F59E0B' },
  contract_issued:   { icon: '✍️', label: 'Contract Issued',        color: '#1A56DB' },
  contract_signed:   { icon: '✅', label: 'Contract Signed',        color: '#10B981' },
  support_raised:    { icon: '💬', label: 'Support Query Raised',   color: '#F59E0B' },
  support_replied:   { icon: '✉️', label: 'Support Reply',          color: '#10B981' },
  account_created:   { icon: '🎉', label: 'Account Created',        color: '#10B981' },
}

function groupByDate(events) {
  const groups = {}
  events.forEach(e => {
    const date = e.created_at?.split('T')[0] || 'Unknown'
    const label = (() => {
      const d = new Date(date)
      const today = new Date()
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
      if (d.toDateString() === today.toDateString()) return 'Today'
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    })()
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })
  return groups
}

export default function Activity() {
  const { clientEmail } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (clientEmail) fetchActivity() }, [clientEmail])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-activity-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_activity', filter: `client_email=eq.${clientEmail}` }, fetchActivity)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchActivity = async () => {
    setLoading(true)
    const { data } = await supabase.from('client_activity')
      .select('*').ilike('client_email', clientEmail)
      .order('created_at', { ascending: false }).limit(100)
    setEvents(data || [])
    setLoading(false)
  }

  const grouped = groupByDate(events)

  return (
    <div className="fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--sub)' }}>
          {events.length > 0 ? `${events.length} events on your account` : ''}
        </div>
        <button onClick={fetchActivity} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading activity…</div>
      ) : events.length === 0 ? (
        <Card>
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>📋</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: 'var(--text)' }}>No activity yet</div>
            <p style={{ fontSize: '13.5px', color: 'var(--sub)' }}>Your account activity will appear here — invoices, website updates, support replies and more.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>{dateLabel}</div>
              <Card style={{ padding: 0 }}>
                {items.map((event, i) => {
                  const eventKey = event.event_type || event.type
                  const type = eventTypes[eventKey] || { icon: '📋', label: eventKey || 'activity', color: 'var(--sub)' }
                  return (
                    <div key={event.id} style={{
                      display: 'flex', gap: '14px', padding: '14px 18px',
                      borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                        background: `${type.color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
                      }}>{type.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{event.title || type.label}</div>
                        {event.description && <div style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: 1.5 }}>{event.description}</div>}
                        {event.amount && <div style={{ fontSize: '13px', fontWeight: 700, color: type.color, marginTop: '4px' }}>£{Number(event.amount).toFixed(2)}</div>}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--faint)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
