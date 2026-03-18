<script setup lang="ts">
interface Props {
  maxWidth?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 'md'
})

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg'
}
</script>

<template>
  <div
    :class="[
      'flex w-full flex-col items-center justify-center gap-6',
      maxWidthMap[props.maxWidth]
    ]"
  >
    <slot />
  </div>
</template>
