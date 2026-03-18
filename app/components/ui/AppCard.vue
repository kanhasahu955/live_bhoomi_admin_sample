<script setup lang="ts">
interface Props {
  class?: string
  padding?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
  padding: true
})
</script>

<template>
  <UCard
    v-bind="$attrs"
    :class="props.class"
    :ui="{ body: props.padding ? 'p-6 sm:p-8' : 'p-0' }"
  >
    <slot />
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
  </UCard>
</template>
