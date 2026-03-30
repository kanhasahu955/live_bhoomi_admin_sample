import { get } from '~/utils/lodash'

/** First non-empty field among keys; used so charts always get a labeled slice. */
export function bucketField(
  row: Record<string, unknown>,
  keys: string[],
  fallback = 'Unknown'
): string {
  for (const k of keys) {
    const v = get(row, k)
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return fallback
}

export function pickCreatedAt(row: Record<string, unknown>): unknown {
  return (
    get(row, 'createdAt') ??
    get(row, 'created_at') ??
    get(row, 'updatedAt') ??
    get(row, 'updated_at')
  )
}
