import type { OutputBlockData } from '@editorjs/editorjs'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Content, List, ListItem as MdastListItem, PhrasingContent } from 'mdast'
import { mdxToBlocks, type Block } from '@inflate-ai/imaxt-mdx'
import { escapeHtml } from './editorjsBlocks'
import { IMAXT_TYPE_MAP } from './imaxtCompile'
import type { ArticleMeta, TypographicCover } from '../types/idea'

const CAMEL_FROM_KEBAB: Record<string, string> = Object.fromEntries(
  Object.entries(IMAXT_TYPE_MAP).map(([camel, kebab]) => [kebab, camel]),
)

/** Inverse of markdown.ts's inlineMarkdown(): walks a paragraph/heading's
 * inline mdast nodes back into the simple inline HTML Editor.js expects.
 * Round-trips everything Prox itself can produce (bold/italic/code/links/
 * hard breaks); anything else falls back to its plain text. */
function inlineToHtml(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value)
        case 'strong':
          return `<b>${inlineToHtml(node.children)}</b>`
        case 'emphasis':
          return `<i>${inlineToHtml(node.children)}</i>`
        case 'inlineCode':
          return `<code>${escapeHtml(node.value)}</code>`
        case 'link':
          return `<a href="${escapeHtml(node.url)}">${inlineToHtml(node.children)}</a>`
        case 'break':
          return '<br>'
        default:
          return 'value' in node ? escapeHtml(String(node.value)) : ''
      }
    })
    .join('')
}

function listItemToEditorItem(item: MdastListItem): { content: string; items?: unknown[] } {
  let content = ''
  const nested: unknown[] = []
  for (const child of item.children) {
    if (child.type === 'paragraph') content += inlineToHtml(child.children)
    else if (child.type === 'list') nested.push(...child.children.map((li) => listItemToEditorItem(li)))
  }
  return nested.length ? { content, items: nested } : { content }
}

/** Inverse of markdown.ts's docToMarkdown(): a pragmatic markdown ->
 * Editor.js blocks parser covering what Prox itself writes (headings,
 * paragraphs, lists, blockquotes, fenced code, rules). GFM-only syntax
 * (tables, task lists) wasn't loaded as an extension here, so it degrades
 * to a plain paragraph rather than being lost outright. */
function markdownToEditorBlocks(source: string): OutputBlockData[] {
  const tree = fromMarkdown(source)
  const blocks: OutputBlockData[] = []

  for (const node of tree.children as Content[]) {
    switch (node.type) {
      case 'heading':
        blocks.push({ type: 'header', data: { text: inlineToHtml(node.children), level: node.depth } })
        break
      case 'paragraph':
        blocks.push({ type: 'paragraph', data: { text: inlineToHtml(node.children) } })
        break
      case 'blockquote': {
        const paragraphs = node.children.filter((c): c is Content & { type: 'paragraph' } => c.type === 'paragraph')
        const text = paragraphs.map((p) => inlineToHtml(p.children)).join('<br>')
        blocks.push({ type: 'quote', data: { text, caption: '', alignment: 'left' } })
        break
      }
      case 'list': {
        const list = node as List
        blocks.push({
          type: 'list',
          data: { style: list.ordered ? 'ordered' : 'unordered', items: list.children.map((li) => listItemToEditorItem(li)) },
        })
        break
      }
      case 'code':
        blocks.push({ type: 'code', data: { code: node.value } })
        break
      case 'thematicBreak':
        blocks.push({ type: 'delimiter', data: {} })
        break
      default:
        if ('value' in node && typeof node.value === 'string' && node.value.trim()) {
          blocks.push({ type: 'paragraph', data: { text: escapeHtml(node.value) } })
        }
    }
  }
  return blocks
}

function blocksToEditorBlocks(blocks: Block[]): OutputBlockData[] {
  const out: OutputBlockData[] = []
  for (const block of blocks) {
    if (block.type === 'markdown') {
      out.push(...markdownToEditorBlocks(block.source))
    } else {
      const camelType = CAMEL_FROM_KEBAB[block.type]
      if (camelType) out.push({ type: camelType, data: block.data as Record<string, unknown> })
    }
  }
  return out
}

export interface ImportedArticle {
  title: string
  tags: string[]
  draft: { blocks: OutputBlockData[] }
  meta: Partial<ArticleMeta>
}

function isTypographicCover(cover: unknown): cover is { kind: TypographicCover['kind']; text: string; sub?: string } {
  return !!cover && typeof cover === 'object' && 'kind' in cover
}

/** Turns a Blog post's MDX source back into the shape DraftEditorView/
 * ArticleMeta expect, for re-importing an already-published post into
 * Prox (Phase 8). Imaxt blocks round-trip exactly (imaxt-mdx recognizes
 * them); ordinary prose goes through markdownToEditorBlocks() above. */
export function importMdxToArticle(source: string): ImportedArticle {
  const { frontmatter, blocks } = mdxToBlocks(source)
  const editorBlocks = blocksToEditorBlocks(blocks)

  const meta: Partial<ArticleMeta> = {
    description: typeof frontmatter.description === 'string' ? frontmatter.description : '',
    author: typeof frontmatter.author === 'string' ? frontmatter.author : '',
    canonical: typeof frontmatter.canonical === 'string' ? frontmatter.canonical : '',
    allowImages: frontmatter.allowImages === true,
    part: typeof frontmatter.order === 'number' ? frontmatter.order : null,
  }
  if (typeof frontmatter.date === 'string') meta.publishAt = frontmatter.date

  const cover = frontmatter.cover
  if (isTypographicCover(cover)) {
    meta.coverMode = 'typographic'
    meta.typographicCover = { kind: cover.kind, text: cover.text, sub: cover.sub ?? '' }
  } else if (cover && typeof cover === 'object' && 'image' in cover) {
    meta.coverMode = 'image'
    meta.coverUrl = String((cover as { image: string }).image)
    meta.coverAlt = String((cover as { alt?: string }).alt ?? '')
  }

  return {
    title: typeof frontmatter.title === 'string' ? frontmatter.title : '',
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    draft: { blocks: editorBlocks },
    meta,
  }
}
