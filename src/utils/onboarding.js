const SECTION_KEYS = ['business_details', 'project_goals', 'pages_needed', 'final_review']

export const ONBOARDING_SECTIONS = SECTION_KEYS.map((key) => ({
  key,
  label: getSectionLabel(key),
}))

export function buildOnboardingSummaryKey(email = '') {
  return `client_onboarding:${normalizeEmail(email)}`
}

export function buildOnboardingSectionKey(email = '', sectionKey = '') {
  return `client_onboarding_section:${normalizeEmail(email)}:${String(sectionKey || '').trim()}`
}

export function buildClientLifecycleKey(id = '') {
  return `client_lifecycle:${String(id || '').trim()}`
}

export function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase()
}

export function getSectionLabel(sectionKey = '') {
  switch (sectionKey) {
    case 'business_details':
      return 'Business Details'
    case 'project_goals':
      return 'Project Goals'
    case 'pages_needed':
      return 'Pages Needed'
    case 'final_review':
      return 'Final Review'
    default:
      return 'Section'
  }
}

export function getInitialSectionData(sectionKey = '') {
  switch (sectionKey) {
    case 'business_details':
      return {
        business_name: '',
        primary_contact: '',
        phone: '',
        address: '',
        opening_hours: '',
        service_areas: '',
      }
    case 'project_goals':
      return {
        main_goal: '',
        target_audience: '',
        key_services: '',
        competitors: '',
        tone_of_voice: '',
        primary_cta: '',
      }
    case 'pages_needed':
      return {
        homepage: true,
        about_page: false,
        services_page: false,
        contact_page: true,
        extra_pages: '',
        special_features: '',
      }
    case 'final_review':
      return {
        missing_items: '',
        ready_for_build: false,
        confirm_accuracy: false,
      }
    default:
      return {}
  }
}

export function normalizeSectionRecord(sectionKey = '', raw = {}) {
  const base = getInitialSectionData(sectionKey)
  const incoming = raw && typeof raw === 'object' ? raw : {}

  if (sectionKey === 'pages_needed') {
    return {
      ...base,
      ...incoming,
      homepage: Boolean(incoming.homepage ?? base.homepage),
      about_page: Boolean(incoming.about_page ?? base.about_page),
      services_page: Boolean(incoming.services_page ?? base.services_page),
      contact_page: Boolean(incoming.contact_page ?? base.contact_page),
    }
  }

  if (sectionKey === 'final_review') {
    return {
      ...base,
      ...incoming,
      ready_for_build: Boolean(incoming.ready_for_build),
      confirm_accuracy: Boolean(incoming.confirm_accuracy),
    }
  }

  return { ...base, ...incoming }
}

export function isSectionComplete(sectionKey = '', data = {}) {
  const safe = normalizeSectionRecord(sectionKey, data)

  switch (sectionKey) {
    case 'business_details':
      return Boolean(
        safe.business_name.trim() &&
        safe.primary_contact.trim() &&
        safe.phone.trim()
      )
    case 'project_goals':
      return Boolean(
        safe.main_goal.trim() &&
        safe.target_audience.trim() &&
        safe.primary_cta.trim()
      )
    case 'pages_needed':
      return Boolean(
        safe.homepage ||
        safe.about_page ||
        safe.services_page ||
        safe.contact_page ||
        safe.extra_pages.trim()
      )
    case 'final_review':
      return Boolean(safe.ready_for_build && safe.confirm_accuracy)
    default:
      return false
  }
}

export function hasSectionContent(sectionKey = '', data = {}) {
  const safe = normalizeSectionRecord(sectionKey, data)

  return Object.values(safe).some((value) => {
    if (typeof value === 'boolean') return value
    return String(value || '').trim().length > 0
  })
}

export function getSectionStatus(sectionKey = '', data = {}) {
  if (isSectionComplete(sectionKey, data)) return 'submitted'
  if (hasSectionContent(sectionKey, data)) return 'in_progress'
  return 'not_started'
}

export function getCompletionPercent(sectionMap = {}) {
  const total = ONBOARDING_SECTIONS.length
  const completeCount = ONBOARDING_SECTIONS.filter(({ key }) => {
    const section = sectionMap[key] || {}
    return section.status === 'submitted'
  }).length

  return {
    total,
    completeCount,
    percent: total ? Math.round((completeCount / total) * 100) : 0,
  }
}

export function buildSectionValue({
  clientEmail,
  clientAccountId,
  sectionKey,
  data,
  updatedBy,
}) {
  const normalizedData = normalizeSectionRecord(sectionKey, data)
  return {
    client_email: normalizeEmail(clientEmail),
    client_account_id: clientAccountId || null,
    section_key: sectionKey,
    status: getSectionStatus(sectionKey, normalizedData),
    data: normalizedData,
    updated_at: new Date().toISOString(),
    updated_by: normalizeEmail(updatedBy),
    source: 'client_portal',
  }
}

export function buildSummaryValue({
  clientEmail,
  clientAccountId,
  existingSummary,
  sections,
  updatedBy,
  forceSubmitted = false,
}) {
  const progress = getCompletionPercent(sections)
  const now = new Date().toISOString()
  const normalizedExisting = existingSummary && typeof existingSummary === 'object' ? existingSummary : {}
  const status = forceSubmitted
    ? 'submitted'
    : progress.completeCount === 0
      ? 'not_started'
      : progress.completeCount === progress.total
        ? 'submitted'
        : 'in_progress'

  const sectionSummary = Object.fromEntries(
    ONBOARDING_SECTIONS.map(({ key }) => {
      const section = sections[key] || {}
      return [
        key,
        {
          status: section.status || 'not_started',
          updated_at: section.updated_at || now,
          complete: section.status === 'submitted',
        },
      ]
    })
  )

  return {
    client_email: normalizeEmail(clientEmail),
    client_account_id: clientAccountId || null,
    status,
    progress,
    sections: sectionSummary,
    started_at: normalizedExisting.started_at || now,
    submitted_at: forceSubmitted ? now : normalizedExisting.submitted_at || '',
    approved_at: normalizedExisting.approved_at || '',
    approved_by: normalizedExisting.approved_by || '',
    updated_at: now,
    updated_by: normalizeEmail(updatedBy),
    source: 'client_portal',
  }
}

export function buildLifecycleValue({
  clientAccountId,
  existingLifecycle,
  summary,
  updatedBy,
}) {
  const normalized = existingLifecycle && typeof existingLifecycle === 'object' ? existingLifecycle : {}
  const progress = summary?.progress || { completeCount: 0, total: ONBOARDING_SECTIONS.length }
  const hasStarted = progress.completeCount > 0
  const status = String(summary?.status || '').trim()

  if (!clientAccountId || !hasStarted) return null

  return {
    client_id: String(clientAccountId),
    stage: status === 'submitted' ? 'onboarding' : 'onboarding',
    health: normalized.health || 'stable',
    summary:
      status === 'submitted'
        ? 'Client onboarding submitted and ready for staff review.'
        : `Client onboarding in progress: ${progress.completeCount}/${progress.total} sections submitted.`,
    risk_flags: Array.isArray(normalized.risk_flags) ? normalized.risk_flags : [],
    updated_at: new Date().toISOString(),
    updated_by: normalizeEmail(updatedBy) || 'client_portal',
  }
}

export function parsePortalSetting(row) {
  return row?.value?.value ?? row?.value ?? {}
}

export function getFirstIncompleteSection(sectionMap = {}) {
  const found = ONBOARDING_SECTIONS.find(({ key }) => (sectionMap[key]?.status || 'not_started') !== 'submitted')
  return found?.key || ONBOARDING_SECTIONS[0].key
}
