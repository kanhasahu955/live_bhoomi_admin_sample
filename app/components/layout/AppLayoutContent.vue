<script setup lang="ts">
/**
 * Reusable content wrapper for layout pages.
 * Provides consistent max-width and padding.
 */
interface Props {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: '7xl',
  class: '',
})

const maxWidthMap = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
}
</script>

<template>
  <div :class="['mx-auto w-full', maxWidthMap[props.maxWidth], props.class]">
    <slot />
  </div>
</template>
