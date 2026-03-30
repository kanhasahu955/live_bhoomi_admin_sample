<script setup lang="ts">
import { computed } from 'vue'

export interface LineRow {
  name: string
  value: number
}

const props = defineProps<{
  rows: LineRow[]
}>()

const polylinePoints = computed(() => {
  const r = props.rows
  if (!r.length) return ''
  const vals = r.map((x) => x.value)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const pad = 4
  const w = 100 - pad * 2
  const h = 100 - pad * 2
  return r
    .map((row, i) => {
      const x = pad + (i / Math.max(r.length - 1, 1)) * w
      const y = pad + h - ((row.value - minV) / range) * h
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
</script>

<template>
  <div class="w-full min-h-[240px] px-2 py-2">
    <template v-if="rows.length">
      <svg
        class="h-[220px] w-full text-emerald-500 dark:text-emerald-400"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          :points="polylinePoints"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div class="mt-3 flex flex-wrap justify-between gap-x-2 gap-y-1 border-t border-gray-200/80 pt-2 text-[10px] text-gray-600 dark:border-gray-700 dark:text-gray-400 sm:text-xs">
        <span v-for="(row, i) in rows" :key="i" class="max-w-[16%] truncate text-center">{{ row.name }}</span>
      </div>
    </template>
    <p v-else class="py-16 text-center text-sm text-gray-500">No trend data</p>
  </div>
</template>
