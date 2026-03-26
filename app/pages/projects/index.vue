<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UIcon from '@nuxt/ui/components/Icon.vue'
import { NuxtLink } from '#components'
import { useProjectsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractProjects, extractPaginationMeta, type PaginationMeta } from '~/utils/api-extract'
import { useLocationDetection } from '~/composables/useLocationDetection'

definePageMeta({
  layout: 'admin',
  title: 'Projects',
  description: 'Manage and moderate projects'
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
const metadata = ref<PaginationMeta | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)
const locationFilter = ref('')
const addressSuggestions = ref<{ label: string; value: string }[]>([])
const suggestionsLoading = ref(false)

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 }
]

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

watch(locationFilter, (val) => fetchSuggestions(val))

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

const columns = computed(() => {
  void actionLoading.value
  return [
    {
      id: 'project',
      header: 'Project',
      size: 220,
      cell: ({ row }) => {
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
        const color =
          status === 'PUBLISHED' ? 'success' : status === 'REJECTED' ? 'error' : 'neutral'
        return h(UBadge, { color, size: 'sm' }, () => status ?? '—')
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
      header: 'Actions',
      size: 160,
      meta: {
        class: {
          th: 'text-right',
          td: 'text-right'
        }
      },
      cell: ({ row }) => {
        const id = get(row.original, 'id') as string
        const status = get(row.original, 'approvalStatus') as string
        const isLoading = actionLoading.value === id
        return h('div', { class: 'flex flex-nowrap items-center justify-end gap-2' }, [
          h(UButton, {
            size: 'sm',
            variant: 'soft',
            color: 'primary',
            icon: 'i-lucide-external-link',
            to: `/projects/${id}`,
            'aria-label': 'View',
            class: 'rounded-lg'
          }),
          status !== 'PUBLISHED' &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'success',
              icon: 'i-lucide-check',
              loading: isLoading,
              'aria-label': 'Publish',
              class: 'rounded-lg',
              onClick: () => publishProject(id)
            }),
          status !== 'REJECTED' &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'error',
              icon: 'i-lucide-x',
              loading: isLoading,
              'aria-label': 'Reject',
              class: 'rounded-lg',
              onClick: () => rejectProject(id)
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
  const city = locationFilter.value.trim() || detectedLocation.value?.city
  if (city) params.city = city
  if (detectedLocation.value?.latitude) params.latitude = detectedLocation.value.latitude
  if (detectedLocation.value?.longitude) params.longitude = detectedLocation.value.longitude
  return params
})

async function loadProjects() {
  loading.value = true
  try {
    const res = (await projectsService.searchPublic(searchParams.value)) as unknown
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
  const prev = page.value
  page.value = 1
  if (prev === 1) await loadProjects()
}

function clearLocationFilter() {
  locationFilter.value = ''
  clear()
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
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

function applyLocationFilter() {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProjects()
}

function refresh() {
  loadProjects()
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
          <p class="min-w-0 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Browse projects, open details, or publish or reject when moderation is required.
          </p>
          <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <AppButton
              icon="i-lucide-plus"
              size="sm"
              color="success"
              class="w-full rounded-xl shadow-md shadow-emerald-600/20 sm:w-auto"
            >
              Add Project
            </AppButton>
            <AppButton
              icon="i-lucide-refresh-cw"
              size="sm"
              variant="outline"
              class="w-full shrink-0 rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
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
          <div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              class="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25"
            >
              <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
              Filters
            </span>
            <span class="min-w-0 text-xs text-gray-500 dark:text-gray-500"
              >Filter by city, location, or use GPS</span
            >
          </div>
          <div class="grid min-w-0 gap-4 sm:grid-cols-1 lg:grid-cols-12 lg:items-end lg:gap-4">
            <div class="space-y-1.5 lg:col-span-8">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >Location</label
              >
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
                icon="i-lucide-map-pin"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyLocationFilter"
              />
            </div>
            <div class="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
              <AppButton
                v-if="isSupported"
                variant="outline"
                size="md"
                color="success"
                :loading="isDetecting"
                class="flex-1 rounded-xl border-emerald-200 bg-white/90 dark:border-emerald-800 dark:bg-gray-900/50 lg:flex-none"
                @click="detectAndFilter"
              >
                <UIcon name="i-lucide-navigation" class="size-3.5 shrink-0" />
                <span>{{ isDetecting ? 'Detecting...' : 'Use my location' }}</span>
              </AppButton>
              <AppButton
                v-if="locationFilter || hasDetected"
                variant="outline"
                size="md"
                icon="i-lucide-x"
                class="flex-1 rounded-xl border-gray-300 bg-white/90 dark:border-gray-600 dark:bg-gray-900/50 lg:flex-none"
                @click="clearLocationFilter"
              >
                Clear
              </AppButton>
              <AppButton
                color="success"
                size="md"
                icon="i-lucide-search"
                class="flex-1 rounded-xl shadow-md shadow-emerald-600/20 lg:flex-none"
                @click="applyLocationFilter"
              >
                Apply
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

        <div
          class="projects-table-wrap min-h-0 min-w-0 bg-gray-50/40 px-3 py-5 dark:bg-gray-950/50 sm:px-5 sm:py-6"
        >
          <div
            class="projects-table-scroll min-w-0 overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-inner shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-none"
          >
            <UTable
              v-model:column-order="columnOrder"
              :data="projects"
              :columns="columns"
              :loading="loading"
              class="min-w-0"
              empty="No projects found."
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
                class="flex items-center gap-1.5 rounded-xl bg-white/90 p-1 ring-1 ring-gray-200/90 dark:bg-gray-900/90 dark:ring-gray-700"
              >
                <UButton
                  size="sm"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-chevrons-left"
                  :disabled="metadata.page <= 1 || loading || metadata.total === 0"
                  class="rounded-lg"
                  aria-label="First page"
                  @click="goFirstPage"
                />
                <UButton
                  size="sm"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-chevron-left"
                  :disabled="metadata.page <= 1 || loading || metadata.total === 0"
                  class="rounded-lg"
                  @click="goPrev"
                >
                  Prev
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  color="primary"
                  trailing-icon="i-lucide-chevron-right"
                  :disabled="metadata.page >= metadata.totalPages || loading || metadata.total === 0"
                  class="rounded-lg"
                  @click="goNext"
                >
                  Next
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  color="primary"
                  icon="i-lucide-chevrons-right"
                  :disabled="metadata.page >= metadata.totalPages || loading || metadata.total === 0"
                  class="rounded-lg"
                  aria-label="Last page"
                  @click="goLastPage"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
</style>
