/**
 * Single place for echarts/core `use()` so imperative `init()` always has charts/components loaded.
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  GraphicComponent
} from 'echarts/components'

let registered = false

export function ensureEchartsRegistered(): void {
  if (registered) return
  registered = true
  use([
    CanvasRenderer,
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    GraphicComponent
  ])
}
