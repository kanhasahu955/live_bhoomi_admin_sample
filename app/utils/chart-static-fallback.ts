/**
 * Realistic sample series so dashboard/analytics charts always render when API
 * returns empty breakdowns or fails — swap to live data automatically when present.
 */
export type NamedValue = { name: string; value: number }

export const CHART_STATIC = {
  usersByRole: [
    { name: 'SUPERADMIN', value: 2 },
    { name: 'ADMIN', value: 6 },
    { name: 'STAFF', value: 14 },
    { name: 'PARTNER', value: 28 },
    { name: 'AGENT', value: 42 }
  ] satisfies NamedValue[],
  usersByStatus: [
    { name: 'ACTIVE', value: 72 },
    { name: 'PENDING', value: 12 },
    { name: 'SUSPENDED', value: 4 }
  ] satisfies NamedValue[],
  projectsByStatus: [
    { name: 'DRAFT', value: 18 },
    { name: 'PENDING_REVIEW', value: 9 },
    { name: 'PUBLISHED', value: 34 },
    { name: 'REJECTED', value: 5 }
  ] satisfies NamedValue[],
  projectsByCategory: [
    { name: 'Residential', value: 28 },
    { name: 'Commercial', value: 14 },
    { name: 'Mixed use', value: 8 },
    { name: 'Plots', value: 16 }
  ] satisfies NamedValue[],
  projectsByCity: [
    { name: 'Hyderabad', value: 24 },
    { name: 'Bengaluru', value: 19 },
    { name: 'Mumbai', value: 16 },
    { name: 'Pune', value: 12 },
    { name: 'Chennai', value: 9 }
  ] satisfies NamedValue[],
  listingsByPurpose: [
    { name: 'SALE', value: 52 },
    { name: 'RENT', value: 31 },
    { name: 'LEASE', value: 7 }
  ] satisfies NamedValue[],
  listingsByStatus: [
    { name: 'DRAFT', value: 22 },
    { name: 'PENDING_REVIEW', value: 11 },
    { name: 'PUBLISHED', value: 48 },
    { name: 'REJECTED', value: 6 }
  ] satisfies NamedValue[],
  listingsByCategory: [
    { name: 'Apartment', value: 36 },
    { name: 'Villa', value: 18 },
    { name: 'Office', value: 12 },
    { name: 'Retail', value: 9 }
  ] satisfies NamedValue[],
  /** Activity trend — month key + combined activity */
  activityTrend: [
    { name: '2025-10', value: 12 },
    { name: '2025-11', value: 19 },
    { name: '2025-12', value: 24 },
    { name: '2026-01', value: 31 },
    { name: '2026-02', value: 27 },
    { name: '2026-03', value: 35 }
  ] satisfies NamedValue[]
} as const

/** Use API breakdown when non-empty; otherwise show static preview. */
export function chartSeries<T extends NamedValue>(real: T[], demo: readonly T[]): T[] {
  return real.length > 0 ? real : [...demo]
}

export function sumNamedValues(rows: readonly NamedValue[]): number {
  return rows.reduce((s, r) => s + r.value, 0)
}

/** Totals that match `CHART_STATIC` breakdowns (for KPI cards in static demo mode). */
export const STATIC_DASHBOARD_KPIS = {
  users: sumNamedValues(CHART_STATIC.usersByRole),
  projects: sumNamedValues(CHART_STATIC.projectsByCategory),
  listings: sumNamedValues(CHART_STATIC.listingsByPurpose)
} as const
