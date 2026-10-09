import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | null

interface UiState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void

  toastMessage: string | null
  toastVisible: boolean
  showToast: (message: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme) {
  const dark = resolveIsDark(theme)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: null,
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggleTheme: () => {
        const isDark = document.documentElement.dataset.theme === 'dark'
        const next: Theme = isDark ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },

      toastMessage: null,
      toastVisible: false,
      showToast: (message) => {
        set({ toastMessage: message, toastVisible: true })
        clearTimeout(toastTimer)
        toastTimer = setTimeout(() => set({ toastVisible: false }), 2400)
      },
    }),
    {
      name: 'prox-ui-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)
