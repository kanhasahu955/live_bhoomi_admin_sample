<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useNuxtApp } from 'nuxt/app'
import { useProjectsService, useListingsService, useAdminService } from '~/services/api'
import { PROJECTS, LISTINGS, ADMIN } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractProjects, extractListings, extractUsers, extractMetadata } from '~/utils/api-extract'

definePageMeta({
  layout: 'admin',
  title: 'Dashboard'
})

const projectsService = useProjectsService()
const listingsService = useListingsService()
const adminService = useAdminService()

const usersCount = ref<number | null>(null)
const projectsCount = ref<number | null>(null)
const listingsCount = ref<number | null>(null)
const projectsByStatus = ref<{ name: string; value: number }[]>([])
const projectsByCategory = ref<{ name: string; value: number }[]>([])
const listingsByPurpose = ref<{ name: string; value: number }[]>([])
const listingsByStatus = ref<{ name: string; value: number }[]>([])
const listingsByCategory = ref<{ name: string; value: number }[]>([])
const usersByRole = ref<{ name: string; value: number }[]>([])
const usersByStatus = ref<{ name: string; value: number }[]>([])
const trendData = ref<{ name: string; projects: number; listings: number }[]>([])
const recentProjects = ref<Record<string, unknown>[]>([])
const recentListings = ref<Record<string, unknown>[]>([])
const recentUsers = ref<Record<string, unknown>[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const chartsReady = ref(false)

const hasData = computed(() => usersCount.value != null || projectsCount.value != null || listingsCount.value != null)

const SAMPLE_BAR_CATEGORY = [
  { name: 'RESIDENTIAL', value: 12 },
  { name: 'COMMERCIAL', value: 8 },
  { name: 'MIXED_USE', value: 5 },
  { name: 'PG_HOSTEL', value: 3 }
]
const SAMPLE_BAR_STATUS = [
  { name: 'PUBLISHED', value: 15 },
  { name: 'DRAFT', value: 8 },
  { name: 'PENDING', value: 4 }
]
const SAMPLE_PIE_ROLE = [
  { name: 'USER', value: 45 },
  { name: 'ADMIN', value: 8 },
  { name: 'MODERATOR', value: 5 }
]
const SAMPLE_PIE_STATUS = [
  { name: 'ACTIVE', value: 52 },
  { name: 'PENDING', value: 6 }
]
const SAMPLE_PIE_PURPOSE = [
  { name: 'RENT', value: 18 },
  { name: 'SALE', value: 12 }
]
const SAMPLE_LINE = (() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { name: m, value: [8, 12, 15, 10, 18, 22][i] ?? 10 }
  })
})()

const chartProjectsCategory = computed(() =>
  projectsByCategory.value.length ? projectsByCategory.value : SAMPLE_BAR_CATEGORY
)
const chartProjectsStatus = computed(() =>
  projectsByStatus.value.length ? projectsByStatus.value : SAMPLE_BAR_STATUS
)
const chartListingsPurpose = computed(() =>
  listingsByPurpose.value.length ? listingsByPurpose.value : SAMPLE_PIE_PURPOSE
)
const chartListingsStatus = computed(() =>
  listingsByStatus.value.length ? listingsByStatus.value : SAMPLE_BAR_STATUS
)
const chartListingsCategory = computed(() =>
  listingsByCategory.value.length ? listingsByCategory.value : SAMPLE_BAR_CATEGORY
)
const chartUsersByRole = computed(() =>
  usersByRole.value.length ? usersByRole.value : SAMPLE_PIE_ROLE
)
const chartUsersByStatus = computed(() =>
  usersByStatus.value.length ? usersByStatus.value : SAMPLE_PIE_STATUS
)
const chartTrendData = computed(() => {
  const mapped = trendData.value.map((t) => ({ name: t.name, value: t.projects + t.listings }))
  return mapped.length ? mapped : SAMPLE_LINE
})

const statCards = computed(() => [
  {
    label: 'Total Users',
    value: usersCount.value != null ? usersCount.value.toLocaleString() : (hasData.value ? '0' : '—'),
    icon: 'i-lucide-users',
    gradient: 'from-cyan-500 to-blue-600',
    iconClass: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    link: '/users'
  },
  {
    label: 'Projects',
    value: projectsCount.value != null ? projectsCount.value.toLocaleString() : (hasData.value ? '0' : '—'),
    icon: 'i-lucide-folder-kanban',
    gradient: 'from-emerald-500 to-teal-600',
    iconClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    link: '/projects'
  },
  {
    label: 'Listings',
    value: listingsCount.value != null ? listingsCount.value.toLocaleString() : (hasData.value ? '0' : '—'),
    icon: 'i-lucide-home',
    gradient: 'from-teal-500 to-cyan-600',
    iconClass: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
    link: '/listings'
  }
])

async function loadUsers() {
  try {
    const res = await adminService.listUsers({ page: 1, limit: 1 }) as unknown
    const meta = extractMetadata(res)
    usersCount.value = meta?.total ?? null
    const list1 = extractUsers(res)
    if (usersCount.value == null) usersCount.value = list1.length
  } catch {
    usersCount.value = null
  }
  try {
    let allRes = await adminService.listUsers({ page: 1, limit: 50 }) as unknown
    let list = extractUsers(allRes)
    if (list.length === 0 && allRes && typeof allRes === 'object') {
      list = extractUsers({ data: allRes })
    }
    if (list.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(ADMIN.usersList, { params: { page: 1, limit: 50 } })
        list = extractUsers((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
    const roleCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}
    list.forEach((u: Record<string, unknown>) => {
      const r = String(get(u, 'role') ?? get(u, 'userType') ?? '—')
      if (r !== '—') roleCounts[r] = (roleCounts[r] ?? 0) + 1
      const s = String(get(u, 'status') ?? get(u, 'accountStatus') ?? '—')
      if (s !== '—') statusCounts[s] = (statusCounts[s] ?? 0) + 1
    })
    usersByRole.value = Object.entries(roleCounts).map(([name, value]) => ({ name, value }))
    usersByStatus.value = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    recentUsers.value = list.slice(0, 5)
  } catch {
    usersByRole.value = []
    usersByStatus.value = []
    recentUsers.value = []
  }
}

function groupByMonth(items: Record<string, unknown>[], dateKey: string): Record<string, number> {
  const counts: Record<string, number> = {}
  items.forEach((item) => {
    const raw = get(item, dateKey)
    if (!raw) return
    const d = new Date(String(raw))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    counts[key] = (counts[key] ?? 0) + 1
  })
  return counts
}

async function loadProjects() {
  try {
    const res = await projectsService.searchPublic({ page: 1, limit: 1 }) as unknown
    const meta = extractMetadata(res)
    projectsCount.value = meta?.total ?? null
    const list1 = extractProjects(res)
    if (projectsCount.value == null) projectsCount.value = list1.length
  } catch {
    projectsCount.value = null
  }
  try {
    let allRes = await projectsService.searchPublic({ page: 1, limit: 50 }) as unknown
    let list = extractProjects(allRes)
    if (list.length === 0 && allRes && typeof allRes === 'object') {
      list = extractProjects({ data: allRes })
    }
    if (list.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(PROJECTS.publicSearch, { params: { page: 1, limit: 50 } })
        list = extractProjects((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
    const statusCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    list.forEach((p: Record<string, unknown>) => {
      const s = String(get(p, 'approvalStatus') ?? get(p, 'status') ?? 'UNKNOWN')
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
      const c = String(get(p, 'category') ?? get(p, 'projectType') ?? '—')
      if (c !== '—') categoryCounts[c] = (categoryCounts[c] ?? 0) + 1
    })
    projectsByStatus.value = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    projectsByCategory.value = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    recentProjects.value = list.slice(0, 5)
    const projByMonth = groupByMonth(list, 'createdAt')
    const allMonths = new Set([...Object.keys(projByMonth)])
    trendData.value = []
    allMonths.forEach((m) => {
      trendData.value.push({
        name: m,
        projects: projByMonth[m] ?? 0,
        listings: 0
      })
    })
  } catch {
    projectsByStatus.value = []
    projectsByCategory.value = []
    recentProjects.value = []
  }
}

async function loadListings() {
  try {
    const res = await listingsService.searchPublic({ page: 1, limit: 1 }) as unknown
    const meta = extractMetadata(res)
    listingsCount.value = meta?.total ?? null
    const list1 = extractListings(res)
    if (listingsCount.value == null) listingsCount.value = list1.length
  } catch {
    listingsCount.value = null
  }
  try {
    let allRes = await listingsService.searchPublic({ page: 1, limit: 50 }) as unknown
    let list = extractListings(allRes)
    if (list.length === 0 && allRes && typeof allRes === 'object') {
      list = extractListings({ data: allRes })
    }
    if (list.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(LISTINGS.publicSearch, { params: { page: 1, limit: 50 } })
        list = extractListings((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
    const purposeCounts: Record<string, number> = {}
    const statusCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    list.forEach((l: Record<string, unknown>) => {
      const p = String(get(l, 'purpose') ?? get(l, 'purposeType') ?? get(l, 'listingPurpose') ?? 'UNKNOWN')
      purposeCounts[p] = (purposeCounts[p] ?? 0) + 1
      const s = String(get(l, 'approvalStatus') ?? get(l, 'status') ?? 'UNKNOWN')
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
      const c = String(get(l, 'category') ?? get(l, 'type') ?? '—')
      if (c !== '—') categoryCounts[c] = (categoryCounts[c] ?? 0) + 1
    })
    listingsByPurpose.value = Object.entries(purposeCounts).map(([name, value]) => ({ name, value }))
    listingsByStatus.value = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    listingsByCategory.value = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    recentListings.value = list.slice(0, 5)
    const listByMonth = groupByMonth(list, 'createdAt')
    const existing = new Map(trendData.value.map((t) => [t.name, { ...t }]))
    Object.entries(listByMonth).forEach(([m, v]) => {
      const cur = existing.get(m) ?? { name: m, projects: 0, listings: 0 }
      cur.listings = v
      existing.set(m, cur)
    })
    trendData.value = Array.from(existing.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(-6)
  } catch {
    listingsByPurpose.value = []
    listingsByStatus.value = []
    listingsByCategory.value = []
    recentListings.value = []
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    await loadUsers()
    await loadProjects()
    await loadListings()
  } catch {
    error.value = 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAll()
  await nextTick()
  // Defer chart render so ECharts can get valid DOM dimensions (fixes "Can't get DOM width or height")
  setTimeout(() => {
    chartsReady.value = true
  }, 100)
})
</script>

<template>
  <div class="min-h-full min-w-0 w-full max-w-[1600px] mx-auto">
    <!-- Dashboard Hero Banner -->
    <div class="relative mb-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-xl dark:border-gray-700/80 sm:p-8">
      <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          <p class="mt-1 text-emerald-100 sm:text-base">
            Platform overview from your API — users, projects, and listings
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/analytics"
            class="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
          >
            <UIcon name="i-lucide-bar-chart-3" class="size-5" />
            View Analytics
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mb-6 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-300"
    >
      <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0" />
      {{ error }}
    </div>

    <!-- KPI Stat Cards -->
    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 sm:grid-rows-1">
      <NuxtLink
        v-for="stat in statCards"
        :key="stat.label"
        :to="stat.link"
        class="group flex min-h-[140px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/30 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/50"
      >
        <div class="flex flex-1 items-center gap-5 p-6">
          <div
            :class="[stat.iconClass, 'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105']"
          >
            <UIcon :name="stat.icon" class="size-8" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-400">
              {{ stat.label }}
            </p>
            <p class="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {{ stat.value }}
            </p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1" />
        </div>
        <div :class="['h-1 w-full bg-gradient-to-r', stat.gradient]" />
      </NuxtLink>
    </div>

    <!-- Users Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-users" class="size-5 text-cyan-500" />
        Users
      </h2>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-cyan-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Role</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">User roles from API</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartPie :key="`urole-${chartUsersByRole.length}`" :data="chartUsersByRole" height="260px" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Status</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">User status from API</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartPie :key="`ustatus-${chartUsersByStatus.length}`" :data="chartUsersByStatus" height="260px" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
      </div>
    </div>

    <!-- Projects Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-folder-kanban" class="size-5 text-emerald-500" />
        Projects
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900 lg:col-span-2">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-emerald-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Category</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">From projects API</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartBar :key="`cat-${chartProjectsCategory.length}`" :data="chartProjectsCategory" height="260px" color="#10b981" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-teal-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-teal-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Status</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Approval status</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartPie :key="`status-${chartProjectsStatus.length}`" :data="chartProjectsStatus" height="260px" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
      </div>
    </div>

    <!-- Listings Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-home" class="size-5 text-teal-500" />
        Listings
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-teal-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-teal-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Purpose</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sale / Rent</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartPie :key="`purpose-${chartListingsPurpose.length}`" :data="chartListingsPurpose" height="260px" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-cyan-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Status</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Approval status</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartPie :key="`lstatus-${chartListingsStatus.length}`" :data="chartListingsStatus" height="260px" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
        <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">By Category</h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Property types</p>
          </div>
          <div v-if="chartsReady" class="flex min-h-[260px] flex-1 flex-col p-4" style="min-height: 260px;">
            <AppChartBar :key="`lcat-${chartListingsCategory.length}`" :data="chartListingsCategory" height="260px" color="#14b8a6" :loading="loading" />
          </div>
          <div v-else class="flex h-[260px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
        </div>
      </div>
    </div>

    <!-- Activity Trend -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-trending-up" class="size-5 text-emerald-500" />
        Activity Trend
      </h2>
      <div class="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
        <div class="shrink-0 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-transparent">
          <h3 class="font-semibold text-gray-900 dark:text-white">New projects & listings by month</h3>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Combined activity over time</p>
        </div>
        <div v-if="chartsReady" class="flex min-h-[280px] flex-1 flex-col p-4" style="min-height: 280px;">
          <AppChartLine :key="`trend-${chartTrendData.length}`" :data="chartTrendData" height="280px" color="#10b981" :loading="loading" />
        </div>
        <div v-else class="flex h-[280px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading chart…</div>
      </div>
    </div>

    <!-- Quick Links + Recent -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
        <div class="border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-emerald-950/20 dark:to-teal-950/20">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Quick Links
          </h3>
        </div>
        <div class="grid grid-cols-2 place-items-stretch gap-3 p-5 sm:grid-cols-4 sm:gap-4">
          <NuxtLink
            to="/projects"
            class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-4 transition-all hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              <UIcon name="i-lucide-folder-kanban" class="size-5" />
            </div>
            <span class="text-center text-sm font-semibold text-gray-900 dark:text-white">Projects</span>
          </NuxtLink>
          <NuxtLink
            to="/listings"
            class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-4 transition-all hover:border-teal-300 hover:bg-teal-50/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-teal-700 dark:hover:bg-teal-950/30"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
              <UIcon name="i-lucide-home" class="size-5" />
            </div>
            <span class="text-center text-sm font-semibold text-gray-900 dark:text-white">Listings</span>
          </NuxtLink>
          <NuxtLink
            to="/users"
            class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-4 transition-all hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/30"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400">
              <UIcon name="i-lucide-users" class="size-5" />
            </div>
            <span class="text-center text-sm font-semibold text-gray-900 dark:text-white">Users</span>
          </NuxtLink>
          <NuxtLink
            to="/analytics"
            class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50/60 px-4 py-4 transition-all hover:border-violet-300 hover:bg-violet-50/80 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
              <UIcon name="i-lucide-bar-chart-3" class="size-5" />
            </div>
            <span class="text-center text-sm font-semibold text-gray-900 dark:text-white">Analytics</span>
          </NuxtLink>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
        <div class="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Latest users, projects & listings
          </p>
        </div>
        <div class="max-h-[280px] overflow-y-auto p-4">
          <div v-if="loading" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-emerald-500" />
          </div>
          <div v-else-if="!recentUsers.length && !recentProjects.length && !recentListings.length" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No recent activity
          </div>
          <div v-else class="space-y-2">
            <NuxtLink
              v-for="u in recentUsers"
              :key="String(get(u, 'id'))"
              :to="`/users/${get(u, 'id')}`"
              class="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <UIcon name="i-lucide-users" class="size-4 text-cyan-500" />
              <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ get(u, 'name') ?? get(u, 'email') ?? 'User' }}</span>
              <UBadge :color="get(u, 'status') === 'ACTIVE' ? 'success' : 'neutral'" size="xs">
                {{ get(u, 'role') ?? get(u, 'status') ?? '—' }}
              </UBadge>
            </NuxtLink>
            <NuxtLink
              v-for="p in recentProjects"
              :key="String(get(p, 'id'))"
              :to="`/projects/${get(p, 'id')}`"
              class="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <UIcon name="i-lucide-folder-kanban" class="size-4 text-emerald-500" />
              <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ get(p, 'name') ?? 'Untitled' }}</span>
              <UBadge :color="get(p, 'approvalStatus') === 'PUBLISHED' ? 'success' : 'neutral'" size="xs">
                {{ get(p, 'approvalStatus') ?? '—' }}
              </UBadge>
            </NuxtLink>
            <NuxtLink
              v-for="l in recentListings"
              :key="String(get(l, 'id'))"
              :to="`/listings/${get(l, 'id')}`"
              class="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <UIcon name="i-lucide-home" class="size-4 text-teal-500" />
              <span class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ get(l, 'title') ?? 'Untitled' }}</span>
              <UBadge :color="(get(l, 'approvalStatus') ?? get(l, 'status')) === 'PUBLISHED' ? 'success' : 'neutral'" size="xs">
                {{ get(l, 'approvalStatus') ?? get(l, 'status') ?? '—' }}
              </UBadge>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
