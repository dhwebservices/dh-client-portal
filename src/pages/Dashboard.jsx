import { useState, useEffect } from 'react'
import { Globe, FileText, MessageSquare, CreditCard, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, Badge, StatusTracker } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, clientAccount, clientEmail, refreshClientAccount } = useAuth()
  const nav = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [tickets, setTickets]   = useState([])
  const [updates, setUpdates]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (clientEmail) fetchAll()
  }, [clientEmail, clientAccount?.id])

  // Real-time updates
  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_accounts',    filter: `email=eq.${clientEmail}` },        fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_invoices',    filter: `client_email=eq.${clientEmail}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets',    filter: `client_email=eq.${clientEmail}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deployment_updates', filter: `client_email=eq.${clientEmail}` }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const fetchAll = async () => {
    setLoading(true)
    const resolvedClient = clientAccount || await refreshClientAccount(user?.email)
    const lookupEmail = resolvedClient?.email || clientEmail

    const [{ data: inv }, { data: tick }, { data: upd }] = await Promise.all([
      supabase.from('client_invoices').select('*').ilike('client_email', lookupEmail).order('created_at', { ascending: false }).limit(3),
      supabase.from('support_tickets').select('*').ilike('client_email', lookupEmail).eq('status', 'open').limit(3),
      supabase.from('deployment_updates').select('*').ilike('client_email', lookupEmail).order('created_at', { ascending: false }).limit(3),
    ])
    setInvoices(inv || [])
    setTickets(tick || [])
    setUpdates(upd || [])
    setLoading(false)
  }

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid')

  const quickLinks = [
    { icon: CreditCard,    label: 'My Plan',   sub: clientAccount?.plan || 'View your package',  to: '/plan',     color: 'var(--accent)'  },
    { icon: FileText,      label: 'Invoices',  sub: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} outstanding` : 'All paid ✓', to: '/invoices', color: '#7C3AED', alert: unpaidInvoices.length > 0 },
    { icon: Globe,         label: 'My Website',sub: clientAccount?.deployment_status?.replace(/_/g,' ') || 'View progress', to: '/website', color: 'var(--green)' },
    { icon: MessageSquare, label: 'Support',   sub: tickets.length > 0 ? `${tickets.length} open ticket${tickets.length > 1 ? 's' : ''}` : 'Get help', to: '/support', color: 'var(--amber)', alert: tickets.length > 0 },
  ]

  return (
    <div className="fade">
      {/* Welcome banner */}
      <div style={{
        background: 'var(--grad)', borderRadius: '16px', padding: '28px 32px',
        marginBottom: '24px', color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '60px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Welcome back</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.85 }}>
          {clientAccount ? `You're on the ${clientAccount.plan} plan.` : 'Your DH Website Services client portal.'}
        </p>
      </div>

      {/* Unpaid invoice alert */}
      {unpaidInvoices.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <AlertCircle size={18} color="var(--amber)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--amber)' }}>Payment Required</div>
            <div style={{ fontSize: '13px', color: 'var(--sub)' }}>You have {unpaidInvoices.length} outstanding invoice{unpaidInvoices.length > 1 ? 's' : ''} — total £{unpaidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0).toFixed(2)}</div>
          </div>
          <button onClick={() => nav('/invoices')} style={{ padding: '7px 16px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Pay Now</button>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {quickLinks.map(({ icon: Icon, label, sub, to, color, alert }) => (
          <div key={label} onClick={() => nav(to)} style={{
            background: 'var(--bg-card)', border: `1px solid ${alert ? color + '40' : 'var(--border)'}`,
            borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: 'var(--shadow)', position: 'relative',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
          >
            {alert && <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', background: color, borderRadius: '50%' }} />}
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <Icon size={18} color={color} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '12px', color: alert ? color : 'var(--sub)', fontWeight: alert ? 600 : 400 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Website status */}
        {clientAccount && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Website Progress</h3>
              <button onClick={() => nav('/website')} style={{ background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                Details <ChevronRight size={14} />
              </button>
            </div>
            <StatusTracker status={clientAccount.deployment_status || 'accepted'} />
          </Card>
        )}

        {/* Recent updates */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Latest Updates</h3>
            <button onClick={() => nav('/website')} style={{ background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>All →</button>
          </div>
          {updates.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--sub)', fontSize: '13px' }}>No updates yet — your team will post progress notes here.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {updates.map(u => (
                <div key={u.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{u.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{u.created_at?.split('T')[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <Card style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Recent Invoices</h3>
            <button onClick={() => nav('/invoices')} style={{ background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {invoices.map((inv, i) => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text)' }}>{inv.description || `Invoice #${inv.invoice_number}`}</div>
                  <div style={{ fontSize: '12px', color: 'var(--sub)' }}>{inv.due_date || inv.created_at?.split('T')[0]}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>£{Number(inv.amount || 0).toFixed(2)}</span>
                  {inv.status === 'unpaid' && inv.stripe_link ? (
                    <a href={inv.stripe_link} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', background: 'var(--accent)', color: '#fff', borderRadius: '7px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Pay</a>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>✓ Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Help */}
      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '10px' }}>Need help?</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.6, marginBottom: '14px' }}>Our team is on hand to help with any questions about your website, plan, or invoices.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="mailto:clients@dhwebsiteservices.co.uk" style={{ padding: '8px 16px', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>📧 clients@dhwebsiteservices.co.uk</a>
          <button onClick={() => nav('/support')} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Raise a Support Query</button>
        </div>
      </Card>
    </div>
  )
}
