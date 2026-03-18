<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  icon: string
}

defineProps<Props>()
</script>

<template>
  <UCard class="overflow-hidden transition-shadow hover:shadow-lg">
    <UCard :ui="{ root: 'flex items-center gap-4', body: 'p-0' }">
      <AppIconBox :icon="icon" size="md" color="primary" />
      <UCard :ui="{ root: 'min-w-0 flex-1', body: 'p-0' }">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ label }}</span>
        <span class="mt-0.5 block truncate text-2xl font-bold text-gray-900 dark:text-white">{{ value }}</span>
      </UCard>
    </UCard>
  </UCard>
</template>
