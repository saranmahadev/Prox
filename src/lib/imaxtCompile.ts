import type { OutputBlockData } from '@editorjs/editorjs'
import { blocksToMdx, type Block } from '@inflate-ai/imaxt-mdx'
import { coverPhrase } from '@inflate-ai/imaxt-core'
import { docToMarkdown } from './markdown'
import { excerptOf } from './articleMeta'
import { stripHtml } from './editorjsBlocks'
import type { Idea, Series } from '../types/idea'

/** imaxt-editorjs registers its tools under camelCase keys
 * (OutputBlockData.type); imaxt-mdx's Block.type is kebab-case. Everything
 * not in this map is a standard Editor.js block (paragraph, header, list,
 * ...) and goes through docToMarkdown + the `markdown` passthrough block
 * instead - see imaxt-mdx's blocks.ts for why that variant exists. */
export const IMAXT_TYPE_MAP: Record<string, string> = {
  banner: 'banner',
  bars: 'bars',
  callout: 'callout',
  changelog: 'changelog',
  checklist: 'checklist',
  codeWalk: 'code-walk',
  compare: 'compare',
  curvedText: 'curved-text',
  delta: 'delta',
  diff: 'diff',
  dropCap: 'drop-cap',
  errorBox: 'error-box',
  faq: 'faq',
  fileTree: 'file-tree',
  footnote: 'footnote',
  formula: 'formula',
  funnel: 'funnel',
  gauge: 'gauge',
  glossary: 'glossary',
  heatmap: 'heatmap',
  marquee: 'marquee',
  matrix: 'matrix',
  pullQuote: 'pull-quote',
  ranked: 'ranked',
  redacted: 'redacted',
  scorecard: 'scorecard',
  scrolly: 'scrolly',
  sidenote: 'sidenote',
  sparkline: 'sparkline',
  stamp: 'stamp',
  statRow: 'stat-row',
  statement: 'statement',
  steps: 'steps',
  takeaways: 'takeaways',
  terminal: 'terminal',
  ticker: 'ticker',
  timeline: 'timeline',
  typeLab: 'type-lab',
  versus: 'versus',
}

/** Walks the draft's Editor.js blocks into imaxt-mdx's Block[] shape:
 * Imaxt blocks map straight through (by type, with their saved data),
 * image blocks are rewritten to their final published path (resolved by
 * the publish step - the in-app blob key/object URL means nothing once
 * published), and every run of ordinary Editor.js blocks between them is
 * serialized with the existing docToMarkdown() and carried as one
 * `markdown` passthrough block, so prose and Imaxt blocks interleave
 * correctly. */
function toImaxtBlocks(blocks: OutputBlockData[], imagePaths: Record<string, string>): Block[] {
  const result: Block[] = []
  let run: OutputBlockData[] = []

  function flushRun() {
    if (!run.length) return
    const source = docToMarkdown(run)
    if (source) result.push({ type: 'markdown', source })
    run = []
  }

  for (const block of blocks) {
    if (block.type === 'image') {
      flushRun()
      const key = (block.data?.file as { key?: string } | undefined)?.key
      const path = key ? imagePaths[key] : undefined
      if (path) {
        const alt = stripHtml(block.data?.caption as string)
        result.push({ type: 'markdown', source: `![${alt}](${path})` })
      }
      continue
    }
    const kebabType = IMAXT_TYPE_MAP[block.type]
    if (kebabType) {
      flushRun()
      result.push({ type: kebabType, data: block.data } as Block)
    } else {
      run.push(block)
    }
  }
  flushRun()
  return result
}

export interface CompiledArticle {
  frontmatter: Record<string, unknown>
  mdx: string
}

export interface CompileOptions {
  /** Final published path for an uploaded/generated cover image (image
   * mode only) - resolved by the publish step once the blob's extension
   * is known. Falls back to meta.coverUrl (a directly pasted URL) when
   * absent, which is all a plain MDX preview (no publish happening) has. */
  coverImagePath?: string
  /** fileStore blob key -> final published path, for inline body images
   * (the rare allowImages exception) - same reasoning as coverImagePath. */
  imagePaths?: Record<string, string>
}

/** Compiles an idea's draft + meta into the exact MDX (frontmatter + body)
 * Blog expects, matching its basePost/seriesPosts Zod schema field for
 * field. `order` is only set when the idea belongs to a series and has a
 * part number - see Phase 5 for how the series itself gets its slug. */
export function compileArticleToMdx(idea: Idea, options: CompileOptions = {}): CompiledArticle {
  const meta = idea.meta
  if (!meta) throw new Error('compileArticleToMdx requires an article idea (idea.meta is null)')

  const publishDate = meta.publishAt ? new Date(meta.publishAt) : new Date(idea.created)

  const frontmatter: Record<string, unknown> = {
    title: idea.title,
    description: excerptOf(idea).slice(0, 200),
    date: publishDate.toISOString().slice(0, 10),
    author: meta.author || 'Dev',
    tags: idea.tags,
  }

  if (meta.coverMode === 'image') {
    const image = options.coverImagePath ?? meta.coverUrl
    if (image) frontmatter.cover = { image, alt: meta.coverAlt }
  } else {
    const text = meta.typographicCover.text.trim() || coverPhrase(idea.title)
    const sub = meta.typographicCover.sub.trim()
    frontmatter.cover = sub ? { kind: meta.typographicCover.kind, text, sub } : { kind: meta.typographicCover.kind, text }
  }

  if (meta.canonical) frontmatter.canonical = meta.canonical
  if (meta.allowImages) frontmatter.allowImages = true
  if (meta.seriesId && meta.part) frontmatter.order = meta.part

  const blocks = toImaxtBlocks(idea.draft?.blocks ?? [], options.imagePaths ?? {})
  const mdx = blocksToMdx({ frontmatter, blocks })
  return { frontmatter, mdx }
}

/** Compiles a series into Blog's series/<slug>/index.md - frontmatter only,
 * no body. tone/pattern are left out entirely when unset, so Blog derives
 * its own stable choice from the slug rather than Prox guessing one. */
export function compileSeriesIndexToMdx(series: Series): CompiledArticle {
  const frontmatter: Record<string, unknown> = {
    title: series.name,
    description: series.desc.slice(0, 200),
  }
  if (series.tone) frontmatter.tone = series.tone
  if (series.pattern) frontmatter.pattern = series.pattern
  const mdx = blocksToMdx({ frontmatter, blocks: [] })
  return { frontmatter, mdx }
}
