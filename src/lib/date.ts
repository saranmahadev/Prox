/** Ported from legacy's fmtDate() (line 1911). */
export function formatDate(t: number | null | undefined): string {
  return t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}
