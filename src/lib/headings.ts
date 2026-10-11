import type { OutputData, OutputBlockData } from '@editorjs/editorjs'
import { flatListTexts, stripHtml, type ListItem } from './editorjsBlocks'

/**
 * Read-only "headings found in the article" helpers, used for the
 * table-of-contents / recap displays (ArticleRecap, PublishedStageView,
 * DistributeView, MetaBuilderView's DetailsSection). Headings are just
 * regular blocks the author types directly into the Draft canvas - there is
 * no separate outline structure feeding these anymore.
 */

export interface HeadingRow {
  index: number // position in doc.blocks - used as the row's identity
  level: number
  text: string
  written: boolean
}

function levelOf(block: OutputBlockData): number {
  return (block.data?.level as number) ?? 2
}

function textOf(block: OutputBlockData): string {
  return stripHtml(block.data?.text as string)
}

function blockHasContent(block: OutputBlockData): boolean {
  const d = block.data ?? {}
  switch (block.type) {
    case 'paragraph':
    case 'quote':
      return !!(stripHtml(d.text as string).trim() || (d.caption && stripHtml(d.caption as string).trim()))
    case 'list':
      return flatListTexts(d.items as ListItem[]).some((t) => stripHtml(t).trim())
    case 'code':
      return !!((d.code as string) ?? '').trim()
    case 'table':
      return ((d.content as string[][]) ?? []).some((row) => row.some((c) => stripHtml(c).trim()))
    case 'image':
      return true
    case 'embed':
      return !!d.source
    default:
      return false
  }
}

function blocksOf(doc: OutputData): OutputBlockData[] {
  return doc.blocks ?? []
}

function hasBody(blocks: OutputBlockData[], index: number): boolean {
  for (let k = index + 1; k < blocks.length && blocks[k].type !== 'header'; k++) {
    if (blockHasContent(blocks[k])) return true
  }
  return false
}

export function headingRows(doc: OutputData): HeadingRow[] {
  const blocks = blocksOf(doc)
  return blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === 'header')
    .map(({ block, index }) => ({ index, level: levelOf(block), text: textOf(block), written: hasBody(blocks, index) }))
}

/** "1", "1.1", "1.2", "2", ... plus nesting depth (for indentation). */
export function numberingFor(rows: HeadingRow[]): { numbering: string; depth: number }[] {
  const stack: { lv: number; n: number }[] = []
  return rows.map((row) => {
    while (stack.length && stack[stack.length - 1].lv > row.level) stack.pop()
    if (stack.length && stack[stack.length - 1].lv === row.level) stack[stack.length - 1].n++
    else stack.push({ lv: row.level, n: 1 })
    return { numbering: stack.map((s) => s.n).join('.'), depth: stack.length - 1 }
  })
}
