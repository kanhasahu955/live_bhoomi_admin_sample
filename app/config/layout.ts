/**
 * Shared layout configuration. Single source for nav items, branding, and layout options.
 * Import: getLayoutConfig, type NavItem, type LayoutConfig
 */

export interface NavItem {
  label: string
  icon: string
  to: string
  badge?: string | number
}

export interface LayoutConfig {
  appName: string
  appIcon: string
  navItems: NavItem[]
  sidebarWidth: { expanded: number; collapsed: number }
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Analytics', icon: 'i-lucide-bar-chart-3', to: '/analytics' },
  { label: 'Projects', icon: 'i-lucide-folder-kanban', to: '/projects' },
  { label: 'Listings', icon: 'i-lucide-home', to: '/listings' },
  { label: 'Users', icon: 'i-lucide-users', to: '/users' },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
]

const DEFAULT_CONFIG: LayoutConfig = {
  appName: 'Bhoominow',
  appIcon: 'i-lucide-leaf',
  navItems: DEFAULT_NAV_ITEMS,
  sidebarWidth: { expanded: 256, collapsed: 80 },
}

let _config: LayoutConfig = { ...DEFAULT_CONFIG }

export function getLayoutConfig(): LayoutConfig {
  return { ..._config }
}

export function setLayoutConfig(overrides: Partial<LayoutConfig>): void {
  _config = { ..._config, ...overrides }
}

export function useLayoutConfig(overrides?: Partial<LayoutConfig>) {
  if (overrides) setLayoutConfig(overrides)
  return getLayoutConfig()
}
