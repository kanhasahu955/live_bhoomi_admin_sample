<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'

interface BarDataItem {
  name: string
  value: number
}

interface Props {
  data: BarDataItem[]
  xAxisKey?: string
  yAxisKey?: string
  title?: string
  height?: string
  loading?: boolean
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  xAxisKey: 'name',
  yAxisKey: 'value',
  height: '320px',
  loading: false,
  color: '#22c55e'
})

const option = computed<EChartsOption>(() => {
  const xData = props.data.map((d) => String(get(d, props.xAxisKey) ?? ''))
  const yData = props.data.map((d) => Number(get(d, props.yAxisKey)) || 0)
  const base: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { alignWithLabel: true }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Value',
        type: 'bar',
        data: yData,
        itemStyle: { color: props.color }
      }
    ]
  }
  if (props.title) {
    base.title = { text: props.title, left: 'center' }
  }
  return base
})
</script>

<template>
  <AppChartBase
    :option="option"
    :height="props.height"
    :loading="props.loading"
  />
</template>
