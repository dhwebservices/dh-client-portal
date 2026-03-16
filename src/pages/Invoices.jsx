import { useState, useEffect } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { Card, Badge } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Invoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { if (user?.email) fetchInvoices() }, [user])

  const fetchInvoices = async () => {
    setLoading(true)
    const { data } = await supabase.from('client_invoices')
      .select('*').ilike('client_email', user.email).order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  const unpaid = invoices.filter(i => i.status === 'unpaid')
  const paid   = invoices.filter(i => i.status === 'paid')
  const total  = unpaid.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div className="fade">
      {/* Summary */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Invoices', value: invoices.length,    color: 'var(--text)'  },
          { label: 'Paid',           value: paid.length,        color: 'var(--green)' },
          { label: 'Outstanding',    value: unpaid.length,      color: 'var(--amber)' },
          { label: 'Amount Due',     value: `£${total.toFixed(2)}`, color: unpaid.length > 0 ? 'var(--amber)' : 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 18px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--sub)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Outstanding invoices first */}
      {unpaid.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Outstanding</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unpaid.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
          </div>
        </div>
      )}

      {/* Paid invoices */}
      {paid.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Paid</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paid.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
          </div>
        </div>
      )}

      {invoices.length === 0 && !loading && (
        <Card>
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, background: 'var(--bg-muted)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FileText size={22} color="var(--faint)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: 'var(--text)' }}>No invoices yet</div>
            <p style={{ fontSize: '13.5px', color: 'var(--sub)' }}>Invoices will appear here once issued by your account manager.</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function InvoiceRow({ invoice }) {
  const unpaid = invoice.status === 'unpaid'
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${unpaid ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
      borderRadius: '12px', padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '10px', background: unpaid ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={18} color={unpaid ? 'var(--amber)' : 'var(--green)'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>
          {invoice.description || `Invoice #${invoice.invoice_number}`}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sub)' }}>
          {invoice.due_date ? `Due ${invoice.due_date}` : invoice.created_at?.split('T')[0]}
          {invoice.invoice_number && ` · #${invoice.invoice_number}`}
        </div>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
        £{Number(invoice.amount || 0).toFixed(2)}
      </div>
      <div>
        {unpaid && invoice.stripe_link ? (
          <a href={invoice.stripe_link} target="_blank" rel="noreferrer" style={{
            display: 'inline-block', padding: '9px 20px',
            background: 'var(--grad)', color: '#fff', borderRadius: '9px',
            fontSize: '13px', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(26,86,219,0.3)',
          }}>Pay Now →</a>
        ) : unpaid ? (
          <Badge variant="pending">Awaiting Link</Badge>
        ) : (
          <Badge variant="paid">✓ Paid</Badge>
        )}
      </div>
    </div>
  )
}
