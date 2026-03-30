<script setup lang="ts">
import { computed } from 'vue'

export interface BarRow {
  name: string
  value: number
}

const props = withDefaults(
  defineProps<{
    rows: BarRow[]
    emptyLabel?: string
    /** Tailwind gradient from-* for the bar fill */
    barClass?: string
  }>(),
  {
    emptyLabel: 'No data',
    barClass: 'from-emerald-500 to-teal-500'
  }
)

const max = computed(() => Math.max(1, ...props.rows.map((r) => r.value)))
</script>

<template>
  <div class="flex min-h-[200px] w-full flex-col justify-center gap-2.5 px-1 py-2">
    <template v-if="rows.length">
      <div
        v-for="(r, i) in rows"
        :key="`${r.name}-${i}`"
        class="flex min-h-[30px] items-center gap-2 text-xs sm:text-sm"
      >
        <span
          class="w-[32%] shrink-0 truncate font-medium text-gray-800 dark:text-gray-100 sm:w-[28%]"
          :title="r.name"
        >{{ r.name }}</span>
        <div class="h-8 min-w-0 flex-1 overflow-hidden rounded-lg bg-gray-200/90 dark:bg-gray-700/80">
          <div
            class="h-full rounded-lg bg-gradient-to-r shadow-sm transition-[width] duration-500"
            :class="barClass"
            :style="{ width: `${(r.value / max) * 100}%` }"
          />
        </div>
        <span class="w-9 shrink-0 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-50 sm:w-10">{{
          r.value
        }}</span>
      </div>
    </template>
    <p v-else class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      {{ emptyLabel }}
    </p>
  </div>
</template>
