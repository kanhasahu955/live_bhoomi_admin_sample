<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'
import { chartAxisColors, chartTooltip, barGradient, emptyGraphicStyle } from '~/utils/echarts-chart-theme'
import AppChartBase from './AppChartBase.client.vue'

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

const colorMode = useColorMode()

const option = computed<EChartsOption>(() => {
  const isDark = colorMode.value === 'dark'
  const axis = chartAxisColors(isDark)

  if (!props.data?.length) {
    return {
      animationDuration: 600,
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: emptyGraphicStyle(isDark)
        }
      ],
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [] }]
    }
  }

  const xData = props.data.map((d) => String(get(d, props.xAxisKey) ?? ''))
  const yData = props.data.map((d) => Number(get(d, props.yAxisKey)) || 0)
  const grad = barGradient(props.color, isDark)

  const base: EChartsOption = {
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDelay: (idx: number) => idx * 40,
    backgroundColor: 'transparent',
    tooltip: {
      ...chartTooltip(isDark),
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)'
        }
      }
    },
    grid: { left: '2%', right: '3%', bottom: '4%', top: props.title ? 48 : 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: axis.line } },
      axisLabel: {
        color: axis.text,
        fontSize: 11,
        fontWeight: 500,
        interval: 0,
        rotate: xData.some((s) => s.length > 10) ? 28 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axis.text, fontSize: 11 },
      splitLine: {
        lineStyle: { color: axis.splitSubtle, type: 'dashed' as const }
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: 'Value',
        type: 'bar',
        barWidth: '58%',
        barMaxWidth: 48,
        data: yData.map((v) => ({
          value: v,
          itemStyle: {
            color: grad,
            borderRadius: [10, 10, 4, 4],
            shadowBlur: isDark ? 14 : 10,
            shadowColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(15, 23, 42, 0.1)',
            shadowOffsetY: 4
          }
        })),
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 22,
            shadowColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 23, 42, 0.12)'
          }
        }
      }
    ]
  }

  if (props.title) {
    base.title = {
      text: props.title,
      left: 'center',
      top: 4,
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
