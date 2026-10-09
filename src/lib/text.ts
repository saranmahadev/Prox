import type { JSONContent } from '@tiptap/core'
import type { Idea } from '../types/idea'

/** Word count across a Tiptap document (replaces legacy's wordsOf, which
 * walked Editor.js blocks instead of a ProseMirror doc). */
export function wordCount(doc: JSONContent | null): number {
  if (!doc) return 0
  let text = ''
  const walk = (node: JSONContent) => {
    if (node.text) text += node.text + ' '
    node.content?.forEach(walk)
  }
  walk(doc)
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function hasCover(idea: Idea): boolean {
  return !!(idea.meta?.coverUrl || idea.meta?.cover)
}
