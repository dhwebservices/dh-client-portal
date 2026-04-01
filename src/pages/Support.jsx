import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Send, RefreshCw } from 'lucide-react'
import { Card, Badge, Btn, Modal, Input } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendEmail } from '../utils/email'

const empty = { subject: '', message: '', priority: 'Normal' }
const priorityColor = { Normal: 'var(--sub)', High: 'var(--amber)', Urgent: 'var(--red)' }
const statusVariant = { open: 'open', 'in-progress': 'building', resolved: 'resolved' }

export default function Support() {
  const { user, clientAccount, clientEmail, refreshClientAccount } = useAuth()
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(empty)
  const [saving, setSaving]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailModal, setDetailModal] = useState(false)

  useEffect(() => { if (clientEmail) fetchTickets() }, [clientEmail, clientAccount?.id])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-support-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `client_email=eq.${clientEmail}` }, fetchTickets)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchTickets = async () => {
    setLoading(true)
    const { data } = await supabase.from('support_tickets')
      .select('*').ilike('client_email', clientEmail).order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  const submit = async () => {
    if (!form.subject || !form.message) return
    setSaving(true)
    const resolvedClient = clientAccount || await refreshClientAccount(user?.email)
    const lookupEmail = resolvedClient?.email || clientEmail
    const lookupName = resolvedClient?.name || user?.name
    await supabase.from('support_tickets').insert([{
      ...form, client_email: lookupEmail, client_name: lookupName, status: 'open',
    }])
    // Email clients@ to notify staff
    await sendEmail('support_ticket_raised', {
      clientName:  lookupName,
      clientEmail: lookupEmail,
      subject:     form.subject,
      message:     form.message,
      priority:    form.priority,
    })
    // Client confirmation notification
    await supabase.from('notifications').insert([{
      user_email: lookupEmail,
      title: 'Support query received',
      message: `We’ve logged "${form.subject}" and the team will reply soon.`,
      type: 'info',
      link: '/support',
    }])
    await fetchTickets()
    setSaving(false)
    setModal(false)
    setForm(empty)
  }

  const openDetail = (t) => { setSelected(t); setDetailModal(true) }

  const openCount   = tickets.filter(t => t.status === 'open').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  return (
    <div className="fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Total',    value: tickets.length,  color: 'var(--text)'  },
            { label: 'Open',     value: openCount,       color: 'var(--amber)' },
            { label: 'Resolved', value: resolvedCount,   color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: 'var(--shadow)' }}>
              <span style={{ fontSize: '12px', color: 'var(--sub)' }}>{label}:</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchTickets} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <Btn icon={Plus} onClick={() => setModal(true)}>New Query</Btn>
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading…</div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, background: 'var(--bg-muted)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <MessageSquare size={22} color="var(--faint)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: 'var(--text)' }}>No support queries yet</div>
            <p style={{ fontSize: '13.5px', color: 'var(--sub)', marginBottom: '20px' }}>Got a question? Our team usually responds within one business day.</p>
            <Btn icon={Plus} onClick={() => setModal(true)}>Raise a Query</Btn>
          </div>
        ) : (
          tickets.map((t, i) => (
            <div key={t.id} onClick={() => openDetail(t)} style={{
              padding: '16px 20px', borderBottom: i < tickets.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t.subject}
                    {t.staff_reply && <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: 'var(--green)', padding: '1px 8px', borderRadius: '20px', fontWeight: 600, flexShrink: 0 }}>Replied</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--faint)', marginTop: '4px' }}>{t.created_at?.split('T')[0]}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: priorityColor[t.priority] }}>{t.priority}</span>
                  <Badge variant={statusVariant[t.status] || 'default'}>{t.status}</Badge>
                  <span style={{ fontSize: '16px', color: 'var(--faint)' }}>›</span>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* New ticket modal */}
      <Modal open={modal} onClose={() => { setModal(false); setForm(empty) }} title="Raise a Support Query">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Subject *" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} placeholder="e.g. Question about my website design" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--sub)', fontWeight: 600 }}>Priority</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Normal','High','Urgent'].map(p => (
                <button key={p} onClick={() => setForm(f => ({...f, priority: p}))} style={{
                  padding: '7px 16px', borderRadius: '8px', border: '1px solid',
                  borderColor: form.priority === p ? priorityColor[p] : 'var(--border)',
                  background: form.priority === p ? `${priorityColor[p]}15` : 'transparent',
                  color: form.priority === p ? priorityColor[p] : 'var(--sub)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--sub)', fontWeight: 600 }}>Message *</label>
            <textarea value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))}
              placeholder="Please describe your query in as much detail as possible…" rows={5}
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text)', fontSize: '13.5px', resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(26,86,219,0.06)', borderRadius: '8px', border: '1px solid rgba(26,86,219,0.15)', fontSize: '13px', color: 'var(--sub)' }}>
            💬 We typically respond within one business day. You'll see the reply here in your portal.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Btn variant="ghost" onClick={() => { setModal(false); setForm(empty) }}>Cancel</Btn>
            <Btn icon={Send} onClick={submit} disabled={!form.subject || !form.message || saving}>{saving ? 'Sending…' : 'Submit Query'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title={selected?.subject} width="560px">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Badge variant={statusVariant[selected.status] || 'default'}>{selected.status}</Badge>
              <span style={{ fontSize: '12px', fontWeight: 600, color: priorityColor[selected.priority] }}>{selected.priority} priority</span>
              <span style={{ fontSize: '12px', color: 'var(--faint)' }}>{selected.created_at?.split('T')[0]}</span>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-muted)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sub)', marginBottom: '6px' }}>Your message</div>
              <div style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.6 }}>{selected.message}</div>
            </div>
            {selected.staff_reply ? (
              <div style={{ padding: '14px', background: 'rgba(26,86,219,0.06)', borderRadius: '10px', border: '1px solid rgba(26,86,219,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', marginBottom: '6px' }}>
                  Reply from {selected.replied_by || 'DH Team'} · {selected.replied_at?.split('T')[0]}
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.6 }}>{selected.staff_reply}</div>
              </div>
            ) : (
              <div style={{ padding: '14px', background: 'var(--bg-muted)', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--sub)', fontSize: '13px' }}>
                ⏳ Awaiting reply from our team — we'll respond within one business day.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
