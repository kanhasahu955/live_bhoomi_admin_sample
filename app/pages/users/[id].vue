<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useClipboard } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import AppButton from '~/components/ui/AppButton.vue'
import {
  useAdminService,
  useUserService,
  type AuthUser,
  isSuperAdmin,
  canUpdateUserStatus,
  canUpdateUserRole
} from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useAdminUsersListRefresh } from '~/composables/useAdminUsersListRefresh'
import { get } from '~/utils/lodash'
import { extractUsers } from '~/utils/api-extract'
import { adminModalUiStacked } from '~/utils/admin-modal-ui'

definePageMeta({
  layout: 'admin',
  title: 'User details',
  description: 'View profile and update role or account status'
})

type UserDetail = Partial<
  AuthUser & {
    status?: string
    accountStatus?: string
    /** Some APIs use snake_case only */
    system_role?: string
    account_status?: string
    phone?: string
    mobile?: string
    createdAt?: string
    created_at?: string
    updatedAt?: string
    updated_at?: string
    avatarUrl?: string
    avatar?: string
  }
>

const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()
const adminService = useAdminService()
const userService = useUserService()
const { requestUsersListRefresh } = useAdminUsersListRefresh()
const { copy, copied } = useClipboard()

const isSuperAdminUser = computed(() => isSuperAdmin(authStore.user))
const canEditRole = computed(() => canUpdateUserRole(authStore.user))
const canEditStatus = computed(() => canUpdateUserStatus(authStore.user))

const activeTab = ref<'overview' | 'tools'>('overview')
const profileSearch = ref('')

const userId = computed(() => String(route.params.id ?? ''))

const user = ref<UserDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

/** Admin-only fields — always editable in the Access card */
const editForm = ref({
  systemRole: '',
  status: ''
})

const initialForm = ref({ systemRole: '', status: '' })

/** PATCH /admin/users/:id/role — API values (Superadmin only). */
const roleOptions = [
  { label: 'User', value: 'USER' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Superadmin', value: 'SUPERADMIN' }
]

/** PATCH /admin/users/:id/status — API values. Include empty so USelect can show a label when unset. */
const statusOptions = [
  { label: 'Not set', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending verification', value: 'PENDING_VERIFICATION' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Banned', value: 'BANNED' },
  { label: 'Deactivated', value: 'DEACTIVATED' },
  { label: 'Deleted', value: 'DELETED' }
]

const showRefreshConfirm = ref(false)
const userDetailSavedModalUi = adminModalUiStacked()

/** Flatten nested API shapes: { user }, { data }, { data: { user } }, JSON:API { attributes }. */
function pickRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  let merged: Record<string, unknown> = { ...r }

  const data = r.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    merged = { ...merged, ...d }
    const du = d.user
    if (du && typeof du === 'object' && !Array.isArray(du)) {
      merged = { ...merged, ...(du as Record<string, unknown>) }
    }
  }

  const nested = merged.user ?? merged.profile ?? r.profile
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    merged = { ...merged, ...(nested as Record<string, unknown>) }
  }

  const attrs = merged.attributes
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    merged = { ...merged, ...(attrs as Record<string, unknown>) }
  }

  return merged
}

function str(...vals: unknown[]): string {
  for (const v of vals) {
    if (v != null && v !== '') return String(v)
  }
  return ''
}

function mapRowToUser(row: Record<string, unknown>): UserDetail {
  const r = pickRecord(row)
  const email = str(
    get(r, 'email'),
    get(r, 'userEmail'),
    get(r, 'user.email'),
    get(r, 'contactEmail')
  )
  const fullName = str(get(r, 'fullName'), get(r, 'name'), get(r, 'displayName'), get(r, 'user.fullName'))
  const phone = str(get(r, 'phone'), get(r, 'mobile'), get(r, 'phoneNumber'), get(r, 'user.phone'))
  const systemRole = str(
    get(r, 'systemRole'),
    get(r, 'system_role'),
    get(r, 'role'),
    get(r, 'user.role'),
    get(r, 'user.systemRole'),
    get(r, 'user.system_role'),
    get(r, 'attributes.systemRole'),
    get(r, 'attributes.system_role')
  )
  const status = str(
    get(r, 'status'),
    get(r, 'accountStatus'),
    get(r, 'account_status'),
    get(r, 'userStatus'),
    get(r, 'user.status'),
    get(r, 'user.accountStatus'),
    get(r, 'user.account_status'),
    get(r, 'account.status'),
    get(r, 'verificationStatus'),
    get(r, 'user.verificationStatus'),
    get(r, 'attributes.status'),
    get(r, 'attributes.accountStatus'),
    get(r, 'attributes.account_status')
  )
  const accountType = str(
    get(r, 'accountType'),
    get(r, 'account_type'),
    get(r, 'user.accountType'),
    get(r, 'user.account_type')
  )
  const id = str(get(r, 'id'), get(r, 'user.id'), get(r, '_id'))
  const createdAt = str(get(r, 'createdAt'), get(r, 'created_at'), get(r, 'user.createdAt'))
  const updatedAt = str(get(r, 'updatedAt'), get(r, 'updated_at'), get(r, 'user.updatedAt'))
  const avatarUrl = str(get(r, 'avatarUrl'), get(r, 'avatar'), get(r, 'user.avatarUrl'))

  return {
    id,
    email: email || undefined,
    name: get(r, 'name') as string | undefined,
    fullName: fullName || undefined,
    phone: phone || undefined,
    mobile: get(r, 'mobile') as string | undefined,
    systemRole: systemRole || undefined,
    role: get(r, 'role') as string | undefined,
    status: status || undefined,
    accountStatus:
      str(get(r, 'accountStatus'), get(r, 'account_status'), get(r, 'user.accountStatus')) || undefined,
    system_role: (get(r, 'system_role') as string | undefined) ?? undefined,
    account_status: (get(r, 'account_status') as string | undefined) ?? undefined,
    accountType: accountType || undefined,
    createdAt: createdAt || undefined,
    created_at: createdAt || undefined,
    updatedAt: updatedAt || undefined,
    updated_at: updatedAt || undefined,
    avatarUrl: avatarUrl || undefined
  }
}

/**
 * Merge GET /user/:id (`fromApi`) with admin list row (`fromList`).
 * Prefer list for fields the admin table shows (email, phone, role, status, type) when GET omits them.
 */
function mergeUserDetail(fromApi: UserDetail, fromList: UserDetail): UserDetail {
  const pick = (x?: string | null, y?: string | null) => {
    const xs = x != null && String(x).trim() !== '' ? String(x).trim() : ''
    const ys = y != null && String(y).trim() !== '' ? String(y).trim() : ''
    return xs || ys || undefined
  }
  /** Prefer admin list first (richer for this screen). */
  const L = (l?: string | null, a?: string | null) => pick(l, a)
  return {
    ...fromApi,
    ...fromList,
    id: pick(fromApi.id, fromList.id) ?? fromApi.id ?? fromList.id ?? '',
    email: L(fromList.email, fromApi.email),
    fullName: pick(fromApi.fullName, fromList.fullName) ?? L(fromList.fullName, fromApi.fullName),
    name: pick(fromApi.name, fromList.name) ?? L(fromList.name, fromApi.name),
    phone: L(fromList.phone, fromApi.phone),
    mobile: L(fromList.mobile, fromApi.mobile),
    systemRole:
      L(fromList.systemRole, fromApi.systemRole) ??
      L(fromList.system_role, fromApi.system_role) ??
      L(fromList.role, fromApi.role),
    role: L(fromList.role, fromApi.role),
    status:
      L(fromList.status, fromApi.status) ??
      L(fromList.accountStatus, fromApi.accountStatus) ??
      L(fromList.account_status, fromApi.account_status),
    accountStatus:
      L(fromList.accountStatus, fromApi.accountStatus) ?? L(fromList.account_status, fromApi.account_status),
    accountType: L(fromList.accountType, fromApi.accountType),
    system_role: L(fromList.system_role, fromApi.system_role),
    account_status: L(fromList.account_status, fromApi.account_status),
    createdAt: pick(fromApi.createdAt, fromList.createdAt) ?? pick(fromApi.created_at, fromList.created_at),
    created_at: pick(fromApi.created_at, fromList.created_at),
    updatedAt: pick(fromApi.updatedAt, fromList.updatedAt) ?? pick(fromApi.updated_at, fromList.updated_at),
    updated_at: pick(fromApi.updated_at, fromList.updated_at),
    avatarUrl: pick(fromApi.avatarUrl, fromList.avatarUrl)
  }
}

/** Find user row in admin list: search by id, then scan first page if needed. */
async function fetchUserRowFromAdminList(uid: string): Promise<Record<string, unknown> | null> {
  const match = (rows: Record<string, unknown>[]) =>
    rows.find((u) => String(get(u, 'id')) === uid) ??
    rows.find((u) => String(get(u, 'userId')) === uid) ??
    rows.find((u) => String(get(u, '_id')) === uid)

  try {
    const res1 = await adminService.listUsers({ page: 1, limit: 500, search: uid, q: uid })
    const rows1 = extractUsers(res1)
    const hit1 = match(rows1)
    if (hit1) return hit1
  } catch {
    /* continue */
  }
  try {
    const res2 = await adminService.listUsers({ page: 1, limit: 500 })
    const rows2 = extractUsers(res2)
    const hit2 = match(rows2)
    if (hit2) return hit2
  } catch {
    /* ignore */
  }
  return null
}

async function loadUser(opts?: { silent?: boolean }) {
  if (!userId.value) return
  const silent = opts?.silent === true
  if (!silent) loading.value = true
  error.value = null
  try {
    let fromApi: UserDetail | null = null
    try {
      const single = (await userService.getById(userId.value)) as unknown
      const rec = Array.isArray(single) ? null : pickRecord(single as Record<string, unknown>)
      if (rec && Object.keys(rec).length) {
        fromApi = mapRowToUser(rec as Record<string, unknown>)
      }
    } catch {
      /* list fallback below */
    }

    let fromList: UserDetail | null = null
    try {
      const item = await fetchUserRowFromAdminList(userId.value)
      if (item) {
        fromList = mapRowToUser(item)
      }
    } catch {
      /* ignore */
    }

    const found: UserDetail | null =
      fromApi && fromList ? mergeUserDetail(fromApi, fromList) : fromApi ?? fromList

    user.value = found
    if (found) {
      const role = normalizeRoleForForm(
        String(found.systemRole ?? found.role ?? found.system_role ?? 'USER')
      )
      const rawStatus = String(
        found.status ?? found.accountStatus ?? found.account_status ?? ''
      ).trim()
      const statusNorm = normalizeStatusValue(rawStatus)
      editForm.value = {
        systemRole: role,
        status: statusNorm === '' ? '' : statusNorm
      }
      initialForm.value = { ...editForm.value }
    }
  } catch {
    error.value = 'Failed to load user'
    user.value = null
  } finally {
    if (!silent) loading.value = false
  }
}

/** Align API / legacy status strings with PATCH body enums so USelect can resolve labels. */
function normalizeStatusValue(s: string): string {
  const raw = String(s ?? '').trim()
  if (!raw) return ''
  const known = statusOptions.map((o) => o.value).filter((v) => v !== '')
  if (known.includes(raw)) return raw
  const u = raw.toUpperCase().replace(/\s+/g, '_').replace(/-+/g, '_')
  if (known.includes(u)) return u
  if (u.includes('PENDING') && (u.includes('VERIF') || u.includes('EMAIL'))) return 'PENDING_VERIFICATION'
  if (u === 'VERIFIED' || u === 'EMAIL_VERIFIED' || u === 'CONFIRMED') return 'ACTIVE'
  if (u === 'INACTIVE' || u === 'DISABLED') return 'DEACTIVATED'
  if (u === 'PENDING') return 'PENDING_VERIFICATION'
  if (u === 'SUSPEND' || u === 'SUSPENDED') return 'SUSPENDED'
  if (u === 'BAN' || u === 'BANNED') return 'BANNED'
  if (u === 'DELETE' || u === 'DELETED' || u === 'REMOVED') return 'DELETED'
  return raw
}

/** Uppercase known system roles so USelect items match (API may send mixed case). */
function normalizeRoleForForm(r: string): string {
  const t = String(r ?? '').trim()
  if (!t) return 'USER'
  const u = t.toUpperCase()
  const allowed = new Set(roleOptions.map((o) => o.value))
  if (allowed.has(u)) return u
  return t
}

const roleBadgeColor = computed(() => {
  const r = user.value?.systemRole ?? user.value?.role ?? ''
  if (r === 'ADMIN') return 'error'
  if (r === 'PARTNER' || r === 'AGENT') return 'primary'
  return 'neutral'
})

const statusBadgeColor = computed(() => {
  const s = String(user.value?.status ?? user.value?.accountStatus ?? '').toUpperCase()
  if (/ACTIVE|VERIFIED/.test(s)) return 'success'
  if (/SUSPEND|INACTIVE/.test(s)) return 'error'
  if (/PENDING|VERIFY/.test(s)) return 'warning'
  return 'neutral'
})

function displayName(u: UserDetail | null): string {
  if (!u) return '—'
  const n = u.fullName ?? u.name ?? u.email
  return n ? String(n) : '—'
}

function formatLabel(raw: unknown): string {
  if (raw == null || raw === '') return '—'
  return String(raw)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(d: unknown): string {
  if (!d) return '—'
  try {
    return new Date(String(d)).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return String(d)
  }
}

const hasAdminChanges = computed(() => {
  const roleDiff = editForm.value.systemRole !== initialForm.value.systemRole
  const statusDiff = editForm.value.status !== initialForm.value.status
  return (canEditRole.value && roleDiff) || (canEditStatus.value && statusDiff)
})

/** Include current API value if missing from static lists (unknown enum values). */
const roleSelectItems = computed(() => {
  const v = editForm.value.systemRole
  if (v && !roleOptions.some((o) => o.value === v)) {
    return [{ label: formatLabel(v), value: v }, ...roleOptions]
  }
  return roleOptions
})

const statusSelectItems = computed(() => {
  const v = String(editForm.value.status ?? '').trim()
  if (v && !statusOptions.some((o) => o.value === v)) {
    return [{ label: formatLabel(v), value: v }, ...statusOptions]
  }
  return statusOptions
})

async function copyId() {
  if (!isSuperAdminUser.value || !user.value?.id) return
  await copy(user.value.id)
  toast.add({
    title: 'Copied',
    description: 'User ID copied to clipboard.',
    color: 'success',
    icon: 'i-lucide-copy-check'
  })
}

async function copyEmail() {
  if (!isSuperAdminUser.value) return
  const e = user.value?.email
  if (!e) return
  await copy(e)
  toast.add({ title: 'Copied', description: 'Email copied.', color: 'success', icon: 'i-lucide-copy-check' })
}

function exportUserJson() {
  if (!isSuperAdminUser.value || !user.value) {
    toast.add({ title: 'Restricted', description: 'Only Superadmin can export.', color: 'warning', icon: 'i-lucide-lock' })
    return
  }
  const blob = new Blob([JSON.stringify(user.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `user-${user.value.id?.slice(0, 8) ?? 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'Exported', description: 'User JSON downloaded.', color: 'success', icon: 'i-lucide-download' })
}

function exportUserCsv() {
  if (!isSuperAdminUser.value || !user.value) {
    toast.add({ title: 'Restricted', description: 'Only Superadmin can export.', color: 'warning', icon: 'i-lucide-lock' })
    return
  }
  const u = user.value
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  const header = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Account type', 'Created', 'Id']
  const line = [
    escape(displayName(u)),
    escape(String(u.email ?? '')),
    escape(String(u.phone ?? u.mobile ?? '')),
    escape(String(u.systemRole ?? u.role ?? '')),
    escape(String(u.status ?? u.accountStatus ?? '')),
    escape(String(u.accountType ?? '')),
    escape(String(u.createdAt ?? u.created_at ?? '')),
    escape(String(u.id ?? ''))
  ].join(',')
  const blob = new Blob([[header.join(','), line].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `user-${String(u.id).slice(0, 8)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'Exported', description: 'CSV downloaded.', color: 'success', icon: 'i-lucide-download' })
}

async function copyRawJson() {
  if (!isSuperAdminUser.value || !user.value) {
    toast.add({ title: 'Restricted', description: 'Only Superadmin can copy raw data.', color: 'warning', icon: 'i-lucide-lock' })
    return
  }
  await copy(JSON.stringify(user.value, null, 2))
  toast.add({ title: 'Copied', description: 'JSON copied to clipboard.', color: 'success', icon: 'i-lucide-copy-check' })
}

function profileFieldMatches(label: string, value: unknown): boolean {
  const q = profileSearch.value.trim().toLowerCase()
  if (!q) return true
  return (
    label.toLowerCase().includes(q) ||
    String(value ?? '')
      .toLowerCase()
      .includes(q)
  )
}

const hasProfileVisible = computed(() => {
  const u = user.value
  if (!u) return true
  if (!profileSearch.value.trim()) return true
  return (
    profileFieldMatches('Full name', u.fullName ?? u.name) ||
    profileFieldMatches('Email', u.email) ||
    (isSuperAdminUser.value && profileFieldMatches('Phone', u.phone ?? u.mobile)) ||
    profileFieldMatches('User ID', u.id)
  )
})

async function saveAccess() {
  if (!user.value?.id || !hasAdminChanges.value) {
    toast.add({ title: 'No changes', description: 'Update role or status first.', color: 'primary', icon: 'i-lucide-info' })
    return
  }
  const roleChanged = editForm.value.systemRole !== initialForm.value.systemRole
  const statusChanged = editForm.value.status !== initialForm.value.status

  if (roleChanged && !canEditRole.value) {
    toast.add({
      title: 'Not allowed',
      description: 'Only Superadmin can change system role.',
      color: 'warning',
      icon: 'i-lucide-lock'
    })
    return
  }
  if (statusChanged && !canEditStatus.value) {
    toast.add({
      title: 'Not allowed',
      description: 'Your role cannot update account status.',
      color: 'warning',
      icon: 'i-lucide-lock'
    })
    return
  }

  saving.value = true
  error.value = null
  try {
    const id = user.value.id

    if (roleChanged && canEditRole.value) {
      await adminService.updateUserRole(id, { role: editForm.value.systemRole })
    }
    if (statusChanged && canEditStatus.value && editForm.value.status) {
      await adminService.updateUserStatus(id, { status: editForm.value.status })
    }

    await loadUser({ silent: true })
    requestUsersListRefresh()
    showRefreshConfirm.value = true
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to save'
    error.value = msg
    toast.add({ title: 'Save failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

function closeSaveSuccessModal(close?: () => void) {
  showRefreshConfirm.value = false
  close?.()
}

function resetAccessForm() {
  editForm.value = { ...initialForm.value }
}

/**
 * Return to the users list. Deferred so Teleport layers (modal, select popovers) finish teardown
 * before the page unmounts — avoids Vue `removeFragment` / `nextSibling` errors on navigation.
 */
async function goBack() {
  showRefreshConfirm.value = false
  if (import.meta.client) {
    ;(document.activeElement as HTMLElement | null)?.blur()
  }
  await nextTick()
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  try {
    return await navigateTo('/users')
  } catch {
    /* duplicate / aborted navigation */
  }
}

watch(userId, loadUser, { immediate: true })

watch(isSuperAdminUser, (sup) => {
  if (!sup && activeTab.value === 'tools') activeTab.value = 'overview'
})
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <!-- Top bar -->
    <div
      class="flex flex-col gap-4 border-b border-gray-200/80 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="layout-header-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-gray-200/80 transition hover:bg-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800"
          aria-label="Back to users"
          @click="goBack"
        >
          <UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {{ user ? displayName(user) : 'User details' }}
          </h1>
          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            View profile and update role or account status
          </p>
        </div>
      </div>
      <div v-if="user && !loading" class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <AppButton
          icon="i-lucide-refresh-cw"
          size="sm"
          variant="outline"
          class="user-detail-toolbar-btn w-full shrink-0 justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
          :loading="loading"
          @click="loadUser"
        >
          Refresh
        </AppButton>
        <template v-if="isSuperAdminUser">
          <AppButton
            icon="i-lucide-braces"
            size="sm"
            variant="outline"
            class="user-detail-toolbar-btn w-full shrink-0 justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
            @click="exportUserJson"
          >
            Export JSON
          </AppButton>
          <AppButton
            icon="i-lucide-table"
            size="sm"
            variant="outline"
            class="user-detail-toolbar-btn w-full shrink-0 justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80 sm:w-auto"
            @click="exportUserCsv"
          >
            Export CSV
          </AppButton>
        </template>
      </div>
    </div>

    <p
      v-if="error && !loading"
      class="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ error }}
    </p>

    <div
      v-if="loading"
      class="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200/90 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <UIcon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-emerald-500" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Loading user…</p>
    </div>

    <template v-else-if="user">
      <div
        class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:ring-white/[0.06]"
      >
        <!-- Hero -->
        <div
          class="relative border-b border-emerald-500/15 bg-gradient-to-br from-emerald-50/95 via-white to-slate-50/90 px-5 py-8 dark:from-emerald-950/50 dark:via-gray-950 dark:to-slate-950 sm:px-8"
        >
          <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
          />
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-5">
              <div
                class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-emerald-100 to-teal-100 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20 dark:border-gray-700 dark:from-emerald-900/40 dark:to-teal-900/30 dark:ring-emerald-400/20"
              >
                <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" class="size-full object-cover">
                <span
                  v-else
                  class="text-2xl font-bold text-emerald-800 dark:text-emerald-300"
                >
                  {{ (displayName(user) || '?')[0].toUpperCase() }}
                </span>
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge v-if="user.accountType" color="neutral" variant="outline">
                    {{ formatLabel(user.accountType) }}
                  </UBadge>
                  <UBadge :color="roleBadgeColor" size="lg" variant="subtle" class="font-semibold">
                    {{ formatLabel(user.systemRole ?? user.role ?? user.system_role) }}
                  </UBadge>
                  <UBadge :color="statusBadgeColor" size="lg" variant="subtle" class="font-semibold">
                    {{ formatLabel(user.status ?? user.accountStatus ?? user.account_status) }}
                  </UBadge>
                </div>
                <p class="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {{ displayName(user) }}
                </p>
                <p v-if="user.email" class="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
                  {{ user.email }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 lg:justify-end">
              <template v-if="isSuperAdminUser">
                <AppButton
                  size="sm"
                  variant="outline"
                  icon="i-lucide-copy"
                  class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
                  @click="copyId"
                >
                  {{ copied ? 'Copied ID' : 'Copy user ID' }}
                </AppButton>
                <AppButton
                  v-if="user.email"
                  size="sm"
                  variant="outline"
                  icon="i-lucide-copy"
                  class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
                  @click="copyEmail"
                >
                  Copy email
                </AppButton>
                <AppButton
                  v-if="user.email"
                  size="sm"
                  variant="outline"
                  icon="i-lucide-mail"
                  class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
                  :to="`mailto:${user.email}`"
                  external
                  target="_blank"
                >
                  Open mail
                </AppButton>
              </template>
            </div>
          </div>
        </div>

        <!-- Overview vs tools -->
        <div
          class="flex flex-wrap gap-2 border-b border-gray-200/90 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40 sm:px-8"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            :class="
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
            "
            @click="activeTab = 'overview'"
          >
            <UIcon name="i-lucide-layout-dashboard" class="size-4" />
            Overview
          </button>
          <button
            v-if="isSuperAdminUser"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            :class="
              activeTab === 'tools'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
            "
            @click="activeTab = 'tools'"
          >
            <UIcon name="i-lucide-database" class="size-4" />
            Tools &amp; data
          </button>
        </div>

        <div v-show="activeTab === 'overview'" class="grid gap-0 lg:grid-cols-5">
          <!-- Profile column -->
          <div class="border-b border-gray-200/80 p-5 dark:border-gray-800 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
            <div class="mb-4 flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                <UIcon name="i-lucide-user-circle" class="h-5 w-5" />
              </span>
              <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
                Profile
              </h2>
            </div>
            <div class="mb-4">
              <UInput
                v-model="profileSearch"
                icon="i-lucide-search"
                size="md"
                :placeholder="
                  isSuperAdminUser
                    ? 'Filter fields (name, email, phone, id)…'
                    : 'Filter fields (name, email, id)…'
                "
                class="w-full rounded-xl shadow-sm"
              />
            </div>
            <p
              v-if="!hasProfileVisible"
              class="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
            >
              No profile fields match “{{ profileSearch }}”.
            </p>
            <dl class="space-4">
              <div
                v-show="profileFieldMatches('Full name', user.fullName ?? user.name)"
                class="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-700/80 dark:bg-gray-900/40"
              >
                <dt class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <UIcon name="i-lucide-user" class="size-3.5" />
                  Full name
                </dt>
                <dd class="mt-2 text-base font-medium text-gray-900 dark:text-white">
                  {{ user.fullName ?? user.name ?? '—' }}
                </dd>
              </div>
              <div
                v-show="profileFieldMatches('Email', user.email)"
                class="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-700/80 dark:bg-gray-900/40"
              >
                <dt class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <UIcon name="i-lucide-mail" class="size-3.5" />
                  Email
                </dt>
                <dd class="mt-2 break-all text-base font-medium text-emerald-700 dark:text-emerald-400">
                  {{ user.email || '—' }}
                </dd>
              </div>
              <div
                v-show="isSuperAdminUser && profileFieldMatches('Phone', user.phone ?? user.mobile)"
                class="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-700/80 dark:bg-gray-900/40"
              >
                <dt class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <UIcon name="i-lucide-phone" class="size-3.5" />
                  Phone
                </dt>
                <dd class="mt-2 text-base font-medium text-gray-900 dark:text-white">
                  {{ user.phone ?? user.mobile ?? '—' }}
                </dd>
              </div>
              <div
                v-show="profileFieldMatches('User ID', user.id)"
                class="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-700/80 dark:bg-gray-900/40"
              >
                <dt class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <UIcon name="i-lucide-fingerprint" class="size-3.5" />
                  User ID
                </dt>
                <dd class="mt-2 break-all font-mono text-xs text-gray-800 dark:text-gray-200">
                  {{ user.id }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Access + timestamps -->
          <div class="flex flex-col gap-0 lg:col-span-2">
            <div
              class="border-b border-emerald-500/20 bg-gradient-to-b from-emerald-50/50 to-transparent p-5 dark:border-gray-800 dark:from-emerald-950/30 lg:p-8"
            >
              <div class="mb-4 flex items-center gap-2">
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-600/30 dark:bg-emerald-600">
                  <UIcon name="i-lucide-shield-check" class="h-5 w-5" />
                </span>
                <div>
                  <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
                    Access &amp; status
                  </h2>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Save applies changes on the server, then refreshes this profile and the users list. A confirmation will appear.
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">System role</label>
                  <USelect
                    v-model="editForm.systemRole"
                    :items="roleSelectItems"
                    size="md"
                    class="w-full rounded-xl"
                    :disabled="!canEditRole"
                    :portal="false"
                    :content="{ class: 'z-[9999]' }"
                  />
                  <p v-if="!canEditRole" class="text-xs text-amber-700 dark:text-amber-400">
                    Only Superadmin can assign system roles (API).
                  </p>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Account status</label>
                  <USelect
                    v-model="editForm.status"
                    :items="statusSelectItems"
                    size="md"
                    class="w-full rounded-xl"
                    :disabled="!canEditStatus"
                    :portal="false"
                    :content="{ class: 'z-[9999]' }"
                  />
                  <p v-if="!canEditStatus" class="text-xs text-amber-700 dark:text-amber-400">
                    Your role cannot update account status.
                  </p>
                </div>
                <div class="flex flex-wrap gap-2 pt-1">
                  <AppButton
                    color="success"
                    size="sm"
                    icon="i-lucide-save"
                    class="user-detail-toolbar-btn flex-1 rounded-xl shadow-md shadow-emerald-600/25 sm:flex-none"
                    :loading="saving"
                    :disabled="!hasAdminChanges"
                    @click="saveAccess"
                  >
                    Save changes
                  </AppButton>
                  <AppButton
                    variant="outline"
                    size="sm"
                    icon="i-lucide-rotate-ccw"
                    class="user-detail-toolbar-btn rounded-xl border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900/80"
                    :disabled="saving || !hasAdminChanges"
                    @click="resetAccessForm"
                  >
                    Reset
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="p-5 lg:p-8 lg:pt-6">
              <div class="mb-3 flex items-center gap-2">
                <UIcon name="i-lucide-clock" class="size-4 text-gray-500" />
                <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Activity
                </h3>
              </div>
              <dl class="grid gap-3 text-sm">
                <div class="flex justify-between gap-4 rounded-lg bg-gray-50/80 px-3 py-2 dark:bg-gray-900/50">
                  <dt class="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd class="font-medium text-gray-900 dark:text-gray-100">
                    {{ formatDate(user.createdAt ?? user.created_at) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4 rounded-lg bg-gray-50/80 px-3 py-2 dark:bg-gray-900/50">
                  <dt class="text-gray-500 dark:text-gray-400">Updated</dt>
                  <dd class="font-medium text-gray-900 dark:text-gray-100">
                    {{ formatDate(user.updatedAt ?? user.updated_at) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div
          v-show="activeTab === 'tools'"
          class="space-y-6 border-t border-gray-200/80 bg-gradient-to-b from-slate-50/80 to-transparent p-6 dark:border-gray-800 dark:from-gray-950/80 sm:p-8"
        >
          <div>
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
              Exports &amp; raw data
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Download or copy the merged user record for support or audits.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton
              icon="i-lucide-braces"
              size="sm"
              variant="outline"
              class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
              @click="exportUserJson"
            >
              Export JSON
            </AppButton>
            <AppButton
              icon="i-lucide-table"
              size="sm"
              variant="outline"
              class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
              @click="exportUserCsv"
            >
              Export CSV
            </AppButton>
            <AppButton
              icon="i-lucide-copy"
              size="sm"
              variant="outline"
              class="user-detail-toolbar-btn justify-center rounded-xl border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/80"
              @click="copyRawJson"
            >
              Copy JSON
            </AppButton>
          </div>
          <div class="overflow-hidden rounded-xl border border-gray-700/90 bg-gray-950 shadow-inner ring-1 ring-white/5">
            <pre class="max-h-[min(28rem,55vh)] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">{{ JSON.stringify(user, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/40"
    >
      <UIcon name="i-lucide-user-x" class="mx-auto h-14 w-14 text-gray-400" />
      <p class="mt-4 text-base font-medium text-gray-800 dark:text-gray-200">User not found</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-500">Check the link or return to the directory.</p>
      <AppButton variant="outline" size="sm" class="mt-8" @click="goBack">
        Back to users
      </AppButton>
    </div>

    <UModal
      v-model:open="showRefreshConfirm"
      :portal="false"
      title="Changes saved"
      :ui="userDetailSavedModalUi"
    >
      <template #body>
        <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Your updates were applied. This profile and the users list have been refreshed automatically.
        </p>
      </template>
      <template #footer="{ close }">
        <div class="admin-btn-modal-footer admin-btn-modal-footer--single">
          <AppButton
            color="success"
            size="sm"
            icon="i-lucide-check"
            class="lb-modal-btn-submit"
            @click="closeSaveSuccessModal(close)"
          >
            OK
          </AppButton>
        </div>
      </template>
    </UModal>
  </AppStack>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.user-detail-toolbar-btn :deep([data-slot="base"]) {
  @apply inline-flex min-h-9 w-full items-center justify-center gap-1.5 px-3 py-2 text-sm sm:w-auto;
}
</style>
