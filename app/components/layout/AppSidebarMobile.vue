<script setup lang="ts">
import type { NavItem } from '~/config/layout'
import { useLayoutStore } from '~/stores/layout'

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
const open = computed(() => layoutStore.isMobileMenuOpen)

function close() {
  layoutStore.closeMobileMenu()
}
</script>

<template>
  <div class="contents">
    <!-- Backdrop -->
    <div
      v-if="open"
      class="fixed inset-0 z-40 cursor-pointer bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
      aria-hidden="true"
      role="button"
      tabindex="-1"
      @click="close"
      @keydown.enter="close"
      @keydown.space.prevent="close"
    />
    <!-- Drawer -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-out lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
        <div class="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800/80 px-4">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <UIcon :name="props.appIcon" class="h-4 w-4" />
            </div>
            <span class="font-semibold text-gray-900 dark:text-white">{{ props.appName }}</span>
          </div>
          <button
            type="button"
            class="layout-header-btn flex h-9 w-9 items-center justify-center rounded-lg"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="h-5 w-5" />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          <ul class="space-y-0.5">
            <li v-for="item in props.navItems" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="layout-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium"
                active-class="layout-nav-link-active"
                @click="close"
              >
                <UIcon :name="item.icon" class="h-[18px] w-[18px] shrink-0" />
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="border-t border-gray-100 dark:border-gray-800/80 p-4">
          <button
            type="button"
            class="layout-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium"
            @click="emit('logout')"
          >
            <UIcon name="i-lucide-log-out" class="h-[18px] w-[18px] shrink-0" />
            Sign out
          </button>
        </div>
    </aside>
  </div>
</template>
