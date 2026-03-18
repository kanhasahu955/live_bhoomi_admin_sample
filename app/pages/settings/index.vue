<script setup lang="ts">
import { useLayoutStore } from '~/stores/layout'

definePageMeta({
  layout: 'admin',
  title: 'Settings'
})

const config = useRuntimeConfig()
const layoutStore = useLayoutStore()
const auth = useAuth()

type SectionId = 'all' | 'appearance' | 'api' | 'notifications' | 'general' | 'security' | 'integrations' | 'data' | 'about'

const activeSection = ref<SectionId>('all')

const sections = [
  { id: 'all' as SectionId, label: 'All', icon: 'i-lucide-layout-grid', color: 'gray' },
  { id: 'appearance' as SectionId, label: 'Appearance', icon: 'i-lucide-palette', color: 'emerald' },
  { id: 'api' as SectionId, label: 'API', icon: 'i-lucide-server', color: 'cyan' },
  { id: 'notifications' as SectionId, label: 'Notifications', icon: 'i-lucide-bell', color: 'violet' },
  { id: 'general' as SectionId, label: 'General', icon: 'i-lucide-settings-2', color: 'amber' },
  { id: 'security' as SectionId, label: 'Security', icon: 'i-lucide-shield', color: 'rose' },
  { id: 'integrations' as SectionId, label: 'Integrations', icon: 'i-lucide-plug', color: 'indigo' },
  { id: 'data' as SectionId, label: 'Data & Privacy', icon: 'i-lucide-database', color: 'slate' },
  { id: 'about' as SectionId, label: 'About', icon: 'i-lucide-info', color: 'teal' }
]

const apiBase = computed(() => (config.public?.apiBase as string) || 'https://api.bhoominow.com/api/v1')
const apiStatus = ref<'checking' | 'online' | 'offline'>('checking')

const emailNotifications = ref(true)
const pushNotifications = ref(false)
const marketingEmails = ref(false)
const digestFrequency = ref('daily')
const dateFormat = ref('DD/MM/YYYY')
const timezone = ref('Asia/Kolkata')
const itemsPerPage = ref(10)
const sessionTimeout = ref(30)
const sidebarCollapsedByDefault = computed({
  get: () => !layoutStore.isSidebarOpen,
  set: (v: boolean) => {
    if (v !== !layoutStore.isSidebarOpen) layoutStore.toggleSidebar()
  }
})

const dateFormatOptions = [
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
]

const digestOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Never', value: 'never' }
]

const itemsPerPageOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

const settingsSaved = ref(false)
const cacheCleared = ref(false)

async function checkApiStatus() {
  apiStatus.value = 'checking'
  try {
    const { $api } = useNuxtApp()
    await ($api as { get: (url: string) => Promise<unknown> }).get('/health')
    apiStatus.value = 'online'
  } catch {
    apiStatus.value = 'offline'
  }
}

function saveNotifications() {
  settingsSaved.value = true
  setTimeout(() => { settingsSaved.value = false }, 2000)
}

function clearCache() {
  if (import.meta.client) {
    try {
      localStorage.removeItem('bhoominow-sidebar-open')
      cacheCleared.value = true
      setTimeout(() => { cacheCleared.value = false }, 3000)
    } catch {
      /* ignore */
    }
  }
}

function scrollToSection(id: SectionId) {
  if (id === 'all') {
    const container = document.getElementById('settings-content')
    container?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSection.value = 'all'
    return
  }
  const el = document.getElementById(`section-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSection.value = id
  }
}

onMounted(() => {
  checkApiStatus()
  if (import.meta.client) {
    nextTick(() => {
      const root = document.getElementById('settings-content')
      if (!root) return
      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            const id = e.target.getAttribute('data-section') as SectionId | null
            if (id) activeSection.value = id
          }
        },
        { root, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
      )
      sections.forEach((s) => {
        const el = document.getElementById(`section-${s.id}`)
        if (el) observer.observe(el)
      })
    })
  }
})
</script>

<template>
  <div class="flex h-[calc(100vh-4.5rem-3rem)] min-h-0 w-full flex-col gap-6 sm:h-[calc(100vh-4.5rem-4rem)]">
    <!-- Header -->
    <div
      v-motion
      :initial="{ opacity: 0, y: 16 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 400, ease: 'easeOut' } }"
      class="shrink-0"
    >
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        Settings
      </h1>
      <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
        Manage your admin panel preferences, notifications, and security
      </p>
    </div>

    <!-- Layout: Section nav on top, content below (stacked, not parallel) -->
    <div class="flex min-h-0 flex-1 flex-col gap-6">
      <!-- Section selector (horizontal tabs) -->
      <nav
        v-motion
        :initial="{ opacity: 0, x: -16 }"
        :enter="{ opacity: 1, x: 0, transition: { delay: 50, duration: 400, ease: 'easeOut' } }"
        class="flex shrink-0 flex-row flex-wrap gap-2 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/50 lg:gap-1 lg:p-3"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          type="button"
          :class="[
            'flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200',
            'shrink-0',
            activeSection === s.id
              ? 'bg-emerald-500/15 text-emerald-700 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/80'
          ]"
          @click="scrollToSection(s.id)"
        >
          <div
            :class="[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              activeSection === s.id ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            ]"
          >
            <UIcon :name="s.icon" class="size-4" />
          </div>
          {{ s.label }}
        </button>
      </nav>

      <!-- Content area: only this scrolls -->
      <div
        id="settings-content"
        class="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto"
      >
        <!-- Sentinel for "All" when at top -->
        <div id="section-all" data-section="all" class="h-px w-full" aria-hidden="true" />
        <!-- Appearance -->
        <div
          id="section-appearance"
          data-section="appearance"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 px-6 py-5 dark:border-gray-800 dark:from-emerald-950/30 dark:via-gray-900 dark:to-teal-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                  <UIcon name="i-lucide-palette" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Customize how the app looks</p>
                </div>
              </div>
            </div>
            <div class="space-y-6 p-6">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Theme</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Light, dark, or system preference</p>
                </div>
                <UColorModeSelect class="w-full sm:w-auto sm:min-w-[180px]" />
              </div>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Compact sidebar</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Start with sidebar collapsed</p>
                </div>
                <USwitch v-model="sidebarCollapsedByDefault" />
              </div>
            </div>
          </div>

        <!-- API -->
        <div
          id="section-api"
          data-section="api"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/30 px-6 py-5 dark:border-gray-800 dark:from-cyan-950/30 dark:via-gray-900 dark:to-blue-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                  <UIcon name="i-lucide-server" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">API Configuration</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Backend connection settings</p>
                </div>
              </div>
            </div>
            <div class="space-y-6 p-6">
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</label>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <code class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    {{ apiBase }}
                  </code>
                  <UBadge
                    :color="apiStatus === 'online' ? 'success' : apiStatus === 'offline' ? 'error' : 'neutral'"
                    size="sm"
                    variant="soft"
                  >
                    <UIcon v-if="apiStatus === 'checking'" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
                    {{ apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Offline' : 'Checking…' }}
                  </UBadge>
                </div>
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Set via NUXT_PUBLIC_API_BASE</p>
              </div>
              <UButton variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="apiStatus === 'checking'" @click="checkApiStatus">
                Recheck connection
              </UButton>
            </div>
          </div>

        <!-- Notifications -->
        <div
          id="section-notifications"
          data-section="notifications"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-violet-50/80 via-white to-purple-50/30 px-6 py-5 dark:border-gray-800 dark:from-violet-950/30 dark:via-gray-900 dark:to-purple-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
                  <UIcon name="i-lucide-bell" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Choose what to be notified about</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-6">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Email notifications</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                </div>
                <USwitch v-model="emailNotifications" @update:model-value="saveNotifications" />
              </div>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Push notifications</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Browser push when available</p>
                </div>
                <USwitch v-model="pushNotifications" @update:model-value="saveNotifications" />
              </div>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Marketing emails</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Product updates and tips</p>
                </div>
                <USwitch v-model="marketingEmails" @update:model-value="saveNotifications" />
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Digest frequency</label>
                <USelect v-model="digestFrequency" :items="digestOptions" class="mt-2 w-full sm:max-w-[200px]" />
              </div>
              <p v-if="settingsSaved" class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <UIcon name="i-lucide-check-circle" class="size-4" /> Preferences saved
              </p>
            </div>
          </div>

        <!-- General -->
        <div
          id="section-general"
          data-section="general"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 px-6 py-5 dark:border-gray-800 dark:from-amber-950/30 dark:via-gray-900 dark:to-orange-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
                  <UIcon name="i-lucide-settings-2" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">General</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Language and display format</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-6">
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date format</label>
                <USelect v-model="dateFormat" :items="dateFormatOptions" class="mt-2 w-full sm:max-w-[200px]" />
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                <UInput v-model="timezone" class="mt-2 w-full sm:max-w-[280px]" placeholder="Asia/Kolkata" />
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Items per page</label>
                <USelect v-model="itemsPerPage" :items="itemsPerPageOptions" class="mt-2 w-full sm:max-w-[200px]" />
              </div>
            </div>
          </div>

        <!-- Security -->
        <div
          id="section-security"
          data-section="security"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-rose-50/80 via-white to-red-50/30 px-6 py-5 dark:border-gray-800 dark:from-rose-950/30 dark:via-gray-900 dark:to-red-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25">
                  <UIcon name="i-lucide-shield" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Password and session management</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-6">
              <NuxtLink
                to="/profile"
                class="flex items-center justify-between rounded-xl border border-gray-200/80 px-4 py-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-700 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
              >
                <div class="flex items-center gap-3">
                  <UIcon name="i-lucide-key" class="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span class="font-medium text-gray-900 dark:text-white">Change password</span>
                </div>
                <UIcon name="i-lucide-chevron-right" class="size-5 text-gray-400" />
              </NuxtLink>
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <p class="text-sm font-medium text-gray-900 dark:text-white">Logged in as</p>
                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ auth.user?.email ?? 'Guest' }}</p>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Session timeout (minutes)</label>
                <UInput v-model.number="sessionTimeout" type="number" class="mt-2 w-full sm:max-w-[120px]" />
              </div>
            </div>
          </div>

        <!-- Integrations -->
        <div
          id="section-integrations"
          data-section="integrations"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/30 px-6 py-5 dark:border-gray-800 dark:from-indigo-950/30 dark:via-gray-900 dark:to-violet-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                  <UIcon name="i-lucide-plug" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Webhooks and API keys</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-6">
              <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
                <UIcon name="i-lucide-webhook" class="mx-auto size-12 text-gray-400 dark:text-gray-500" />
                <p class="mt-2 font-medium text-gray-900 dark:text-white">Webhooks</p>
                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Configure incoming webhooks (coming soon)</p>
              </div>
              <div class="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
                <UIcon name="i-lucide-key-round" class="mx-auto size-12 text-gray-400 dark:text-gray-500" />
                <p class="mt-2 font-medium text-gray-900 dark:text-white">API Keys</p>
                <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage API keys for external access (coming soon)</p>
              </div>
            </div>
          </div>

        <!-- Data & Privacy -->
        <div
          id="section-data"
          data-section="data"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-slate-50/80 via-white to-gray-50/30 px-6 py-5 dark:border-gray-800 dark:from-slate-950/30 dark:via-gray-900 dark:to-gray-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-lg shadow-slate-500/25">
                  <UIcon name="i-lucide-database" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Export data and clear local cache</p>
                </div>
              </div>
            </div>
            <div class="space-y-4 p-6">
              <UButton variant="outline" icon="i-lucide-trash-2" @click="clearCache">
                Clear local cache
              </UButton>
              <UButton variant="outline" icon="i-lucide-download" class="ml-2">
                Export data
              </UButton>
              <p v-if="cacheCleared" class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <UIcon name="i-lucide-check-circle" class="size-4" /> Cache cleared successfully
              </p>
            </div>
          </div>

        <!-- About -->
        <div
          id="section-about"
          data-section="about"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/10 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/30"
        >
            <div class="border-b border-gray-100 bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/30 px-6 py-5 dark:border-gray-800 dark:from-teal-950/30 dark:via-gray-900 dark:to-cyan-950/20">
              <div class="flex items-center gap-4">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                  <UIcon name="i-lucide-info" class="size-6" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">About</h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">App version and information</p>
                </div>
              </div>
            </div>
            <div class="space-y-6 p-6">
              <div class="flex flex-wrap items-center gap-4">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Bhoominow Admin</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Admin Panel v1.0</p>
                </div>
                <UBadge color="neutral" variant="soft" size="sm">Nuxt 4</UBadge>
              </div>
              <div class="flex flex-wrap gap-3">
                <NuxtLink
                  to="/"
                  class="inline-flex items-center gap-2 rounded-xl border border-gray-200/80 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                >
                  <UIcon name="i-lucide-home" class="size-4" />
                  Dashboard
                </NuxtLink>
                <NuxtLink
                  to="/analytics"
                  class="inline-flex items-center gap-2 rounded-xl border border-gray-200/80 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                >
                  <UIcon name="i-lucide-bar-chart-3" class="size-4" />
                  Analytics
                </NuxtLink>
              </div>
            </div>
          </div>
      </div>
    </div>
  </div>
</template>
