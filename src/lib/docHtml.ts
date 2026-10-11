import type { OutputBlockData } from '@editorjs/editorjs'
import { escapeHtml, itemText, stripHtml, type ListItem } from './editorjsBlocks'
import { renderImaxtBlock } from './imaxtRender'

/**
 * Manual Editor.js blocks -> HTML renderer, used for both the draft
 * editor's Preview toggle and the published-article body. Ported from
 * legacy's blocksToHTML/cleanInline/listHTML/safeUrl (lines 993-1034).
 */

const SAFE_URL = /^(https?:|mailto:|blob:|data:image\/)/i
function safeUrl(u: string | undefined): string {
  const trimmed = String(u ?? '').trim()
  return SAFE_URL.test(trimmed) ? trimmed : ''
}

const ALLOWED_INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'CODE', 'BR', 'A', 'S'])

/** Keeps only simple inline markup (the tags the inline toolbar can add)
 * when rendering stored block HTML, same allowlist as legacy's cleanInline(). */
function cleanInline(html: string | undefined): string {
  const template = document.createElement('template')
  template.innerHTML = String(html ?? '')
  const walk = (node: ParentNode) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove()
        continue
      }
      const el = child as HTMLElement
      walk(el)
      if (!ALLOWED_INLINE_TAGS.has(el.tagName)) {
        el.replaceWith(...el.childNodes)
        continue
      }
      for (const attr of [...el.attributes]) {
        if (!(el.tagName === 'A' && attr.name === 'href')) el.removeAttribute(attr.name)
      }
      if (el.tagName === 'A') {
        const href = safeUrl(el.getAttribute('href') ?? undefined)
        if (href) {
          el.setAttribute('href', href)
          el.setAttribute('target', '_blank')
          el.setAttribute('rel', 'noopener noreferrer')
        } else {
          el.removeAttribute('href')
        }
      }
    }
  }
  walk(template.content)
  return template.innerHTML
}

function listHtml(items: ListItem[] | undefined, style: string): string {
  const tag = style === 'ordered' ? 'ol' : 'ul'
  const body = (items ?? [])
    .map((item) => {
      const text = itemText(item)
      const checked = typeof item !== 'string' && item.meta?.checked
      const nested = typeof item !== 'string' && item.items?.length ? listHtml(item.items, style) : ''
      return `<li>${style === 'checklist' ? (checked ? '☑ ' : '☐ ') : ''}${cleanInline(text)}${nested}</li>`
    })
    .join('')
  return `<${tag}${style === 'checklist' ? ' class="pv-check"' : ''}>${body}</${tag}>`
}

function renderBlock(block: OutputBlockData): string {
  const d = block.data ?? {}
  switch (block.type) {
    case 'header': {
      const level = Math.min(6, Math.max(1, (d.level as number) ?? 2))
      return `<h${level}>${cleanInline(d.text as string)}</h${level}>`
    }
    case 'paragraph':
      return `<p>${cleanInline(d.text as string)}</p>`
    case 'quote':
      return `<blockquote><p>${cleanInline(d.text as string)}</p>${d.caption ? `<cite>${cleanInline(d.caption as string)}</cite>` : ''}</blockquote>`
    case 'code':
      return `<pre><code>${escapeHtml(d.code as string)}</code></pre>`
    case 'delimiter':
      return '<hr>'
    case 'list':
      return listHtml(d.items as ListItem[], (d.style as string) ?? 'unordered')
    case 'table': {
      const rows = (d.content as string[][]) ?? []
      return `<table>${rows
        .map((row, n) => `<tr>${row.map((cell) => `<${d.withHeadings && n === 0 ? 'th' : 'td'}>${cleanInline(cell)}</${d.withHeadings && n === 0 ? 'th' : 'td'}>`).join('')}</tr>`)
        .join('')}</table>`
    }
    case 'image': {
      const file = (d.file as { key?: string; url?: string }) ?? {}
      const url = safeUrl(file.url)
      const caption = (d.caption as string) ?? ''
      const img = url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(stripHtml(caption))}">` : ''
      return `<figure>${img}${caption ? `<figcaption>${cleanInline(caption)}</figcaption>` : ''}</figure>`
    }
    case 'embed': {
      const url = safeUrl(d.source as string)
      return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml((d.source as string) ?? '')}</a></p>`
    }
    default:
      // Imaxt's typographic blocks (statement, callout, stat, timeline, ...)
      // render through imaxt-core, matching Blog's published HTML exactly.
      return renderImaxtBlock(block.type, d) ?? ''
  }
}

export function docToHtml(blocks: OutputBlockData[]): string {
  return blocks.map(renderBlock).join('\n')
}
