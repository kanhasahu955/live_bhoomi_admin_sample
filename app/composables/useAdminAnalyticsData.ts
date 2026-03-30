import type { AxiosInstance } from 'axios'
import { useNuxtApp } from 'nuxt/app'
import { ADMIN, useAdminService } from '~/services/api'
import {
  extractUsers,
  extractProjects,
  extractListings,
  extractPaginationMeta,
  extractLargestObjectArray
} from '~/utils/api-extract'

const PAGE_LIMIT = 100
/** Cap pages to avoid huge admin payloads; totals still come from API metadata. */
const MAX_PAGES = 25

export interface AdminAggregateResult {
  total: number
  rows: Record<string, unknown>[]
}

/** Prefer inner `data` payload; keep full body available for extractors. */
function innerPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const b = body as Record<string, unknown>
  return b.data !== undefined ? b.data : body
}

function extractRows(body: unknown, extract: (res: unknown) => Record<string, unknown>[]): Record<string, unknown>[] {
  const inner = innerPayload(body)
  const a = extract(inner)
  if (a.length) return a
  return extract(body)
}

/** Named extractors first, then deepest object-array scan (handles odd API shapes). */
function coerceRows(body: unknown, extract: (res: unknown) => Record<string, unknown>[]): Record<string, unknown>[] {
  let rows = extractRows(body, extract)
  if (rows.length) return rows
  const inner = innerPayload(body)
  rows = extractLargestObjectArray(inner)
  if (rows.length) return rows
  return extractLargestObjectArray(body)
}

/**
 * Uses raw `$api.get` so we see the same JSON as the network layer — `unwrap()` in BaseApiClient
 * often drops sibling `metadata`, which broke totals and sometimes list extraction for charts.
 */
function createPaginateList($api: AxiosInstance, admin: ReturnType<typeof useAdminService>) {
  return async function paginateList(
    path: string,
    extract: (res: unknown) => Record<string, unknown>[]
  ): Promise<AdminAggregateResult> {
  const res1 = await $api.get(path, { params: { page: 1, limit: PAGE_LIMIT } })
  const body1 = res1.data
  let rows = coerceRows(body1, extract)
  if (!rows.length) {
    const params = { page: 1, limit: PAGE_LIMIT }
    const raw =
      path === ADMIN.usersList
        ? await admin.listUsers(params)
        : path === ADMIN.projects
          ? await admin.listAdminProjects(params)
          : await admin.listAdminListings(params)
    rows = coerceRows(raw, extract)
  }

  const meta =
    extractPaginationMeta(body1 as unknown, 1, PAGE_LIMIT) ??
    extractPaginationMeta(innerPayload(body1) as unknown, 1, PAGE_LIMIT)
  let total = meta?.total ?? rows.length
  let totalPages = meta?.totalPages
  if (!Number.isFinite(totalPages) || totalPages < 1) {
    totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / PAGE_LIMIT))
  }
  totalPages = Math.min(Math.max(totalPages, 1), MAX_PAGES)

  for (let p = 2; p <= totalPages; p++) {
    const res = await $api.get(path, { params: { page: p, limit: PAGE_LIMIT } })
    const chunk = coerceRows(res.data, extract)
    rows = rows.concat(chunk)
  }
  return { total, rows }
  }
}

/**
 * Loads admin-scoped users, projects, and listings (same sources as Users / Projects / Listings pages)
 * with pagination so charts reflect real data beyond the first page.
 */
export function useAdminAnalyticsData() {
  const nuxtApp = useNuxtApp()
  const admin = useAdminService()
  const $api = nuxtApp.$api as AxiosInstance
  const paginateList = createPaginateList($api, admin)

  return {
    fetchUsers: () => paginateList(ADMIN.usersList, extractUsers),
    fetchProjects: () => paginateList(ADMIN.projects, extractProjects),
    fetchListings: () => paginateList(ADMIN.listings, extractListings)
  }
}
