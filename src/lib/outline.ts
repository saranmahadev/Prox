import type { JSONContent } from '@tiptap/core'

/**
 * Outline operations over the article's Tiptap document. Legacy treated
 * the outline as "the header blocks of the one Editor.js document" and
 * mutated the shared `blocks` array directly (lines 899-938). A Tiptap
 * doc's top-level `content` array is structurally the same thing (a flat
 * list of block nodes), so these are pure functions over `doc.content`
 * that return a new doc - callers persist the result the same way the
 * draft editor does (updateDraftDoc), which is what keeps outline and
 * draft "the same document, two views" without sharing a live editor
 * instance (the two views are never shown at once in this app).
 */

export interface HeadingRow {
  index: number // position in doc.content - used as the row's identity (stable for one render pass / one drag gesture)
  level: number
  text: string
  written: boolean
}

function levelOf(node: JSONContent): number {
  return (node.attrs?.level as number) ?? 2
}

function textOf(node: JSONContent): string {
  return (node.content ?? [])
    .filter((n) => n.type === 'text')
    .map((n) => n.text ?? '')
    .join('')
}

function nodeHasContent(node: JSONContent): boolean {
  if (node.type === 'image') return true
  if (node.type === 'text') return !!node.text?.trim()
  return (node.content ?? []).some(nodeHasContent)
}

function content(doc: JSONContent): JSONContent[] {
  return doc.content ?? []
}

function withContent(doc: JSONContent, next: JSONContent[]): JSONContent {
  return { ...doc, content: next }
}

function sectionEnd(blocks: JSONContent[], index: number): number {
  const level = levelOf(blocks[index])
  let e = index + 1
  while (e < blocks.length && !(blocks[e].type === 'heading' && levelOf(blocks[e]) <= level)) e++
  return e
}

function hasBody(blocks: JSONContent[], index: number): boolean {
  for (let k = index + 1; k < blocks.length && blocks[k].type !== 'heading'; k++) {
    if (nodeHasContent(blocks[k])) return true
  }
  return false
}

function makeHeading(text: string, level: number): JSONContent {
  return { type: 'heading', attrs: { level }, content: text ? [{ type: 'text', text }] : [] }
}

/** Moves the section starting at `index` (its heading + everything up to
 * the next heading of equal-or-higher level) so it sits right before
 * `beforeIndex`. Returns null if the move is a no-op (dropping inside
 * itself). Ported from legacy's moveSection() (lines 922-926). */
function moveSection(blocks: JSONContent[], index: number, beforeIndex: number): JSONContent[] | null {
  const end = sectionEnd(blocks, index)
  if (beforeIndex > index && beforeIndex < end) return null
  const next = [...blocks]
  const segment = next.splice(index, end - index)
  const adjustedBefore = beforeIndex > index ? beforeIndex - segment.length : beforeIndex
  next.splice(adjustedBefore, 0, ...segment)
  return next
}

export function headingRows(doc: JSONContent): HeadingRow[] {
  const blocks = content(doc)
  return blocks
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'heading')
    .map(({ node, index }) => ({ index, level: levelOf(node), text: textOf(node), written: hasBody(blocks, index) }))
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

export function outlineStats(doc: JSONContent) {
  const rows = headingRows(doc)
  const levels = new Set(rows.map((r) => r.level)).size
  const written = rows.filter((r) => r.written).length
  return { headings: rows.length, levels, written }
}

export function setHeadingLevel(doc: JSONContent, index: number, level: number): JSONContent {
  const blocks = content(doc)
  if (blocks[index]?.type !== 'heading') return doc
  const clamped = Math.min(6, Math.max(1, level))
  const next = blocks.map((b, i) => (i === index ? { ...b, attrs: { ...b.attrs, level: clamped } } : b))
  return withContent(doc, next)
}

export function setHeadingText(doc: JSONContent, index: number, text: string): JSONContent {
  const blocks = content(doc)
  if (blocks[index]?.type !== 'heading') return doc
  const next = blocks.map((b, i) => (i === index ? { ...b, content: text ? [{ type: 'text', text }] : [] } : b))
  return withContent(doc, next)
}

/** Removes just the heading block itself (its body paragraphs stay, same as legacy). */
export function removeHeading(doc: JSONContent, index: number): JSONContent {
  const blocks = content(doc)
  if (blocks[index]?.type !== 'heading') return doc
  return withContent(doc, blocks.filter((_, i) => i !== index))
}

/** Inserts a new empty heading right after the given section. Returns the
 * new doc and the new heading's index. */
export function addHeadingAfter(doc: JSONContent, index: number): { doc: JSONContent; index: number } {
  const blocks = content(doc)
  const heading = blocks[index]
  if (heading?.type !== 'heading') return { doc, index }
  const insertAt = sectionEnd(blocks, index)
  const next = [...blocks]
  next.splice(insertAt, 0, makeHeading('', levelOf(heading)))
  return { doc: withContent(doc, next), index: insertAt }
}

export function addHeadingAtEnd(doc: JSONContent, text: string, level: number): JSONContent {
  return withContent(doc, [...content(doc), makeHeading(text, level)])
}

export function addStarterHeadings(doc: JSONContent): JSONContent {
  const starters = ['Introduction', 'Main points', 'Conclusion'].map((t) => makeHeading(t, 2))
  return withContent(doc, [...content(doc), ...starters])
}

export function moveSectionUp(doc: JSONContent, index: number): JSONContent {
  const blocks = content(doc)
  const level = levelOf(blocks[index])
  let p = index - 1
  while (p >= 0 && !(blocks[p].type === 'heading' && levelOf(blocks[p]) <= level)) p--
  if (p < 0 || levelOf(blocks[p]) !== level) return doc
  const moved = moveSection(blocks, index, p)
  return moved ? withContent(doc, moved) : doc
}

export function moveSectionDown(doc: JSONContent, index: number): JSONContent {
  const blocks = content(doc)
  const level = levelOf(blocks[index])
  const end = sectionEnd(blocks, index)
  if (end >= blocks.length || blocks[end].type !== 'heading' || levelOf(blocks[end]) !== level) return doc
  const moved = moveSection(blocks, index, sectionEnd(blocks, end))
  return moved ? withContent(doc, moved) : doc
}

export function moveSectionBefore(doc: JSONContent, index: number, beforeIndex: number): JSONContent {
  const moved = moveSection(content(doc), index, beforeIndex)
  return moved ? withContent(doc, moved) : doc
}
