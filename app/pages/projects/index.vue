<script setup lang="ts">
import { ref, computed, onMounted, watch, h, resolveComponent } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useProjectsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { useLocationDetection } from '~/composables/useLocationDetection'

definePageMeta({
  layout: 'admin',
  title: 'Projects'
})

const projectsService = useProjectsService()
const adminService = useAdminService()
const {
  detectedLocation,
  detectionError,
  isDetecting,
  hasDetected,
  isSupported,
  detect,
  clear
} = useLocationDetection()

const projects = ref<Record<string, unknown>[]>([])
const metadata = ref<{ total: number; page: number; limit: number; totalPages: number } | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const limit = 10
const locationFilter = ref('')
const addressSuggestions = ref<{ label: string; value: string }[]>([])
const suggestionsLoading = ref(false)

const fetchSuggestions = useDebounceFn(async (query: string) => {
  const q = query?.trim()
  if (!q || q.length < 2) {
    addressSuggestions.value = []
    return
  }
  suggestionsLoading.value = true
  try {
    const res = await projectsService.addressSuggestions({ q }) as unknown
    const data = get(res, 'data') ?? res
    const list = Array.isArray(get(data, 'suggestions')) ? get(data, 'suggestions') : Array.isArray(get(data, 'results')) ? get(data, 'results') : Array.isArray(data) ? data : []
    addressSuggestions.value = (list ?? []).map((item: unknown) => {
      if (typeof item === 'string') return { label: item, value: item }
      const label = get(item, 'label') ?? get(item, 'city') ?? get(item, 'name') ?? get(item, 'formatted_address') ?? String(item)
      const value = get(item, 'value') ?? get(item, 'city') ?? label
      return { label: String(label), value: String(value) }
    })
  } catch {
    addressSuggestions.value = []
  } finally {
    suggestionsLoading.value = false
  }
}, 300)

watch(locationFilter, (val) => fetchSuggestions(val))

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

const columns = computed(() => [
  {
    id: 'project',
    header: 'Project',
    size: 220,
    cell: ({ row }) => {
      const url = get(row.original, 'thumbnailUrl')
      const name = get(row.original, 'name') ?? 'Untitled'
      const id = get(row.original, 'id')
      const thumb = url
        ? h('img', { src: String(url), alt: '', class: 'size-10 shrink-0 rounded border border-gray-200 object-cover dark:border-gray-700' })
        : h('div', { class: 'flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-image-off', class: 'size-5 text-gray-400' })
        ])
      return h('div', { class: 'flex items-center gap-3' }, [
        thumb,
        h(
          resolveComponent('NuxtLink'),
          { to: `/projects/${id}`, class: 'font-medium text-gray-900 hover:underline dark:text-white' },
          () => name
        )
      ])
    }
  },
  { accessorKey: 'category', header: 'Category', size: 120 },
  { accessorKey: 'projectType', header: 'Type', size: 100 },
  {
    id: 'approvalStatus',
    header: 'Status',
    size: 110,
    cell: ({ row }) => {
      const status = get(row.original, 'approvalStatus') as string
      const color = status === 'PUBLISHED' ? 'success' : status === 'REJECTED' ? 'error' : 'neutral'
      return h(resolveComponent('UBadge'), { color, size: 'xs' }, () => status ?? '—')
    }
  },
  {
    id: 'price',
    header: 'Price',
    size: 140,
    cell: ({ row }) => {
      const min = get(row.original, 'minPrice')
      const max = get(row.original, 'maxPrice')
      if (!min && !max) return '—'
      return `${formatPrice(min)} – ${formatPrice(max)}`
    }
  },
  { accessorKey: 'city', header: 'Location', size: 120 },
  {
    id: 'actions',
    header: '',
    size: 140,
    cell: ({ row }) => {
      const id = get(row.original, 'id') as string
      const status = get(row.original, 'approvalStatus') as string
      const isLoading = actionLoading.value === id
      return h('div', { class: 'flex flex-row flex-nowrap items-center justify-end gap-2 sm:gap-3' }, [
        h(
          resolveComponent('UButton'),
          {
            size: 'sm',
            variant: 'soft',
            icon: 'i-lucide-external-link',
            to: `/projects/${id}`,
            'aria-label': 'View',
            class: '!rounded-lg !px-3 !py-2.5 !font-medium transition-all hover:!shadow-md'
          }
        ),
        status !== 'PUBLISHED' && h(
          resolveComponent('UButton'),
          {
            size: 'sm',
            variant: 'soft',
            icon: 'i-lucide-check',
            loading: isLoading,
            'aria-label': 'Publish',
            class: '!rounded-lg !px-3 !py-2.5 !font-medium !text-emerald-700 dark:!text-emerald-400 transition-all hover:!shadow-md',
            onClick: () => publishProject(id)
          }
        ),
        status !== 'REJECTED' && h(
          resolveComponent('UButton'),
          {
            size: 'sm',
            variant: 'soft',
            icon: 'i-lucide-x',
            loading: isLoading,
            class: '!rounded-lg !px-3 !py-2.5 !font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-all hover:!shadow-md',
            'aria-label': 'Reject',
            onClick: () => rejectProject(id)
          }
        )
      ].filter(Boolean))
    }
  }
])

const searchParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit }
  const city = locationFilter.value.trim() || detectedLocation.value?.city
  if (city) params.city = city
  if (detectedLocation.value?.latitude) params.latitude = detectedLocation.value.latitude
  if (detectedLocation.value?.longitude) params.longitude = detectedLocation.value.longitude
  return params
})

async function loadProjects() {
  loading.value = true
  try {
    const res = await projectsService.searchPublic(searchParams.value) as {
      projects?: Record<string, unknown>[]
      metadata?: { total: number; page: number; limit: number; totalPages: number }
    }
    projects.value = get(res, 'projects') ?? []
    metadata.value = get(res, 'metadata') ?? null
  } catch {
    projects.value = []
    metadata.value = null
  } finally {
    loading.value = false
  }
}

async function detectAndFilter() {
  await detect()
  if (detectedLocation.value?.city) {
    locationFilter.value = detectedLocation.value.city
  }
  page.value = 1
  await loadProjects()
}

function clearLocationFilter() {
  locationFilter.value = ''
  clear()
  page.value = 1
  loadProjects()
}

async function publishProject(id: string) {
  actionLoading.value = id
  try {
    await adminService.publishProject(id)
    await loadProjects()
  } finally {
    actionLoading.value = null
  }
}

async function rejectProject(id: string) {
  actionLoading.value = id
  try {
    await adminService.rejectProject(id)
    await loadProjects()
  } finally {
    actionLoading.value = null
  }
}

function onRowSelect(_e: Event, row: { original: Record<string, unknown> }) {
  const id = get(row.original, 'id')
  if (id) navigateTo(`/projects/${id}`)
}

function applyLocationFilter() {
  page.value = 1
  loadProjects()
}

onMounted(loadProjects)
watch([page], loadProjects)
</script>

<template>
  <AppStack gap="xl">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <AppPageHeader
        title="Projects"
        description="Manage and moderate projects"
      />
      <AppButton
        icon="i-lucide-plus"
        size="sm"
        class="w-full shrink-0 cursor-pointer sm:w-auto !rounded-xl !px-4 !py-2.5 !font-semibold !shadow-md !shadow-emerald-500/20 transition-all hover:!shadow-lg hover:!shadow-emerald-500/30"
      >
        Add Project
      </AppButton>
    </div>

    <!-- Location filter -->
    <div class="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-700/80 dark:bg-gray-900">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div class="flex min-w-0 flex-1 items-center gap-3 sm:max-w-[280px]">
          <UIcon name="i-lucide-map-pin" class="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
          <UInputMenu
            v-model="locationFilter"
            :items="addressSuggestions"
            value-key="value"
            label-key="label"
            :loading="suggestionsLoading"
            placeholder="Filter by city or location"
            :ignore-filter="true"
            :trailing-icon="null"
            create-item
            class="min-w-0 flex-1"
            @keydown.enter="applyLocationFilter"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3 sm:gap-4">
          <AppButton
            v-if="isSupported"
            size="sm"
            variant="outline"
            color="success"
            :loading="isDetecting"
            class="profile-btn-secondary cursor-pointer"
            @click="detectAndFilter"
          >
            <UIcon name="i-lucide-navigation" class="size-3.5 shrink-0" />
            <span>{{ isDetecting ? 'Detecting...' : 'Use my location' }}</span>
          </AppButton>
          <AppButton
            v-if="locationFilter || hasDetected"
            size="sm"
            variant="outline"
            class="!inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 !rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="clearLocationFilter"
          >
            <UIcon name="i-lucide-x" class="size-3.5 shrink-0" />
            <span>Clear</span>
          </AppButton>
          <AppButton
            size="sm"
            color="success"
            class="profile-btn-primary cursor-pointer"
            @click="applyLocationFilter"
          >
            <UIcon name="i-lucide-search" class="size-3.5 shrink-0" />
            <span>Apply</span>
          </AppButton>
        </div>
      </div>
      <p v-if="detectionError" class="mt-3 text-sm text-red-600 dark:text-red-400">
        {{ detectionError }}
      </p>
      <p v-else-if="hasDetected" class="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
        Showing projects near {{ detectedLocation?.city ?? detectedLocation?.locality ?? 'you' }}
      </p>
    </div>

    <!-- Table -->
    <AppCard :padding="false" class="mt-6 overflow-hidden sm:mt-8">
      <UCard :ui="{ root: 'overflow-x-auto', body: 'p-0' }">
        <UTable
          :data="projects"
          :columns="columns"
          :loading="loading"
          empty="No projects found."
          :on-select="onRowSelect"
        />
      </UCard>
      <div
        v-if="metadata && metadata.total > 0"
        class="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:gap-4"
      >
        <p class="order-2 text-center text-sm text-gray-500 dark:text-gray-400 sm:order-1 sm:text-left">
          Showing {{ (metadata.page - 1) * metadata.limit + 1 }}–{{ Math.min(metadata.page * metadata.limit, metadata.total) }} of {{ metadata.total }}
        </p>
        <div class="order-1 flex w-full justify-center gap-3 sm:order-2 sm:w-auto sm:justify-end">
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="metadata.page <= 1"
            class="!rounded-xl !cursor-pointer !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md disabled:!cursor-not-allowed disabled:opacity-50"
            @click="page = Math.max(1, metadata.page - 1)"
          >
            Previous
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            trailing-icon="i-lucide-chevron-right"
            :disabled="metadata.page >= metadata.totalPages"
            class="!rounded-xl !cursor-pointer !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md disabled:!cursor-not-allowed disabled:opacity-50"
            @click="page = Math.min(metadata.totalPages, metadata.page + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
    </AppCard>
  </AppStack>
</template>
