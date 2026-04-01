import { supabase } from './supabase'

export function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase()
}

export async function resolveClientAccount(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const { data, error } = await supabase
    .from('client_accounts')
    .select('*')
    .ilike('email', normalized)
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}
