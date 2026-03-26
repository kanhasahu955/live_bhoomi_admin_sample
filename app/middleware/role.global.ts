import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '~/stores/auth'
import { isBlockedEndUserRole } from '~/services/api'

/**
 * If the session belongs to a plain USER end-account, clear it and send them to login.
 * Runs after login response handling and after /user/me hydration in auth.client.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth = useAuthStore()
  if (!auth.isAuthenticated || !auth.user) return
  if (isBlockedEndUserRole(auth.user)) {
    await auth.logout()
    return navigateTo({ path: '/login', query: { reason: 'access_denied' } }, { replace: true })
  }
})
