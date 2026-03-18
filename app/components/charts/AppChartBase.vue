<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { useColorMode } from '@vueuse/core'

interface Props {
  option: EChartsOption
  loading?: boolean
  height?: string
  autoresize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: '320px',
  autoresize: true
})

const colorMode = useColorMode()
const theme = computed(() => (colorMode.value === 'dark' ? 'dark' : undefined))
</script>

<template>
  <div
    class="chart-container w-full min-w-0 shrink-0 rounded-lg bg-white dark:bg-gray-900/50"
    :style="{ height: props.height, minHeight: props.height, width: '100%', display: 'block' }"
  >
    <VChart
      class="w-full h-full block"
      :style="{ height: props.height, width: '100%', minHeight: props.height, display: 'block' }"
      :option="props.option"
      :loading="props.loading"
      :theme="theme"
      :autoresize="props.autoresize"
      :init-options="{ width: 'auto', height: 'auto' }"
    />
  </div>
</template>
