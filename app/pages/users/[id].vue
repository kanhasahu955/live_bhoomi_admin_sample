<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminService, useUserService, type AuthUser } from '~/services/api'
import { get } from '~/utils/lodash'

definePageMeta({
  layout: 'admin',
  title: 'User Details'
})

const route = useRoute()
const router = useRouter()
const adminService = useAdminService()
const userService = useUserService()

const userId = computed(() => route.params.id as string)
const user = ref<Partial<AuthUser & { status?: string; role?: string }> | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const isEditing = ref(false)
const editForm = ref({
  name: '',
  email: '',
  role: '',
  status: ''
})

async function loadUser() {
  if (!userId.value) return
  loading.value = true
  error.value = null
  try {
    let found: Partial<AuthUser & { status?: string; role?: string }> | null = null
    try {
      const single = await userService.getById(userId.value) as AuthUser & { status?: string; role?: string }
      found = single ?? null
    } catch {
      const res = await adminService.listUsers() as { data?: Record<string, unknown>[] } | Record<string, unknown>[]
      const data = Array.isArray(res) ? res : (get(res as object, 'data') as Record<string, unknown>[] | undefined)
      const list = data ?? []
      const item = list.find((u) => String(get(u, 'id')) === userId.value) as Record<string, unknown> | undefined
      if (item) {
        found = {
          id: String(get(item, 'id')),
          name: String(get(item, 'name') ?? get(item, 'fullName') ?? ''),
          email: String(get(item, 'email') ?? ''),
          role: String(get(item, 'role') ?? ''),
          status: String(get(item, 'status') ?? '')
        }
      }
    }
    user.value = found
    if (found) {
      editForm.value = {
        name: found.name ?? '',
        email: found.email ?? '',
        role: (found as { role?: string }).role ?? '',
        status: (found as { status?: string }).status ?? ''
      }
    }
  } catch {
    error.value = 'Failed to load user'
    user.value = null
  } finally {
    loading.value = false
  }
}

async function saveUser() {
  if (!user.value?.id) return
  saving.value = true
  error.value = null
  try {
    if (editForm.value.role) {
      await adminService.updateUserRole(user.value.id, { role: editForm.value.role })
    }
    if (editForm.value.status) {
      await adminService.updateUserStatus(user.value.id, { status: editForm.value.status })
    }
    user.value = { ...user.value, ...editForm.value }
    isEditing.value = false
  } catch {
    error.value = 'Failed to save user'
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editForm.value = {
    name: user.value?.name ?? '',
    email: user.value?.email ?? '',
    role: user.value?.role ?? '',
    status: (user.value as { status?: string })?.status ?? ''
  }
  isEditing.value = false
}

function goBack() {
  router.push('/users')
}

watch(userId, loadUser, { immediate: true })
onMounted(loadUser)
</script>

<template>
  <AppStack gap="lg">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="layout-header-btn flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="Back to users"
          @click="goBack"
        >
          <UIcon name="i-lucide-arrow-left" class="h-5 w-5" />
        </button>
        <AppPageHeader
          title="User Details"
          :description="user?.email ?? 'Loading...'"
        />
      </div>
      <div v-if="user && !loading" class="flex gap-2">
        <AppButton
          v-if="!isEditing"
          icon="i-lucide-pencil"
          size="sm"
          @click="isEditing = true"
        >
          Edit
        </AppButton>
        <template v-else>
          <AppButton
            variant="outline"
            size="sm"
            :disabled="saving"
            @click="cancelEdit"
          >
            Cancel
          </AppButton>
          <AppButton
            size="sm"
            :loading="saving"
            @click="saveUser"
          >
            Save
          </AppButton>
        </template>
      </div>
    </div>

    <p
      v-if="error"
      class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
    >
      {{ error }}
    </p>

    <AppCard v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-gray-400" />
    </AppCard>

    <template v-else-if="user">
      <AppCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-user" class="h-5 w-5 text-emerald-500" />
            <span class="font-semibold text-gray-900 dark:text-white">User Information</span>
          </div>
        </template>
        <AppStack gap="md">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                v-if="isEditing"
                v-model="editForm.name"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Full name"
              >
              <p v-else class="rounded-lg bg-gray-50 px-3 py-2 text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ user.name || '—' }}
              </p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                v-if="isEditing"
                v-model="editForm.email"
                type="email"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Email"
              >
              <p v-else class="rounded-lg bg-gray-50 px-3 py-2 text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ user.email || '—' }}
              </p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select
                v-if="isEditing"
                v-model="editForm.role"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">—</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
              </select>
              <p v-else class="rounded-lg bg-gray-50 px-3 py-2 text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ user?.role ?? '—' }}
              </p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                v-if="isEditing"
                v-model="editForm.status"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">—</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <p v-else class="rounded-lg bg-gray-50 px-3 py-2 text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ user?.status ?? '—' }}
              </p>
            </div>
          </div>
        </AppStack>
      </AppCard>
    </template>

    <AppCard v-else>
      <div class="py-12 text-center">
        <UIcon name="i-lucide-user-x" class="mx-auto h-12 w-12 text-gray-400" />
        <p class="mt-2 text-gray-500 dark:text-gray-400">User not found</p>
        <AppButton variant="outline" size="sm" class="mt-4" @click="goBack">
          Back to Users
        </AppButton>
      </div>
    </AppCard>
  </AppStack>
</template>
