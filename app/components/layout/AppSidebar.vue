<script setup lang="ts">
import type { NavItem } from '~/config/layout'
import { useLayoutStore } from '~/stores/layout'
import { useRoute } from 'nuxt/app'

interface Props {
  navItems: NavItem[]
  appName?: string
  appIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  appName: 'Bhoominow',
  appIcon: 'i-lucide-leaf',
})

const emit = defineEmits<{ logout: [] }>()
const layoutStore = useLayoutStore()
const route = useRoute()
const collapsed = computed(() => !layoutStore.isSidebarOpen)

function isNavActive(item: NavItem): boolean {
  const config = useRuntimeConfig()
  const base = (config.app?.baseURL as string) || '/'
  const baseClean = base.replace(/^\/+|\/+$/g, '') // e.g. 'admin'
  let path = (route.path || '/').replace(/^\/+|\/+$/g, '')
  if (baseClean && path.startsWith(baseClean)) {
    path = path.slice(baseClean.length).replace(/^\/+/, '') || 'root'
  } else {
    path = path || 'root'
  }
  const target = (item.to === '/' || item.to === '') ? 'root' : item.to.replace(/^\/+|\/+$/g, '')
  if (target === 'root') return path === 'root' || path === ''
  return path === target || path.startsWith(target + '/')
}
</script>

<template>
  <aside
    :class="[
      'layout-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-out',
      'border-r border-gray-200/80 dark:border-gray-800/80',
      'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
      'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)]',
      collapsed ? 'w-20' : 'w-64'
    ]"
  >
    <!-- Logo / Brand -->
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 dark:border-gray-800/80 px-3">
      <slot name="logo">
        <NuxtLink
          to="/"
          class="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800/50"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105"
          >
            <UIcon :name="props.appIcon" class="h-5 w-5" />
          </div>
          <span
            v-if="!collapsed"
            class="truncate text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            {{ props.appName }}
          </span>
        </NuxtLink>
      </slot>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
      <ul class="space-y-0.5">
        <li v-for="item in props.navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            :class="[
              'layout-nav-link group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
              isNavActive(item) && 'layout-nav-link-active'
            ]"
          >
            <span
              :class="[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                isNavActive(item) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200'
              ]"
            >
              <UIcon :name="item.icon" class="h-[18px] w-[18px]" />
            </span>
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            <span
              v-if="item.badge && !collapsed"
              class="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            >
              {{ item.badge }}
            </span>
          </NuxtLink>
        </li>
      </ul>
      <slot name="nav-extra" />
    </nav>

    <!-- Footer -->
    <div class="shrink-0 border-t border-gray-100 dark:border-gray-800/80 p-3">
      <button
        type="button"
        class="layout-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-white"
        :title="collapsed ? 'Sign out' : undefined"
        @click="emit('logout')"
      >
        <UIcon name="i-lucide-log-out" class="h-[18px] w-[18px] shrink-0" />
        <span v-if="!collapsed">Sign out</span>
      </button>
      <slot name="footer" />
    </div>
  </aside>
</template>
