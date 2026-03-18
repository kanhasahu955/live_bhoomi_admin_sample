/**
 * Reusable plugin factories.
 */
import type { AxiosInstance } from 'axios'
import { defineNuxtPlugin, useRuntimeConfig, useCookie, navigateTo } from 'nuxt/app'
import {
  createApiClient,
  buildApiBaseUrl,
  attachAuthInterceptor,
  attachResponseInterceptor,
} from '~/config/api'
import { getAuthConfig } from '~/config/auth'

export interface ApiPluginOptions {
  cookieName?: string
  loginPath?: string
  apiBase?: string
}

/**
 * Create axios API plugin with auth interceptors.
 */
export function createApiPlugin(options: ApiPluginOptions = {}) {
  return defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const auth = { ...getAuthConfig(), ...options }
    const apiBase = options.apiBase ?? buildApiBaseUrl(config.public.apiBase as string)

    const api = createApiClient({ baseURL: apiBase })

    attachAuthInterceptor(api, () => useCookie(auth.cookieName).value ?? null)

    attachResponseInterceptor(api, () => {
      useCookie(auth.cookieName).value = null
      if (import.meta.client) {
        navigateTo(auth.loginPath)
      }
    })

    return { provide: { api } }
  })
}
