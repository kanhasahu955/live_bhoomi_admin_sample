<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  cols?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  cols: 3,
  gap: 'md',
  class: ''
})

const colsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

const gapMap = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6'
}

const gridClass = computed(() =>
  `grid w-full max-w-none ${colsMap[props.cols]} ${gapMap[props.gap]} ${props.class}`.trim()
)
</script>

<template>
  <UContainer :class="gridClass">
    <slot />
  </UContainer>
</template>
