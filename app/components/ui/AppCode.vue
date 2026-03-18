<script setup lang="ts">
interface Props {
  code: string
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  block: false
})
</script>

<template>
  <UBadge
    :class="props.block
      ? 'block w-full rounded-lg bg-gray-100 px-4 py-3 font-mono text-sm dark:bg-gray-800'
      : 'rounded-md bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800'"
    variant="soft"
    color="neutral"
  >
    {{ code }}
  </UBadge>
