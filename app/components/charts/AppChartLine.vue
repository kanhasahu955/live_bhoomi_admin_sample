<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'

interface LineDataItem {
  name: string
  value: number
  [key: string]: unknown
}

interface Props {
  data: LineDataItem[]
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
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Value',
        type: 'line',
        smooth: true,
        data: yData,
        itemStyle: { color: props.color },
        areaStyle: { opacity: 0.2 }
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
