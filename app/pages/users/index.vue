<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'

definePageMeta({
  layout: 'admin',
  title: 'Users'
})

const adminService = useAdminService()
const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' }
]

const users = ref<Record<string, unknown>[]>([])
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminService.listUsers() as { data?: Record<string, unknown>[] } | Record<string, unknown>[]
    const data = Array.isArray(res) ? res : (get(res as object, 'data') as Record<string, unknown>[] | undefined)
    users.value = data ?? []
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <AppStack gap="lg">
    <UCard :ui="{ root: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-transparent border-0 shadow-none', body: 'p-0' }">
      <AppPageHeader
        title="Users"
        description="Manage users from your API"
      />
      <AppButton icon="i-lucide-plus" size="sm" class="w-full sm:w-auto">
        Add User
      </AppButton>
    </UCard>
    <AppCard :padding="false" class="overflow-hidden">
      <AdminDataTable
        :data="users"
        :columns="columns"
        :loading="loading"
        empty-message="Connect your API to load users"
      />
    </AppCard>
  </AppStack>
</template>
