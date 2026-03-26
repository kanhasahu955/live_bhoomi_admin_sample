/**
 * Auth plugin: fetch current user when we have a token but no user (e.g. after refresh).
 */
import type { AxiosInstance } from 'axios'
import { createApiService } from '~/config/api'
import { getAuthConfig } from '~/config/auth'
import { useAuthStore } from '~/stores/auth'
import { USER, isBlockedEndUserRole, normalizeAuthUser } from '~/services/api'

export default defineNuxtPlugin({
  name: 'auth-init',
  enforce: 'post',
  async setup(nuxtApp) {
    const authStore = useAuthStore()
    if (authStore.user) return

    const { cookieName } = getAuthConfig()
    const token = useCookie(cookieName).value
    if (!token) return

    try {
      const api = createApiService(nuxtApp.$api as AxiosInstance)
      const data = await api.get(USER.me)
      const user = normalizeAuthUser(data)
      if (user) {
        if (isBlockedEndUserRole(user)) {
          await authStore.logout()
          await navigateTo({ path: '/login', query: { reason: 'access_denied' } }, { replace: true })
          return
        }
        authStore.setUser(user)
      }
    } catch {
      // Token may be invalid; leave user null
    }
  },
})
