/**
 * Reusable middleware factories.
 */
import type { RouteLocationNormalized } from 'vue-router'
import { defineNuxtRouteMiddleware, navigateTo, useCookie } from 'nuxt/app'
import { getAuthConfig, isAuthPath } from '~/config/auth'

export interface AuthMiddlewareOptions {
  cookieName?: string
  loginPath?: string
  homePath?: string
  publicPaths?: string[]
}

/**
 * Create auth guard middleware. Protects routes unless token exists or path is public.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return defineNuxtRouteMiddleware((to: RouteLocationNormalized) => {
    const config = { ...getAuthConfig(), ...options }
    const token = useCookie(config.cookieName).value
    const isAuthenticated = !!token
    const path = to.path?.replace(/\/$/, '') || '/'
    const isPublic = isAuthPath(path, config)

    if (!isAuthenticated && !isPublic) {
      return navigateTo(config.loginPath, { replace: true })
    }

    if (isAuthenticated && isPublic) {
      return navigateTo(config.homePath, { replace: true })
    }
  })
}
