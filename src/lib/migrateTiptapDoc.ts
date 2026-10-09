import type { OutputBlockData, OutputData } from '@editorjs/editorjs'
import { escapeHtml } from './editorjsBlocks'

interface TiptapNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

function inlineHtml(nodes: TiptapNode[] | undefined): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === 'hardBreak') return '<br>'
      if (n.type !== 'text') return ''
      let out = escapeHtml(n.text ?? '')
      for (const mark of n.marks ?? []) {
        switch (mark.type) {
          case 'bold':
            out = `<b>${out}</b>`
            break
          case 'italic':
            out = `<i>${out}</i>`
            break
          case 'code':
            out = `<code class="inline-code">${out}</code>`
            break
          case 'strike':
            out = `<s>${out}</s>`
            break
          case 'underline':
            out = `<u>${out}</u>`
            break
          case 'highlight':
            out = `<mark class="cdx-marker">${out}</mark>`
            break
          case 'link':
            out = `<a href="${escapeHtml(String(mark.attrs?.href ?? ''))}">${out}</a>`
            break
          default:
            break
        }
      }
      return out
    })
    .join('')
}

function listItems(node: TiptapNode): { content: string; items: unknown[] }[] {
  return (node.content ?? []).map((item) => {
    const paragraph = item.content?.find((c) => c.type === 'paragraph')
    const nestedList = item.content?.find((c) => c.type === 'bulletList' || c.type === 'orderedList')
    return { content: inlineHtml(paragraph?.content), items: nestedList ? listItems(nestedList) : [] }
  })
}

/** One-time conversion for `Idea.doc` persisted under the old Tiptap/
 * ProseMirror schema, before the Editor.js rewrite - see useIdeasStore's
 * persist `migrate`. Best-effort: covers every node type draftExtensions.ts
 * used to enable (heading/paragraph/blockquote/codeBlock/lists/table/image/
 * horizontalRule); anything else is dropped rather than guessed at. */
export function migrateTiptapDoc(doc: unknown): OutputData {
  const root = doc as TiptapNode
  const blocks: OutputBlockData[] = []
  for (const child of root?.content ?? []) {
    switch (child.type) {
      case 'heading':
        blocks.push({ type: 'header', data: { text: inlineHtml(child.content), level: (child.attrs?.level as number) ?? 2 } })
        break
      case 'paragraph':
        blocks.push({ type: 'paragraph', data: { text: inlineHtml(child.content) } })
        break
      case 'blockquote':
        blocks.push({ type: 'quote', data: { text: (child.content ?? []).map((p) => inlineHtml(p.content)).join('<br>'), caption: '' } })
        break
      case 'codeBlock':
        blocks.push({ type: 'code', data: { code: (child.content ?? []).map((t) => t.text ?? '').join('') } })
        break
      case 'horizontalRule':
        blocks.push({ type: 'delimiter', data: {} })
        break
      case 'bulletList':
      case 'orderedList':
        blocks.push({ type: 'list', data: { style: child.type === 'orderedList' ? 'ordered' : 'unordered', items: listItems(child) } })
        break
      case 'table':
        blocks.push({
          type: 'table',
          data: {
            withHeadings: false,
            content: (child.content ?? []).map((row) => (row.content ?? []).map((cell) => inlineHtml(cell.content?.[0]?.content))),
          },
        })
        break
      case 'image':
        blocks.push({
          type: 'image',
          data: {
            file: { key: (child.attrs?.fileKey as string) ?? '', url: '' },
            caption: escapeHtml(String(child.attrs?.alt ?? '')),
          },
        })
        break
      default:
        break
    }
  }
  return { time: Date.now(), blocks }
}
