<script setup>
import { useHead, useSeoMeta } from 'nuxt/app'
import { getLayoutConfig } from '~/config/layout'
import { useLayoutStore } from '~/stores/layout'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/admin/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Admin — Bhoominow',
  description: 'Bhoominow admin dashboard'
})

const layoutStore = useLayoutStore()
const layoutConfig = getLayoutConfig()
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <LayoutAppLayoutSearch
      v-if="layoutStore.isSearchOpen"
      :nav-items="layoutConfig.navItems"
    />
  </UApp>
</template>
