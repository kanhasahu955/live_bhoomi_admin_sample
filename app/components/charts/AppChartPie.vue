<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'
import {
  PIE_COLOR_PALETTE,
  chartTooltipItem,
  legendStyle,
  emptyGraphicStyle
} from '~/utils/echarts-chart-theme'
import AppChartBase from './AppChartBase.client.vue'

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
  /** When true and data is empty, show placeholder slices (dev/demo only). */
  fillSampleWhenEmpty?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  nameKey: 'name',
  valueKey: 'value',
  height: '320px',
  loading: false,
  radius: '60%',
  fillSampleWhenEmpty: false
})

const colorMode = useColorMode()

const option = computed<EChartsOption>(() => {
  const isDark = colorMode.value === 'dark'
  const borderColor = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.98)'

  const source = Array.isArray(props.data) ? props.data : []
  let chartData = source
    .map((d) => {
      const rawName = get(d, props.nameKey)
      const name =
        rawName === null || rawName === undefined || String(rawName).trim() === ''
          ? '(unspecified)'
          : String(rawName).trim()
      return {
        name,
        value: Number(get(d, props.valueKey)) || 0
      }
    })
    .filter((d) => d.value > 0)

  if (chartData.length === 0 && props.fillSampleWhenEmpty) {
    chartData = [
      { name: 'Sample A', value: 12 },
      { name: 'Sample B', value: 8 },
      { name: 'Sample C', value: 5 }
    ]
  }

  const dataWithStyle = chartData.map((d, i) => ({
    ...d,
    itemStyle: {
      color: PIE_COLOR_PALETTE[i % PIE_COLOR_PALETTE.length],
      borderRadius: 6,
      borderColor,
      borderWidth: 2,
      shadowBlur: isDark ? 12 : 8,
      shadowColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(15, 23, 42, 0.08)'
    }
  }))

  const base: EChartsOption = {
    animationDuration: 900,
    animationEasing: 'cubicOut',
    color: [...PIE_COLOR_PALETTE],
    tooltip: {
      ...chartTooltipItem(isDark),
      formatter: (params: unknown) => {
        const p = params as { name?: string; value?: number; percent?: number; marker?: string }
        const pct = p.percent != null ? `${p.percent.toFixed(1)}%` : '—'
        return `${p.marker ?? ''} <span style="font-weight:600">${p.name}</span><br/><span style="opacity:0.85">${p.value} · ${pct}</span>`
      }
    },
    legend: {
      ...legendStyle(isDark),
      type: chartData.length > 6 ? 'scroll' : 'plain',
      pageIconColor: isDark ? '#94a3b8' : '#64748b'
    },
    series: [
      {
        name: 'Data',
        type: 'pie',
        radius: props.radius,
        center: ['50%', '44%'],
        data: dataWithStyle,
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor,
          borderWidth: 2
        },
        label: {
          show: chartData.length <= 7,
          color: isDark ? '#cbd5e1' : '#475569',
          fontSize: 11,
          fontWeight: 500,
          formatter: '{b}\n{d}%'
        },
        labelLine: {
          length: 10,
          length2: 8,
          lineStyle: { color: isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.35)' }
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          itemStyle: {
            shadowBlur: 28,
            shadowOffsetY: 4,
            shadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15, 23, 42, 0.15)'
          },
          label: { fontWeight: 600 }
        }
      }
    ]
  }

  if (chartData.length === 0) {
    base.legend = { show: false }
    base.graphic = [
      {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: emptyGraphicStyle(isDark)
      }
    ]
  }

  if (props.title) {
    base.title = {
      text: props.title,
      left: 'center',
      top: 8,
      textStyle: {
        color: isDark ? '#f1f5f9' : '#0f172a',
        fontSize: 14,
        fontWeight: 600
      }
    }
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
