import type { AxiosInstance } from 'axios'
import { defineNuxtPlugin, useRuntimeConfig, useCookie, navigateTo } from 'nuxt/app'
import {
  createApiClient,
  buildApiBaseUrl,
  attachAuthInterceptor,
  attachResponseInterceptor,
} from '~/config/api'
import { getAuthConfig } from '~/config/auth'

declare module '#app' {
  interface NuxtApp {
    $api: AxiosInstance
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: AxiosInstance
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const auth = getAuthConfig()
  const apiBase = buildApiBaseUrl((config.public?.apiBase as string) || undefined)

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
