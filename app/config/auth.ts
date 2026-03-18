/**
 * Shared auth config for middleware, plugins, and composables.
 * Override via runtimeConfig.public.auth in nuxt.config.
 */
export interface AuthConfig {
  cookieName: string
  loginPath: string
  homePath: string
  publicPaths: string[]
}

const DEFAULT: AuthConfig = {
  cookieName: 'admin_token',
  loginPath: '/login',
  homePath: '/',
  publicPaths: ['/login'],
}

export function getAuthConfig(): AuthConfig {
  try {
    const config = useRuntimeConfig()
    const auth = (config.public as { auth?: Partial<AuthConfig> }).auth
    return auth ? { ...DEFAULT, ...auth } : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function isAuthPath(path: string, config?: AuthConfig): boolean {
  const { publicPaths } = config ?? getAuthConfig()
  const p = path.replace(/\/$/, '') || '/'
  return publicPaths.some((pub) => p === pub || p.endsWith(pub))
}
