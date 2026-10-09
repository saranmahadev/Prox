/**
 * Shared helpers for reading Editor.js's OutputData blocks as plain data.
 * Block text/caption fields hold inline HTML (bold/italic/links added via
 * the inline toolbar), so every plain-text consumer strips tags first -
 * ports legacy's stripHTML/esc/itemText/flatItems (lines 901-903, 1364).
 */

export function stripHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

const ESCAPE_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c])
}

export type ListItem = string | { content?: string; text?: string; items?: ListItem[]; meta?: { checked?: boolean } }

export function itemText(item: ListItem): string {
  if (typeof item === 'string') return item
  return (item.content ?? item.text) || ''
}

/** Flattens nested list items (Editor.js list v2's `{content, items}` tree)
 * into their text content, depth-first - ports legacy's flatItems(). */
export function flatListTexts(items: ListItem[] | undefined): string[] {
  const out: string[] = []
  const walk = (list: ListItem[] | undefined) => {
    for (const item of list ?? []) {
      out.push(itemText(item))
      if (typeof item !== 'string' && item.items) walk(item.items)
    }
  }
  walk(items)
  return out
}
