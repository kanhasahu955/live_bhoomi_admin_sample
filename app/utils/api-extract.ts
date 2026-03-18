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
    get(data, 'results') ??
    get(data, 'records') ??
    get(res, 'users') ??
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
