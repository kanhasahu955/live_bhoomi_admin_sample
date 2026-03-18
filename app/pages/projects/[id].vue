<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProjectsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'

definePageMeta({
  layout: 'admin',
  title: 'Project Details'
})

const route = useRoute()
const router = useRouter()
const projectsService = useProjectsService()
const adminService = useAdminService()

const projectId = computed(() => route.params.id as string)
const project = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const staggerDelays = [0, 80, 160, 240, 320, 400]

function extractProject(res: unknown): Record<string, unknown> | null {
  const obj = res as Record<string, unknown>
  if (!obj) return null
  const inner = get(obj, 'data') as Record<string, unknown> | undefined
  return (inner && typeof inner === 'object' && 'id' in inner ? inner : obj) as Record<string, unknown>
}

async function loadProject() {
  if (!projectId.value) return
  loading.value = true
  error.value = null
  try {
    const res = await projectsService.getById(projectId.value)
    project.value = extractProject(res)
    if (!project.value?.id) {
      const listRes = await projectsService.searchPublic({ page: 1, limit: 100 }) as { projects?: Record<string, unknown>[] }
      const list = get(listRes, 'projects') ?? []
      const item = list.find((p) => String(get(p, 'id')) === projectId.value) as Record<string, unknown> | undefined
      project.value = item ?? null
    }
  } catch {
    try {
      const listRes = await projectsService.searchPublic({ page: 1, limit: 100 }) as { projects?: Record<string, unknown>[] }
      const list = get(listRes, 'projects') ?? []
      const item = list.find((p) => String(get(p, 'id')) === projectId.value) as Record<string, unknown> | undefined
      project.value = item ?? null
    } catch {
      error.value = 'Failed to load project'
      project.value = null
    }
  } finally {
    loading.value = false
  }
}

async function publishProject() {
  if (!projectId.value) return
  saving.value = true
  error.value = null
  try {
    await adminService.publishProject(projectId.value)
    await loadProject()
  } catch {
    error.value = 'Failed to publish project'
  } finally {
    saving.value = false
  }
}

async function rejectProject(reason?: string) {
  if (!projectId.value) return
  saving.value = true
  error.value = null
  try {
    await adminService.rejectProject(projectId.value, reason ? { reason } : undefined)
    await loadProject()
  } catch {
    error.value = 'Failed to reject project'
  } finally {
    saving.value = false
  }
}

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function formatArea(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString()} sq ft`
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  try {
    const d = new Date(String(value))
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return String(value)
  }
}

function mapUrl(): string {
  const lat = get(project.value, 'latitude')
  const lng = get(project.value, 'longitude')
  const addr = get(project.value, 'fullAddress') || [get(project.value, 'locality'), get(project.value, 'city'), get(project.value, 'state')].filter(Boolean).join(', ')
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(addr))}`
  }
  return ''
}

const hasMapUrl = computed(() => !!mapUrl())

const hasCoords = computed(() => {
  const lat = get(project.value, 'latitude')
  const lng = get(project.value, 'longitude')
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
})

const osmEmbedUrl = computed(() => {
  const lat = Number(get(project.value, 'latitude'))
  const lng = Number(get(project.value, 'longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const delta = 0.015
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(',')
  const marker = `${lat},${lng}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(marker)}`
})

const amenities = computed(() => {
  const a = get(project.value, 'amenities')
  return Array.isArray(a) ? a : []
})

function goBack() {
  router.push('/projects')
}

onMounted(loadProject)
</script>

<template>
  <div class="min-h-full min-w-0 w-full overflow-x-hidden">
    <div class="flex flex-row flex-wrap items-center justify-between gap-4 min-w-0 overflow-hidden">
      <div class="flex min-w-0 items-center gap-4">
        <NuxtLink
          to="/projects"
          class="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          Back
        </NuxtLink>
        <AppPageHeader
          :title="project ? String(get(project, 'name') ?? 'Project') : 'Project Details'"
          description="View and manage project details"
        />
      </div>
      <div v-if="project" class="flex shrink-0 flex-row flex-nowrap items-center gap-3">
        <AppButton
          v-if="get(project, 'approvalStatus') !== 'PUBLISHED'"
          size="sm"
          :loading="saving"
          class="!rounded-xl !px-4 !py-2.5 !font-semibold !shadow-md !shadow-emerald-500/25 transition-all hover:!shadow-lg hover:!shadow-emerald-500/30"
          @click="publishProject"
        >
          <UIcon name="i-lucide-check-circle" class="size-4" />
          Publish
        </AppButton>
        <AppButton
          v-if="get(project, 'approvalStatus') !== 'REJECTED'"
          variant="outline"
          size="sm"
          :loading="saving"
          class="!rounded-xl !border-red-200 !px-4 !py-2.5 !font-semibold text-red-600 transition-all hover:!border-red-300 hover:!bg-red-50 hover:!shadow-md dark:!border-red-800 dark:text-red-400 dark:hover:!bg-red-950/30"
          @click="rejectProject()"
        >
          <UIcon name="i-lucide-x-circle" class="size-4" />
          Reject
        </AppButton>
      </div>
    </div>

    <div class="mt-4">
    <Transition name="profile-notification">
      <div
        v-if="error"
        class="profile-animate-fade-up opacity-0 mb-4 flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-400"
      >
        <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0" />
        {{ error }}
      </div>
    </Transition>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white/80 py-12 shadow-sm backdrop-blur dark:border-gray-700/80 dark:bg-gray-900/80"
    >
      <div class="relative">
        <div class="h-14 w-14 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500 dark:border-gray-700" />
        <UIcon name="i-lucide-building-2" class="absolute inset-0 m-auto h-6 w-6 text-emerald-500" />
      </div>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading project...</p>
    </div>

    <!-- Not found -->
    <div
      v-else-if="!project"
      class="profile-animate-fade-up opacity-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white py-12 dark:border-gray-700/80 dark:bg-gray-900"
    >
      <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <UIcon name="i-lucide-file-question" class="h-10 w-10 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-gray-500 dark:text-gray-400">Project not found</p>
      <AppButton
        variant="outline"
        size="sm"
        class="!rounded-xl !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md"
        @click="goBack"
      >
        Back to Projects
      </AppButton>
    </div>

    <template v-else-if="project">
      <!-- Hero card -->
      <div
        class="profile-card-hover profile-animate-scale-in opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-gray-200/30 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-none"
        :style="{ animationDelay: `${staggerDelays[0]}ms` }"
      >
        <div class="relative overflow-hidden">
          <!-- Gradient accent bar -->
          <div class="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-transparent to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20" />

          <div class="relative flex flex-row flex-wrap items-center gap-4 p-4 sm:p-5">
            <div class="project-hero-thumb shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 ring-4 ring-white shadow-xl dark:from-gray-800 dark:to-gray-900 dark:ring-gray-800">
              <div class="flex h-36 w-36 shrink-0 items-center justify-center">
                <img
                  v-if="get(project, 'thumbnailUrl')"
                  :src="String(get(project, 'thumbnailUrl'))"
                  :alt="String(get(project, 'name'))"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40">
                  <UIcon name="i-lucide-building-2" class="size-14 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 min-w-0">
                <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl break-words">
                  {{ get(project, 'name') ?? '—' }}
                </h2>
                <span
                  v-if="get(project, 'isFeatured')"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                >
                  <UIcon name="i-lucide-star" class="size-3.5" />
                  Featured
                </span>
                <span
                  v-if="get(project, 'isVerified')"
                  class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  <UIcon name="i-lucide-badge-check" class="size-3.5" />
                  Verified
                </span>
              </div>
              <p v-if="get(project, 'description')" class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ get(project, 'description') }}
              </p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  :class="get(project, 'approvalStatus') === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300' : get(project, 'approvalStatus') === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'"
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  <span
                    :class="get(project, 'approvalStatus') === 'PUBLISHED' ? 'bg-emerald-500' : get(project, 'approvalStatus') === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500'"
                    class="h-2 w-2 rounded-full animate-pulse"
                  />
                  {{ get(project, 'approvalStatus') ?? '—' }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                  <UIcon name="i-lucide-layers" class="size-3.5" />
                  {{ get(project, 'category') ?? '—' }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                  <UIcon name="i-lucide-home" class="size-3.5" />
                  {{ get(project, 'projectType') ?? '—' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick stats strip -->
      <div
        class="profile-animate-fade-up opacity-0 mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"
        :style="{ animationDelay: `${(staggerDelays[0] ?? 0) + 60}ms` }"
      >
        <div class="project-stat-card flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0 overflow-hidden">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <UIcon name="i-lucide-indian-rupee" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Price Range</p>
            <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ formatPrice(get(project, 'minPrice')) }} – {{ formatPrice(get(project, 'maxPrice')) }}</p>
          </div>
        </div>
        <div class="project-stat-card flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0 overflow-hidden">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
            <UIcon name="i-lucide-building" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Units</p>
            <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ get(project, 'availableUnits') ?? '—' }} / {{ get(project, 'totalUnits') ?? '—' }} available</p>
          </div>
        </div>
        <div class="project-stat-card flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0 overflow-hidden">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400">
            <UIcon name="i-lucide-eye" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Views</p>
            <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ get(project, 'viewCount') ?? 0 }}</p>
          </div>
        </div>
        <div class="project-stat-card col-span-2 flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm sm:col-span-1 dark:border-gray-700/80 dark:bg-gray-900 min-w-0 overflow-hidden">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <UIcon name="i-lucide-map-pin" class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</p>
            <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ get(project, 'city') || get(project, 'locality') || '—' }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 min-w-0">
        <!-- Main column -->
        <div class="flex flex-col gap-4 lg:col-span-2 min-w-0">
          <!-- Project details -->
          <div
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[1]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-transparent">
              <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                  <UIcon name="i-lucide-info" class="h-4 w-4" />
                </span>
                Project Details
              </h3>
            </div>
            <div class="p-3 sm:p-4 overflow-hidden">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0">
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Price</dt>
                  <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ formatPrice(get(project, 'minPrice')) }} – {{ formatPrice(get(project, 'maxPrice')) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Units</dt>
                  <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(project, 'availableUnits') ?? '—' }} / {{ get(project, 'totalUnits') ?? '—' }} available</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Area</dt>
                  <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ formatArea(get(project, 'minArea')) }} – {{ formatArea(get(project, 'maxArea')) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</dt>
                  <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(project, 'projectStatus') ?? '—' }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Builder / Developer</dt>
                  <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(project, 'builder') ?? get(project, 'developer') ?? '—' }}</dd>
                </div>
                <div v-if="get(project, 'rejectionReason')" class="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 sm:px-4 sm:py-3 sm:col-span-2 dark:border-red-900/50 dark:bg-red-950/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Rejection Reason</dt>
                  <dd class="mt-1 text-sm font-medium text-red-800 dark:text-red-300 break-words">{{ get(project, 'rejectionReason') }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 sm:col-span-2 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Project ID</dt>
                  <dd class="mt-1 font-mono text-sm text-gray-900 dark:text-white break-all">{{ get(project, 'id') }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 transition-colors dark:border-gray-800 dark:bg-gray-800/30 sm:col-span-2 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</dt>
                  <dd class="mt-1 truncate text-sm text-gray-900 dark:text-white">{{ get(project, 'slug') ?? '—' }}</dd>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div
            v-if="get(project, 'description')"
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[2]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-transparent">
              <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                  <UIcon name="i-lucide-file-text" class="h-4 w-4" />
                </span>
                Description
              </h3>
            </div>
            <div class="p-3 sm:p-4 overflow-hidden min-w-0">
              <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">{{ get(project, 'description') }}</p>
            </div>
          </div>

          <!-- Location -->
          <div
            v-if="(get(project, 'fullAddress') || get(project, 'locality') || get(project, 'city') || hasCoords)"
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[2]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-amber-950/20 dark:to-transparent">
              <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
                  <UIcon name="i-lucide-map-pin" class="h-4 w-4" />
                </span>
                Location
              </h3>
            </div>
            <div class="p-3 sm:p-4 overflow-hidden min-w-0">
              <p v-if="get(project, 'fullAddress') || get(project, 'locality') || get(project, 'city')" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400 break-words">
                {{ (get(project, 'fullAddress') || [get(project, 'locality'), get(project, 'city'), get(project, 'state'), get(project, 'country'), get(project, 'pincode')].filter(Boolean).join(', ')) || '—' }}
              </p>
              <p v-if="hasCoords" class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                {{ get(project, 'latitude') }}, {{ get(project, 'longitude') }}
              </p>
              <div v-if="hasCoords && osmEmbedUrl" class="mt-4 overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <div class="relative aspect-[16/9] w-full min-h-[200px]">
                  <iframe
                    :src="osmEmbedUrl"
                    class="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    sandbox="allow-scripts"
                    referrerpolicy="no-referrer-when-downgrade"
                    title="Project location on map"
                  />
                </div>
                <div class="flex items-center justify-between gap-2 border-t border-gray-200/80 bg-white/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                  <span class="text-xs text-gray-500 dark:text-gray-400">OpenStreetMap</span>
                  <a
                    v-if="hasMapUrl"
                    :href="mapUrl()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:brightness-110"
                  >
                    <UIcon name="i-lucide-external-link" class="h-3.5 w-3.5" />
                    Open in Google Maps
                  </a>
                </div>
              </div>
              <a
                v-else-if="hasMapUrl"
                :href="mapUrl()"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:brightness-110"
              >
                <UIcon name="i-lucide-map" class="h-4 w-4" />
                View on Map
                <UIcon name="i-lucide-arrow-up-right" class="h-4 w-4" />
              </a>
            </div>
          </div>

          <!-- Compliance -->
          <div
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[2]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-transparent">
              <h3 class="flex flex-wrap items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                  <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
                </span>
                Compliance & Verification
              </h3>
            </div>
            <div class="p-3 sm:p-4 overflow-hidden min-w-0">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0">
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">RERA Number</dt>
                  <dd class="mt-1 font-mono text-sm font-medium text-gray-900 dark:text-white break-all">{{ get(project, 'reraNumber') ?? '—' }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">RERA Approved</dt>
                  <dd class="mt-1">
                    <span
                      :class="get(project, 'isReraApproved') ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                    >
                      <UIcon :name="get(project, 'isReraApproved') ? 'i-lucide-check-circle' : 'i-lucide-x-circle'" class="size-3.5" />
                      {{ get(project, 'isReraApproved') ? 'Yes' : 'No' }}
                    </span>
                  </dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Verified</dt>
                  <dd class="mt-1">
                    <span
                      :class="get(project, 'isVerified') ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                    >
                      <UIcon :name="get(project, 'isVerified') ? 'i-lucide-check-circle' : 'i-lucide-x-circle'" class="size-3.5" />
                      {{ get(project, 'isVerified') ? 'Yes' : 'No' }}
                    </span>
                  </dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Featured</dt>
                  <dd class="mt-1">
                    <span
                      :class="get(project, 'isFeatured') ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400'"
                    >
                      <UIcon :name="get(project, 'isFeatured') ? 'i-lucide-star' : 'i-lucide-star-off'" class="size-3.5" />
                      {{ get(project, 'isFeatured') ? 'Yes' : 'No' }}
                    </span>
                  </dd>
                </div>
              </div>
              </div>
            </div>

        </div>

        <!-- Sidebar -->
        <div class="flex flex-col gap-4 lg:col-span-1 min-w-0">
          <!-- Timeline -->
          <div
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[3]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25">
                  <UIcon name="i-lucide-calendar" class="h-4 w-4" />
                </span>
                Timeline
              </h3>
            </div>
            <dl class="flex flex-col gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
              <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</dt>
                <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(project, 'createdAt')) }}</dd>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Updated</dt>
                <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(project, 'updatedAt')) }}</dd>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Published</dt>
                <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(project, 'publishedAt')) }}</dd>
              </div>
              <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Views</dt>
                <dd class="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ get(project, 'viewCount') ?? 0 }}</dd>
              </div>
            </dl>
          </div>

          <!-- Amenities -->
          <div
            v-if="amenities.length"
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[4]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-pink-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-pink-950/20 dark:to-transparent">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25">
                  <UIcon name="i-lucide-sparkles" class="h-4 w-4" />
                </span>
                Amenities
              </h3>
            </div>
            <div class="flex flex-wrap gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
              <span
                v-for="(a, i) in amenities"
                :key="`amenity-${i}-${a}`"
                class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-medium capitalize text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300"
              >
                <UIcon name="i-lucide-check" class="size-3.5" />
                {{ a }}
              </span>
            </div>
          </div>

          <!-- References -->
          <div
            v-if="get(project, 'userId') || get(project, 'profileId')"
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0"
            :style="{ animationDelay: `${staggerDelays[5]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gradient-to-r from-slate-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-slate-900/50 dark:to-transparent">
              <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-md shadow-slate-500/25">
                  <UIcon name="i-lucide-users" class="h-4 w-4" />
                </span>
                References
              </h3>
            </div>
            <dl class="flex flex-col gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
              <div v-if="get(project, 'userId')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">User ID</dt>
                <dd class="mt-0.5 truncate font-mono text-sm font-medium text-gray-900 dark:text-white">{{ get(project, 'userId') }}</dd>
              </div>
              <div v-if="get(project, 'profileId')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Profile ID</dt>
                <dd class="mt-0.5 truncate font-mono text-sm font-medium text-gray-900 dark:text-white">{{ get(project, 'profileId') }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>
    </div>
  </div>
</template>

<style scoped>
.profile-animate-fade-up {
  animation: profile-fade-up 0.4s ease-out forwards;
}

.profile-animate-scale-in {
  animation: profile-scale-in 0.35s ease-out forwards;
}

.profile-animate-slide-right {
  animation: profile-slide-in-right 0.4s ease-out forwards;
}

.profile-notification-enter-active,
.profile-notification-leave-active {
  transition: all 0.3s ease;
}

.profile-notification-enter-from,
.profile-notification-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.project-hero-thumb {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.profile-card-hover:hover .project-hero-thumb {
  transform: scale(1.02);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.project-stat-card {
  transition: all 0.25s ease;
}
.project-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
