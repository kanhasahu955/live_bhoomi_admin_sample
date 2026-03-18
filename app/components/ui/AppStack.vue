<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  direction?: 'vertical' | 'horizontal'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  gap: 'md',
  direction: 'vertical',
  class: ''
})

const gapMap = {
  sm: 'gap-2',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-12'
}

const directionMap = {
  vertical: 'flex flex-col',
  horizontal: 'flex flex-row'
}

const stackClass = computed(() =>
  `${directionMap[props.direction]} ${gapMap[props.gap]} ${props.class}`.trim()
)
</script>

<template>
  <UContainer :class="stackClass">
    <slot />
  </UContainer>
</template>
