<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  title: 'Settings'
})
</script>

<template>
  <AppStack gap="lg">
    <AppPageHeader
      title="Settings"
      description="Configure your admin panel preferences"
    />
    <AppGrid :cols="2" gap="lg">
      <AppCard>
        <template #header>
          <UCard :ui="{ root: 'flex items-center gap-2', body: 'p-0' }">
            <UIcon name="i-lucide-palette" class="h-5 w-5 text-green-500" />
            <span class="font-semibold text-gray-900 dark:text-white">Appearance</span>
          </UCard>
        </template>
        <UCard :ui="{ root: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', body: 'p-0' }">
          <UCard :ui="{ root: 'bg-transparent border-0 shadow-none', body: 'p-0' }">
            <span class="font-medium text-gray-900 dark:text-white">Theme</span>
            <span class="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
              Follows your system preference by default
            </span>
          </UCard>
          <UColorModeSelect class="w-full sm:w-auto sm:min-w-[140px]" />
        </UCard>
      </AppCard>
      <AppCard>
        <template #header>
          <UCard :ui="{ root: 'flex items-center gap-2', body: 'p-0' }">
            <UIcon name="i-lucide-server" class="h-5 w-5 text-green-500" />
            <span class="font-semibold text-gray-900 dark:text-white">API Configuration</span>
          </UCard>
        </template>
        <AppStack gap="sm">
          <UCard :ui="{ root: 'bg-transparent border-0 shadow-none', body: 'p-0' }">
            <span class="text-sm text-gray-500 dark:text-gray-400">Base URL</span>
          </UCard>
          <AppCode code="https://api.bhoominow.com" block />
        </AppStack>
      </AppCard>
    </AppGrid>
  </AppStack>
</template>
