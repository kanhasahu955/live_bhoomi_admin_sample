<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import UBadge from '@nuxt/ui/components/Badge.vue'
import AppButton from '~/components/ui/AppButton.vue'
import { useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractProfiles, extractPaginationMeta, type PaginationMeta } from '~/utils/api-extract'

definePageMeta({
  layout: 'admin',
  title: 'Partners',
  description: 'Search, filter, and manage partner approvals'
})

const adminService = useAdminService()
const toast = useToast()

const profilesRaw = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(10)
const metadata = ref<PaginationMeta | null>(null)

/** Sentinel for “all” — Radix Select breaks with `value: ''`; omit from API when this is selected */
const APPROVAL_ALL = '__all__'

/** Minimal filters: search, city (location), approval — sent to API as before */
const filters = ref({
  search: '',
  location: '',
  approvalStatus: APPROVAL_ALL as string
})

const approvalStatusOptions = [
  { label: 'All statuses', value: APPROVAL_ALL },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 }
]

const queryParams = computed(() => {
  const p: Record<string, string | number> = {
    page: page.value,
    limit: pageSize.value
  }
  const f = filters.value
  const q = f.search.trim()
  if (q) p.search = q
  if (f.location.trim()) p.city = f.location.trim()
  if (f.approvalStatus && f.approvalStatus !== APPROVAL_ALL) p.approvalStatus = f.approvalStatus
  return p
})

function buildFallbackMeta(rowsList: Record<string, unknown>[]): PaginationMeta {
  const total = rowsList.length
  return {
    total,
    page: 1,
    limit: Math.max(total, pageSize.value),
    totalPages: 1
  }
}

async function loadProfiles() {
  loading.value = true
  try {
    const res = await adminService.listProfiles(queryParams.value)
    const list = extractProfiles(res)
    profilesRaw.value = list

    const meta = extractPaginationMeta(res, page.value, pageSize.value)
    if (meta) {
      metadata.value = meta
    } else {
      metadata.value = buildFallbackMeta(list)
    }
  } catch {
    profilesRaw.value = []
    metadata.value = null
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProfiles()
}

function resetFilters() {
  filters.value = {
    search: '',
    location: '',
    approvalStatus: APPROVAL_ALL
  }
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProfiles()
}

function refresh() {
  loadProfiles()
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

const confirmOpen = ref(false)
const confirmKind = ref<'approve' | 'reject'>('approve')
const pendingProfile = ref<{ id: string; businessName: string } | null>(null)
const rejectReason = ref('')

function openApproveConfirm(row: Record<string, unknown>) {
  const id = String(row.id ?? '')
  if (!id || id === '—') return
  pendingProfile.value = {
    id,
    businessName: String(row.businessName ?? 'Partner')
  }
  confirmKind.value = 'approve'
  confirmOpen.value = true
}

function openRejectConfirm(row: Record<string, unknown>) {
  const id = String(row.id ?? '')
  if (!id || id === '—') return
  pendingProfile.value = {
    id,
    businessName: String(row.businessName ?? 'Partner')
  }
  rejectReason.value = ''
  confirmKind.value = 'reject'
  confirmOpen.value = true
}

async function runConfirmedAction() {
  if (!pendingProfile.value) return
  const id = pendingProfile.value.id
  actionLoading.value = id
  try {
    if (confirmKind.value === 'approve') {
      await adminService.approveProfile(id)
      toast.add({
        title: 'Partner approved',
        description: `${pendingProfile.value.businessName} is now approved.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      const reason = rejectReason.value.trim()
      await adminService.rejectProfile(id, reason ? { reason } : undefined)
      toast.add({
        title: 'Partner rejected',
        description: reason ? 'Reason recorded.' : `${pendingProfile.value.businessName} was rejected.`,
        color: 'warning',
        icon: 'i-lucide-ban'
      })
    }
    confirmOpen.value = false
    pendingProfile.value = null
    rejectReason.value = ''
    await loadProfiles()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    toast.add({
      title: confirmKind.value === 'approve' ? 'Approve failed' : 'Reject failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    actionLoading.value = null
  }
}

function badgeColor(status: string) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'error'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}

const columns = computed(() => {
  void actionLoading.value
  return [
  {
    id: 'business',
    header: 'Partner / business',
    size: 220,
    cell: ({ row }) => {
      const name = get(row.original, 'businessName') ?? '—'
      const tag = get(row.original, 'tagline')
      return h('div', { class: 'min-w-0 py-1.5' }, [
        h('div', { class: 'font-semibold text-gray-900 dark:text-white truncate' }, String(name)),
        tag
          ? h('div', { class: 'mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate' }, String(tag))
          : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'accountType',
    header: 'Type',
    size: 100
  },
  {
    id: 'location',
    header: 'Location',
    size: 140,
    cell: ({ row }) => {
      const city = get(row.original, 'city')
      const state = get(row.original, 'state')
      const line = [city, state].filter(Boolean).join(', ')
      return line || '—'
    }
  },
  {
    id: 'approval',
    header: 'Approval',
    size: 120,
    cell: ({ row }) => {
      const status = String(get(row.original, 'approvalStatus') ?? '—')
      return h(
        UBadge,
        {
          color: badgeColor(status),
          size: 'sm',
          class: 'font-medium tracking-wide shadow-sm ring-1 ring-black/5 dark:ring-white/10'
        },
        () => status
      )
    }
  },
  {
    id: 'rera',
    header: 'RERA',
    size: 120,
    cell: ({ row }) => {
      const r = get(row.original, 'reraNumber')
      return r ? String(r) : '—'
    }
  },
  {
    id: 'contact',
    header: 'Contact',
    size: 160,
    cell: ({ row }) => {
      const email = get(row.original, 'businessEmail')
      const phone = get(row.original, 'businessPhone')
      const parts = [email, phone].filter(Boolean)
      return parts.length
        ? h('div', { class: 'text-xs space-y-0.5' }, parts.map((p) => h('div', { class: 'truncate max-w-[10rem]' }, String(p))))
        : '—'
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    size: 220,
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const original = row.original as Record<string, unknown>
      const id = String(original.id ?? '')
      const status = String(get(original, 'approvalStatus') ?? '')
      const busy = actionLoading.value === id
      const showApprove = status !== 'APPROVED'
      const showReject = status !== 'REJECTED'
      return h('div', { class: 'flex flex-nowrap items-center justify-end gap-2 py-1' }, [
        showApprove &&
          h(AppButton, {
            color: 'success',
            variant: 'solid',
            size: 'sm',
            icon: 'i-lucide-check',
            label: 'Approve',
            loading: busy,
            disabled: !!actionLoading.value && actionLoading.value !== id,
            class:
              '!min-h-[2.25rem] !rounded-xl !px-3.5 !text-xs !font-semibold !shadow-md !shadow-emerald-600/25 !ring-2 !ring-emerald-500/30 hover:!brightness-110 dark:!shadow-emerald-900/40 dark:!ring-emerald-400/35',
            onClick: () => openApproveConfirm(original)
          }),
        showReject &&
          h(AppButton, {
            color: 'error',
            variant: 'solid',
            size: 'sm',
            icon: 'i-lucide-x',
            label: 'Reject',
            loading: busy,
            disabled: !!actionLoading.value && actionLoading.value !== id,
            class:
              '!min-h-[2.25rem] !rounded-xl !px-3.5 !text-xs !font-semibold !shadow-md !shadow-red-600/30 !ring-2 !ring-red-500/35 hover:!brightness-110 dark:!shadow-red-950/50 dark:!ring-red-400/40',
            onClick: () => openRejectConfirm(original)
          })
      ].filter(Boolean))
    }
  }
  ]
})

const confirmTitle = computed(() =>
  confirmKind.value === 'approve' ? 'Approve partner' : 'Reject partner'
)

/** Keep Actions as the last column in header/body order */
const columnOrder = ref([
  'business',
  'accountType',
  'location',
  'approval',
  'rera',
  'contact',
  'actions'
])

watch([page], loadProfiles, { immediate: true })

watch(pageSize, () => {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadProfiles()
})
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <!-- Panel: helper + refresh + filters + table (single container, no stray horizontal scroll on the shell) -->
    <div
      class="partners-panel w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]"
    >
      <div class="flex min-w-0 flex-col">
        <!-- Helper + refresh (inside card) -->
        <div
          class="flex flex-col gap-3 border-b border-gray-200/80 bg-gray-50/50 px-5 py-4 dark:border-gray-800/80 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
        >
          <p class="min-w-0 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Use filters to narrow the list, then
            <span class="font-medium text-emerald-700 dark:text-emerald-400">Approve</span>
            or
            <span class="font-medium text-rose-700 dark:text-rose-400">Reject</span>
            in the last column.
          </p>
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

        <!-- Filters -->
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
            <span class="min-w-0 text-xs text-gray-500 dark:text-gray-500">Refine the partner list</span>
          </div>
          <div class="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-4">
            <div class="space-y-1.5 lg:col-span-5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</label>
              <UInput
                v-model="filters.search"
                placeholder="Business name, RERA, tagline…"
                icon="i-lucide-search"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyFilters"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-3">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">City</label>
              <UInput
                v-model="filters.location"
                placeholder="City"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyFilters"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Approval</label>
              <USelect
                v-model="filters.approvalStatus"
                :items="approvalStatusOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999] max-h-60 min-w-[12rem]' }"
              />
            </div>
            <div class="flex gap-2 lg:col-span-2 lg:justify-end">
              <AppButton
                color="success"
                size="md"
                icon="i-lucide-filter"
                class="flex-1 rounded-xl shadow-md shadow-emerald-600/20 lg:flex-none"
                @click="applyFilters"
              >
                Apply
              </AppButton>
              <AppButton
                variant="outline"
                size="md"
                icon="i-lucide-rotate-ccw"
                class="flex-1 rounded-xl border-gray-300 bg-white/90 dark:border-gray-600 dark:bg-gray-900/50 lg:flex-none"
                @click="resetFilters"
              >
                Reset
              </AppButton>
            </div>
          </div>
        </div>

        <!-- Table: horizontal scroll only on this inner strip (not the whole card) -->
        <div
          class="partners-table-wrap min-h-0 min-w-0 bg-gray-50/40 px-3 py-5 dark:bg-gray-950/50 sm:px-5 sm:py-6"
        >
          <div
            class="partners-table-scroll min-w-0 overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-inner shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-none"
          >
            <UTable
              v-model:column-order="columnOrder"
              :data="profilesRaw"
              :columns="columns"
              :loading="loading"
              class="partners-table min-w-0"
              empty="No partners match your filters."
            />
          </div>
        </div>

        <!-- Pagination -->
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
                  :content="{ class: 'z-[9999] max-h-60 min-w-[6.5rem]' }"
                />
              </div>
              <div class="flex items-center gap-1.5 rounded-xl bg-white/90 p-1 ring-1 ring-gray-200/90 dark:bg-gray-900/90 dark:ring-gray-700">
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

    <!-- Confirm dialog -->
    <UModal
      v-model:open="confirmOpen"
      :title="confirmTitle"
      :ui="{
        content: 'max-w-[92vw] sm:max-w-md',
        header: 'border-b border-gray-200/80 px-5 py-4 dark:border-gray-800',
        body: 'px-5 py-5 sm:px-6 sm:py-6',
        footer: 'border-t border-gray-100 px-5 py-4 dark:border-gray-800'
      }"
    >
      <template #body>
        <div class="space-y-5">
          <div
            class="flex gap-4 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-900 dark:to-gray-950"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner"
              :class="
                confirmKind === 'approve'
                  ? 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30 dark:text-rose-400'
              "
            >
              <UIcon
                :name="confirmKind === 'approve' ? 'i-lucide-badge-check' : 'i-lucide-shield-alert'"
                class="size-6"
              />
            </div>
            <div class="min-w-0 space-y-1">
              <p v-if="pendingProfile" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                <template v-if="confirmKind === 'approve'">
                  Approve
                  <span class="font-semibold text-gray-900 dark:text-white">{{ pendingProfile.businessName }}</span>
                  — they will appear as approved to users.
                </template>
                <template v-else>
                  Reject
                  <span class="font-semibold text-gray-900 dark:text-white">{{ pendingProfile.businessName }}</span>
                  . You can add a reason for your records.
                </template>
              </p>
            </div>
          </div>
          <div v-if="confirmKind === 'reject'" class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason (optional)</label>
            <textarea
              v-model="rejectReason"
              rows="3"
              placeholder="e.g. Incomplete RERA documentation"
              class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="flex w-full flex-wrap justify-end gap-3">
          <AppButton variant="outline" size="md" class="rounded-xl" :disabled="!!actionLoading" @click="close()">
            Cancel
          </AppButton>
          <AppButton
            v-if="confirmKind === 'approve'"
            color="success"
            size="md"
            class="rounded-xl shadow-lg shadow-emerald-600/25"
            :loading="!!actionLoading"
            :disabled="!pendingProfile"
            @click="runConfirmedAction"
          >
            Confirm approval
          </AppButton>
          <AppButton
            v-else
            color="error"
            size="md"
            class="rounded-xl shadow-lg shadow-rose-600/25"
            :loading="!!actionLoading"
            :disabled="!pendingProfile"
            @click="runConfirmedAction"
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

.partners-table-scroll :deep(table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
/* One horizontal scroll area; thin bar so it doesn’t dominate the card */
.partners-table-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.6) transparent;
}
.partners-table-scroll::-webkit-scrollbar {
  height: 8px;
}
.partners-table-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: rgb(148 163 184 / 0.55);
}
.dark .partners-table-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(100 116 139 / 0.6);
}
/* Same horizontal padding + vertical align on header and body cells */
.partners-table-wrap :deep(thead th),
.partners-table-wrap :deep(tbody td) {
  @apply box-border align-middle px-4 py-3.5 text-left;
}
.partners-table-wrap :deep(thead th) {
  @apply whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
.partners-table-wrap :deep(tbody td) {
  @apply text-sm text-gray-800 dark:text-gray-200;
}
.partners-table-wrap :deep(tbody tr) {
  @apply border-b border-gray-100 transition-colors dark:border-gray-800/80;
}
.partners-table-wrap :deep(tbody tr:hover) {
  @apply bg-emerald-50/40 dark:bg-emerald-950/20;
}
.partners-table-wrap :deep(tbody td:last-child) {
  overflow: visible;
  min-width: 10rem;
}
@media (min-width: 1024px) {
  .partners-table-wrap :deep(tbody td:last-child) {
    min-width: 12rem;
  }
}
.partners-table-wrap :deep(tbody tr:last-child) {
  @apply border-b-0;
}
</style>
