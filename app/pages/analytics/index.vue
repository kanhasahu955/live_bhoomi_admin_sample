<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp } from 'nuxt/app'
import { useProjectsService, useListingsService, useAdminService } from '~/services/api'
import { PROJECTS, LISTINGS, ADMIN } from '~/services/api'
import { get, countBy } from '~/utils/lodash'
import { extractProjects, extractListings, extractUsers } from '~/utils/api-extract'

definePageMeta({
  layout: 'admin',
  title: 'Analytics'
})

const projectsService = useProjectsService()
const listingsService = useListingsService()
const adminService = useAdminService()

const loading = ref(true)
const error = ref<string | null>(null)

const projects = ref<Record<string, unknown>[]>([])
const listings = ref<Record<string, unknown>[]>([])
const users = ref<Record<string, unknown>[]>([])

const projectsByStatus = computed(() => {
  const counts = countBy(projects.value, (p) => String(get(p, 'approvalStatus') ?? get(p, 'status') ?? 'UNKNOWN'))
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

const projectsByCategory = computed(() => {
  const counts = countBy(projects.value, (p) => String(get(p, 'category') ?? get(p, 'projectType') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const projectsByCity = computed(() => {
  const counts = countBy(projects.value, (p) => String(get(p, 'city') ?? get(p, 'locality') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

const listingsByStatus = computed(() => {
  const counts = countBy(listings.value, (l) => String(get(l, 'approvalStatus') ?? get(l, 'status') ?? 'UNKNOWN'))
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
})

const listingsByPurpose = computed(() => {
  const counts = countBy(listings.value, (l) => String(get(l, 'purpose') ?? get(l, 'purposeType') ?? get(l, 'listingPurpose') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const listingsByCategory = computed(() => {
  const counts = countBy(listings.value, (l) => String(get(l, 'category') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const usersByRole = computed(() => {
  const counts = countBy(users.value, (u) => String(get(u, 'role') ?? get(u, 'userType') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
})

const usersByStatus = computed(() => {
  const counts = countBy(users.value, (u) => String(get(u, 'status') ?? '—'))
  return Object.entries(counts)
    .filter(([name]) => name !== '—')
    .map(([name, value]) => ({ name, value }))
})

const DEMO_PIE = [{ name: 'PUBLISHED', value: 15 }, { name: 'PENDING', value: 5 }]
const DEMO_BAR = [{ name: 'Residential', value: 12 }, { name: 'Commercial', value: 8 }, { name: 'Plot', value: 5 }]

const chartProjectsStatus = computed(() => projectsByStatus.value.length ? projectsByStatus.value : DEMO_PIE)
const chartProjectsCategory = computed(() => projectsByCategory.value.length ? projectsByCategory.value : DEMO_BAR)
const chartProjectsCity = computed(() => projectsByCity.value.length ? projectsByCity.value : DEMO_BAR.slice(0, 5))
const chartListingsStatus = computed(() => listingsByStatus.value.length ? listingsByStatus.value : DEMO_PIE)
const chartListingsPurpose = computed(() => listingsByPurpose.value.length ? listingsByPurpose.value : [{ name: 'SALE', value: 10 }, { name: 'RENT', value: 8 }])
const chartListingsCategory = computed(() => listingsByCategory.value.length ? listingsByCategory.value : DEMO_BAR)

const summaryStats = computed(() => [
  { label: 'Users', value: users.value.length, icon: 'i-lucide-users', gradient: 'from-cyan-500 to-blue-600', iconClass: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' },
  { label: 'Projects', value: projects.value.length, icon: 'i-lucide-folder-kanban', gradient: 'from-emerald-500 to-teal-600', iconClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  { label: 'Listings', value: listings.value.length, icon: 'i-lucide-home', gradient: 'from-teal-500 to-cyan-600', iconClass: 'bg-teal-500/20 text-teal-600 dark:text-teal-400' }
])

async function loadProjects() {
  try {
    let res = await projectsService.searchPublic({ page: 1, limit: 500 }) as unknown
    projects.value = extractProjects(res)
    if (projects.value.length === 0 && res && typeof res === 'object') {
      projects.value = extractProjects({ data: res })
    }
    if (projects.value.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(PROJECTS.publicSearch, { params: { page: 1, limit: 500 } })
        projects.value = extractProjects((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
  } catch {
    projects.value = []
  }
}

async function loadListings() {
  try {
    let res = await listingsService.searchPublic({ page: 1, limit: 500 }) as unknown
    listings.value = extractListings(res)
    if (listings.value.length === 0 && res && typeof res === 'object') {
      listings.value = extractListings({ data: res })
    }
    if (listings.value.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(LISTINGS.publicSearch, { params: { page: 1, limit: 500 } })
        listings.value = extractListings((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
  } catch {
    listings.value = []
  }
}

async function loadUsers() {
  try {
    let res = await adminService.listUsers() as unknown
    users.value = extractUsers(res)
    if (users.value.length === 0 && res && typeof res === 'object') {
      users.value = extractUsers({ data: res })
    }
    if (users.value.length === 0 && import.meta.client) {
      try {
        const { $api } = useNuxtApp()
        const raw = await $api.get(ADMIN.usersList, { params: { page: 1, limit: 500 } })
        users.value = extractUsers((raw as { data?: unknown })?.data ?? raw)
      } catch {
        /* ignore */
      }
    }
  } catch {
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

onMounted(loadAll)
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
          <p class="mt-1 text-violet-100 sm:text-base">
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
              Approval status from API
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartPie
                :data="chartProjectsStatus"
                height="260px"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-emerald-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!projectsByStatus.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-teal-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-teal-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Category
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Project categories
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartBar
                :data="chartProjectsCategory"
                height="260px"
                color="#10b981"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-teal-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!projectsByCategory.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Top Cities
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Geographic distribution
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartBar
                :data="chartProjectsCity"
                height="260px"
                color="#14b8a6"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!projectsByCity.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
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
              Approval status from API
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartPie
                :data="chartListingsStatus"
                height="260px"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-teal-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!listingsByStatus.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Purpose
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Sale / Rent breakdown
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartPie
                :data="chartListingsPurpose"
                height="260px"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!listingsByPurpose.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
          </div>
        </div>
        <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900">
          <div class="border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Category
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Property categories
            </p>
          </div>
          <div class="p-4 min-h-[300px]">
            <ClientOnly>
              <AppChartBar
                :data="chartListingsCategory"
                height="260px"
                color="#0d9488"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[260px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-violet-500" />
                </div>
              </template>
            </ClientOnly>
            <p v-if="!listingsByCategory.length && !loading" class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">Sample data — connect API for real data</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Analytics Section -->
    <div>
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <UIcon name="i-lucide-users" class="size-5 text-cyan-500" />
        Users Analytics
      </h2>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          v-if="usersByRole.length"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900"
        >
          <div class="border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-cyan-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Role
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              User roles from API
            </p>
          </div>
          <div class="p-4">
            <ClientOnly>
              <AppChartPie
                :data="usersByRole"
                height="280px"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[280px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-cyan-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div
          v-if="usersByStatus.length"
          class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-md dark:border-gray-700/80 dark:bg-gray-900"
        >
          <div class="border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent px-5 py-4 dark:border-gray-800 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-transparent">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              By Status
            </h3>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              User status from API
            </p>
          </div>
          <div class="p-4">
            <ClientOnly>
              <AppChartPie
                :data="usersByStatus"
                height="280px"
                :loading="loading"
              />
              <template #fallback>
                <div class="flex h-[280px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-blue-500" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
        <div
          v-if="!usersByRole.length && !usersByStatus.length && !loading"
          class="col-span-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-20 dark:border-gray-700 dark:bg-gray-900/50"
        >
          <UIcon name="i-lucide-users" class="size-16 text-gray-300 dark:text-gray-600" />
          <p class="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            No user analytics data available
          </p>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
            User role/status data will appear here when available from the API
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
