<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <UCard :ui="{ root: 'bg-transparent border-0 shadow-none', body: 'p-0' }">
    <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
      {{ title }}
    </h2>
    <p
      v-if="description"
      class="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base"
    >
      {{ description }}
    </p>
    <slot />
  </UCard>
</template>
