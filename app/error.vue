<script setup lang="ts">
const props = defineProps<{
  error: { message?: string; statusCode?: number }
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
    <div class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p class="text-6xl font-bold text-gray-900 dark:text-white">
        {{ props.error?.statusCode ?? 'Error' }}
      </p>
      <p class="mt-4 text-gray-600 dark:text-gray-400">
        {{ props.error?.message ?? 'Something went wrong' }}
      </p>
      <button
        type="button"
        class="mt-6 inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        @click="handleError"
      >
        Go home
      </button>
    </div>
  </div>
</template>
