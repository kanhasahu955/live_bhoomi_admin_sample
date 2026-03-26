import { defineStore } from 'pinia'
import type { AxiosInstance } from 'axios'
import { useCookie, useNuxtApp } from 'nuxt/app'
import { createApiService } from '~/config/api'
import { getAuthConfig } from '~/config/auth'
import { AUTH, isBlockedEndUserRole, normalizeAuthUser, type AuthUser } from '~/services/api'

export type LoginResult = 'success' | 'access_denied' | false

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null
  }),

  getters: {
    isAuthenticated(): boolean {
      if (import.meta.server) return false
      const { cookieName } = getAuthConfig()
      return !!useCookie(cookieName).value
    },
    currentUser: (state) => state.user,
    /** True when logged-in user is a plain USER (blocked from this admin app). */
    isPortalUserRole(): boolean {
      return isBlockedEndUserRole(this.user)
    }
  },

  actions: {
    setToken(token: string | null) {
      const { cookieName } = getAuthConfig()
      useCookie(cookieName).value = token
    },

    setUser(user: AuthUser | null) {
      this.user = user
    },

    async login(email: string, password: string): Promise<LoginResult> {
      const { $api } = useNuxtApp()
      const api = createApiService($api as AxiosInstance)
      const res = await api.post<{
        token?: string | { accessToken?: string }
        access_token?: string
        user?: AuthUser & { fullName?: string; accountType?: string }
      }>(AUTH.loginEmail, { email, password })
      const tokenStr = typeof res?.token === 'string'
        ? res.token
        : (res?.token as { accessToken?: string })?.accessToken ?? res?.access_token
      const u = res?.user
      if (tokenStr && u && isBlockedEndUserRole(u)) {
        return 'access_denied'
      }
      if (tokenStr) {
        this.setToken(tokenStr)
        this.setUser(u ? normalizeAuthUser(u) : null)
        return 'success'
      }
      return false
    },

    async logout() {
      const { cookieName } = getAuthConfig()
      const token = useCookie(cookieName).value
      if (token) {
        try {
          const { $api } = useNuxtApp()
          const api = createApiService($api as AxiosInstance)
          await api.post(AUTH.logout)
        } catch {
          // Ignore errors - clear local state regardless
        }
      }
      this.setToken(null)
      this.setUser(null)
    }
  }
})
