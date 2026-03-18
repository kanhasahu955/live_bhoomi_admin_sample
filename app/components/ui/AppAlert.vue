<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  color?: 'error' | 'success' | 'warning' | 'info' | 'neutral'
  variant?: 'solid' | 'soft' | 'outline'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'error',
  variant: 'soft'
})
</script>

<template>
  <UAlert
    v-bind="$attrs"
    :title="props.title"
    :description="props.description"
    :color="props.color"
    :variant="props.variant"
  >
    <slot />
  </UAlert>
</template>
