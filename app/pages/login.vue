<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const auth = useAuth()
const toast = useToast()

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    let success = false
    try {
      success = await auth.login(email.value, password.value)
    } catch {
      if (import.meta.dev) {
        auth.setToken('demo-token')
        auth.setUser({ id: '1', email: email.value, name: 'Demo User' })
        success = true
      } else {
        throw new Error('Login failed')
      }
    }
    if (!success && import.meta.dev) {
      auth.setToken('demo-token')
      auth.setUser({ id: '1', email: email.value, name: 'Demo User' })
      success = true
    }
    if (success) {
      try {
        toast.add({
          title: 'Login successful',
          description: 'Welcome back!',
          color: 'primary',
          icon: 'i-lucide-check-circle'
        })
      } catch {
        // Toast may not be available
      }
      await new Promise(r => setTimeout(r, 300))
      await navigateTo('/')
    } else {
      error.value = 'Invalid email or password'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md space-y-8">
    <!-- Header -->
    <div class="flex flex-col items-center text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
        <UIcon name="i-lucide-leaf" class="h-8 w-8" />
      </div>
      <h1 class="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        Bhoominow Admin
      </h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Sign in to access your dashboard
      </p>
    </div>

    <!-- Form Card -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
      <form class="space-y-5" @submit.prevent="handleLogin">
        <div class="space-y-2">
          <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="admin@bhoominow.com"
            autocomplete="email"
            :disabled="loading"
            required
            class="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div class="space-y-2">
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
            required
            class="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {{ error }}
        </div>
        <button
          type="submit"
          :disabled="!email || !password || loading"
          class="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in...
          </span>
          <span v-else>Sign in</span>
        </button>
      </form>
    </div>

    <!-- Dev message -->
    <p class="text-center text-xs text-gray-500 dark:text-gray-400">
      In development mode, any credentials work for demo access.
    </p>
  </div>
</template>
