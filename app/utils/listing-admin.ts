import { get } from '~/utils/lodash'

/** True when listing is live (approval / status / listingStatus). */
export function isListingPublished(l: Record<string, unknown> | null | undefined): boolean {
  if (!l) return false
  const a = String(get(l, 'approvalStatus') ?? '')
  const s = String(get(l, 'status') ?? '')
  const ls = String(get(l, 'listingStatus') ?? '')
  return a === 'PUBLISHED' || s === 'PUBLISHED' || ls === 'PUBLISHED'
}

export function isListingSoftDeleted(l: Record<string, unknown> | null | undefined): boolean {
  if (!l) return false
  const d = get(l, 'deletedAt')
  return d != null && d !== ''
}

/** Admin PATCH form: any non-deleted listing, including published (uses PATCH /admin/listings/:id). */
export function canAdminFullEditListing(l: Record<string, unknown> | null | undefined): boolean {
  if (!l || isListingSoftDeleted(l)) return false
  return true
}

/**
 * PATCH /admin/listings/:id/reject — show when review can reject or a live listing should be taken down.
 * Not shown when already REJECTED.
 */
export function canAdminRejectListing(l: Record<string, unknown> | null | undefined): boolean {
  if (!l || isListingSoftDeleted(l)) return false
  const ap = String(get(l, 'approvalStatus') ?? '').trim()
  if (ap === 'REJECTED') return false
  return ap === 'PENDING_REVIEW' || isListingPublished(l)
}
