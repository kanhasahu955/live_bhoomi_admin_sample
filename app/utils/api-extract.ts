/**
 * Robust extraction of arrays from API responses.
 * Handles various response shapes: { projects }, { data: { projects } }, { items }, etc.
 */
import { get } from '~/utils/lodash'

function toArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) {
    return val.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
  }
  if (val && typeof val === 'object') {
    const items = get(val, 'items') ?? get(val, 'data') ?? get(val, 'results')
    if (Array.isArray(items)) {
      return items.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
    }
  }
  return []
}

export function extractProjects(res: unknown): Record<string, unknown>[] {
  if (!res || typeof res !== 'object') return []
  const raw =
    get(res, 'projects') ??
    get(res, 'data.projects') ??
    get(res, 'data.items') ??
    get(res, 'data.results') ??
    get(res, 'data.list') ??
    get(res, 'list') ??
    get(res, 'data') ??
    get(res, 'items') ??
    get(res, 'results') ??
    (Array.isArray(res) ? res : null)
  const arr = Array.isArray(raw) ? raw : toArray(raw)
  return arr ?? []
}

export function extractListings(res: unknown): Record<string, unknown>[] {
  if (!res || typeof res !== 'object') return []
  // Handle: { listings }, { data: { listings } }, { data: { data: { listings } } } (raw axios body)
  const raw =
    get(res, 'listings') ??
    get(res, 'data.listings') ??
    get(res, 'data.data.listings') ??
    get(res, 'data.list') ??
    get(res, 'list') ??
    (Array.isArray(get(res, 'data')) ? get(res, 'data') : null)
  if (Array.isArray(raw)) {
    return raw.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
  }
  const data = get(res, 'data') ?? res
  const raw2 =
    get(data, 'listings') ??
    get(data, 'items') ??
    get(data, 'results') ??
    get(data, 'records') ??
    get(res, 'items') ??
    get(res, 'results') ??
    get(data, 'data') ??
    (Array.isArray(data) ? data : Array.isArray(res) ? res : null)
  const arr = Array.isArray(raw2) ? raw2 : toArray(raw2)
  return arr ?? []
}

export function extractUsers(res: unknown): Record<string, unknown>[] {
  if (!res || typeof res !== 'object') return []
  const data = get(res, 'data') ?? res
  const raw =
    (Array.isArray(data) ? data : null) ??
    get(data, 'users') ??
    get(data, 'items') ??
    get(data, 'list') ??
    get(data, 'results') ??
    get(data, 'records') ??
    get(res, 'users') ??
    get(res, 'list') ??
    (Array.isArray(res) ? res : null)
  const arr = Array.isArray(raw) ? raw : toArray(raw)
  return arr ?? []
}

/** Admin /profile list responses: { profiles }, { data: [...] }, paginated items, etc. */
export function extractProfiles(res: unknown): Record<string, unknown>[] {
  if (!res || typeof res !== 'object') return []
  const data = get(res, 'data') ?? res
  const raw =
    (Array.isArray(data) ? data : null) ??
    get(data, 'profiles') ??
    get(data, 'items') ??
    get(data, 'results') ??
    get(data, 'records') ??
    get(res, 'profiles') ??
    (Array.isArray(res) ? res : null)
  const arr = Array.isArray(raw) ? raw : toArray(raw)
  return arr ?? []
}

export function extractMetadata(res: unknown): { total?: number } | undefined {
  if (!res || typeof res !== 'object') return undefined
  const meta =
    get(res, 'metadata') ??
    get(res, 'data.metadata') ??
    get((res as Record<string, unknown>).data as object, 'metadata')
  return meta as { total?: number } | undefined
}

/** Pagination from list APIs: metadata / meta / pagination / top-level total */
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * When named keys (users, projects, listings) are missing, find the largest array of
 * plain objects in the JSON tree — picks the best-scoring candidate (length + id/email heuristics).
 */
export function extractLargestObjectArray(root: unknown, maxDepth = 10): Record<string, unknown>[] {
  let best: Record<string, unknown>[] = []
  let bestScore = -1

  function score(arr: Record<string, unknown>[]): number {
    if (!arr.length) return -1
    const sample = arr[0]
    let extra = 0
    if (sample && typeof sample === 'object') {
      if ('id' in sample) extra += 50
      if ('email' in sample) extra += 30
      if ('name' in sample || 'title' in sample) extra += 20
    }
    return arr.length * 5 + extra
  }

  function walk(node: unknown, depth: number) {
    if (depth > maxDepth || node == null) return
    if (Array.isArray(node)) {
      const plain = node.filter(
        (x): x is Record<string, unknown> =>
          x != null && typeof x === 'object' && !Array.isArray(x)
      )
      const sc = score(plain)
      if (plain.length > 0 && sc > bestScore) {
        best = plain
        bestScore = sc
      }
      for (const el of node) walk(el, depth + 1)
      return
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v, depth + 1)
    }
  }

  walk(root, 0)
  return best
}

export function extractPaginationMeta(
  res: unknown,
  requestPage: number,
  requestLimit: number
): PaginationMeta | null {
  if (!res || typeof res !== 'object') return null
  const root = res as Record<string, unknown>
  const metaBlock =
    get(root, 'metadata') ??
    get(root, 'data.metadata') ??
    get(root, 'meta') ??
    get(root, 'data.meta') ??
    get(root, 'pagination')

  let total: number | undefined
  let page: number | undefined
  let lim: number | undefined
  let totalPages: number | undefined

  if (metaBlock && typeof metaBlock === 'object') {
    const m = metaBlock as Record<string, unknown>
    total = Number(m.total ?? m.totalCount ?? m.totalItems)
    page = Number(m.page ?? m.currentPage ?? m.pageNumber)
    lim = Number(m.limit ?? m.perPage ?? m.pageSize ?? m.size)
    totalPages = Number(m.totalPages ?? m.lastPage ?? m.pages)
  }

  const topTotal = Number(
    root.total ?? get(root, 'data.total') ?? get(root, 'data.totalCount')
  )
  if (!Number.isFinite(total) && Number.isFinite(topTotal)) {
    total = topTotal
  }

  if (!Number.isFinite(total) || total < 0) return null

  if (!Number.isFinite(page) || page < 1) page = requestPage
  if (!Number.isFinite(lim) || lim < 1) lim = requestLimit
  if (!Number.isFinite(totalPages) || totalPages < 1) {
    totalPages = Math.max(1, Math.ceil(total / lim))
  }

  return { total, page, limit: lim, totalPages }
}
