<script setup lang="ts">
/**
 * Client-only ECharts host using the **full** `echarts` entry (all charts registered).
 * Avoids tree-shaken `echarts/core` init issues; retries until flex layout gives non-zero width.
 */
import { ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsType } from 'echarts'
import type { EChartsOption } from 'echarts'

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

const hostRef = ref<HTMLDivElement | null>(null)
const chart = shallowRef<EChartsType | null>(null)
const initError = ref<string | null>(null)
let resizeObserver: ResizeObserver | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

function parseHeightPx(h: string): number {
  const s = String(h).trim()
  const m = /^(\d+(?:\.\d+)?)\s*px$/i.exec(s)
  if (m) return Math.max(64, Number(m[1]))
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) && n > 0 ? Math.max(64, n) : 320
}

function disposeChart() {
  if (retryTimer != null) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  try {
    chart.value?.dispose()
  } catch {
    /* ignore */
  }
  chart.value = null
}

function mountChart(attempt = 0) {
  initError.value = null
  const el = hostRef.value
  if (!el) return

  const hPx = parseHeightPx(props.height)
  const wPxRaw = el.clientWidth || el.offsetWidth || (el.parentElement?.clientWidth ?? 0)

  if (wPxRaw < 32 && attempt < 20) {
    retryTimer = setTimeout(() => mountChart(attempt + 1), 50)
    return
  }

  const wPx = Math.max(wPxRaw, 280)

  try {
    disposeChart()

    const instance = echarts.init(el, undefined, {
      renderer: 'canvas',
      width: wPx,
      height: hPx
    })
    chart.value = instance
    instance.setOption(props.option)

    if (props.autoresize && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        try {
          instance.resize({ width: el.clientWidth || undefined, height: hPx })
        } catch {
          /* ignore */
        }
      })
      resizeObserver.observe(el)
    }

    requestAnimationFrame(() => {
      try {
        instance.resize()
      } catch {
        /* ignore */
      }
    })
  } catch (e) {
    initError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => {
  nextTick(() => mountChart(0))
})

onBeforeUnmount(() => {
  disposeChart()
})

watch(
  () => props.option,
  (opt) => {
    if (!chart.value) return
    try {
      chart.value.setOption(opt, { notMerge: false, lazyUpdate: true })
      requestAnimationFrame(() => chart.value?.resize())
    } catch (e) {
      initError.value = e instanceof Error ? e.message : String(e)
    }
  },
  { deep: true }
)

watch(
  () => props.height,
  () => {
    nextTick(() => {
      disposeChart()
      mountChart(0)
    })
  }
)
</script>

<template>
  <div
    class="chart-shell group relative w-full min-w-0 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_4px_28px_-6px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.03] dark:border-slate-600/45 dark:from-slate-900 dark:via-slate-900/98 dark:to-slate-950 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:ring-white/[0.06]"
    :style="{ height: props.height, minHeight: props.height, width: '100%' }"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent opacity-90 dark:via-emerald-400/25"
      aria-hidden="true"
    />
    <div
      v-if="loading"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-[2px] dark:bg-slate-950/70"
      aria-hidden="true"
    >
      <div class="relative flex h-11 w-11 items-center justify-center">
        <span
          class="absolute inset-0 animate-ping rounded-full bg-emerald-400/25 dark:bg-emerald-400/15"
          style="animation-duration: 1.8s"
        />
        <span
          class="relative inline-block h-9 w-9 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500 dark:border-emerald-400/25 dark:border-t-emerald-400"
        />
      </div>
    </div>
    <p
      v-if="initError"
      class="absolute inset-0 z-20 flex items-center justify-center p-3 text-center text-xs text-red-600 dark:text-red-400"
    >
      {{ initError }}
    </p>
    <div
      ref="hostRef"
      class="echarts-host relative z-[1] w-full min-w-0 px-1 pt-1"
      :style="{ height: props.height, minHeight: props.height, width: '100%' }"
    />
  </div>
</template>
