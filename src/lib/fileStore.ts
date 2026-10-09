/**
 * Blob storage for uploaded files/images (research docs, covers,
 * thumbnails, draft images) - too large for the localStorage-backed
 * ideas store. Ported from legacy/index.html's `FS` wrapper
 * (lines 781-787): IndexedDB, falling back to an in-memory Map when
 * IndexedDB is unavailable.
 */
class FileStore {
  private mem = new Map<string, Blob>()
  private dbPromise: Promise<IDBDatabase | null> | null = null

  private db(): Promise<IDBDatabase | null> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open('prox-files', 1)
          req.onupgradeneeded = () => req.result.createObjectStore('f')
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    }
    return this.dbPromise
  }

  async put(key: string, blob: Blob): Promise<boolean> {
    const db = await this.db()
    if (!db) {
      this.mem.set(key, blob)
      return false
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('f', 'readwrite')
        tx.objectStore('f').put(blob, key)
        tx.oncomplete = () => resolve(true)
        tx.onerror = tx.onabort = () => {
          this.mem.set(key, blob)
          resolve(false)
        }
      } catch {
        this.mem.set(key, blob)
        resolve(false)
      }
    })
  }

  async get(key: string): Promise<Blob | null> {
    if (this.mem.has(key)) return this.mem.get(key) ?? null
    const db = await this.db()
    if (!db) return null
    return new Promise((resolve) => {
      try {
        const req = db.transaction('f').objectStore('f').get(key)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }

  async del(key: string): Promise<void> {
    this.mem.delete(key)
    const db = await this.db()
    if (!db) return
    try {
      db.transaction('f', 'readwrite').objectStore('f').delete(key)
    } catch {
      // ignore
    }
  }
}

export const fileStore = new FileStore()

export const MAX_FILE_SIZE = 25 * 1024 * 1024

export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${Math.round(n / 1024)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

export function fileIcon(type: string): string {
  if (/pdf/.test(type)) return '📕'
  if (/^image\//.test(type)) return '🖼️'
  if (/sheet|excel|csv/.test(type)) return '📊'
  if (/presentation|powerpoint/.test(type)) return '📽️'
  if (/^(audio|video)\//.test(type)) return '🎞️'
  return '📄'
}

export function isPreviewable(type: string | undefined): boolean {
  return /^(image\/|text\/|audio\/|video\/)|pdf$/.test(type || '')
}
