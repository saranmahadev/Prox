import type { OutputData } from '@editorjs/editorjs'
import { fileStore } from './fileStore'

interface ImageFile {
  key?: string
  url?: string
}

/** Blank out `url` on any image block that has a `key` before persisting -
 * blob: URLs only live for the current session, so storing them would break
 * on reload. Mirrors legacy's commitDoc() (lines 1069-1073). */
export function stripImageUrls(doc: OutputData): OutputData {
  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      const file = block.data?.file as ImageFile | undefined
      if (block.type !== 'image' || !file?.key) return block
      return { ...block, data: { ...block.data, file: { ...file, url: '' } } }
    }),
  }
}

/** Resolve `url` for every image block with a `key` from the blob store
 * before mounting the editor or rendering a preview. Mirrors legacy's
 * mountDraft() image hydration (lines 1106-1107). */
export async function hydrateImageUrls(doc: OutputData): Promise<OutputData> {
  const urlCache = new Map<string, string>()

  async function resolve(key: string): Promise<string> {
    const cached = urlCache.get(key)
    if (cached) return cached
    const blob = await fileStore.get(key)
    const url = blob ? URL.createObjectURL(blob) : ''
    urlCache.set(key, url)
    return url
  }

  const blocks = await Promise.all(
    doc.blocks.map(async (block) => {
      const file = block.data?.file as ImageFile | undefined
      if (block.type !== 'image' || !file?.key) return block
      return { ...block, data: { ...block.data, file: { ...file, url: await resolve(file.key) } } }
    }),
  )
  return { ...doc, blocks }
}
