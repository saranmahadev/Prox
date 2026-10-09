/** Ported from legacy/index.html's uid(). */
export function uid(): string {
  return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
