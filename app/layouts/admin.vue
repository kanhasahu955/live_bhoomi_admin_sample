<script setup lang="ts">
/**
 * Admin layout: sidebar + header + content.
 * Features: search (⌘K), breadcrumbs, persistent sidebar, responsive.
 */
import { useLayoutStore } from '~/stores/layout'

const auth = useAuth()
const layout = useLayout()
const layoutStore = useLayoutStore()

const userEmail = computed(() => auth.user?.email ?? 'Guest')

function handleLogout() {
  auth.logout()
}
</script>

<template>
  <div class="layout-root flex min-h-screen w-full overflow-x-hidden bg-gray-50/80 dark:bg-gray-950">
    <LayoutAppSidebarMobile
      :nav-items="layout.navItems"
      :app-name="layout.config.appName"
      :app-icon="layout.config.appIcon"
      @logout="handleLogout"
    />
    <LayoutAppSidebar
      :nav-items="layout.navItems"
      :app-name="layout.config.appName"
      :app-icon="layout.config.appIcon"
      class="hidden lg:flex"
      @logout="handleLogout"
    />
    <main
      :class="[
        'layout-main flex min-h-screen min-w-0 flex-1 flex-col w-full overflow-y-auto transition-[margin] duration-300 ease-out',
        layoutStore.isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      ]"
    >
      <LayoutAppAdminHeader
        :title="layout.pageTitle"
        :description="layout.pageDescription"
        :breadcrumbs="layout.breadcrumbs"
        :user-email="userEmail"
        :user-name="auth.user?.name"
        @menu-click="layout.openMobileMenu"
        @open-search="layout.openSearch"
        @logout="handleLogout"
      />
      <div class="layout-content flex-1 w-full min-w-0 overflow-x-hidden pt-[4.5rem] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
        <div class="w-full min-w-0 overflow-x-hidden">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
