<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue'

interface ColumnDef {
  key: string
  label: string
}

interface Props {
  data: T[]
  columns: ColumnDef[]
  loading?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'No data available'
})

const tableColumns = computed(() =>
  props.columns.map((c) => ({
    accessorKey: c.key,
    header: c.label
  }))
)
</script>

<template>
  <UCard :ui="{ root: 'overflow-x-auto', body: 'p-0' }">
    <UTable
      :data="props.data"
      :columns="tableColumns"
      :loading="props.loading"
      :empty="props.emptyMessage"
    />
  </UCard>
</template>
