import type { Plugin } from 'vue'
import { defineNuxtPlugin } from 'nuxt/app'
import VChart from 'vue-echarts'
import { ensureEchartsRegistered } from '~/utils/echarts-register'

ensureEchartsRegistered()

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('VChart', VChart as unknown as Plugin)
})
