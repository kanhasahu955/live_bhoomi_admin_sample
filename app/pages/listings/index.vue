<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UIcon from '@nuxt/ui/components/Icon.vue'
import { NuxtLink } from '#components'
import AppButton from '~/components/ui/AppButton.vue'
import { useAdminService } from '~/services/api'
import {
  canAdminFullEditListing,
  canAdminRejectListing,
  isListingPublished,
  isListingSoftDeleted
} from '~/utils/listing-admin'
import { get } from '~/utils/lodash'
import { extractListings, extractPaginationMeta, type PaginationMeta } from '~/utils/api-extract'
import { adminModalUiCompact } from '~/utils/admin-modal-ui'

definePageMeta({
  layout: 'admin',
  title: 'Listings',
  description: 'Manage and moderate property listings'
})

const ALL = '__all__'

const adminService = useAdminService()
const toast = useToast()

const listings = ref<Record<string, unknown>[]>([])
const metadata = ref<PaginationMeta | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)

const filters = ref({
  location: '',
  category: ALL as string,
  type: ALL as string,
  purpose: ALL as string,
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

const typeOptions = [
  { label: 'All types', value: ALL },
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Villa', value: 'VILLA' },
  { label: 'House', value: 'HOUSE' },
  { label: 'Plot', value: 'PLOT' },
  { label: 'Studio', value: 'STUDIO' }
]

const purposeOptions = [
  { label: 'All purposes', value: ALL },
  { label: 'Sale', value: 'SALE' },
  { label: 'Rent', value: 'RENT' }
]

const statusOptions = [
  { label: 'All statuses', value: ALL },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Pending review', value: 'PENDING_REVIEW' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Draft', value: 'DRAFT' }
]

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.value.location.trim()) n++
  if (filters.value.category !== ALL) n++
  if (filters.value.type !== ALL) n++
  if (filters.value.purpose !== ALL) n++
  if (filters.value.approvalStatus !== ALL) n++
  return n
})

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

/** Refine current page when API ignores some query params. */
function rowMatchesFilters(row: Record<string, unknown>): boolean {
  const f = filters.value
  if (f.category !== ALL && String(get(row, 'category') ?? '') !== f.category) return false
  if (f.type !== ALL && String(get(row, 'type') ?? '').toUpperCase() !== f.type.toUpperCase()) return false
  if (f.purpose !== ALL && String(get(row, 'purpose') ?? '').toUpperCase() !== f.purpose.toUpperCase()) return false
  if (f.approvalStatus !== ALL) {
    const st = String(get(row, 'approvalStatus') ?? get(row, 'status') ?? '')
    if (st !== f.approvalStatus) return false
  }
  return true
}

const displayListings = computed(() => listings.value.filter(rowMatchesFilters))

const columns = computed(() => {
  void actionLoading.value
  return [
    {
      id: 'listing',
      header: 'Listing',
      size: 240,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const url = get(row.original, 'thumbnailUrl')
        const title = get(row.original, 'title') ?? get(row.original, 'project.name') ?? 'Untitled'
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
              [h(UIcon, { name: 'i-lucide-home', class: 'size-5 text-gray-400' })]
            )
        return h('div', { class: 'flex items-center gap-3' }, [
          thumb,
          h(
            NuxtLink,
            {
              to: `/listings/${id}`,
              class: 'font-medium text-emerald-700 hover:underline dark:text-emerald-400'
            },
            () => title
          )
        ])
      }
    },
    { accessorKey: 'category', header: 'Category', size: 120 },
    { accessorKey: 'type', header: 'Type', size: 110 },
    { accessorKey: 'purpose', header: 'Purpose', size: 100 },
    {
      id: 'approvalStatus',
      header: 'Status',
      size: 110,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const status = get(row.original, 'approvalStatus') ?? get(row.original, 'status') as string
        const color = status === 'PUBLISHED' ? 'success' : status === 'REJECTED' ? 'error' : 'neutral'
        return h(UBadge, { color, size: 'sm' }, () => status ?? '—')
      }
    },
    {
      id: 'price',
      header: 'Price',
      size: 140,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const amount = get(row.original, 'amount') ?? get(row.original, 'price')
        const priceType = get(row.original, 'priceType')
        const billingPeriod = get(row.original, 'billingPeriod')
        if (!amount) return '—'
        const formatted = formatPrice(amount)
        if (priceType === 'RENT' && billingPeriod) {
          const period = String(billingPeriod).toLowerCase()
          return `${formatted}/${period}`
        }
        return formatted
      }
    },
    {
      id: 'location',
      header: 'Location',
      size: 120,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const city = get(row.original, 'city') ?? get(row.original, 'project.city')
        return city ?? '—'
      }
    },
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
        const isLoading = actionLoading.value === id
        const canEdit = canAdminFullEditListing(row.original)
        const canReject = canAdminRejectListing(row.original)
        return h('div', { class: 'flex flex-nowrap items-center justify-end gap-1' }, [
          h(UButton, {
            size: 'sm',
            variant: 'soft',
            color: 'primary',
            icon: 'i-lucide-external-link',
            label: 'View',
            to: `/listings/${id}`,
            class: 'admin-btn-table lb-action-btn'
          }),
          canEdit &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'neutral',
              icon: 'i-lucide-pencil',
              label: 'Edit',
              to: `/listings/${id}/edit`,
              class: 'admin-btn-table lb-action-btn'
            }),
          !isListingSoftDeleted(row.original) &&
            h(UButton, {
              size: 'sm',
              variant: 'soft',
              color: 'success',
              icon: 'i-lucide-check',
              label: isListingPublished(row.original) ? 'Published' : 'Publish',
              disabled: isListingPublished(row.original),
              loading: isLoading,
              class: 'admin-btn-table lb-action-btn',
              onClick: () => publishListing(id)
            }),
          canReject &&
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
  'listing',
  'category',
  'type',
  'purpose',
  'approvalStatus',
  'price',
  'location',
  'actions'
])

const searchParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit: pageSize.value }
  const city = filters.value.location.trim()
  if (city) params.city = city
  if (filters.value.category !== ALL) params.category = filters.value.category
  if (filters.value.type !== ALL) params.type = filters.value.type
  if (filters.value.purpose !== ALL) params.purpose = filters.value.purpose
  if (filters.value.approvalStatus !== ALL) {
    params.approvalStatus = filters.value.approvalStatus
    params.status = filters.value.approvalStatus
  }
  return params
})

async function loadListings() {
  loading.value = true
  try {
    const res = (await adminService.listAdminListings(searchParams.value)) as unknown
    listings.value = extractListings(res)

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
        metadata.value = listings.value.length
          ? {
              total: listings.value.length,
              page: 1,
              limit: pageSize.value,
              totalPages: 1
            }
          : null
      }
    }
  } catch (e) {
    listings.value = []
    metadata.value = null
    const msg = e instanceof Error ? e.message : 'Failed to load listings'
    toast.add({ title: 'Listings', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

async function publishListing(id: string) {
  const row = listings.value.find((r) => String(get(r, 'id')) === id)
  if (row && isListingPublished(row)) {
    toast.add({
      title: 'Already published',
      description: 'This listing is already live.',
      color: 'neutral',
      icon: 'i-lucide-info'
    })
    return
  }
  actionLoading.value = id
  try {
    await adminService.publishListing(id)
    await loadListings()
    toast.add({ title: 'Published', description: 'Listing is now live.', color: 'success', icon: 'i-lucide-check' })
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

async function confirmRejectListing() {
  const id = pendingRejectId.value
  if (!id) return
  actionLoading.value = id
  try {
    const reason = rejectReasonInput.value.trim()
    await adminService.rejectListing(id, reason ? { reason } : undefined)
    rejectModalOpen.value = false
    pendingRejectId.value = null
    rejectReasonInput.value = ''
    await loadListings()
    toast.add({
      title: 'Rejected',
      description: reason ? 'Reason recorded.' : 'Listing was rejected.',
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
  loadListings()
}

function applyFilters() {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadListings()
}

function resetFilters() {
  filters.value = {
    location: '',
    category: ALL,
    type: ALL,
    purpose: ALL,
    approvalStatus: ALL
  }
  const prev = page.value
  page.value = 1
  if (prev === 1) loadListings()
}

function exportCsv() {
  const rows = displayListings.value
  if (!rows.length) {
    toast.add({ title: 'Export', description: 'No rows to export.', color: 'warning', icon: 'i-lucide-info' })
    return
  }
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = ['Title', 'Category', 'Type', 'Purpose', 'Status', 'Price', 'Location', 'Id']
  const lines = [
    header.join(','),
    ...rows.map((r) => {
      const title = String(get(r, 'title') ?? get(r, 'project.name') ?? '')
      const rawPrice = get(r, 'amount') ?? get(r, 'price')
      const price =
        rawPrice != null && rawPrice !== '' ? formatPrice(rawPrice) : ''
      const city = String(get(r, 'city') ?? get(r, 'project.city') ?? '')
      return [
        escape(title),
        escape(String(get(r, 'category') ?? '')),
        escape(String(get(r, 'type') ?? '')),
        escape(String(get(r, 'purpose') ?? '')),
        escape(String(get(r, 'approvalStatus') ?? get(r, 'status') ?? '')),
        escape(price),
        escape(city),
        escape(String(get(r, 'id') ?? ''))
      ].join(',')
    })
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `listings-page-${page.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'Exported', description: `${rows.length} row(s) downloaded.`, color: 'success', icon: 'i-lucide-download' })
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

function onAddListing() {
  toast.add({
    title: 'Add listing',
    description: 'New listings are usually created from the partner or mobile app. This button is reserved for a future admin flow.',
    color: 'primary',
    icon: 'i-lucide-info'
  })
}

watch([page], loadListings, { immediate: true })

watch(pageSize, () => {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadListings()
})
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <div
      class="listings-panel w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]"
    >
      <div class="flex min-w-0 flex-col">
        <div
          class="flex flex-col gap-3 border-b border-gray-200/80 bg-gray-50/50 px-5 py-4 dark:border-gray-800/80 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
        >
          <div class="min-w-0 max-w-2xl space-y-1">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Filter, export, and publish listings from the admin list. Apply after changing filters; the table can further narrow the current page when needed.
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
              @click="onAddListing"
            >
              Add Listing
            </AppButton>
            <AppButton
              icon="i-lucide-download"
              size="sm"
              variant="outline"
              color="neutral"
              class="admin-btn-page admin-btn-page-fluid"
              :disabled="loading || !displayListings.length"
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
          <div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              class="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25"
            >
              <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
              Filters
            </span>
            <span class="min-w-0 text-xs text-gray-500 dark:text-gray-500">Use Apply after changing filters. Reset clears all.</span>
          </div>

          <div class="grid min-w-0 gap-4 lg:grid-cols-12 lg:items-end lg:gap-4">
            <div class="space-y-1.5 lg:col-span-3">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</label>
              <UInput
                v-model="filters.location"
                placeholder="City or area"
                icon="i-lucide-map-pin"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyFilters"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Category</label>
              <USelect
                v-model="filters.category"
                :items="categoryOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</label>
              <USelect
                v-model="filters.type"
                :items="typeOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Purpose</label>
              <USelect
                v-model="filters.purpose"
                :items="purposeOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-3">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</label>
              <USelect
                v-model="filters.approvalStatus"
                :items="statusOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AppButton
              v-if="activeFilterCount > 0"
              variant="ghost"
              size="sm"
              icon="i-lucide-rotate-ccw"
              class="self-start text-gray-600 hover:text-emerald-800 dark:text-gray-400 dark:hover:text-emerald-300"
              @click="resetFilters"
            >
              Reset all filters
            </AppButton>
            <div v-else class="hidden sm:block" />

            <div class="flex w-full flex-wrap gap-1.5 sm:w-auto sm:justify-end">
              <AppButton
                color="success"
                size="sm"
                icon="i-lucide-filter"
                class="admin-btn-page flex-1 sm:flex-none sm:min-w-[7rem]"
                @click="applyFilters"
              >
                Apply
              </AppButton>
            </div>
          </div>
        </div>

        <div
          class="listings-table-wrap min-h-0 min-w-0 bg-gray-50/40 px-3 py-5 dark:bg-gray-950/50 sm:px-5 sm:py-6"
        >
          <div
            class="listings-table-scroll min-w-0 overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-inner shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-none"
          >
            <UTable
              v-model:column-order="columnOrder"
              :data="displayListings"
              :columns="columns"
              :loading="loading"
              class="min-w-0"
              empty="No listings match your filters."
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
                  {{ (metadata.page - 1) * metadata.limit + 1 }}–{{ Math.min(metadata.page * metadata.limit, metadata.total) }}
                  of {{ metadata.total }}
                </template>
                <template v-else>No results</template>
              </span>
              <span class="text-gray-400 dark:text-gray-500"> · Page {{ metadata.page }} / {{ metadata.totalPages }}</span>
            </p>
            <div class="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
              <div class="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1 ring-1 ring-gray-200/80 dark:bg-gray-900/80 dark:ring-gray-700">
                <span class="pl-1 text-xs text-gray-500 dark:text-gray-400">Rows</span>
                <USelect
                  v-model="pageSize"
                  :items="pageSizeOptions"
                  size="sm"
                  class="min-w-[6.5rem] border-0"
                  :content="{ class: 'z-[9999]' }"
                />
              </div>
              <div class="flex items-center gap-1 rounded-xl bg-white/90 p-0.5 ring-1 ring-gray-200/90 dark:bg-gray-900/90 dark:ring-gray-700">
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

    <UModal v-model:open="rejectModalOpen" title="Reject listing" :ui="adminModalUiCompact">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            For <span class="font-mono text-xs">PENDING_REVIEW</span> or published rows. Uses
            <span class="font-mono text-xs">PATCH …/reject</span>. Optional reason for the lister.
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
            @click="confirmRejectListing"
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

.listings-table-scroll :deep(table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
.listings-table-scroll {
  scrollbar-width: thin;
}
.listings-table-wrap :deep(thead th),
.listings-table-wrap :deep(tbody td) {
  @apply box-border align-middle px-4 py-3.5 text-left;
}
.listings-table-wrap :deep(thead th) {
  @apply whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
.listings-table-wrap :deep(tbody td) {
  @apply text-sm text-gray-800 dark:text-gray-200;
}
.listings-table-wrap :deep(tbody tr) {
  @apply border-b border-gray-100 transition-colors dark:border-gray-800/80;
}
.listings-table-wrap :deep(tbody tr:hover) {
  @apply bg-emerald-50/40 dark:bg-emerald-950/20;
}
.listings-table-wrap :deep(tbody tr:last-child) {
  @apply border-b-0;
}
.listings-table-wrap :deep(tbody td:last-child) {
  overflow: visible;
  min-width: 10rem;
}
@media (min-width: 1024px) {
  .listings-table-wrap :deep(tbody td:last-child) {
    min-width: 11rem;
  }
}
</style>
