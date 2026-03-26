/**
 * Reusable layout composable. Provides nav items, sidebar state, breadcrumbs, and handlers.
 * Features: persistent sidebar state, keyboard shortcuts, responsive behavior.
 * Uses Pinia layout store for search/mobile menu so state is shared app-wide.
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'nuxt/app'
import { getLayoutConfig, type NavItem } from '~/config/layout'
import { useLayoutStore } from '~/stores/layout'
import { stripAppBasePath } from '~/utils/nav-path'

const SEARCH_HOTKEY = 'k'

export interface Breadcrumb {
  label: string
  to?: string
}

export interface UseLayoutOptions {
  navItems?: NavItem[]
  defaultSidebarOpen?: boolean
  persistSidebar?: boolean
}

export function useLayout(options: UseLayoutOptions = {}) {
  const route = useRoute()
  const config = getLayoutConfig()
  const layoutStore = useLayoutStore()

  const navItems = options.navItems ?? config.navItems
  const isSidebarOpen = computed(() => layoutStore.isSidebarOpen)
  const isMobileMenuOpen = computed(() => layoutStore.isMobileMenuOpen)
  const isSearchOpen = computed(() => layoutStore.isSearchOpen)
  const isUserMenuOpen = ref(false)
  const isNotificationsOpen = ref(false)

  const pageDescription = computed(() => route.meta.description as string | undefined)

  const ROUTE_LABELS: Record<string, string> = {
    partners: 'Partners',
    profile: 'Profile',
    listings: 'Listings',
    projects: 'Projects',
    analytics: 'Analytics',
    users: 'Users',
    settings: 'Settings',
    login: 'Login'
  }

  const pageTitle = computed(() => {
    const path = stripAppBasePath(route.path || '/')
    const normalized = (path.replace(/\/$/, '') || '/') as string
    if (normalized !== '/' && normalized !== '') {
      const lastSeg = normalized.split('/').filter(Boolean).pop() || ''
      const mapped = ROUTE_LABELS[lastSeg.toLowerCase()]
      if (mapped) return mapped
    }
    return (route.meta.title as string) || 'Admin Panel'
  })

  const breadcrumbs = computed<Breadcrumb[]>(() => {
    let path = stripAppBasePath(route.path?.replace(/\/$/, '') || '/')
    path = path.replace(/\/$/, '') || '/'
    if (path === '/' || path === '') return [{ label: 'Dashboard', to: '/' }]
    const segments = path.split('/').filter(Boolean)
    return segments.map((seg, i) => {
      const to = '/' + segments.slice(0, i + 1).join('/')
      const isLast = i === segments.length - 1
      const fromMap = ROUTE_LABELS[seg.toLowerCase()]
      const label =
        isLast && fromMap
          ? fromMap
          : isLast && route.meta?.title
            ? String(route.meta.title)
            : fromMap ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
      return { label, to: isLast ? undefined : to }
    })
  })

  const checkMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      layoutStore.closeMobileMenu()
    }
  }

  watch(() => route.path, () => {
    layoutStore.closeMobileMenu()
  })

  let keydownHandler: ((e: KeyboardEvent) => void) | null = null
  onMounted(() => {
    if (typeof window !== 'undefined') {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          layoutStore.closeSearch()
          layoutStore.closeMobileMenu()
          isUserMenuOpen.value = false
          isNotificationsOpen.value = false
        }
        if (window.innerWidth >= 768 && (e.metaKey || e.ctrlKey) && e.key === SEARCH_HOTKEY) {
          e.preventDefault()
          layoutStore.isSearchOpen ? layoutStore.closeSearch() : layoutStore.openSearch()
        }
      }
      window.addEventListener('keydown', keydownHandler, { capture: true })
    }
  })
  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', checkMobile)
      if (keydownHandler) window.removeEventListener('keydown', keydownHandler, { capture: true })
    }
  })

  const toggleSidebar = () => {
    layoutStore.toggleSidebar()
  }

  const openMobileMenu = () => {
    layoutStore.openMobileMenu()
  }

  const closeMobileMenu = () => {
    layoutStore.closeMobileMenu()
  }

  const openSearch = () => {
    layoutStore.openSearch()
  }

  const closeSearch = () => {
    layoutStore.closeSearch()
  }

  const toggleUserMenu = () => {
    isUserMenuOpen.value = !isUserMenuOpen.value
    if (isUserMenuOpen.value) isNotificationsOpen.value = false
  }

  const toggleNotifications = () => {
    isNotificationsOpen.value = !isNotificationsOpen.value
    if (isNotificationsOpen.value) isUserMenuOpen.value = false
  }

  const closeDropdowns = () => {
    isUserMenuOpen.value = false
    isNotificationsOpen.value = false
  }

  return {
    config,
    navItems,
    isSidebarOpen,
    isMobileMenuOpen,
    isSearchOpen,
    isUserMenuOpen,
    isNotificationsOpen,
    pageTitle,
    pageDescription,
    breadcrumbs,
    toggleSidebar,
    openMobileMenu,
    closeMobileMenu,
    openSearch,
    closeSearch,
    toggleUserMenu,
    toggleNotifications,
    closeDropdowns,
  }
}
