import { defineStore } from 'pinia'

const SIDEBAR_STORAGE_KEY = 'bhoominow-sidebar-open'

function getInitialSidebarOpen(): boolean {
  if (import.meta.server) return true
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'false'
}

export const useLayoutStore = defineStore('layout', {
  state: () => ({
    isSearchOpen: false,
    isMobileMenuOpen: false,
    isSidebarOpen: getInitialSidebarOpen(),
  }),

  actions: {
    openSearch() {
      this.isSearchOpen = true
    },

    closeSearch() {
      this.isSearchOpen = false
    },

    openMobileMenu() {
      this.isMobileMenuOpen = true
    },

    closeMobileMenu() {
      this.isMobileMenuOpen = false
    },

    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen
      if (!import.meta.server) {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(this.isSidebarOpen))
      }
    },
  },
})
