import type { JSONContent } from '@tiptap/core'
import { fileStore } from './fileStore'

/** Blank out `src` on any image node that has a `fileKey` before persisting -
 * blob: URLs only live for the current session, so storing them would break
 * on reload. Mirrors legacy's commitDoc() (lines 1069-1073). */
export function stripImageUrls(doc: JSONContent): JSONContent {
  const walk = (node: JSONContent): JSONContent => {
    const next = { ...node }
    if (next.type === 'image' && next.attrs?.fileKey) {
      next.attrs = { ...next.attrs, src: '' }
    }
    if (next.content) next.content = next.content.map(walk)
    return next
  }
  return walk(doc)
}

/** Resolve `src` for every image node with a `fileKey` from the blob store
 * before mounting the editor. Mirrors legacy's mountDraft() image hydration
 * (lines 1106-1107). */
export async function hydrateImageUrls(doc: JSONContent): Promise<JSONContent> {
  const urlCache = new Map<string, string>()

  async function resolve(key: string): Promise<string> {
    const cached = urlCache.get(key)
    if (cached) return cached
    const blob = await fileStore.get(key)
    const url = blob ? URL.createObjectURL(blob) : ''
    urlCache.set(key, url)
    return url
  }

  async function walk(node: JSONContent): Promise<JSONContent> {
    const next = { ...node }
    if (next.type === 'image' && next.attrs?.fileKey) {
      next.attrs = { ...next.attrs, src: await resolve(next.attrs.fileKey) }
    }
    if (next.content) next.content = await Promise.all(next.content.map(walk))
    return next
  }

  return walk(doc)
}
