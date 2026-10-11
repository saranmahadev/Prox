import type { OutputBlockData } from '@editorjs/editorjs'
import { blocksToMdx, type Block } from '@inflate-ai/imaxt-mdx'
import { coverPhrase } from '@inflate-ai/imaxt-core'
import { docToMarkdown } from './markdown'
import { excerptOf } from './articleMeta'
import type { Idea } from '../types/idea'

/** imaxt-editorjs registers its tools under camelCase keys
 * (OutputBlockData.type); imaxt-mdx's Block.type is kebab-case. Everything
 * not in this map is a standard Editor.js block (paragraph, header, list,
 * ...) and goes through docToMarkdown + the `markdown` passthrough block
 * instead - see imaxt-mdx's blocks.ts for why that variant exists. */
const IMAXT_TYPE_MAP: Record<string, string> = {
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
 * and every run of ordinary Editor.js blocks between them is serialized
 * with the existing docToMarkdown() and carried as one `markdown`
 * passthrough block, so prose and Imaxt blocks interleave correctly. */
function toImaxtBlocks(blocks: OutputBlockData[]): Block[] {
  const result: Block[] = []
  let run: OutputBlockData[] = []

  function flushRun() {
    if (!run.length) return
    const source = docToMarkdown(run)
    if (source) result.push({ type: 'markdown', source })
    run = []
  }

  for (const block of blocks) {
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

/** Compiles an idea's draft + meta into the exact MDX (frontmatter + body)
 * Blog expects, matching its basePost/seriesPosts Zod schema field for
 * field. `order` is only set when the idea belongs to a series and has a
 * part number - see Phase 5 for how the series itself gets its slug. */
export function compileArticleToMdx(idea: Idea): CompiledArticle {
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
    if (meta.coverUrl) frontmatter.cover = { image: meta.coverUrl, alt: meta.coverAlt }
  } else {
    const text = meta.typographicCover.text.trim() || coverPhrase(idea.title)
    const sub = meta.typographicCover.sub.trim()
    frontmatter.cover = sub ? { kind: meta.typographicCover.kind, text, sub } : { kind: meta.typographicCover.kind, text }
  }

  if (meta.canonical) frontmatter.canonical = meta.canonical
  if (meta.allowImages) frontmatter.allowImages = true
  if (meta.seriesId && meta.part) frontmatter.order = meta.part

  const blocks = toImaxtBlocks(idea.draft?.blocks ?? [])
  const mdx = blocksToMdx({ frontmatter, blocks })
  return { frontmatter, mdx }
}
