import type { JSONContent } from '@tiptap/core'

/**
 * Manual ProseMirror-JSON -> Markdown serializer. Tiptap v3 ships internal
 * markdown parse/render hooks on some node specs, but they're undocumented
 * and not exposed as a stable top-level API - per the migration plan, this
 * manual walker (mirroring legacy's blocksToMD/inlineMD/listMD) is the
 * safer, fully-controlled fallback.
 */

function renderMarks(text: string, marks: JSONContent['marks']): string {
  let out = text
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case 'bold':
        out = `**${out}**`
        break
      case 'italic':
        out = `*${out}*`
        break
      case 'code':
        out = `\`${out}\``
        break
      case 'strike':
        out = `~~${out}~~`
        break
      case 'highlight':
        out = `==${out}==`
        break
      case 'link':
        out = `[${out}](${mark.attrs?.href ?? ''})`
        break
      default:
        break
    }
  }
  return out
}

function renderInline(nodes: JSONContent[] | undefined): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === 'text') return renderMarks(n.text ?? '', n.marks)
      if (n.type === 'hardBreak') return '\n'
      return ''
    })
    .join('')
}

function renderListItem(item: JSONContent, ordered: boolean, index: number, depth: number): string {
  const pad = '  '.repeat(depth)
  const marker = ordered ? `${index + 1}. ` : '- '
  const parts = (item.content ?? []).map((child) => {
    if (child.type === 'bulletList' || child.type === 'orderedList') {
      return renderList(child, depth + 1)
    }
    return renderInline(child.content)
  })
  return pad + marker + parts.join('\n' + '  '.repeat(depth + 1))
}

function renderList(node: JSONContent, depth: number): string {
  const ordered = node.type === 'orderedList'
  return (node.content ?? []).map((item, i) => renderListItem(item, ordered, i, depth)).join('\n')
}

function renderTable(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => (cell.content ?? []).map((p) => renderInline(p.content)).join(' ')),
  )
  if (!rows.length) return ''
  const header = rows[0]
  const sep = header.map(() => '---')
  const body = rows.slice(1)
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`
  return [line(header), line(sep), ...body.map(line)].join('\n')
}

function renderBlock(node: JSONContent): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, node.attrs?.level ?? 2))
      return '#'.repeat(level) + ' ' + renderInline(node.content)
    }
    case 'paragraph':
      return renderInline(node.content)
    case 'blockquote':
      return (node.content ?? []).map((p) => '> ' + renderInline(p.content)).join('\n')
    case 'codeBlock': {
      const lang = node.attrs?.language ?? ''
      const code = (node.content ?? []).map((t) => t.text ?? '').join('')
      return '```' + lang + '\n' + code + '\n```'
    }
    case 'horizontalRule':
      return '---'
    case 'bulletList':
    case 'orderedList':
      return renderList(node, 0)
    case 'table':
      return renderTable(node)
    case 'image': {
      const alt = node.attrs?.alt ?? ''
      const src = node.attrs?.src ?? ''
      return `![${alt}](${src})`
    }
    default:
      return ''
  }
}

export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? [])
    .map(renderBlock)
    .filter((s) => s !== '')
    .join('\n\n')
}
