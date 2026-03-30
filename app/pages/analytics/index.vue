<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { bucketField, pickCreatedAt } from '~/utils/chart-buckets'
import { useAdminAnalyticsData } from '~/composables/useAdminAnalyticsData'
import { getFetchErrorMessage } from '~/utils/api-errors'
import { CHART_STATIC, chartSeries, STATIC_DASHBOARD_KPIS } from '~/utils/chart-static-fallback'
import AppChartPie from '~/components/charts/AppChartPie.vue'
import AppChartBar from '~/components/charts/AppChartBar.vue'
import AppChartLine from '~/components/charts/AppChartLine.vue'

const ANALYTICS_USE_STATIC_SAMPLE = false

const donutRadius = ['42%', '68%'] as [string, string]
const donutRadiusAlt = ['45%', '72%'] as [string, string]

definePageMeta({
  layout: 'admin',
  title: 'Analytics'
})

const { fetchUsers, fetchProjects, fetchListings } = useAdminAnalyticsData()

const loading = ref(true)
const error = ref<string | null>(null)
const usersLoadError = ref<string | null>(null)
const projectsLoadError = ref<string | null>(null)
const listingsLoadError = ref<string | null>(null)

const projects = ref<Record<string, unknown>[]>([])
const listings = ref<Record<string, unknown>[]>([])
const users = ref<Record<string, unknown>[]>([])
const totalUsers = ref(0)
const totalProjects = ref(0)
const totalListings = ref(0)

const projectsByStatus = computed(() => {
  const counts: Record<string, number> = {}
  projects.value.forEach((p) => {
    const k = bucketField(p, ['approvalStatus', 'approval_status', 'status'], 'UNKNOWN')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

const projectsByCategory = computed(() => {
  const counts: Record<string, number> = {}
  projects.value.forEach((p) => {
    const k = bucketField(p, ['category', 'projectType', 'project_type', 'type'], 'Unknown')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const projectsByCity = computed(() => {
  const counts: Record<string, number> = {}
  projects.value.forEach((p) => {
    const k = bucketField(p, ['city', 'locality', 'address.city'], 'Unknown')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

const listingsByStatus = computed(() => {
  const counts: Record<string, number> = {}
  listings.value.forEach((l) => {
    const k = bucketField(l, ['approvalStatus', 'approval_status', 'status'], 'UNKNOWN')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

const listingsByPurpose = computed(() => {
  const counts: Record<string, number> = {}
  listings.value.forEach((l) => {
    const k = bucketField(l, ['purpose', 'purposeType', 'listingPurpose', 'purpose_type'], 'UNKNOWN')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const listingsByCategory = computed(() => {
  const counts: Record<string, number> = {}
  listings.value.forEach((l) => {
    const k = bucketField(l, ['category', 'type', 'propertyType'], 'Unknown')
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const usersByRole = computed(() => {
  const counts: Record<string, number> = {}
  users.value.forEach((u) => {
    const k = bucketField(u, ['systemRole', 'system_role', 'role', 'userType', 'user_type'])
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

const usersByStatus = computed(() => {
  const counts: Record<string, number> = {}
  users.value.forEach((u) => {
    const k = bucketField(u, ['status', 'accountStatus', 'account_status'])
    counts[k] = (counts[k] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

function groupByMonth(items: Record<string, unknown>[]): Record<string, number> {
  const counts: Record<string, number> = {}
  items.forEach((item) => {
    const raw = pickCreatedAt(item)
    if (!raw) return
    const t = new Date(String(raw)).getTime()
    if (!Number.isFinite(t)) return
    const d = new Date(t)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    counts[key] = (counts[key] ?? 0) + 1
  })
  return counts
}

/** Combined projects + listings per month (same idea as dashboard activity trend) */
const analyticsActivityByMonth = computed(() => {
  const proj = groupByMonth(projects.value)
  const list = groupByMonth(listings.value)
  const keys = new Set([...Object.keys(proj), ...Object.keys(list)])
  return Array.from(keys)
    .map((name) => ({ name, value: (proj[name] ?? 0) + (list[name] ?? 0) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-12)
})

const chartProjectsStatus = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.projectsByStatus] : chartSeries(projectsByStatus.value, CHART_STATIC.projectsByStatus)
)
const chartProjectsCategory = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.projectsByCategory] : chartSeries(projectsByCategory.value, CHART_STATIC.projectsByCategory)
)
const chartProjectsCity = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.projectsByCity] : chartSeries(projectsByCity.value, CHART_STATIC.projectsByCity)
)
const chartListingsStatus = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.listingsByStatus] : chartSeries(listingsByStatus.value, CHART_STATIC.listingsByStatus)
)
const chartListingsPurpose = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.listingsByPurpose] : chartSeries(listingsByPurpose.value, CHART_STATIC.listingsByPurpose)
)
const chartListingsCategory = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.listingsByCategory] : chartSeries(listingsByCategory.value, CHART_STATIC.listingsByCategory)
)
const chartUsersByRole = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.usersByRole] : chartSeries(usersByRole.value, CHART_STATIC.usersByRole)
)
const chartUsersByStatus = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE ? [...CHART_STATIC.usersByStatus] : chartSeries(usersByStatus.value, CHART_STATIC.usersByStatus)
)

const chartAnalyticsTrend = computed(() =>
  ANALYTICS_USE_STATIC_SAMPLE
    ? [...CHART_STATIC.activityTrend]
    : chartSeries(analyticsActivityByMonth.value, CHART_STATIC.activityTrend)
)

const summaryStats = computed(() => [
  {
    label: 'Users',
    value: totalUsers.value,
    icon: 'i-lucide-users',
    gradient: 'from-cyan-500 to-blue-600',
    iconClass: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
  },
  {
    label: 'Projects',
    value: totalProjects.value,
    icon: 'i-lucide-folder-kanban',
    gradient: 'from-emerald-500 to-teal-600',
    iconClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  },
  {
    label: 'Listings',
    value: totalListings.value,
    icon: 'i-lucide-home',
    gradient: 'from-teal-500 to-cyan-600',
    iconClass: 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
  }
])

async function loadProjects() {
  projectsLoadError.value = null
  try {
    const { total, rows } = await fetchProjects()
    totalProjects.value = total
    projects.value = rows
  } catch (e) {
    projectsLoadError.value = getFetchErrorMessage(e)
    totalProjects.value = 0
    projects.value = []
  }
}

async function loadListings() {
  listingsLoadError.value = null
  try {
    const { total, rows } = await fetchListings()
    totalListings.value = total
    listings.value = rows
  } catch (e) {
    listingsLoadError.value = getFetchErrorMessage(e)
    totalListings.value = 0
    listings.value = []
  }
}

async function loadUsers() {
  usersLoadError.value = null
  try {
    const { total, rows } = await fetchUsers()
    totalUsers.value = total
    users.value = rows
  } catch (e) {
    usersLoadError.value = getFetchErrorMessage(e)
    totalUsers.value = 0
    users.value = []
  }
}

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    await Promise.all([loadProjects(), loadListings(), loadUsers()])
  } catch {
    error.value = 'Failed to load analytics data'
  } finally {
    loading.value = false
  }
}

function applyStaticAnalytics() {
  error.value = null
  totalUsers.value = STATIC_DASHBOARD_KPIS.users
  totalProjects.value = STATIC_DASHBOARD_KPIS.projects
  totalListings.value = STATIC_DASHBOARD_KPIS.listings
  users.value = []
  projects.value = []
  listings.value = []
  loading.value = false
}

onMounted(() => {
  if (ANALYTICS_USE_STATIC_SAMPLE) {
    applyStaticAnalytics()
    return
  }
  loadAll()
})
</script>

<template>
  <div class="min-h-full min-w-0 w-full max-w-[1600px] mx-auto">
    <!-- Analytics Hero Banner -->
    <div class="relative mb-8 overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 shadow-xl dark:border-gray-700/80 sm:p-8">
      <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Analytics
          </h1>
          <p v-if="ANALYTICS_USE_STATIC_SAMPLE" class="mt-1 text-violet-100 sm:text-base">
            Sample breakdowns for preview (no API). Set <code class="rounded bg-white/15 px-1">ANALYTICS_USE_STATIC_SAMPLE</code> to <code class="rounded bg-white/15 px-1">false</code> in <code class="rounded bg-white/15 px-1">analytics/index.vue</code> for live data.
          </p>
          <p v-else class="mt-1 text-violet-100 sm:text-base">
            Platform analytics from your API — projects, listings, and users
          </p>
        </div>
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
        >
          <UIcon name="i-lucide-layout-dashboard" class="size-5" />
          Back to Dashboard
        </NuxtLink>
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

    <div
      v-if="usersLoadError || projectsLoadError || listingsLoadError"
      class="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-300"
    >
      <p class="font-medium">Some requests failed:</p>
      <ul class="mt-1 list-inside list-disc space-y-0.5">
        <li v-if="usersLoadError">Users: {{ usersLoadError }}</li>
        <li v-if="projectsLoadError">Projects: {{ projectsLoadError }}</li>
        <li v-if="listingsLoadError">Listings: {{ listingsLoadError }}</li>
      </ul>
    </div>

    <!-- Summary KPI Cards -->
    <div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      <div
        v-for="stat in summaryStats"
        :key="stat.label"
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/30 transition-all hover:shadow-xl dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-gray-900/50"
      >
        <div class="flex items-center gap-5 p-6">
          <div :class="[stat.iconClass, 'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-transform hover:scale-105']">
            <UIcon :name="stat.icon" class="size-8" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ stat.label }}
            </p>
            <p class="mt-0.5 text-3xl font-bold text-gray-900 dark:text-white">
              {{ stat.value.toLocaleString() }}
            </p>
          </div>
        </div>
        <div :class="['h-1 w-full bg-gradient-to-r', stat.gradient]" />
      </div>
    </div>

    <!-- Projects Analytics Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-folder-kanban" class="size-5 text-emerald-500" />
        Projects Analytics
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-emerald-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Status
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Approval status from API' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartPie
                :data="chartProjectsStatus"
                height="260px"
                :radius="donutRadius"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-emerald-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-teal-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-teal-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Category
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Project categories' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartBar :data="chartProjectsCategory" height="260px" color="#10b981" :loading="loading" />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-teal-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Top Cities
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Geographic distribution' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartBar :data="chartProjectsCity" height="260px" color="#0ea5e9" :loading="loading" />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Listings Analytics Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-home" class="size-5 text-teal-500" />
        Listings Analytics
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-teal-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-teal-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Status
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Approval status from API' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartPie :data="chartListingsStatus" height="260px" :loading="loading" />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-teal-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Purpose
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Sale / Rent breakdown' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartBar :data="chartListingsPurpose" height="260px" color="#06b6d4" :loading="loading" />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Category
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'Property categories' }}
            </p>
          </div>
          <div class="p-2 min-h-[260px]">
            <ClientOnly>
              <AppChartPie
                :data="chartListingsCategory"
                height="260px"
                :radius="donutRadiusAlt"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-violet-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Analytics Section -->
    <div class="mb-8">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-users" class="size-5 text-cyan-500" />
        Users Analytics
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900"
        >
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Role
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'User roles from API' }}
            </p>
          </div>
          <div class="p-2 min-h-[280px]">
            <ClientOnly>
              <AppChartBar :data="chartUsersByRole" height="280px" color="#0891b2" :loading="loading" />
              <template #fallback>
                <div class="flex h-[280px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900"
        >
          <div class="border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Status
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample data' : 'User status from API' }}
            </p>
          </div>
          <div class="p-2 min-h-[280px]">
            <ClientOnly>
              <AppChartPie :data="chartUsersByStatus" height="280px" :loading="loading" />
              <template #fallback>
                <div class="flex h-[280px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-blue-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity trend (sample / fallback series) -->
    <div>
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-trending-up" class="size-5 text-violet-500" />
        Activity trend
      </h2>
      <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
        <div class="border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Combined activity by month
          </h3>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {{ ANALYTICS_USE_STATIC_SAMPLE ? 'Sample time series' : 'New projects + listings by month (from created/updated dates on loaded rows)' }}
          </p>
        </div>
        <div class="p-2 min-h-[300px]">
          <ClientOnly>
            <AppChartLine :data="chartAnalyticsTrend" height="300px" color="#7c3aed" :loading="loading" />
            <template #fallback>
              <div class="flex h-[300px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-violet-500" />
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>
  </div>
</template>
