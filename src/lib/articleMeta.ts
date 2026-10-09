import type { OutputData } from '@editorjs/editorjs'
import type { Idea } from '../types/idea'
import { stripHtml } from './editorjsBlocks'

/** Ported from legacy's slugify() (line 1153). */
export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

function firstParagraphText(doc: OutputData | null): string {
  for (const block of doc?.blocks ?? []) {
    if (block.type === 'paragraph') {
      const text = stripHtml(block.data?.text as string)
      if (text.trim()) return text
    }
  }
  return ''
}

/** Meta description falls back to the first non-empty paragraph, then the
 * idea summary. Ported from legacy's excerptOf() (line 1154). */
export function excerptOf(idea: Idea): string {
  if (idea.meta?.description) return idea.meta.description
  const p = firstParagraphText(idea.doc)
  return (p || idea.summary || '').slice(0, 160)
}

export const PALETTES: [string, [string, string, string]][] = [
  ['Ink', ['#1f1f1f', '#3a3a3a', '#ffffff']],
  ['Forest', ['#0f4d2a', '#1a8917', '#ffffff']],
  ['Dusk', ['#3b2a6b', '#d8527a', '#ffffff']],
  ['Sand', ['#f1e7d3', '#d9c4a0', '#2a2118']],
  ['Ocean', ['#0b3c5d', '#328cc1', '#ffffff']],
]

export function readMins(words: number): number {
  return Math.max(1, Math.round(words / 200))
}
