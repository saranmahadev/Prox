/** Ported from legacy/index.html's hostOf/looksUrl (lines 771-772). */

export function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function looksLikeUrl(s: string): boolean {
  return !/\s/.test(s) && (/^https?:\/\//i.test(s) || /^www\./i.test(s) || /^[\w-]+(\.[\w-]+)+\/\S*$/.test(s))
}

export function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url
}
