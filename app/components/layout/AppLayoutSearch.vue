<script setup lang="ts">
import type { NavItem } from '~/config/layout'
import { useLayoutStore } from '~/stores/layout'

interface Props {
  navItems: NavItem[]
}

const props = defineProps<Props>()
const router = useRouter()
const layoutStore = useLayoutStore()
const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const filteredItems = computed(() => {
  if (!query.value.trim()) return props.navItems
  const q = query.value.toLowerCase()
  return props.navItems.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.to.toLowerCase().includes(q)
  )
})

function close() {
  layoutStore.closeSearch()
}

function navigateTo(item: NavItem) {
  router.push(item.to)
  close()
  query.value = ''
}

function handleBackdropClick(e: Event) {
  if (e.target === e.currentTarget) {
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    layoutStore.closeSearch()
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', handleKeydown, { capture: true })
  nextTick(() => inputRef.value?.focus())
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleKeydown, { capture: true })
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      @click="handleBackdropClick"
      @keydown.escape="close"
    >
        <div
          class="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          @click.stop
        >
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <UIcon name="i-lucide-search" class="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              placeholder="Search pages..."
              class="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none dark:text-white"
              @keydown.escape.prevent="close"
            />
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close search"
              @click="close"
            >
              <UIcon name="i-lucide-x" class="h-5 w-5" />
            </button>
          </div>
          <div class="max-h-64 overflow-y-auto py-2">
            <button
              v-for="item in filteredItems"
              :key="item.to"
              type="button"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="navigateTo(item)"
            >
              <UIcon :name="item.icon" class="h-4 w-4 shrink-0 text-gray-400" />
              {{ item.label }}
            </button>
            <p
              v-if="filteredItems.length === 0"
              class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              No results found
            </p>
          </div>
          <div class="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 dark:border-gray-800">
            Press <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-800">⌘K</kbd> to open, <kbd class="rounded bg-gray-100 px-1 dark:bg-gray-800">Esc</kbd> to close
          </div>
        </div>
    </div>
  </Teleport>
</template>
