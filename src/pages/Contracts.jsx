import { useEffect, useMemo, useState } from 'react'
import { FileSignature, FileText, RefreshCw, Download, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useMsal } from '@azure/msal-react'
import { Card, Badge, Btn, Modal } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  buildClientContractFileName,
  buildClientContractKey,
  buildClientContractPdfBlob,
  createClientContract,
  createPortalSignature,
  formatCurrencyAmount,
  getClientContractStatusLabel,
  renderClientContractHtml,
} from '../utils/clientContracts'

function contractFromRow(row = {}) {
  return createClientContract({
    id: String(row.key || '').replace('client_contract:', ''),
    ...(row.value?.value ?? row.value ?? {}),
  })
}

export default function Contracts() {
  const { clientEmail, clientAccount } = useAuth()
  const { accounts } = useMsal()
  const user = accounts[0]
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [signingId, setSigningId] = useState('')

  useEffect(() => {
    if (!clientEmail) return
    loadContracts()
  }, [clientEmail, clientAccount?.id])

  useEffect(() => {
    if (!clientEmail) return
    const channel = supabase
      .channel(`client-contracts-${clientEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_settings' }, loadContracts)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [clientEmail, clientAccount?.id])

  async function loadContracts() {
    if (!clientEmail) return
    setLoading(true)
    const { data } = await supabase.from('portal_settings').select('key,value').like('key', 'client_contract:%')
    const rows = (data || [])
      .map(contractFromRow)
      .filter((contract) => {
        const matchesEmail = contract.client_email === String(clientEmail || '').toLowerCase()
        const matchesAccount = clientAccount?.id && contract.client_account_id && contract.client_account_id === clientAccount.id
        return matchesEmail || matchesAccount
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    setContracts(rows)
    setLoading(false)
  }

  const pendingContracts = useMemo(
    () => contracts.filter((contract) => contract.status === 'awaiting_client_signature'),
    [contracts],
  )
  const completedContracts = useMemo(
    () => contracts.filter((contract) => contract.status === 'completed'),
    [contracts],
  )

  async function signContract(contract) {
    if (!contract?.id || !clientEmail) return
    setSigningId(contract.id)
    try {
      const clientSignature = createPortalSignature({
        name: user?.name || clientAccount?.contact || clientAccount?.name || contract.client_name,
        title: 'Authorised client contact',
        email: clientEmail,
      })
      const nextContract = createClientContract({
        ...contract,
        client_signature: clientSignature,
        status: 'completed',
        client_signed_at: clientSignature.signed_at,
        completed_at: clientSignature.signed_at,
        updated_at: new Date().toISOString(),
      })

      let finalDocumentUrl = contract.final_document_url
      let finalDocumentPath = contract.final_document_path

      try {
        const pdfBlob = await buildClientContractPdfBlob(nextContract)
        const filePath = `client-contracts/${contract.id}/${Date.now()}-${buildClientContractFileName(nextContract)}`
        const { error: uploadError } = await supabase.storage.from('hr-documents').upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('hr-documents').getPublicUrl(filePath)
        finalDocumentUrl = publicUrlData.publicUrl
        finalDocumentPath = filePath
      } catch {}

      const finalContract = createClientContract({
        ...nextContract,
        final_document_url: finalDocumentUrl || '',
        final_document_path: finalDocumentPath || '',
      })

      await supabase.from('portal_settings').upsert({
        key: buildClientContractKey(finalContract.id),
        value: { value: finalContract },
      }, { onConflict: 'key' })

      if (finalContract.final_document_url) {
        await supabase.from('client_documents').insert([{
          client_email: finalContract.client_email,
          name: `${finalContract.template_name || 'Signed contract'} — ${finalContract.service_name || finalContract.company_name || ''}`.trim(),
          type: 'Contract',
          description: 'Signed client agreement',
          file_name: buildClientContractFileName(finalContract),
          file_url: finalContract.final_document_url,
          file_path: finalContract.final_document_path,
          created_at: new Date().toISOString(),
        }]).catch(() => {})
      }

      await Promise.allSettled([
        supabase.from('client_activity').insert([{
          client_email: finalContract.client_email,
          event_type: 'contract_signed',
          title: finalContract.template_name || 'Contract signed',
          description: `${finalContract.service_name || 'Agreement'} has been signed in the client portal.`,
          created_at: new Date().toISOString(),
        }]),
        finalContract.issued_by_email
          ? supabase.from('notifications').insert([{
              user_email: finalContract.issued_by_email,
              title: 'Client contract signed',
              message: `${finalContract.company_name || finalContract.client_name} signed ${finalContract.template_name || 'their contract'}.`,
              type: 'success',
              link: `/client-mgmt`,
              created_at: new Date().toISOString(),
            }])
          : Promise.resolve(),
      ])

      setSelected(finalContract)
      await loadContracts()
    } finally {
      setSigningId('')
    }
  }

  return (
    <div className="fade">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>{pendingContracts.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>Awaiting your signature</div>
        </Card>
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>{completedContracts.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>Signed agreements</div>
        </Card>
        <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Your contract inbox</div>
            <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px', lineHeight: 1.6 }}>Review active agreements, confirm pricing and payment terms, and sign digitally from here.</div>
          </div>
          <Btn variant="secondary" size="sm" icon={RefreshCw} onClick={loadContracts}>Refresh</Btn>
        </Card>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>Loading contracts…</div>
      ) : !contracts.length ? (
        <Card>
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileSignature size={24} color="var(--faint)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>No contracts yet</div>
            <div style={{ maxWidth: 520, margin: '0 auto', fontSize: '13.5px', color: 'var(--sub)', lineHeight: 1.7 }}>
              When our team issues an agreement for your account, it will appear here with the pricing, payment terms, and a digital signature step.
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {contracts.map((contract) => {
            const [statusLabel, variant] = getClientContractStatusLabel(contract.status)
            return (
              <Card key={contract.id} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{contract.template_name || 'Client contract'}</div>
                      <Badge variant={variant}>{statusLabel}</Badge>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--sub)', lineHeight: 1.7 }}>
                      {contract.service_name || 'Service agreement'}
                      {contract.company_name ? ` · ${contract.company_name}` : ''}
                      {contract.issued_at ? ` · Issued ${new Date(contract.issued_at).toLocaleDateString('en-GB')}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {contract.price_amount ? <Badge variant="default">{formatCurrencyAmount(contract.price_amount, contract.currency) || contract.price_amount}</Badge> : null}
                      {contract.paid_in_full ? <Badge variant="paid">Paid in full</Badge> : null}
                      {contract.payment_terms ? <Badge variant="default">{contract.payment_terms}</Badge> : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {contract.final_document_url ? (
                      <Btn variant="secondary" size="sm" icon={Download} onClick={() => window.open(contract.final_document_url, '_blank', 'noopener,noreferrer')}>
                        Download signed PDF
                      </Btn>
                    ) : null}
                    {contract.template_reference_file_url ? (
                      <Btn variant="ghost" size="sm" icon={ExternalLink} onClick={() => window.open(contract.template_reference_file_url, '_blank', 'noopener,noreferrer')}>
                        Reference file
                      </Btn>
                    ) : null}
                    <Btn variant="primary" size="sm" icon={FileText} onClick={() => setSelected(contract)}>
                      {contract.status === 'awaiting_client_signature' ? 'Review and sign' : 'Open'}
                    </Btn>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.template_name || 'Contract'} width="980px">
        {selected ? (
          <div style={{ display: 'grid', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <Card style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Service</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{selected.service_name || 'Service agreement'}</div>
              </Card>
              <Card style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Amount due</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{formatCurrencyAmount(selected.price_amount, selected.currency) || 'Not listed'}</div>
              </Card>
              <Card style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Payment terms</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{selected.paid_in_full ? 'Paid in full' : (selected.payment_terms || 'As agreed')}</div>
              </Card>
            </div>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>Agreement preview</div>
                <div style={{ fontSize: '12px', color: 'var(--sub)', marginTop: '6px' }}>
                  Please review the contract details carefully before signing. Your portal account and timestamp will be recorded as the digital signature.
                </div>
              </div>
              <div style={{ padding: '24px', background: '#f8f6f1', maxHeight: '55vh', overflowY: 'auto' }}>
                <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #e7e1d8', borderRadius: 18, padding: '28px 30px', boxShadow: '0 18px 48px rgba(15, 23, 42, 0.08)' }}>
                  <div style={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '15px', lineHeight: 1.8, color: '#111' }} dangerouslySetInnerHTML={{ __html: renderClientContractHtml(selected.template_html || '', selected.merge_fields || {}) }} />
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', color: 'var(--sub)', lineHeight: 1.7 }}>
                {selected.client_signed_at ? (
                  <>Signed on {new Date(selected.client_signed_at).toLocaleString('en-GB')} as {selected.client_signature?.name || user?.name || clientEmail}.</>
                ) : (
                  <>Signing records your Microsoft-authenticated client account as the authorised signer for this agreement.</>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selected.final_document_url ? (
                  <Btn variant="secondary" size="sm" icon={Download} onClick={() => window.open(selected.final_document_url, '_blank', 'noopener,noreferrer')}>
                    Download PDF
                  </Btn>
                ) : null}
                {selected.status === 'awaiting_client_signature' ? (
                  <Btn variant="primary" size="sm" icon={CheckCircle2} disabled={signingId === selected.id} onClick={() => signContract(selected)}>
                    {signingId === selected.id ? 'Signing…' : 'Sign agreement'}
                  </Btn>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
