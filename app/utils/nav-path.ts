import type { NavItem } from '~/config/layout'

/**
 * Normalize the current route path relative to the app base.
 * Vite dev often sets `import.meta.env.BASE_URL` to `/` while the app is still served under `/admin/`,
 * so we also strip a leading `/admin` segment when present.
 */
export function stripAppBasePath(path: string): string {
  let p = path || '/'
  const raw = import.meta.env.BASE_URL || '/admin/'
  let base = raw.replace(/\/$/, '')
  if (!base && (p.startsWith('/admin/') || p === '/admin')) {
    base = '/admin'
  }
  if (base && p.startsWith(base + '/')) {
    p = p.slice(base.length) || '/'
  } else if (base && p === base) {
    p = '/'
  }
  p = (p.replace(/\/$/, '') || '/') as string
  return p.startsWith('/') ? p : `/${p}`
}

export function isNavItemActive(routePath: string, item: NavItem): boolean {
  const itemPath = item.to === '/' || item.to === '' ? '/' : item.to.replace(/\/$/, '')
  let p = stripAppBasePath(routePath)
  p = (p.replace(/\/$/, '') || '/') as string
  if (itemPath === '/') {
    return p === '/' || p === ''
  }
  const norm = p.startsWith('/') ? p : `/${p}`
  const target = itemPath.startsWith('/') ? itemPath : `/${itemPath}`
  return norm === target || norm.startsWith(`${target}/`)
}
