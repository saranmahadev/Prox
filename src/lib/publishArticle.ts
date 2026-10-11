import type { OutputBlockData } from '@editorjs/editorjs'
import { compileArticleToMdx, compileSeriesIndexToMdx } from './imaxtCompile'
import { publishToBlog, textToBase64, blobToBase64, type PublishFile } from './githubPublish'
import { fileStore } from './fileStore'
import { slugify } from './articleMeta'
import { stripHtml } from './editorjsBlocks'
import type { Idea, PublishedPr, Series } from '../types/idea'

/** A publish that didn't even reach GitHub - a decision the author needs to
 * make (missing title, unconfirmed images), not a network/API failure. */
export class PublishBlockedError extends Error {}

function draftImageKeys(idea: Idea): { key: string; alt: string }[] {
  return (idea.draft?.blocks ?? [])
    .filter((b): b is OutputBlockData => b.type === 'image')
    .map((b) => ({ key: (b.data?.file as { key?: string } | undefined)?.key ?? '', alt: stripHtml(b.data?.caption as string) }))
    .filter((img) => img.key)
}

function extensionFor(blob: Blob): string {
  if (blob.type.includes('png')) return 'png'
  if (blob.type.includes('webp')) return 'webp'
  if (blob.type.includes('gif')) return 'gif'
  if (blob.type.includes('svg')) return 'svg'
  return 'jpg'
}

export interface PublishArticleResult {
  pr: PublishedPr
  seriesPublished: boolean
}

/** Builds the full file set for one article and opens the PR on
 * saranmahadev/blog via the Tauri GitHub transport (Phase 6). This is the
 * only place that decides real published paths - the compiler
 * (imaxtCompile.ts) just takes whatever paths it's handed. */
export async function publishArticle(idea: Idea, series: Series | null): Promise<PublishArticleResult> {
  const meta = idea.meta
  if (!meta) throw new PublishBlockedError('This idea has no article metadata.')

  const slug = (meta.slug || slugify(idea.title)).trim()
  if (!slug) throw new PublishBlockedError('Give this article a title or a slug before publishing.')

  const images = draftImageKeys(idea)
  if (images.length && !meta.allowImages) {
    throw new PublishBlockedError(
      'This draft has images - check "Publish with these images anyway" in the Image check panel first.',
    )
  }

  const files: PublishFile[] = []

  // Resolve every blob-backed image to its final public/ path up front, so
  // the compiler can rewrite both the cover and the body's <img> references
  // to real, servable paths instead of this session's blob keys.
  const imagePaths: Record<string, string> = {}
  for (const img of images) {
    const blob = await fileStore.get(img.key)
    if (!blob) continue
    const ext = extensionFor(blob)
    const path = `/articles/${slug}/${img.key}.${ext}`
    imagePaths[img.key] = path
    files.push({ path: `public/articles/${slug}/${img.key}.${ext}`, contentBase64: await blobToBase64(blob) })
  }

  let coverImagePath: string | undefined
  if (meta.coverMode === 'image' && meta.cover) {
    const blob = await fileStore.get(meta.cover.key)
    if (blob) {
      const ext = extensionFor(blob)
      coverImagePath = `/articles/${slug}/cover.${ext}`
      files.push({ path: `public/articles/${slug}/cover.${ext}`, contentBase64: await blobToBase64(blob) })
    }
  }

  const { mdx } = compileArticleToMdx(idea, { coverImagePath, imagePaths })
  const postPath = series ? `src/content/series/${series.slug}/${slug}.mdx` : `src/content/posts/${slug}.mdx`
  files.push({ path: postPath, contentBase64: textToBase64(mdx) })

  const seriesPublished = !!series && !series.publishedToBlog
  if (series && seriesPublished) {
    const { mdx: seriesMdx } = compileSeriesIndexToMdx(series)
    files.push({ path: `src/content/series/${series.slug}/index.md`, contentBase64: textToBase64(seriesMdx) })
  }

  const branch = `prox/publish-${slug}-${Date.now()}`
  const description = meta.description || idea.summary || ''
  const result = await publishToBlog({
    branch,
    prTitle: `Publish: ${idea.title}`,
    prBody: `Published from Prox.${description ? `\n\n${description}` : ''}`,
    files,
    labels: ['deploy-preview'],
  })

  return {
    pr: { number: result.prNumber, url: result.prUrl, branch: result.branch, merged: false },
    seriesPublished,
  }
}
