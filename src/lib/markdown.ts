import type { OutputBlockData } from '@editorjs/editorjs'
import { itemText, stripHtml, type ListItem } from './editorjsBlocks'

/**
 * Manual Editor.js blocks -> Markdown serializer. Ported from legacy's
 * blocksToMD/inlineMD/listMD (lines 1035-1066) - block `text`/`caption`
 * fields are inline HTML from the inline toolbar, so inline marks are
 * translated by regex rather than parsed, same as legacy.
 */

function inlineMarkdown(html: string | undefined): string {
  let t = String(html ?? '')
  t = t
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  return stripHtml(t.replace(/<br\s*\/?>/gi, '\n'))
}

function listMarkdown(items: ListItem[] | undefined, style: string, depth: number): string {
  return (items ?? [])
    .map((item, n) => {
      const text = inlineMarkdown(itemText(item))
      const pad = '  '.repeat(depth)
      const checked = typeof item !== 'string' && item.meta?.checked
      const marker = style === 'ordered' ? `${n + 1}. ` : style === 'checklist' ? (checked ? '- [x] ' : '- [ ] ') : '- '
      const nested = typeof item !== 'string' && item.items?.length ? '\n' + listMarkdown(item.items, style, depth + 1) : ''
      return pad + marker + text + nested
    })
    .join('\n')
}

function renderBlock(block: OutputBlockData): string {
  const d = block.data ?? {}
  switch (block.type) {
    case 'header':
      return '#'.repeat(Math.min(6, Math.max(1, (d.level as number) ?? 2))) + ' ' + inlineMarkdown(d.text as string)
    case 'paragraph':
      return inlineMarkdown(d.text as string)
    case 'quote':
      return '> ' + inlineMarkdown(d.text as string) + (d.caption ? '\n> — ' + inlineMarkdown(d.caption as string) : '')
    case 'code':
      return '```\n' + ((d.code as string) ?? '') + '\n```'
    case 'delimiter':
      return '---'
    case 'list':
      return listMarkdown(d.items as ListItem[], (d.style as string) ?? 'unordered', 0)
    case 'table': {
      const rows = (d.content as string[][]) ?? []
      if (!rows.length) return ''
      const line = (cells: string[]) => `| ${cells.map(inlineMarkdown).join(' | ')} |`
      const sep = `| ${rows[0].map(() => '---').join(' | ')} |`
      return [line(rows[0]), sep, ...rows.slice(1).map(line)].join('\n')
    }
    case 'image': {
      const file = (d.file as { url?: string }) ?? {}
      return `![${stripHtml(d.caption as string)}](${file.url || 'image'})`
    }
    case 'embed':
      return (d.source as string) ?? ''
    default:
      return ''
  }
}

export function docToMarkdown(blocks: OutputBlockData[]): string {
  return blocks
    .map(renderBlock)
    .filter((s) => s !== '')
    .join('\n\n')
}
