import type { OutputData, OutputBlockData } from '@editorjs/editorjs'
import type { Idea } from '../types/idea'
import { flatListTexts, stripHtml, type ListItem } from './editorjsBlocks'

function blockPlainText(block: OutputBlockData): string {
  const d = block.data ?? {}
  switch (block.type) {
    case 'header':
    case 'paragraph':
      return stripHtml(d.text as string)
    case 'quote':
      return stripHtml(d.text as string) + (d.caption ? ' ' + stripHtml(d.caption as string) : '')
    case 'list':
      return flatListTexts(d.items as ListItem[]).map(stripHtml).join(' ')
    case 'code':
      return (d.code as string) || ''
    case 'table':
      return ((d.content as string[][]) ?? []).flat().map(stripHtml).join(' ')
    case 'image':
      return stripHtml(d.caption as string)
    default:
      return ''
  }
}

/** Word count across the Editor.js document - ports legacy's wordsOf(),
 * which walked blocks the same way (lines 904-916). */
export function wordCount(doc: OutputData | null): number {
  if (!doc) return 0
  const text = (doc.blocks ?? []).map(blockPlainText).join(' ').trim()
  return text ? text.split(/\s+/).length : 0
}

/** An article always has a cover once it has meta: typographic mode always
 * renders something (it falls back to the title), image mode only once an
 * image is actually set. */
export function hasCover(idea: Idea): boolean {
  if (!idea.meta) return false
  return idea.meta.coverMode === 'image' ? !!(idea.meta.coverUrl || idea.meta.cover) : true
}
