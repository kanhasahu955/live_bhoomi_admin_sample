/**
 * Auth plugin: fetch current user when we have a token but no user (e.g. after refresh).
 */
import type { AxiosInstance } from 'axios'
import { createApiService } from '~/config/api'
import { getAuthConfig } from '~/config/auth'
import { useAuthStore } from '~/stores/auth'
import { USER } from '~/services/api'
import type { AuthUser } from '~/services/api'

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
      const data = await api.get<AuthUser & { fullName?: string }>(USER.me)
      if (data?.id && data?.email) {
        authStore.setUser({
          id: String(data.id),
          email: data.email,
          name: data.name ?? data.fullName
        })
      }
    } catch {
      // Token may be invalid; leave user null
    }
  },
})
