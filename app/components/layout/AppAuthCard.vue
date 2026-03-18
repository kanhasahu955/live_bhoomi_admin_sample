<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-leaf'
})
</script>

<template>
  <UCard :ui="{ root: 'mb-8', body: 'p-0 flex flex-col items-center text-center' }">
    <UCard
      :ui="{
        root: 'inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl',
        body: 'p-0'
      }"
    >
      <UIcon :name="props.icon" class="h-8 w-8" />
    </UCard>
    <UCard :ui="{ root: 'mt-4', body: 'p-0' }">
      <span class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        {{ title }}
      </span>
    </UCard>
    <UCard v-if="props.subtitle" :ui="{ root: 'mt-2', body: 'p-0' }">
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ props.subtitle }}</span>
    </UCard>
    <slot />
  </UCard>
</template>
