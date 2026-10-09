import { useEffect, useState } from 'react'
import { fileStore } from '../lib/fileStore'
import type { Idea } from '../types/idea'

/** Resolves an idea's cover to a displayable URL - either the pasted
 * coverUrl directly, or an object URL hydrated from the uploaded/generated
 * blob (mirrors legacy's coverImg() + hydrateImgs() for cover images). */
export function useCoverUrl(idea: Idea): string {
  const key = idea.meta?.cover?.key
  const directUrl = idea.meta?.coverUrl ?? ''
  const [blobUrl, setBlobUrl] = useState('')

  useEffect(() => {
    if (!key) {
      setBlobUrl('')
      return
    }
    let cancelled = false
    fileStore.get(key).then((blob) => {
      if (!cancelled && blob) setBlobUrl(URL.createObjectURL(blob))
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return key ? blobUrl : directUrl
}
