import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getAuthConfig } from '~/config/auth'
import type { AuthUser } from '~/services/api'

export interface UseAuthOptions {
  /** Override redirect after logout */
  logoutRedirect?: string
  /** Override redirect after login */
  loginRedirect?: string
}

/**
 * Reusable auth composable. Uses shared auth config for redirects.
 */
export function useAuth(options: UseAuthOptions = {}) {
  const authStore = useAuthStore()
  const config = getAuthConfig()

  const loginRedirect = options.loginRedirect ?? config.homePath
  const logoutRedirect = options.logoutRedirect ?? config.loginPath

  const login = async (email: string, password: string) => {
    return authStore.login(email, password)
  }

  const logout = async () => {
    await authStore.logout()
    navigateTo(logoutRedirect)
  }

  return {
    user: computed(() => authStore.currentUser),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    login,
    logout,
    setToken: (token: string | null) => authStore.setToken(token),
    setUser: (user: AuthUser | null) => authStore.setUser(user),
    loginRedirect,
    logoutRedirect,
  }
}
