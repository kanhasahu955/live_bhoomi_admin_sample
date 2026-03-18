<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'neutral' | 'success'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary'
})

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-16 w-16'
}

const iconSizeMap = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-8 w-8'
}

const colorMap = {
  primary: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
}

const boxClass = computed(() =>
  `flex shrink-0 items-center justify-center rounded-2xl ${colorMap[props.color]} ${sizeMap[props.size]}`
)
</script>

<template>
  <UCard :ui="{ root: boxClass, body: 'p-0 flex items-center justify-center' }">
    <UIcon :name="icon" :class="iconSizeMap[size]" />
  </UCard>
</template>
