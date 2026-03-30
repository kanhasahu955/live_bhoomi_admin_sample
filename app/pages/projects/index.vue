<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UIcon from '@nuxt/ui/components/Icon.vue'
import { NuxtLink } from '#components'
import AppButton from '~/components/ui/AppButton.vue'
import { useProjectsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractProjects, extractPaginationMeta, type PaginationMeta } from '~/utils/api-extract'
import { adminModalUiCompact } from '~/utils/admin-modal-ui'
import { useLocationDetection } from '~/composables/useLocationDetection'

definePageMeta({
  layout: 'admin',
  title: 'Projects',
  description: 'Manage and moderate projects'
})

const ALL = '__all__'

const projectsService = useProjectsService()
const adminService = useAdminService()
const toast = useToast()
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
const metadata = ref<PaginationMeta | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)
const addressSuggestions = ref<{ label: string; value: string }[]>([])
const suggestionsLoading = ref(false)

const filters = ref({
  location: '',
  category: ALL as string,
  projectType: ALL as string,
  approvalStatus: ALL as string
})

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 }
]

const categoryOptions = [
  { label: 'All categories', value: ALL },
  { label: 'Residential', value: 'RESIDENTIAL' },
  { label: 'Commercial', value: 'COMMERCIAL' },
  { label: 'Industrial', value: 'INDUSTRIAL' },
  { label: 'Land', value: 'LAND' }
]

const projectTypeOptions = [
  { label: 'All types', value: ALL },
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Villa', value: 'VILLA' },
  { label: 'House', value: 'HOUSE' },
  { label: 'Plot', value: 'PLOT' },
  { label: 'Studio', value: 'STUDIO' }
]

const statusOptions = [
  { label: 'All statuses', value: ALL },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Draft', value: 'DRAFT' }
]

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.value.location.trim()) n++
  if (filters.value.category !== ALL) n++
  if (filters.value.projectType !== ALL) n++
  if (filters.value.approvalStatus !== ALL) n++
  return n
})

const fetchSuggestions = useDebounceFn(async (query: string) => {
  const q = query?.trim()
  if (!q || q.length < 2) {
    addressSuggestions.value = []
    return
  }
  suggestionsLoading.value = true
  try {
    const res = (await projectsService.addressSuggestions({ q })) as unknown
    const data = get(res, 'data') ?? res
    const list = Array.isArray(get(data, 'suggestions'))
      ? get(data, 'suggestions')
      : Array.isArray(get(data, 'results'))
        ? get(data, 'results')
        : Array.isArray(data)
          ? data
          : []
    addressSuggestions.value = (list ?? []).map((item: unknown) => {
      if (typeof item === 'string') return { label: item, value: item }
      const label =
        get(item, 'label') ??
        get(item, 'city') ??
        get(item, 'name') ??
        get(item, 'formatted_address') ??
        String(item)
      const value = get(item, 'value') ?? get(item, 'city') ?? label
      return { label: String(label), value: String(value) }
    })
  } catch {
    addressSuggestions.value = []
  } finally {
    suggestionsLoading.value = false
  }
}, 300)

watch(
  () => filters.value.location,
  (val) => fetchSuggestions(val)
)

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function rowMatchesFilters(row: Record<string, unknown>): boolean {
  const f = filters.value
  if (f.category !== ALL && String(get(row, 'category') ?? '') !== f.category) return false
  if (f.projectType !== ALL) {
    const pt = String(get(row, 'projectType') ?? '').toUpperCase()
    if (pt !== f.projectType.toUpperCase()) return false
  }
  if (f.approvalStatus !== ALL) {
    const st = String(get(row, 'approvalStatus') ?? get(row, 'status') ?? '')
    if (st !== f.approvalStatus) return false
  }
  return true
}

const displayProjects = computed(() => projects.value.filter(rowMatchesFilters))

const columns = computed(() => {
  void actionLoading.value
  return [
    {
      id: 'project',
      header: 'Project',
      size: 220,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const url = get(row.original, 'thumbnailUrl')
        const name = get(row.original, 'name') ?? 'Untitled'
        const id = get(row.original, 'id')
        const thumb = url
          ? h('img', {
              src: String(url),
              alt: '',
              class: 'size-10 shrink-0 rounded border border-gray-200 object-cover dark:border-gray-700'
            })
          : h(
              'div',
              {
                class:
                  'flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'
              },
              [h(UIcon, { name: 'i-lucide-image-off', class: 'size-5 text-gray-400' })]
            )
        return h('div', { class: 'flex items-center gap-3' }, [
          thumb,
          h(
            NuxtLink,
            {
              to: `/projects/${id}`,
              class: 'font-medium text-emerald-700 hover:underline dark:text-emerald-400'
            },
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
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const status = get(row.original, 'approvalStatus') as string
        const color =
          status === 'PUBLISHED' ? 'success' : status === 'REJECTED' ? 'error' : 'neutral'
        return h(UBadge, { color, size: 'sm' }, () => status ?? '—')
      }
    },
    {
      id: 'price',
      header: 'Price',
      size: 140,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const min = get(row.original, 'minPrice')
        const max = get(row.original, 'maxPrice')
        if (!min && !max) return '—'
        return `${formatPrice(min)} – ${formatPrice(max)}`
      }
    },
    { accessorKey: 'city', header: 'Location', size: 120 },
    {
      id: 'actions',
      header: 'Actions',
      size: 180,
      meta: {
        class: {
          th: 'text-right',
          td: 'text-right'
        }
      },
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const id = get(row.original, 'id') as string
        const status = get(row.original, 'approvalStatus') as string
        const isLoading = actionLoading.value === id
        return h('div', { class: 'flex flex-nowrap items-center justify-end gap-1' }, [
          h(UButton, {
            size: 'sm',
            variant: 'soft',
            color: 'primary',
            icon: 'i-lucide-external-link',
            label: 'View',
            to: `/projects/${id}`,
            class: 'admin-btn-table lb-action-btn'
          }),
          status !== 'PUBLISHED' &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'success',
              icon: 'i-lucide-check',
              label: 'Publish',
              loading: isLoading,
              class: 'admin-btn-table lb-action-btn',
              onClick: () => publishProject(id)
            }),
          status !== 'REJECTED' &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'error',
              icon: 'i-lucide-x',
              label: 'Reject',
              loading: isLoading,
              class: 'admin-btn-table lb-action-btn',
              onClick: () => openRejectModal(id)
            })
        ].filter(Boolean))
      }
    }
  ]
})

const columnOrder = ref([
  'project',
  'category',
  'projectType',
  'approvalStatus',
  'price',
  'city',
  'actions'
])

const searchParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit: pageSize.value }
  const city = filters.value.location.trim() || detectedLocation.value?.city
  if (city) params.city = city
  if (detectedLocation.value?.latitude) params.latitude = detectedLocation.value.latitude
  if (detectedLocation.value?.longitude) params.longitude = detectedLocation.value.longitude
  if (filters.value.category !== ALL) params.category = filters.value.category
  if (filters.value.projectType !== ALL) {
    params.projectType = filters.value.projectType
    params.type = filters.value.projectType
  }
  if (filters.value.approvalStatus !== ALL) {
    params.approvalStatus = filters.value.approvalStatus
    params.status = filters.value.approvalStatus
  }
  return params
})

async function loadProjects() {
  loading.value = true
  try {
    const res = (await adminService.listAdminProjects(searchParams.value)) as unknown
    projects.value = extractProjects(res)

    const meta = extractPaginationMeta(res as object, page.value, pageSize.value)
    if (meta) {
      metadata.value = meta
    } else {
      const data = get(res, 'data') ?? res
      const m = get(data, 'metadata') ?? get(res, 'metadata')
      if (m && typeof m === 'object') {
        const total = Number((m as { total?: number }).total)
        if (Number.isFinite(total)) {
          metadata.value = {
            total,
            page: page.value,
            limit: pageSize.value,
            totalPages: Math.max(1, Math.ceil(total / pageSize.value))
          }
        } else {
          metadata.value = null
        }
      } else {
        metadata.value = projects.value.length
          ? {
              total: projects.value.length,
              page: 1,
              limit: pageSize.value,
              totalPages: 1
            }
          : null
      }
    }
  } catch (e) {
    projects.value = []
    metadata.value = null
    const msg = e instanceof Error ? e.message : 'Failed to load projects'
    toast.add({ title: 'Projects', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

async function detectAndFilter() {
  await detect()
  if (detectedLocation.value?.city) {
    filters.value.location = detectedLocation.value.city
  }
  const prev = page.value
  page.value = 1
  if (prev === 1) await loadProjects()
}

function clearLocationFilter() {
  filters.value.location = ''
  clear()
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
}

function applyFilters() {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
}

function resetFilters() {
  filters.value = {
    location: '',
    category: ALL,
    projectType: ALL,
    approvalStatus: ALL
  }
  clear()
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
}

function exportCsv() {
  const rows = displayProjects.value
  if (!rows.length) {
    toast.add({ title: 'Export', description: 'No rows to export.', color: 'warning', icon: 'i-lucide-info' })
    return
  }
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = ['Name', 'Category', 'Type', 'Status', 'Min price', 'Max price', 'Location', 'Id']
  const lines = [
    header.join(','),
    ...rows.map((r) => {
      const name = String(get(r, 'name') ?? '')
      const minP = get(r, 'minPrice')
      const maxP = get(r, 'maxPrice')
      const minStr = minP != null && minP !== '' ? formatPrice(minP) : ''
      const maxStr = maxP != null && maxP !== '' ? formatPrice(maxP) : ''
      const city = String(get(r, 'city') ?? '')
      return [
        escape(name),
        escape(String(get(r, 'category') ?? '')),
        escape(String(get(r, 'projectType') ?? '')),
        escape(String(get(r, 'approvalStatus') ?? get(r, 'status') ?? '')),
        escape(minStr),
        escape(maxStr),
        escape(city),
        escape(String(get(r, 'id') ?? ''))
      ].join(',')
    })
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `projects-page-${page.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'Exported', description: `${rows.length} row(s) downloaded.`, color: 'success', icon: 'i-lucide-download' })
}

async function publishProject(id: string) {
  actionLoading.value = id
  try {
    await adminService.publishProject(id)
    await loadProjects()
    toast.add({ title: 'Published', description: 'Project is now live.', color: 'success', icon: 'i-lucide-check' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Publish failed'
    toast.add({ title: 'Publish failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = null
  }
}

const rejectModalOpen = ref(false)
const pendingRejectId = ref<string | null>(null)
const rejectReasonInput = ref('')

function openRejectModal(id: string) {
  pendingRejectId.value = id
  rejectReasonInput.value = ''
  rejectModalOpen.value = true
}

async function confirmRejectProject() {
  const id = pendingRejectId.value
  if (!id) return
  actionLoading.value = id
  try {
    const reason = rejectReasonInput.value.trim()
    await adminService.rejectProject(id, reason ? { reason } : undefined)
    rejectModalOpen.value = false
    pendingRejectId.value = null
    rejectReasonInput.value = ''
    await loadProjects()
    toast.add({
      title: 'Rejected',
      description: reason ? 'Reason recorded.' : 'Project was rejected.',
      color: 'warning',
      icon: 'i-lucide-ban'
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Reject failed'
    toast.add({ title: 'Reject failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    actionLoading.value = null
  }
}

function refresh() {
  loadProjects()
}

function onAddProject() {
  toast.add({
    title: 'Add project',
    description: 'New projects are usually created from the partner or mobile app. This button is reserved for a future admin flow.',
    color: 'primary',
    icon: 'i-lucide-info'
  })
}

function goPrev() {
  if (page.value <= 1) return
  page.value -= 1
}

function goNext() {
  if (!metadata.value || page.value >= metadata.value.totalPages) return
  page.value += 1
}

function goFirstPage() {
  page.value = 1
}

function goLastPage() {
  if (metadata.value && metadata.value.totalPages > 0) {
    page.value = metadata.value.totalPages
  }
}

watch([page], loadProjects, { immediate: true })

watch(pageSize, () => {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
})
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <div
      class="projects-panel w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]"
    >
      <div class="flex min-w-0 flex-col">
        <div
          class="flex flex-col gap-3 border-b border-gray-200/80 bg-gray-50/50 px-5 py-4 dark:border-gray-800/80 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
        >
          <div class="min-w-0 max-w-2xl space-y-1">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Search, filter, export, and moderate projects. Apply filters after you change them; Reset clears everything.
            </p>
            <p
              v-if="metadata && activeFilterCount > 0"
              class="text-xs text-emerald-700 dark:text-emerald-400"
            >
              {{ activeFilterCount }} filter(s) active
            </p>
          </div>
          <div class="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:justify-end">
            <AppButton
              icon="i-lucide-plus"
              size="sm"
              color="success"
              class="admin-btn-page admin-btn-page-fluid"
              @click="onAddProject"
            >
              Add Project
            </AppButton>
            <AppButton
              icon="i-lucide-download"
              size="sm"
              variant="outline"
              color="neutral"
              class="admin-btn-page admin-btn-page-fluid"
              :disabled="loading || !displayProjects.length"
              @click="exportCsv"
            >
              Export CSV
            </AppButton>
            <AppButton
              icon="i-lucide-refresh-cw"
              size="sm"
              variant="outline"
              color="neutral"
              class="admin-btn-page admin-btn-page-fluid"
              :loading="loading"
              @click="refresh"
            >
              Refresh
            </AppButton>
          </div>
        </div>

        <div
          class="shrink-0 border-b border-emerald-500/10 bg-gradient-to-br from-emerald-50/90 via-white to-gray-50/80 px-5 py-5 dark:border-emerald-500/10 dark:from-emerald-950/40 dark:via-gray-950 dark:to-gray-950 sm:px-6 sm:py-6"
        >
          <div class="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              class="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25"
            >
              <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
              Filters
            </span>
            <span class="min-w-0 text-xs text-gray-500 dark:text-gray-400">
              Location, category, type, and approval status — then Apply.
            </span>
          </div>

          <div
            class="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 md:items-end xl:grid-cols-12"
          >
            <div class="space-y-1.5 md:col-span-2 xl:col-span-5">
              <label
                class="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >Location</label
              >
              <UInputMenu
                v-model="filters.location"
                :items="addressSuggestions"
                value-key="value"
                label-key="label"
                :loading="suggestionsLoading"
                placeholder="City or area"
                :ignore-filter="true"
                :trailing-icon="null"
                create-item
                icon="i-lucide-map-pin"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyFilters"
              />
            </div>
            <div class="space-y-1.5 xl:col-span-2">
              <label
                class="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >Category</label
              >
              <USelect
                v-model="filters.category"
                :items="categoryOptions"
                size="md"
                class="w-full min-h-10 rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 xl:col-span-2">
              <label
                class="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >Type</label
              >
              <USelect
                v-model="filters.projectType"
                :items="projectTypeOptions"
                size="md"
                class="w-full min-h-10 rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 xl:col-span-3">
              <label
                class="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >Status</label
              >
              <USelect
                v-model="filters.approvalStatus"
                :items="statusOptions"
                size="md"
                class="w-full min-h-10 rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
          </div>

          <div
            class="mt-5 flex flex-col gap-1.5 border-t border-gray-200/70 pt-5 dark:border-gray-700/70 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-1.5"
          >
            <AppButton
              v-if="isSupported"
              variant="outline"
              size="sm"
              color="neutral"
              :loading="isDetecting"
              class="admin-btn-page admin-btn-page-fluid sm:min-w-[10.5rem]"
              @click="detectAndFilter"
            >
              <UIcon name="i-lucide-navigation" class="size-3.5 shrink-0" />
              <span>{{ isDetecting ? 'Detecting...' : 'Use my location' }}</span>
            </AppButton>
            <AppButton
              v-if="filters.location || hasDetected"
              variant="outline"
              size="sm"
              color="neutral"
              icon="i-lucide-x"
              class="admin-btn-page admin-btn-page-fluid sm:min-w-[7rem]"
              @click="clearLocationFilter"
            >
              Clear location
            </AppButton>
            <AppButton
              color="success"
              size="sm"
              icon="i-lucide-filter"
              class="admin-btn-page admin-btn-page-fluid sm:min-w-[8.5rem]"
              @click="applyFilters"
            >
              Apply filters
            </AppButton>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AppButton
              v-if="activeFilterCount > 0"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-rotate-ccw"
              class="self-start rounded-lg font-medium text-gray-600 hover:bg-gray-100 hover:text-emerald-800 dark:text-gray-400 dark:hover:bg-gray-800/80 dark:hover:text-emerald-300"
              @click="resetFilters"
            >
              Reset all filters
            </AppButton>
            <div v-else class="hidden sm:block" />
          </div>

          <p v-if="detectionError" class="mt-3 text-sm text-red-600 dark:text-red-400">
            {{ detectionError }}
          </p>
          <p v-else-if="hasDetected" class="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            Showing projects near {{ detectedLocation?.city ?? detectedLocation?.locality ?? 'you' }}
          </p>
        </div>

        <div
          class="projects-table-wrap min-h-0 min-w-0 bg-gray-50/40 px-3 py-5 dark:bg-gray-950/50 sm:px-5 sm:py-6"
        >
          <div
            class="projects-table-scroll min-w-0 overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-inner shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-none"
          >
            <UTable
              v-model:column-order="columnOrder"
              :data="displayProjects"
              :columns="columns"
              :loading="loading"
              class="projects-table min-w-0"
              empty="No projects match your filters."
            />
          </div>
        </div>

        <div
          v-if="metadata"
          class="shrink-0 border-t border-gray-200/90 bg-gradient-to-r from-gray-50 to-white px-4 py-4 dark:border-gray-800 dark:from-gray-950 dark:to-gray-900 sm:px-6"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-center text-sm text-gray-600 dark:text-gray-400 sm:text-left">
              <span class="font-medium text-gray-900 dark:text-gray-100">
                <template v-if="metadata.total > 0">
                  {{ (metadata.page - 1) * metadata.limit + 1 }}–{{
                    Math.min(metadata.page * metadata.limit, metadata.total)
                  }}
                  of {{ metadata.total }}
                </template>
                <template v-else>No results</template>
              </span>
              <span class="text-gray-400 dark:text-gray-500">
                · Page {{ metadata.page }} / {{ metadata.totalPages }}</span
              >
            </p>
            <div class="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
              <div
                class="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1 ring-1 ring-gray-200/80 dark:bg-gray-900/80 dark:ring-gray-700"
              >
                <span class="pl-1 text-xs text-gray-500 dark:text-gray-400">Rows</span>
                <USelect
                  v-model="pageSize"
                  :items="pageSizeOptions"
                  size="sm"
                  class="min-w-[6.5rem] border-0"
                  :content="{ class: 'z-[9999]' }"
                />
              </div>
              <div
                class="flex items-center gap-1 rounded-xl bg-white/90 p-0.5 ring-1 ring-gray-200/90 dark:bg-gray-900/90 dark:ring-gray-700"
              >
                <UButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  icon="i-lucide-chevrons-left"
                  :disabled="metadata.page <= 1 || loading || metadata.total === 0"
                  class="admin-btn-pagination lb-action-btn"
                  aria-label="First page"
                  @click="goFirstPage"
                />
                <UButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  icon="i-lucide-chevron-left"
                  :disabled="metadata.page <= 1 || loading || metadata.total === 0"
                  class="admin-btn-pagination lb-action-btn"
                  @click="goPrev"
                >
                  Prev
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  trailing-icon="i-lucide-chevron-right"
                  :disabled="metadata.page >= metadata.totalPages || loading || metadata.total === 0"
                  class="admin-btn-pagination lb-action-btn"
                  @click="goNext"
                >
                  Next
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  icon="i-lucide-chevrons-right"
                  :disabled="metadata.page >= metadata.totalPages || loading || metadata.total === 0"
                  class="admin-btn-pagination lb-action-btn"
                  aria-label="Last page"
                  @click="goLastPage"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="rejectModalOpen"
      title="Reject project"
      :ui="adminModalUiCompact"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            The lister may see an optional reason you add below.
          </p>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason (optional)</label>
            <textarea
              v-model="rejectReasonInput"
              rows="3"
              placeholder="e.g. Incomplete documentation"
              class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="admin-btn-modal-footer">
          <AppButton
            variant="outline"
            color="neutral"
            size="sm"
            class="lb-modal-btn-cancel"
            :disabled="!!actionLoading"
            @click="close()"
          >
            Cancel
          </AppButton>
          <AppButton
            color="error"
            size="sm"
            class="lb-modal-btn-submit"
            :loading="!!actionLoading"
            :disabled="!pendingRejectId"
            @click="confirmRejectProject"
          >
            Confirm rejection
          </AppButton>
        </div>
      </template>
    </UModal>
  </AppStack>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.projects-table-scroll :deep(table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
.projects-table-scroll {
  scrollbar-width: thin;
}
.projects-table-wrap :deep(thead th),
.projects-table-wrap :deep(tbody td) {
  @apply box-border align-middle px-4 py-3.5 text-left;
}
.projects-table-wrap :deep(thead th) {
  @apply whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
.projects-table-wrap :deep(tbody td) {
  @apply text-sm text-gray-800 dark:text-gray-200;
}
.projects-table-wrap :deep(tbody tr) {
  @apply border-b border-gray-100 transition-colors dark:border-gray-800/80;
}
.projects-table-wrap :deep(tbody tr:hover) {
  @apply bg-emerald-50/40 dark:bg-emerald-950/20;
}
.projects-table-wrap :deep(tbody tr:last-child) {
  @apply border-b-0;
}
.projects-table-wrap :deep(tbody td:last-child) {
  overflow: visible;
  min-width: 11rem;
}
@media (min-width: 1024px) {
  .projects-table-wrap :deep(tbody td:last-child) {
    min-width: 13rem;
  }
}

</style>
