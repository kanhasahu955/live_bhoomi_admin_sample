<script setup lang="ts">
import type { Breadcrumb } from '~/composables/useLayout'
import { useLayoutStore } from '~/stores/layout'

interface Props {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  showMenuButton?: boolean
  showSearch?: boolean
  showBreadcrumbs?: boolean
  showSidebarToggle?: boolean
  userEmail?: string
  userName?: string
}

const props = withDefaults(defineProps<Props>(), {
  showMenuButton: true,
  showSearch: true,
  showBreadcrumbs: true,
  showSidebarToggle: true,
})

const emit = defineEmits<{
  menuClick: []
  openSearch: []
  logout: []
}>()

const auth = useAuth()
const layoutStore = useLayoutStore()
const colorMode = useColorMode()
const isProfileOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)

const displayName = computed(() => props.userName || auth.user?.name || props.userEmail || auth.user?.email || 'Account')
const displayEmail = computed(() => props.userEmail || auth.user?.email || 'Guest')

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

function onClickOutside(e: MouseEvent) {
  if (profileRef.value && !profileRef.value.contains(e.target as Node)) {
    isProfileOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <header
    :class="[
      'layout-header fixed left-0 right-0 top-0 z-40 flex min-h-14 shrink-0 flex-col justify-center border-b border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl transition-[left] duration-300 ease-out',
      layoutStore.isSidebarOpen ? 'lg:left-64' : 'lg:left-20'
    ]"
  >
    <div class="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <div class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button
          v-if="props.showMenuButton"
          type="button"
          class="layout-header-btn -ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg lg:hidden"
          aria-label="Open menu"
          @click="emit('menuClick')"
        >
          <UIcon name="i-lucide-menu" class="h-5 w-5" />
        </button>
        <button
          v-if="props.showSidebarToggle"
          type="button"
          class="layout-header-btn -ml-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg lg:flex"
          :aria-label="layoutStore.isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'"
          @click="layoutStore.toggleSidebar()"
        >
          <UIcon
            :name="layoutStore.isSidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
            class="h-5 w-5"
          />
        </button>
        <div class="min-w-0 flex-1">
          <nav
            v-if="props.breadcrumbs && props.breadcrumbs.length > 1 && props.showBreadcrumbs"
            class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-gray-500 dark:text-gray-400"
          >
            <template v-for="(crumb, i) in props.breadcrumbs" :key="i">
              <NuxtLink
                v-if="crumb.to"
                :to="crumb.to"
                class="hover:text-gray-700 dark:hover:text-gray-300"
              >
                {{ crumb.label }}
              </NuxtLink>
              <span v-else class="font-medium text-gray-900 dark:text-white">{{ crumb.label }}</span>
              <UIcon
                v-if="i < props.breadcrumbs!.length - 1"
                name="i-lucide-chevron-right"
                class="h-3.5 w-3.5 shrink-0 text-gray-400"
              />
            </template>
          </nav>
          <h1 class="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
            {{ props.title }}
          </h1>
          <p
            v-if="props.description"
            class="mt-0.5 hidden truncate text-sm text-gray-500 dark:text-gray-400 sm:block"
          >
            {{ props.description }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <slot name="actions-before" />
        <button
          v-if="props.showSearch"
          type="button"
          class="layout-header-btn hidden items-center gap-2 rounded-lg px-3 text-sm text-gray-500 md:flex md:h-9"
          @click="emit('openSearch')"
        >
          <UIcon name="i-lucide-search" class="h-4 w-4" />
          <span class="hidden lg:inline">Search</span>
          <kbd class="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800 xl:inline">⌘K</kbd>
        </button>
        <button
          type="button"
          class="layout-header-btn flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="Toggle theme"
          @click="toggleTheme"
        >
          <UIcon :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" class="h-5 w-5" />
        </button>
        <button
          type="button"
          class="layout-header-btn relative flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="Notifications"
        >
          <UIcon name="i-lucide-bell" class="h-5 w-5" />
          <span
            class="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900"
          />
        </button>
        <div ref="profileRef" class="relative">
          <button
            type="button"
            class="layout-header-btn flex items-center gap-2 rounded-lg px-2 py-1.5"
            aria-label="Profile menu"
            aria-haspopup="true"
            :aria-expanded="isProfileOpen"
            @click.stop="isProfileOpen = !isProfileOpen"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {{ displayName[0]?.toUpperCase() || '?' }}
            </div>
            <div class="hidden text-left sm:block">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white max-w-[120px]">
                {{ displayName }}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400 max-w-[120px]">
                {{ displayEmail }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-down" class="h-4 w-4 shrink-0 text-gray-500" />
          </button>
          <div
            v-if="isProfileOpen"
            class="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <NuxtLink
              to="/profile"
              class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="isProfileOpen = false"
            >
              <UIcon name="i-lucide-user" class="h-4 w-4" />
              Profile
            </NuxtLink>
            <NuxtLink
              to="/settings"
              class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="isProfileOpen = false"
            >
              <UIcon name="i-lucide-settings" class="h-4 w-4" />
              Settings
            </NuxtLink>
            <div class="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              @click="emit('logout'); isProfileOpen = false"
            >
              <UIcon name="i-lucide-log-out" class="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
