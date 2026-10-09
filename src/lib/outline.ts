import type { OutputData, OutputBlockData } from '@editorjs/editorjs'
import { flatListTexts, stripHtml, type ListItem } from './editorjsBlocks'

/**
 * Outline operations over the article's Editor.js document. Legacy treated
 * the outline as "the header blocks of the one Editor.js document" and
 * mutated the shared `blocks` array directly (lines 899-938, 939-950) -
 * these are the same pure functions over `doc.blocks`, ported 1:1.
 */

export interface HeadingRow {
  index: number // position in doc.blocks - used as the row's identity (stable for one render pass / one drag gesture)
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

function withBlocks(doc: OutputData, blocks: OutputBlockData[]): OutputData {
  return { ...doc, time: Date.now(), blocks }
}

function sectionEnd(blocks: OutputBlockData[], index: number): number {
  const level = levelOf(blocks[index])
  let e = index + 1
  while (e < blocks.length && !(blocks[e].type === 'header' && levelOf(blocks[e]) <= level)) e++
  return e
}

function hasBody(blocks: OutputBlockData[], index: number): boolean {
  for (let k = index + 1; k < blocks.length && blocks[k].type !== 'header'; k++) {
    if (blockHasContent(blocks[k])) return true
  }
  return false
}

function makeHeading(text: string, level: number): OutputBlockData {
  return { type: 'header', data: { text, level } }
}

/** Moves the section starting at `index` (its heading + everything up to
 * the next heading of equal-or-higher level) so it sits right before
 * `beforeIndex`. Returns null if the move is a no-op (dropping inside
 * itself). Ported from legacy's moveSection() (lines 922-926). */
function moveSection(blocks: OutputBlockData[], index: number, beforeIndex: number): OutputBlockData[] | null {
  const end = sectionEnd(blocks, index)
  if (beforeIndex > index && beforeIndex < end) return null
  const next = [...blocks]
  const segment = next.splice(index, end - index)
  const adjustedBefore = beforeIndex > index ? beforeIndex - segment.length : beforeIndex
  next.splice(adjustedBefore, 0, ...segment)
  return next
}

export function headingRows(doc: OutputData): HeadingRow[] {
  const blocks = blocksOf(doc)
  return blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === 'header')
    .map(({ block, index }) => ({ index, level: levelOf(block), text: textOf(block), written: hasBody(blocks, index) }))
}

/** "1", "1.1", "1.2", "2", ... plus nesting depth (for indentation), ported
 * from legacy's olRows() stack logic (lines 940-944). */
export function numberingFor(rows: HeadingRow[]): { numbering: string; depth: number }[] {
  const stack: { lv: number; n: number }[] = []
  return rows.map((row) => {
    while (stack.length && stack[stack.length - 1].lv > row.level) stack.pop()
    if (stack.length && stack[stack.length - 1].lv === row.level) stack[stack.length - 1].n++
    else stack.push({ lv: row.level, n: 1 })
    return { numbering: stack.map((s) => s.n).join('.'), depth: stack.length - 1 }
  })
}

export function outlineStats(doc: OutputData) {
  const rows = headingRows(doc)
  const levels = new Set(rows.map((r) => r.level)).size
  const written = rows.filter((r) => r.written).length
  return { headings: rows.length, levels, written }
}

export function setHeadingLevel(doc: OutputData, index: number, level: number): OutputData {
  const blocks = blocksOf(doc)
  if (blocks[index]?.type !== 'header') return doc
  const clamped = Math.min(6, Math.max(1, level))
  const next = blocks.map((b, i) => (i === index ? { ...b, data: { ...b.data, level: clamped } } : b))
  return withBlocks(doc, next)
}

export function setHeadingText(doc: OutputData, index: number, text: string): OutputData {
  const blocks = blocksOf(doc)
  if (blocks[index]?.type !== 'header') return doc
  const next = blocks.map((b, i) => (i === index ? { ...b, data: { ...b.data, text } } : b))
  return withBlocks(doc, next)
}

/** Removes just the heading block itself (its body paragraphs stay, same as legacy). */
export function removeHeading(doc: OutputData, index: number): OutputData {
  const blocks = blocksOf(doc)
  if (blocks[index]?.type !== 'header') return doc
  return withBlocks(doc, blocks.filter((_, i) => i !== index))
}

/** Inserts a new empty heading right after the given section. Returns the
 * new doc and the new heading's index. */
export function addHeadingAfter(doc: OutputData, index: number): { doc: OutputData; index: number } {
  const blocks = blocksOf(doc)
  const heading = blocks[index]
  if (heading?.type !== 'header') return { doc, index }
  const insertAt = sectionEnd(blocks, index)
  const next = [...blocks]
  next.splice(insertAt, 0, makeHeading('', levelOf(heading)))
  return { doc: withBlocks(doc, next), index: insertAt }
}

export function addHeadingAtEnd(doc: OutputData, text: string, level: number): OutputData {
  return withBlocks(doc, [...blocksOf(doc), makeHeading(text, level)])
}

export function addStarterHeadings(doc: OutputData): OutputData {
  const starters = ['Introduction', 'Main points', 'Conclusion'].map((t) => makeHeading(t, 2))
  return withBlocks(doc, [...blocksOf(doc), ...starters])
}

export function moveSectionUp(doc: OutputData, index: number): OutputData {
  const blocks = blocksOf(doc)
  const level = levelOf(blocks[index])
  let p = index - 1
  while (p >= 0 && !(blocks[p].type === 'header' && levelOf(blocks[p]) <= level)) p--
  if (p < 0 || levelOf(blocks[p]) !== level) return doc
  const moved = moveSection(blocks, index, p)
  return moved ? withBlocks(doc, moved) : doc
}

export function moveSectionDown(doc: OutputData, index: number): OutputData {
  const blocks = blocksOf(doc)
  const level = levelOf(blocks[index])
  const end = sectionEnd(blocks, index)
  if (end >= blocks.length || blocks[end].type !== 'header' || levelOf(blocks[end]) !== level) return doc
  const moved = moveSection(blocks, index, sectionEnd(blocks, end))
  return moved ? withBlocks(doc, moved) : doc
}

export function moveSectionBefore(doc: OutputData, index: number, beforeIndex: number): OutputData {
  const moved = moveSection(blocksOf(doc), index, beforeIndex)
  return moved ? withBlocks(doc, moved) : doc
}
