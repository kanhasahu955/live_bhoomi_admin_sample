<script setup lang="ts">
interface Props {
  color?: 'primary' | 'neutral' | 'success' | 'error'
  variant?: 'solid' | 'outline' | 'ghost' | 'soft'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  block?: boolean
  loading?: boolean
  disabled?: boolean
  icon?: string
  label?: string
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  variant: 'solid',
  size: 'md',
  block: false,
  loading: false,
  disabled: false
})
</script>

<template>
  <UButton
    v-bind="$attrs"
    :color="props.color"
    :variant="props.variant"
    :size="props.size"
    :block="props.block"
    :loading="props.loading"
    :disabled="props.disabled"
    :icon="props.icon"
    :label="props.label"
    :to="props.to"
  >
    <slot />
  </UButton>
</template>
