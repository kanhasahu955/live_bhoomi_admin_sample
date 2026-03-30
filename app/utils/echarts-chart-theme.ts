import * as echarts from 'echarts'

/** Distinct, accessible slice colors (light & dark friendly) */
export const PIE_COLOR_PALETTE = [
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#a855f7',
  '#0ea5e9'
] as const

export function chartAxisColors(isDark: boolean) {
  return {
    text: isDark ? '#94a3b8' : '#64748b',
    line: isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.35)',
    split: isDark ? 'rgba(51, 65, 85, 0.65)' : 'rgba(226, 232, 240, 0.95)',
    splitSubtle: isDark ? 'rgba(51, 65, 85, 0.35)' : 'rgba(241, 245, 249, 0.9)'
  }
}

export function chartTooltip(isDark: boolean) {
  return {
    trigger: 'axis' as const,
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.97)',
    borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.35)',
    borderWidth: 1,
    padding: [12, 16],
    textStyle: {
      color: isDark ? '#e2e8f0' : '#334155',
      fontSize: 12,
      fontWeight: 500
    },
    extraCssText:
      'border-radius: 14px; box-shadow: 0 12px 40px -8px rgba(0,0,0,0.22), 0 4px 12px -4px rgba(0,0,0,0.12); backdrop-filter: blur(8px);'
  }
}

export function chartTooltipItem(isDark: boolean) {
  return {
    trigger: 'item' as const,
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.97)',
    borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.35)',
    borderWidth: 1,
    padding: [12, 16],
    textStyle: {
      color: isDark ? '#e2e8f0' : '#334155',
      fontSize: 12,
      fontWeight: 500
    },
    extraCssText:
      'border-radius: 14px; box-shadow: 0 12px 40px -8px rgba(0,0,0,0.22), 0 4px 12px -4px rgba(0,0,0,0.12);'
  }
}

export function legendStyle(isDark: boolean) {
  return {
    orient: 'horizontal' as const,
    bottom: 4,
    icon: 'roundRect' as const,
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 14,
    textStyle: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 11,
      fontWeight: 500
    }
  }
}

/** Vertical bar gradient (lighter at top) */
export function barGradient(hex: string, isDark: boolean): echarts.graphic.LinearGradient {
  const top = isDark ? lightenHex(hex, 22) : lightenHex(hex, 18)
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: top },
    { offset: 1, color: hex }
  ])
}

function lightenHex(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const num = parseInt(full, 16)
  const p = percent / 100
  const r = Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * p)
  const g = Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * p)
  const b = Math.round((num & 0xff) + (255 - (num & 0xff)) * p)
  return `#${[r, g, b].map((x) => Math.min(255, x).toString(16).padStart(2, '0')).join('')}`
}

/** Area under line: soft fade */
export function lineAreaGradient(hex: string, isDark: boolean): echarts.graphic.LinearGradient {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: isDark ? hexToRgba(hex, 0.42) : hexToRgba(hex, 0.32) },
    { offset: 1, color: isDark ? hexToRgba(hex, 0.02) : hexToRgba(hex, 0.02) }
  ])
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

export function emptyGraphicStyle(isDark: boolean) {
  return {
    text: 'No data',
    fill: isDark ? '#64748b' : '#94a3b8',
    fontSize: 14,
    fontWeight: 500
  }
}
