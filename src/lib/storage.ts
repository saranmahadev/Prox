/**
 * Minimal storage abstraction so Zustand's `persist` middleware can be
 * pointed at localStorage now and swapped for a Tauri-backed adapter later
 * without touching the stores themselves.
 */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const localStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
}

/**
 * Debounces writes per key (trailing edge, 250ms - matches legacy's
 * saveSoon()). High-frequency updates like typing in the draft editor or
 * outline would otherwise write the whole persisted blob to localStorage
 * on every keystroke.
 */
export function debounced(adapter: StorageAdapter, delayMs = 250): StorageAdapter {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  return {
    getItem: (key) => adapter.getItem(key),
    removeItem: (key) => adapter.removeItem(key),
    setItem: (key, value) => {
      clearTimeout(timers.get(key))
      timers.set(
        key,
        setTimeout(() => adapter.setItem(key, value), delayMs),
      )
    },
  }
}
