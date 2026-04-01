import { useState, useEffect } from 'react'
import { CreditCard, Check } from 'lucide-react'
import { Card, Badge } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Plan() {
  const { clientAccount, clientEmail, refreshClientAccount } = useAuth()
  const [client, setClient] = useState(clientAccount)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!clientEmail) return
      setLoading(true)
      const resolved = clientAccount || await refreshClientAccount(clientEmail)
      if (!cancelled) {
        setClient(resolved)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [clientEmail, clientAccount?.id])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-plan-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_accounts', filter: `email=eq.${clientEmail}` }, async () => {
        const refreshed = await refreshClientAccount(clientEmail)
        setClient(refreshed)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [clientEmail])

  const planFeatures = {
    'Monthly Starter': ['1-page website', 'Mobile responsive', 'Contact form', 'Basic SEO setup', 'Monthly updates'],
    'Monthly Pro':     ['Up to 5 pages', 'Mobile responsive', 'Contact form', 'Full SEO optimisation', 'Unlimited updates', 'Google Analytics', 'Priority support'],
    'Website Build':   ['Custom design', 'Up to 10 pages', 'Mobile responsive', 'Full SEO setup', 'Contact forms', 'Google Analytics', 'Social media integration'],
    'SEO Package':     ['Keyword research', 'On-page SEO', 'Monthly reporting', 'Google Search Console', 'Backlink building'],
  }

  const features = planFeatures[client?.plan] || []

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading…</div>

  return (
    <div className="fade">
      {client ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(26,86,219,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={22} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>{client.plan}</div>
                <div style={{ fontSize: '13px', color: 'var(--sub)' }}>Your current plan</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { label: 'Monthly Value', value: `£${client.value || 0}/mo` },
                { label: 'Status',        value: <Badge variant={client.status}>{client.status}</Badge> },
                { label: 'Invoice',       value: <Badge variant={client.invoice_paid ? 'paid' : 'unpaid'}>{client.invoice_paid ? 'Paid' : 'Pending'}</Badge> },
                { label: 'Client Since',  value: client.joined || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13.5px', color: 'var(--sub)' }}>{label}</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>What's included</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={11} color="var(--green)" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '13.5px', color: 'var(--text)' }}>{f}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ gridColumn: '1 / -1', background: 'rgba(26,86,219,0.04)', borderColor: 'rgba(26,86,219,0.15)' }}>
            <p style={{ fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.6 }}>
              Want to upgrade your plan or discuss your options? Get in touch with us at{' '}
              <a href="mailto:clients@dhwebsiteservices.co.uk" style={{ color: 'var(--accent)', fontWeight: 500 }}>clients@dhwebsiteservices.co.uk</a>
            </p>
          </Card>
        </div>
      ) : (
        <Card>
          <p style={{ color: 'var(--sub)', fontSize: '14px' }}>No plan details found. Please contact clients@dhwebsiteservices.co.uk</p>
        </Card>
      )}
    </div>
  )
}
