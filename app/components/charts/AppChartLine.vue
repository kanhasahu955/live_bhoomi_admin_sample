<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { get } from '~/utils/lodash'
import {
  chartAxisColors,
  chartTooltip,
  lineAreaGradient,
  emptyGraphicStyle,
  hexToRgba
} from '~/utils/echarts-chart-theme'
import AppChartBase from './AppChartBase.client.vue'

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

const colorMode = useColorMode()

const option = computed<EChartsOption>(() => {
  const isDark = colorMode.value === 'dark'
  const axis = chartAxisColors(isDark)

  const xData = props.data.map((d) => String(get(d, props.xAxisKey) ?? ''))
  const yData = props.data.map((d) => Number(get(d, props.yAxisKey)) || 0)

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
      series: [{ type: 'line', data: [] }]
    }
  }

  const areaGrad = lineAreaGradient(props.color, isDark)

  const base: EChartsOption = {
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    backgroundColor: 'transparent',
    tooltip: {
      ...chartTooltip(isDark),
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)',
          width: 1,
          type: 'dashed' as const
        }
      }
    },
    grid: { left: '2%', right: '4%', bottom: '4%', top: props.title ? 48 : 16, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLine: { lineStyle: { color: axis.line } },
      axisTick: { show: false },
      axisLabel: { color: axis.text, fontSize: 11, fontWeight: 500 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: axis.text, fontSize: 11 },
      splitLine: { lineStyle: { color: axis.splitSubtle, type: 'dashed' as const } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: 'Value',
        type: 'line',
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 9,
        showSymbol: true,
        data: yData,
        lineStyle: {
          width: 3,
          color: props.color,
          shadowBlur: isDark ? 12 : 8,
          shadowColor: isDark ? 'rgba(0,0,0,0.4)' : hexToRgba(props.color, 0.35),
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#fff',
          borderWidth: 2,
          borderColor: props.color,
          shadowBlur: 6,
          shadowColor: hexToRgba(props.color, 0.45)
        },
        areaStyle: {
          color: areaGrad
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            borderWidth: 3,
            shadowBlur: 12
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
