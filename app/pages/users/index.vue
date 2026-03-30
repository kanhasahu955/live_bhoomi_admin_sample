<script setup lang="ts">
import { ref, computed, watch, h } from 'vue'
import { watchDebounced } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UIcon from '@nuxt/ui/components/Icon.vue'
import { NuxtLink } from '#components'
import AppButton from '~/components/ui/AppButton.vue'
import { useAdminService, isSuperAdmin } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useAdminUsersListRefresh } from '~/composables/useAdminUsersListRefresh'
import { get } from '~/utils/lodash'
import { extractUsers, extractPaginationMeta, type PaginationMeta } from '~/utils/api-extract'

definePageMeta({
  layout: 'admin',
  title: 'Users',
  description: 'Search, filter, sort, and manage platform users'
})

const ALL = '__all__'

const adminService = useAdminService()
const authStore = useAuthStore()
const toast = useToast()
const { bump } = useAdminUsersListRefresh()

const isSuperAdminUser = computed(() => isSuperAdmin(authStore.user))

const usersRaw = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const metadata = ref<PaginationMeta | null>(null)
const lastUpdatedAt = ref<Date | null>(null)

const filters = ref({
  search: '',
  systemRole: ALL as string,
  status: ALL as string,
  sortBy: 'createdAt' as 'createdAt' | 'email' | 'name' | 'systemRole',
  sortOrder: 'desc' as 'asc' | 'desc'
})

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 }
]

const roleFilterOptions = [
  { label: 'All roles', value: ALL },
  { label: 'User', value: 'USER' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Superadmin', value: 'SUPERADMIN' },
  { label: 'Partner', value: 'PARTNER' },
  { label: 'Agent', value: 'AGENT' },
  { label: 'Moderator', value: 'MODERATOR' }
]

const statusFilterOptions = [
  { label: 'All statuses', value: ALL },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending verification', value: 'PENDING_VERIFICATION' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Banned', value: 'BANNED' },
  { label: 'Deactivated', value: 'DEACTIVATED' },
  { label: 'Deleted', value: 'DELETED' }
]

const sortByOptions = [
  { label: 'Created date', value: 'createdAt' },
  { label: 'Name', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Role', value: 'systemRole' }
]

const sortOrderOptions = [
  { label: 'Newest first', value: 'desc' },
  { label: 'Oldest first', value: 'asc' }
]

const queryParams = computed(() => {
  const p: Record<string, string | number> = {
    page: page.value,
    limit: pageSize.value,
    sortBy: filters.value.sortBy,
    sortOrder: filters.value.sortOrder
  }
  const q = filters.value.search.trim()
  if (q) {
    p.search = q
    p.q = q
  }
  if (filters.value.systemRole !== ALL) p.systemRole = filters.value.systemRole
  if (filters.value.status !== ALL) p.status = filters.value.status
  return p
})

function buildFallbackMeta(rows: Record<string, unknown>[]): PaginationMeta {
  const total = rows.length
  return {
    total,
    page: 1,
    limit: Math.max(total, pageSize.value),
    totalPages: 1
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminService.listUsers(queryParams.value)
    const list = extractUsers(res)
    usersRaw.value = list

    const meta = extractPaginationMeta(res, page.value, pageSize.value)
    if (meta) {
      metadata.value = meta
    } else {
      metadata.value = buildFallbackMeta(list)
    }
    lastUpdatedAt.value = new Date()
  } catch (e) {
    usersRaw.value = []
    metadata.value = null
    const msg = e instanceof Error ? e.message : 'Failed to load users'
    toast.add({ title: 'Users', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.value.search.trim()) n++
  if (filters.value.systemRole !== ALL) n++
  if (filters.value.status !== ALL) n++
  return n
})

function formatTime(d: Date | null): string {
  if (!d) return '—'
  try {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

function copyPageEmails() {
  if (!isSuperAdminUser.value) return
  const emails = sortedUsers.value
    .map((r) => get(r, 'email'))
    .filter((e): e is string => typeof e === 'string' && e.length > 0)
  if (!emails.length) {
    toast.add({ title: 'Nothing to copy', description: 'No emails on this page.', color: 'warning', icon: 'i-lucide-info' })
    return
  }
  void navigator.clipboard.writeText(emails.join('\n'))
  toast.add({
    title: 'Copied',
    description: `${emails.length} email(s) copied to clipboard.`,
    color: 'success',
    icon: 'i-lucide-copy-check'
  })
}

function formatLabel(raw: unknown): string {
  if (raw == null || raw === '') return '—'
  return String(raw)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function displayName(row: Record<string, unknown>): string {
  const n =
    get(row, 'fullName') ??
    get(row, 'name') ??
    get(row, 'displayName') ??
    get(row, 'email')
  return n ? String(n) : '—'
}

function sortValue(row: Record<string, unknown>, col: string): string | number {
  switch (col) {
    case 'email':
      return String(get(row, 'email') ?? '').toLowerCase()
    case 'createdAt': {
      const d = get(row, 'createdAt') ?? get(row, 'created_at')
      const t = d ? new Date(String(d)).getTime() : 0
      return Number.isFinite(t) ? t : 0
    }
    case 'systemRole':
      return String(get(row, 'systemRole') ?? get(row, 'role') ?? '').toLowerCase()
    case 'name':
    default:
      return displayName(row).toLowerCase()
  }
}

/** Stable sort on the current page (works with or without server-side sorting). */
const sortedUsers = computed(() => {
  const rows = usersRaw.value.map((r) => ({ ...r }) as Record<string, unknown>)
  const col = filters.value.sortBy
  const desc = filters.value.sortOrder === 'desc'
  rows.sort((a, b) => {
    const va = sortValue(a, col)
    const vb = sortValue(b, col)
    let cmp = 0
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
    else cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
    return desc ? -cmp : cmp
  })
  return rows
})

function refresh() {
  loadUsers()
}

function applyFilters() {
  const prev = page.value
  page.value = 1
  if (prev === 1) loadUsers()
}

function resetFilters() {
  filters.value = {
    search: '',
    systemRole: ALL,
    status: ALL,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
  const prev = page.value
  page.value = 1
  if (prev === 1) loadUsers()
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

function exportCsv() {
  if (!isSuperAdminUser.value) {
    toast.add({ title: 'Export', description: 'Only Superadmin can export.', color: 'warning', icon: 'i-lucide-lock' })
    return
  }
  const rows = sortedUsers.value
  if (!rows.length) {
    toast.add({ title: 'Export', description: 'No rows to export.', color: 'warning', icon: 'i-lucide-info' })
    return
  }
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Account type', 'Created', 'Id']
  const lines = [
    header.join(','),
    ...rows.map((r) => {
      const id = String(get(r, 'id') ?? '')
      const phone = String(get(r, 'phone') ?? get(r, 'mobile') ?? '')
      const role = String(get(r, 'systemRole') ?? get(r, 'role') ?? '')
      const status = String(get(r, 'status') ?? get(r, 'accountStatus') ?? '')
      const acc = String(get(r, 'accountType') ?? '')
      const created = get(r, 'createdAt') ?? get(r, 'created_at')
      const createdStr = created
        ? new Date(String(created)).toISOString().slice(0, 10)
        : ''
      return [
        escape(displayName(r)),
        escape(String(get(r, 'email') ?? '')),
        escape(phone),
        escape(role),
        escape(status),
        escape(acc),
        escape(createdStr),
        escape(id)
      ].join(',')
    })
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `users-page-${page.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'Exported', description: `${rows.length} row(s) downloaded.`, color: 'success', icon: 'i-lucide-download' })
}

const columnOrder = ref([
  'user',
  'email',
  'phone',
  'accountType',
  'role',
  'status',
  'created',
  'actions'
])

watch(
  isSuperAdminUser,
  (sup) => {
    const o = columnOrder.value.filter((c) => c !== 'phone')
    if (sup) {
      const i = o.indexOf('email')
      if (i !== -1 && !o.includes('phone')) {
        columnOrder.value = [...o.slice(0, i + 1), 'phone', ...o.slice(i + 1)]
      }
    } else {
      columnOrder.value = o
    }
  },
  { immediate: true }
)

const columns = computed(() => {
  const phoneCol = {
    id: 'phone',
    header: 'Phone',
    size: 120,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const v = get(row.original, 'phone') ?? get(row.original, 'mobile')
      return v ? String(v) : '—'
    }
  }

  return [
  {
    id: 'user',
    header: 'User',
    size: 200,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const r = row.original as Record<string, unknown>
      const id = String(get(r, 'id') ?? '')
      const primary = displayName(r)
      const secondary = get(r, 'email')
      return h('div', { class: 'min-w-0 py-1' }, [
        id
          ? h(
              NuxtLink,
              {
                to: `/users/${id}`,
                class: 'font-medium text-emerald-700 hover:underline dark:text-emerald-400'
              },
              () => primary
            )
          : h('div', { class: 'font-medium text-gray-900 dark:text-white' }, primary),
        secondary
          ? h('div', { class: 'mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400' }, String(secondary))
          : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    size: 200,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const v = get(row.original, 'email')
      return v ? String(v) : '—'
    }
  },
  ...(isSuperAdminUser.value ? [phoneCol] : []),
  {
    id: 'accountType',
    header: 'Type',
    size: 100,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const v = get(row.original, 'accountType')
      if (!v) return '—'
      return h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => formatLabel(v))
    }
  },
  {
    id: 'role',
    header: 'Role',
    size: 120,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const r = row.original as Record<string, unknown>
      const role = String(get(r, 'systemRole') ?? get(r, 'role') ?? '—')
      if (role === '—') return '—'
      return h(
        UBadge,
        { color: 'primary', variant: 'subtle', size: 'sm', class: 'font-medium' },
        () => formatLabel(role)
      )
    }
  },
  {
    id: 'status',
    header: 'Status',
    size: 110,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const r = row.original as Record<string, unknown>
      const s = String(get(r, 'status') ?? get(r, 'accountStatus') ?? '—')
      if (s === '—') return '—'
      const ok = /active|verified|approved/i.test(s)
      return h(
        UBadge,
        {
          color: ok ? 'success' : 'neutral',
          variant: 'subtle',
          size: 'sm'
        },
        () => formatLabel(s)
      )
    }
  },
  {
    id: 'created',
    header: 'Created',
    size: 130,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const r = row.original as Record<string, unknown>
      const d = get(r, 'createdAt') ?? get(r, 'created_at')
      if (!d) return '—'
      try {
        return new Date(String(d)).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        return String(d)
      }
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    size: 100,
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right'
      }
    },
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const r = row.original as Record<string, unknown>
      const id = String(get(r, 'id') ?? '')
      if (!id) return '—'
      return h(
        AppButton,
        {
          size: 'sm',
          color: 'success',
          variant: 'solid',
          icon: 'i-lucide-arrow-right',
          label: 'View',
          to: `/users/${id}`,
          class:
            '!min-h-8 !px-2.5 !text-xs !font-semibold !shadow-md !shadow-emerald-600/25 !ring-2 !ring-emerald-500/30 hover:!brightness-110 dark:!ring-emerald-400/35'
        }
      )
    }
  }
  ]
})

watch([page, pageSize], loadUsers, { immediate: true })

watchDebounced(
  () => filters.value.search,
  () => {
    if (page.value !== 1) page.value = 1
    else loadUsers()
  },
  { debounce: 400 }
)

watch(
  () => [filters.value.systemRole, filters.value.status, filters.value.sortBy, filters.value.sortOrder],
  () => {
    const prev = page.value
    page.value = 1
    if (prev === 1) loadUsers()
  }
)

watch(bump, () => {
  loadUsers()
})
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <div
      class="users-panel w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_-12px_rgba(0,0,0,0.65)] dark:ring-white/[0.06]"
    >
      <div class="flex min-w-0 flex-col">
        <!-- Helper + export + refresh (same pattern as Partners) -->
        <div
          class="flex flex-col gap-3 border-b border-gray-200/80 bg-gray-50/50 px-5 py-4 dark:border-gray-800/80 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
        >
          <div class="min-w-0 max-w-2xl space-y-2">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Search by name or email, filter by role and status, then open a user to manage account details.
              <template v-if="isSuperAdminUser">
                Phone numbers appear only for Superadmin. Use
                <span class="font-medium text-emerald-700 dark:text-emerald-400">Export CSV</span>
                or
                <span class="font-medium text-emerald-700 dark:text-emerald-400">Copy emails</span>
                for the current page.
              </template>
              <template v-else>
                Phone numbers and bulk export are restricted to Superadmin.
              </template>
            </p>
            <div
              v-if="metadata"
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400"
            >
              <span class="inline-flex items-center gap-1.5">
                <UIcon name="i-lucide-users" class="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span class="font-medium text-gray-700 dark:text-gray-200">{{ metadata.total }}</span>
                total
              </span>
              <span class="text-gray-400 dark:text-gray-600">·</span>
              <span>{{ sortedUsers.length }} on this page</span>
              <span v-if="activeFilterCount > 0" class="text-emerald-700 dark:text-emerald-400">
                · {{ activeFilterCount }} filter(s) active
              </span>
              <span class="text-gray-400 dark:text-gray-600">·</span>
              <span>Updated {{ formatTime(lastUpdatedAt) }}</span>
            </div>
          </div>
          <div class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <AppButton
              v-if="isSuperAdminUser"
              icon="i-lucide-download"
              size="sm"
              variant="outline"
              class="w-full shrink-0 justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
              :disabled="loading || !sortedUsers.length"
              @click="exportCsv"
            >
              Export CSV
            </AppButton>
            <AppButton
              icon="i-lucide-refresh-cw"
              size="sm"
              variant="outline"
              class="w-full shrink-0 justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
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
            <span class="min-w-0 text-xs text-gray-500 dark:text-gray-500">Refine the user list — Enter applies search.</span>
          </div>

          <div class="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-4">
            <div class="space-y-1.5 lg:col-span-4">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</label>
              <UInput
                v-model="filters.search"
                placeholder="Name, email, or ID…"
                icon="i-lucide-search"
                size="md"
                class="w-full rounded-xl shadow-sm"
                @keydown.enter="applyFilters"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</label>
              <USelect
                v-model="filters.systemRole"
                :items="roleFilterOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</label>
              <USelect
                v-model="filters.status"
                :items="statusFilterOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sort by</label>
              <USelect
                v-model="filters.sortBy"
                :items="sortByOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
            <div class="space-y-1.5 lg:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Order</label>
              <USelect
                v-model="filters.sortOrder"
                :items="sortOrderOptions"
                size="md"
                class="w-full rounded-xl"
                :content="{ class: 'z-[9999]' }"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <AppButton
              v-if="isSuperAdminUser"
              icon="i-lucide-copy"
              size="sm"
              variant="ghost"
              class="w-full justify-start text-gray-600 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-gray-400 dark:hover:text-emerald-300 sm:w-auto"
              :disabled="loading || !sortedUsers.length"
              @click="copyPageEmails"
            >
              Copy emails (this page)
            </AppButton>
            <div class="flex w-full flex-wrap gap-1.5 sm:w-auto sm:justify-end sm:ml-auto">
              <AppButton
                color="success"
                size="sm"
                icon="i-lucide-filter"
                class="flex-1 rounded-xl shadow-md shadow-emerald-600/20 sm:flex-none sm:min-w-[6.5rem]"
                @click="applyFilters"
              >
                Apply
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                icon="i-lucide-rotate-ccw"
                class="flex-1 rounded-xl border-gray-300 bg-white/90 dark:border-gray-600 dark:bg-gray-900/50 sm:flex-none sm:min-w-[6.5rem]"
                @click="resetFilters"
              >
                Reset
              </AppButton>
            </div>
          </div>
        </div>

        <div class="users-table-wrap min-h-0 min-w-0 bg-gray-50/40 px-3 py-5 dark:bg-gray-950/50 sm:px-5 sm:py-6">
          <div
            class="users-table-scroll min-w-0 overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-inner shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900/40 dark:shadow-none"
          >
            <UTable
              v-model:column-order="columnOrder"
              :data="sortedUsers"
              :columns="columns"
              :loading="loading"
              class="min-w-0"
              empty="No users match your filters."
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
  </AppStack>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.users-table-scroll :deep(table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}
.users-table-scroll {
  scrollbar-width: thin;
}
.users-table-wrap :deep(thead th),
.users-table-wrap :deep(tbody td) {
  @apply box-border align-middle px-4 py-3.5 text-left;
}
.users-table-wrap :deep(thead th) {
  @apply whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400;
}
.users-table-wrap :deep(tbody td) {
  @apply text-sm text-gray-800 dark:text-gray-200;
}
.users-table-wrap :deep(tbody tr) {
  @apply border-b border-gray-100 transition-colors dark:border-gray-800/80;
}
.users-table-wrap :deep(tbody tr:hover) {
  @apply bg-emerald-50/40 dark:bg-emerald-950/20;
}
.users-table-wrap :deep(tbody tr:last-child) {
  @apply border-b-0;
}
</style>
