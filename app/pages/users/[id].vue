<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import { useAdminService, useUserService, type AuthUser } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractUsers } from '~/utils/api-extract'

definePageMeta({
  layout: 'admin',
  title: 'User details',
  description: 'View profile and update role or account status'
})

type UserDetail = Partial<
  AuthUser & {
    status?: string
    /** Some APIs use accountStatus instead of status */
    accountStatus?: string
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
const router = useRouter()
const toast = useToast()
const adminService = useAdminService()
const userService = useUserService()
const { copy, copied } = useClipboard()

const userId = computed(() => String(route.params.id ?? ''))

const user = ref<UserDetail | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const isEditing = ref(false)

const editForm = ref({
  systemRole: '',
  status: ''
})

const initialForm = ref({ systemRole: '', status: '' })

const roleOptions = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Partner', value: 'PARTNER' },
  { label: 'Agent', value: 'AGENT' },
  { label: 'Moderator', value: 'MODERATOR' }
]

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' }
]

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

function mapRowToUser(row: Record<string, unknown>): UserDetail {
  return {
    id: String(get(row, 'id') ?? ''),
    email: String(get(row, 'email') ?? ''),
    name: get(row, 'name') as string | undefined,
    fullName: get(row, 'fullName') as string | undefined,
    phone: (get(row, 'phone') ?? get(row, 'mobile')) as string | undefined,
    systemRole: (get(row, 'systemRole') ?? get(row, 'role')) as string | undefined,
    role: get(row, 'role') as string | undefined,
    status: (get(row, 'status') ?? get(row, 'accountStatus')) as string | undefined,
    accountType: get(row, 'accountType') as string | undefined,
    createdAt: (get(row, 'createdAt') ?? get(row, 'created_at')) as string | undefined,
    updatedAt: (get(row, 'updatedAt') ?? get(row, 'updated_at')) as string | undefined,
    avatarUrl: (get(row, 'avatarUrl') ?? get(row, 'avatar')) as string | undefined
  }
}

async function loadUser() {
  if (!userId.value) return
  loading.value = true
  error.value = null
  try {
    let found: UserDetail | null = null
    try {
      const single = (await userService.getById(userId.value)) as Record<string, unknown>
      if (single && typeof single === 'object') {
        found = mapRowToUser(single)
      }
    } catch {
      /* try admin list */
    }
    if (!found?.id) {
      const res = await adminService.listUsers({
        page: 1,
        limit: 100,
        search: userId.value,
        q: userId.value
      })
      const rows = extractUsers(res)
      const item =
        rows.find((u) => String(get(u, 'id')) === userId.value) ??
        rows.find((u) => String(get(u, 'email')) === userId.value)
      if (item) {
        found = mapRowToUser(item)
      }
    }
    user.value = found
    if (found) {
      const role = String(found.systemRole ?? found.role ?? '')
      const status = String(found.status ?? found.accountStatus ?? '')
      editForm.value = { systemRole: role, status }
      initialForm.value = { ...editForm.value }
    }
  } catch {
    error.value = 'Failed to load user'
    user.value = null
  } finally {
    loading.value = false
  }
}

const roleBadgeColor = computed(() => {
  const r = user.value?.systemRole ?? user.value?.role ?? ''
  if (r === 'ADMIN') return 'error'
  if (r === 'PARTNER' || r === 'AGENT') return 'primary'
  return 'neutral'
})

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

async function copyId() {
  if (!user.value?.id) return
  await copy(user.value.id)
  toast.add({
    title: 'Copied',
    description: 'User ID copied to clipboard.',
    color: 'success',
    icon: 'i-lucide-copy-check'
  })
}

async function saveUser() {
  if (!user.value?.id) return
  saving.value = true
  error.value = null
  try {
    const id = user.value.id
    const roleChanged = editForm.value.systemRole !== initialForm.value.systemRole
    const statusChanged = editForm.value.status !== initialForm.value.status

    if (roleChanged && editForm.value.systemRole) {
      await adminService.updateUserRole(id, { role: editForm.value.systemRole })
    }
    if (statusChanged && editForm.value.status) {
      await adminService.updateUserStatus(id, { status: editForm.value.status })
    }

    user.value = {
      ...user.value,
      systemRole: editForm.value.systemRole,
      role: editForm.value.systemRole,
      status: editForm.value.status
    }
    initialForm.value = { ...editForm.value }
    isEditing.value = false
    toast.add({
      title: 'Saved',
      description: 'Account settings were updated.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await loadUser()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save user'
    toast.add({
      title: 'Save failed',
      description: error.value,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editForm.value = { ...initialForm.value }
  isEditing.value = false
  error.value = null
}

function goBack() {
  router.push('/users')
}

watch(userId, loadUser, { immediate: true })
</script>

<template>
  <AppStack gap="lg" class="!gap-6">
    <div
      class="flex flex-col gap-4 border-b border-gray-200/80 pb-4 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex min-w-0 items-start gap-3">
        <button
          type="button"
          class="layout-header-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-gray-200/80 transition hover:bg-gray-100 dark:ring-gray-700 dark:hover:bg-gray-800"
          aria-label="Back to users"
          @click="goBack"
        >
          <UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
        </button>
        <div class="min-w-0">
          <h1 class="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {{ user ? displayName(user) : 'User details' }}
          </h1>
          <p v-if="user?.email" class="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
            {{ user.email }}
          </p>
          <p v-else-if="loading" class="mt-1 text-sm text-gray-500">Loading…</p>
        </div>
      </div>
      <div v-if="user && !loading" class="flex flex-wrap gap-2 sm:justify-end">
        <AppButton
          v-if="!isEditing"
          icon="i-lucide-pencil"
          size="sm"
          color="success"
          class="rounded-xl shadow-md shadow-emerald-600/20"
          @click="isEditing = true"
        >
          Edit account
        </AppButton>
        <template v-else>
          <AppButton variant="outline" size="sm" class="rounded-xl" :disabled="saving" @click="cancelEdit">
            Cancel
          </AppButton>
          <AppButton size="sm" color="success" class="rounded-xl" :loading="saving" @click="saveUser">
            Save changes
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
      class="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
    >
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-emerald-500" />
    </div>

    <template v-else-if="user">
      <div
        class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:ring-white/[0.06]"
      >
        <div
          class="border-b border-emerald-500/10 bg-gradient-to-br from-emerald-50/90 via-white to-gray-50/80 px-5 py-6 dark:from-emerald-950/40 dark:via-gray-950 dark:to-gray-950 sm:px-8"
        >
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <div
                class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
              >
                <img
                  v-if="user.avatarUrl"
                  :src="user.avatarUrl"
                  alt=""
                  class="size-full object-cover"
                >
                <UIcon v-else name="i-lucide-user" class="size-8 text-gray-400" />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="roleBadgeColor" size="md" variant="subtle" class="font-semibold">
                    {{ user.systemRole ?? user.role ?? '—' }}
                  </UBadge>
                  <UBadge
                    v-if="user.status || user.accountStatus"
                    color="success"
                    variant="subtle"
                    size="md"
                  >
                    {{ formatLabel(user.status ?? user.accountStatus) }}
                  </UBadge>
                  <UBadge v-if="user.accountType" color="neutral" variant="outline" size="sm">
                    {{ formatLabel(user.accountType) }}
                  </UBadge>
                </div>
                <p class="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {{ displayName(user) }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <AppButton
                size="sm"
                variant="outline"
                icon="i-lucide-copy"
                class="rounded-xl"
                @click="copyId"
              >
                {{ copied ? 'Copied' : 'Copy user ID' }}
              </AppButton>
              <AppButton
                v-if="user.email"
                size="sm"
                variant="outline"
                icon="i-lucide-mail"
                class="rounded-xl"
                :to="`mailto:${user.email}`"
                external
                target="_blank"
              >
                Email
              </AppButton>
            </div>
          </div>
        </div>

        <div class="grid gap-6 px-5 py-6 sm:grid-cols-2 sm:px-8"
        >
          <div class="space-y-4 sm:col-span-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Profile
            </h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Full name</span>
                <p class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white">
                  {{ user.fullName ?? user.name ?? '—' }}
                </p>
              </div>
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</span>
                <p class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white">
                  {{ user.email || '—' }}
                </p>
              </div>
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Phone</span>
                <p class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white">
                  {{ user.phone ?? user.mobile ?? '—' }}
                </p>
              </div>
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">User ID</span>
                <p class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 font-mono text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200">
                  {{ user.id }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4 sm:col-span-2">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Admin actions
            </h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">System role</label>
                <USelect
                  v-if="isEditing"
                  v-model="editForm.systemRole"
                  :items="roleOptions"
                  size="md"
                  class="w-full rounded-xl"
                  :content="{ class: 'z-[9999]' }"
                />
                <p v-else class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/50">
                  {{ user.systemRole ?? user.role ?? '—' }}
                </p>
              </div>
              <div class="space-y-1.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Account status</label>
                <USelect
                  v-if="isEditing"
                  v-model="editForm.status"
                  :items="statusOptions"
                  size="md"
                  class="w-full rounded-xl"
                  :content="{ class: 'z-[9999]' }"
                />
                <p v-else class="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/50">
                  {{ formatLabel(user.status ?? user.accountStatus) }}
                </p>
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              Updates call
              <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">PATCH /admin/users/:id/role</code>
              and
              <code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">PATCH /admin/users/:id/status</code>
              .
            </p>
          </div>

          <div class="space-y-4 border-t border-gray-200/80 pt-6 sm:col-span-2 dark:border-gray-800">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Timestamps
            </h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Created</span>
                <p class="text-sm text-gray-800 dark:text-gray-200">
                  {{ formatDate(user.createdAt ?? user.created_at) }}
                </p>
              </div>
              <div class="space-y-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Updated</span>
                <p class="text-sm text-gray-800 dark:text-gray-200">
                  {{ formatDate(user.updatedAt ?? user.updated_at) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/40"
    >
      <UIcon name="i-lucide-user-x" class="mx-auto h-12 w-12 text-gray-400" />
      <p class="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">User not found</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">Try another ID or return to the list.</p>
      <AppButton variant="outline" size="sm" class="mt-6 rounded-xl" @click="goBack">
        Back to users
      </AppButton>
    </div>
  </AppStack>
</template>
