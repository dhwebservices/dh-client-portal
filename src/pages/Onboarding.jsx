import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, FolderSync, Loader2, Save, Send } from 'lucide-react'
import { Card, Btn } from '../components/UI'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import OnboardingProgress from '../components/onboarding/OnboardingProgress'
import OnboardingSectionNav from '../components/onboarding/OnboardingSectionNav'
import SectionBusinessDetails from '../components/onboarding/SectionBusinessDetails'
import SectionProjectGoals from '../components/onboarding/SectionProjectGoals'
import SectionPagesNeeded from '../components/onboarding/SectionPagesNeeded'
import SectionFinalReview from '../components/onboarding/SectionFinalReview'
import {
  buildClientLifecycleKey,
  buildLifecycleValue,
  buildOnboardingSectionKey,
  buildOnboardingSummaryKey,
  buildSectionValue,
  buildSummaryValue,
  getCompletionPercent,
  getFirstIncompleteSection,
  getSectionLabel,
  getSectionStatus,
  normalizeEmail,
  normalizeSectionRecord,
  ONBOARDING_SECTIONS,
  parsePortalSetting,
} from '../utils/onboarding'

const SECTION_DESCRIPTIONS = {
  business_details: 'Add the key business information the team should treat as source-of-truth.',
  project_goals: 'Explain what the website needs to achieve and who it needs to speak to.',
  pages_needed: 'Confirm the initial page structure and any must-have functionality.',
  final_review: 'Flag any remaining gaps and formally submit the onboarding for staff review.',
}

function SectionRenderer({ activeKey, value, onChange }) {
  switch (activeKey) {
    case 'business_details':
      return <SectionBusinessDetails value={value} onChange={onChange} />
    case 'project_goals':
      return <SectionProjectGoals value={value} onChange={onChange} />
    case 'pages_needed':
      return <SectionPagesNeeded value={value} onChange={onChange} />
    case 'final_review':
      return <SectionFinalReview value={value} onChange={onChange} />
    default:
      return null
  }
}

export default function Onboarding() {
  const { user, clientAccount, clientEmail } = useAuth()
  const [summary, setSummary] = useState(null)
  const [sections, setSections] = useState({})
  const [activeKey, setActiveKey] = useState(ONBOARDING_SECTIONS[0].key)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const safeEmail = normalizeEmail(clientAccount?.email || clientEmail || user?.email)
  const safeAccountId = clientAccount?.id || ''
  const summaryKey = buildOnboardingSummaryKey(safeEmail)
  const sectionPrefix = buildOnboardingSectionKey(safeEmail, '')

  const decoratedSections = useMemo(() => {
    return ONBOARDING_SECTIONS.map(({ key, label }) => ({
      key,
      label,
      status: sections[key]?.status || 'not_started',
      description: SECTION_DESCRIPTIONS[key],
    }))
  }, [sections])

  const progress = useMemo(() => getCompletionPercent(sections), [sections])
  const activeSection = sections[activeKey] || { data: {}, status: 'not_started' }
  const missingSections = decoratedSections.filter((section) => section.status !== 'submitted')

  useEffect(() => {
    if (!safeEmail) return
    loadOnboarding()
  }, [safeEmail, safeAccountId])

  useEffect(() => {
    if (!safeEmail) return undefined

    const channel = supabase
      .channel(`client-onboarding-${safeEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_settings' }, (payload) => {
        const key = payload.new?.key || payload.old?.key || ''
        if (key === summaryKey || key.startsWith(sectionPrefix)) loadOnboarding()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [safeEmail, summaryKey, sectionPrefix])

  useEffect(() => {
    if (!decoratedSections.some((section) => section.key === activeKey)) {
      setActiveKey(getFirstIncompleteSection(sections))
    }
  }, [sections, activeKey, decoratedSections])

  async function loadOnboarding() {
    setLoading(true)
    const [{ data: summaryRow }, { data: sectionRows }] = await Promise.all([
      supabase.from('portal_settings').select('key,value').eq('key', summaryKey).maybeSingle(),
      supabase.from('portal_settings').select('key,value').like('key', `${sectionPrefix}%`),
    ])

    const parsedSummary = parsePortalSetting(summaryRow) || null
    const nextSections = Object.fromEntries(
      ONBOARDING_SECTIONS.map(({ key }) => {
        const row = (sectionRows || []).find((item) => item.key === buildOnboardingSectionKey(safeEmail, key))
        const payload = parsePortalSetting(row)
        const data = normalizeSectionRecord(key, payload.data)
        return [
          key,
          {
            status: payload.status || getSectionStatus(key, data),
            data,
            updated_at: payload.updated_at || '',
          },
        ]
      })
    )

    setSummary(parsedSummary)
    setSections(nextSections)
    setActiveKey(getFirstIncompleteSection(nextSections))
    setLoading(false)
  }

  function handleFieldChange(field, fieldValue) {
    setSections((current) => {
      const currentSection = current[activeKey] || { data: {} }
      const nextData = { ...(currentSection.data || {}), [field]: fieldValue }
      return {
        ...current,
        [activeKey]: {
          ...currentSection,
          data: nextData,
          status: getSectionStatus(activeKey, nextData),
        },
      }
    })
    setSaveMessage('')
  }

  async function persistSections({ forceSubmitted = false } = {}) {
    if (!safeEmail) return

    const now = new Date().toISOString()
    const updatedSections = Object.fromEntries(
      ONBOARDING_SECTIONS.map(({ key }) => {
        const existing = sections[key] || { data: {} }
        const data = normalizeSectionRecord(key, existing.data)
        return [
          key,
          {
            status: getSectionStatus(key, data),
            data,
            updated_at: now,
          },
        ]
      })
    )

    const summaryValue = buildSummaryValue({
      clientEmail: safeEmail,
      clientAccountId: safeAccountId,
      existingSummary: summary,
      sections: updatedSections,
      updatedBy: user?.email,
      forceSubmitted,
    })

    const lifecycleKey = buildClientLifecycleKey(safeAccountId)
    const existingLifecycleRow = safeAccountId
      ? await supabase.from('portal_settings').select('key,value').eq('key', lifecycleKey).maybeSingle()
      : { data: null }
    const lifecycleValue = buildLifecycleValue({
      clientAccountId: safeAccountId,
      existingLifecycle: parsePortalSetting(existingLifecycleRow.data),
      summary: summaryValue,
      updatedBy: user?.email,
    })

    const upserts = [
      {
        key: summaryKey,
        value: summaryValue,
      },
      ...ONBOARDING_SECTIONS.map(({ key }) => ({
        key: buildOnboardingSectionKey(safeEmail, key),
        value: buildSectionValue({
          clientEmail: safeEmail,
          clientAccountId: safeAccountId,
          sectionKey: key,
          data: updatedSections[key].data,
          updatedBy: user?.email,
        }),
      })),
    ]

    if (lifecycleValue) {
      upserts.push({
        key: lifecycleKey,
        value: lifecycleValue,
      })
    }

    await supabase.from('portal_settings').upsert(upserts, { onConflict: 'key' })
    setSummary(summaryValue)
    setSections(updatedSections)
    return { summaryValue, updatedSections }
  }

  async function handleSave() {
    setSaving(true)
    await persistSections()
    setSaving(false)
    setSaveMessage(`Saved ${getSectionLabel(activeKey).toLowerCase()} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)
  }

  async function handleSubmit() {
    if (missingSections.length) return
    setSubmitting(true)
    await persistSections({ forceSubmitted: true })
    setSubmitting(false)
    setSaveMessage('Onboarding submitted for staff review.')
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sub)' }}>
        Loading onboarding...
      </div>
    )
  }

  return (
    <div className="fade onboarding-page">
      <div className="page-hd" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Onboarding</h1>
          <p className="page-sub">
            Submit the core business, project, and page information we need so the staff portal can start planning from one clean source.
          </p>
        </div>
      </div>

      <div className="onboarding-shell">
        <div style={{ display: 'grid', gap: 16 }}>
          <OnboardingProgress
            completeCount={progress.completeCount}
            total={progress.total}
            percent={progress.percent}
            status={summary?.status || 'not_started'}
          />

          <Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: 'rgba(26,86,219,0.10)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FolderSync size={18} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Staff portal sync is built in
                </div>
                <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.65 }}>
                  Every save writes to the shared Supabase `portal_settings` layer the staff portal already uses,
                  so progress and submitted content can be picked up on the other side without a separate sync job.
                </div>
              </div>
            </div>
          </Card>

          <OnboardingSectionNav sections={decoratedSections} activeKey={activeKey} onSelect={setActiveKey} />
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
                    {getSectionLabel(activeKey)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1.02 }}>
                    {SECTION_DESCRIPTIONS[activeKey]}
                  </div>
                </div>
                <div
                  style={{
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: activeSection.status === 'submitted' ? 'rgba(16,185,129,0.10)' : activeSection.status === 'in_progress' ? 'rgba(245,158,11,0.10)' : 'var(--bg-muted)',
                    color: activeSection.status === 'submitted' ? 'var(--green)' : activeSection.status === 'in_progress' ? 'var(--amber)' : 'var(--sub)',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                  }}
                >
                  {activeSection.status.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div style={{ padding: 22 }}>
              <SectionRenderer activeKey={activeKey} value={activeSection.data || {}} onChange={handleFieldChange} />
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {saveMessage || 'Save each section as you go. You can come back later.'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--sub)' }}>
                  Final submission is enabled once all four sections are marked as submitted.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Btn icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving || submitting}>
                  {saving ? 'Saving...' : 'Save section'}
                </Btn>
                <Btn variant="secondary" icon={submitting ? Loader2 : Send} onClick={handleSubmit} disabled={Boolean(missingSections.length) || saving || submitting}>
                  {submitting ? 'Submitting...' : 'Submit onboarding'}
                </Btn>
              </div>
            </div>
            {missingSections.length ? (
              <div
                style={{
                  marginTop: 16,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.16)',
                  color: 'var(--text)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Still to finish</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {missingSections.map((section) => (
                    <button
                      key={section.key}
                      onClick={() => setActiveKey(section.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(245,158,11,0.18)',
                        background: 'rgba(255,255,255,0.7)',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: 'var(--amber)',
                      }}
                    >
                      {section.label}
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 16,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--green)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={18} />
                All required onboarding sections are complete and ready to submit.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
