/// <reference types="node" />
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,
  future: { compatibilityVersion: 4 },

  app: {
    baseURL: '/admin/',
    layoutTransition: false,
    pageTransition: false,
    head: {
      htmlAttrs: { lang: 'en' },
      titleTemplate: '%s | Admin',
      title: 'Admin — Bhoominow',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Bhoominow admin dashboard.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/admin/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap',
        },
      ],
    },
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vueuse/motion/nuxt'
  ],

  pinia: {
    storesDirs: ['app/stores/**']
  },

  ui: {
    fonts: false
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'bhoominow-admin-theme'
  },

  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tailwindcss() as any],
    optimizeDeps: {
      include: ['echarts', 'vue-echarts', 'ag-grid-community', 'ag-grid-vue3'],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.bhoominow.com/api/v1',
      auth: {
        cookieName: 'admin_token',
        loginPath: '/login',
        homePath: '/',
        publicPaths: ['/login'],
      },
    },
  },

  css: ['~/assets/css/main.css'],
})
