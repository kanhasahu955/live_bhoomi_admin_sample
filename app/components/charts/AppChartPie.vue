<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'

interface PieDataItem {
  name: string
  value: number
  [key: string]: unknown
}

interface Props {
  data: PieDataItem[]
  nameKey?: string
  valueKey?: string
  title?: string
  height?: string
  loading?: boolean
  radius?: string | [string, string]
}

const props = withDefaults(defineProps<Props>(), {
  nameKey: 'name',
  valueKey: 'value',
  height: '320px',
  loading: false,
  radius: '60%'
})

const option = computed<EChartsOption>(() => {
  let chartData = props.data.map((d) => ({
    name: String(get(d, props.nameKey) ?? ''),
    value: Number(get(d, props.valueKey)) || 0
  })).filter((d) => d.name && d.value > 0)
  if (chartData.length === 0) {
    chartData = [
      { name: 'Sample A', value: 12 },
      { name: 'Sample B', value: 8 },
      { name: 'Sample C', value: 5 }
    ]
  }
  const base: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'horizontal', bottom: 0 },
    series: [
      {
        name: 'Data',
        type: 'pie',
        radius: props.radius,
        center: ['50%', '45%'],
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        }
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
