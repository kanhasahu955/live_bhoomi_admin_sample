<script setup lang="ts">
interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'lg',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <UFormField v-if="props.label" :label="props.label">
    <UInput
      :model-value="props.modelValue"
      :type="props.type"
      :placeholder="props.placeholder"
      :size="props.size"
      :disabled="props.disabled"
      v-bind="$attrs"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </UFormField>
  <UInput
    v-else
    :model-value="props.modelValue"
    :type="props.type"
    :placeholder="props.placeholder"
    :size="props.size"
    :disabled="props.disabled"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
