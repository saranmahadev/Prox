import { invoke } from '@tauri-apps/api/core'

/**
 * Thin wrapper over the Rust-side GitHub commands (src-tauri/src/github.rs).
 * The token never reaches the webview - every call here just names an
 * action and lets the Rust side hold and use the credential.
 */

export interface PublishFile {
  path: string
  contentBase64: string
}

export interface PublishRequest {
  branch: string
  base?: string
  prTitle: string
  prBody: string
  files: PublishFile[]
  labels?: string[]
}

export interface PublishResult {
  prNumber: number
  prUrl: string
  branch: string
}

export interface PrStatus {
  state: 'open' | 'closed'
  merged: boolean
  htmlUrl: string
  mergeable: boolean | null
}

export function setGithubToken(token: string): Promise<void> {
  return invoke('set_github_token', { token })
}

export function hasGithubToken(): Promise<boolean> {
  return invoke('has_github_token')
}

export function clearGithubToken(): Promise<void> {
  return invoke('clear_github_token')
}

export function publishToBlog(request: PublishRequest): Promise<PublishResult> {
  return invoke('publish_to_blog', {
    request: {
      branch: request.branch,
      base: request.base,
      pr_title: request.prTitle,
      pr_body: request.prBody,
      files: request.files.map((f) => ({ path: f.path, content_base64: f.contentBase64 })),
      labels: request.labels ?? [],
    },
  })
}

export async function getPrStatus(prNumber: number): Promise<PrStatus> {
  const result = await invoke<{ state: string; merged: boolean; html_url: string; mergeable: boolean | null }>('get_pr_status', {
    prNumber,
  })
  return { state: result.state as 'open' | 'closed', merged: result.merged, htmlUrl: result.html_url, mergeable: result.mergeable }
}

/** UTF-8 text -> base64, for committing generated MDX through the same
 * content_base64 path as binary image blobs. */
export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Blob (an uploaded/generated image from fileStore) -> base64. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
