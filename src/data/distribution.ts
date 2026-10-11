import { excerptOf } from '../lib/articleMeta'
import { headingRows } from '../lib/headings'
import type { Idea } from '../types/idea'

/** Ported from legacy/index.html's CHANNELS/DSTAT (lines 1236-1237). */
export const CHANNELS: [string, string, string][] = [
  ['blog', 'Blog', '📝'],
  ['newsletter', 'Newsletter', '✉️'],
  ['linkedin', 'LinkedIn', '💼'],
  ['x', 'X / Threads', '🧵'],
  ['shorts', 'Shorts / Reels', '📱'],
]

export const DISTRIBUTE_STATUS: [string, string][] = [
  ['todo', 'To do'],
  ['scheduled', 'Scheduled'],
  ['posted', 'Posted'],
]

/** Ported from legacy's snippet() (lines 1240-1250). */
export function snippet(idea: Idea, channel: string): string {
  const blogUrl = idea.dist?.channels.blog?.url ?? ''
  const url = (idea.meta?.canonical || blogUrl || '').trim()
  const tags = idea.tags.map((t) => '#' + t.replace(/\s+/g, '')).join(' ')
  const excerpt = excerptOf(idea)
  const headings = headingRows(idea.draft ?? { blocks: [] })
    .map((h) => h.text)
    .filter(Boolean)

  switch (channel) {
    case 'blog':
      return `${idea.title}\n${excerpt}${url ? '\n' + url : ''}`
    case 'newsletter':
      return `Subject: ${idea.meta?.seoTitle || idea.title}\nPreview: ${excerpt}\n\n${url || '[link]'}`
    case 'linkedin':
      return `${idea.title}\n\n${excerpt}\n\nRead it here: ${url || '[link]'}\n\n${tags}`.trim()
    case 'x': {
      const t = `${idea.title} ${url}`.trim()
      return t.length > 280 ? t.slice(0, 277) + '…' : t
    }
    case 'shorts':
      return headings.length
        ? headings
            .slice(0, 3)
            .map((h, n) => `Short ${n + 1}: ${h}`)
            .join('\n')
        : `Short: ${idea.title}`
    default:
      return ''
  }
}
