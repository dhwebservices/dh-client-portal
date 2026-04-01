import { createContext, useContext, useState, useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from '../authConfig'
import { resolveClientAccount, normalizeEmail } from '../utils/clientAccount'
import { supabase } from '../utils/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wrongRole, setWrongRole] = useState(false)
  const [clientAccount, setClientAccount] = useState(null)

  const refreshClientAccount = async (email) => {
    const lookupEmail = normalizeEmail(email || accounts[0]?.username)
    if (!lookupEmail) {
      setClientAccount(null)
      return null
    }

    try {
      const account = await resolveClientAccount(lookupEmail)
      setClientAccount(account)
      return account
    } catch (err) {
      console.error('Failed to resolve client account:', err)
      setClientAccount(null)
      return null
    }
  }

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const account = accounts[0]
      const roles = account.idTokenClaims?.roles || []

      // If user has Staff/Admin role but is on client portal — block them
      if ((roles.includes('Staff') || roles.includes('Administrator')) && !roles.includes('Client')) {
        setWrongRole(true)
        setLoading(false)
        return
      }

      setUser({
        name: account.name || account.username,
        email: normalizeEmail(account.username),
        roles,
      })
      setWrongRole(false)
      refreshClientAccount(account.username)
    } else {
      setUser(null)
      setClientAccount(null)
    }
    setLoading(false)
  }, [isAuthenticated, accounts])

  useEffect(() => {
    const lookupEmail = normalizeEmail(clientAccount?.email || user?.email)
    if (!lookupEmail) return

    const channel = supabase
      .channel(`client-account-${lookupEmail}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_accounts', filter: `email=eq.${lookupEmail}` }, () => {
        refreshClientAccount(lookupEmail)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientAccount?.email, user?.email])

  const login  = () => instance.loginRedirect(loginRequest).catch(console.error)
  const logout = () => instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin })

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      wrongRole,
      clientAccount,
      clientEmail: normalizeEmail(clientAccount?.email || user?.email),
      refreshClientAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
