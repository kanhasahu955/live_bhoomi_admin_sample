/** Human-readable message from axios / fetch errors for admin UI. */
export function getFetchErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const r = (e as { response?: { status?: number; data?: { message?: string; error?: string } } }).response
    const msg = r?.data?.message ?? r?.data?.error
    if (msg) return String(msg)
    if (r?.status) return `Request failed (HTTP ${r.status})`
  }
  if (e instanceof Error) return e.message
  return 'Request failed'
}
