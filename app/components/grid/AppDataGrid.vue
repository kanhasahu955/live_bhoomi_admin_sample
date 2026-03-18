<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef } from 'ag-grid-community'
import { capitalize } from '~/utils/lodash'

interface SimpleColumnDef {
  field: string
  headerName?: string
  width?: number
  sortable?: boolean
  filter?: boolean | string
}

interface Props {
  rowData: T[]
  columnDefs: (SimpleColumnDef | ColDef<T>)[]
  loading?: boolean
  height?: string
  pagination?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: '400px',
  pagination: false,
  emptyMessage: 'No data available'
})

const processedColumnDefs = computed<ColDef<T>[]>(() =>
  props.columnDefs.map((col) => {
    if ('field' in col) {
      return {
        ...col,
        headerName: col.headerName ?? (col.field ? capitalize(String(col.field)) : '')
      } as ColDef<T>
    }
    return col as ColDef<T>
  })
)
</script>

<template>
  <UCard :ui="{ root: 'overflow-hidden', body: 'p-0' }">
    <div class="ag-theme-quartz" :style="{ height: props.height }">
      <AgGridVue
        :row-data="props.rowData"
        :column-defs="processedColumnDefs"
        :loading="props.loading"
        :pagination="props.pagination"
        :overlay-no-rows-template="`<span class='text-gray-500'>${props.emptyMessage}</span>`"
        :default-col-def="{
          sortable: true,
          filter: true,
          resizable: true,
          minWidth: 100
        }"
        class="w-full"
      />
    </div>
  </UCard>
</template>
