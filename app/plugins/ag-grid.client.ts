import { defineNuxtPlugin } from 'nuxt/app'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

export default defineNuxtPlugin(() => {
  // AG Grid styles are imported globally
  // Components will import AgGridVue directly
})
