<script setup lang="ts">
</script>

<template>
  <UCard
    :ui="{
      root: 'absolute inset-0 -z-10 overflow-hidden bg-transparent border-0 shadow-none',
      body: 'p-0 relative'
    }"
  >
    <UCard
      :ui="{
        root: 'absolute -top-40 -right-40 h-80 w-80 rounded-full bg-green-200/30 dark:bg-green-900/20 blur-3xl',
        body: 'p-0'
      }"
    />
    <UCard
      :ui="{
        root: 'absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-emerald-200/30 dark:bg-emerald-900/20 blur-3xl',
        body: 'p-0'
      }"
    />
  </UCard>
</template>
