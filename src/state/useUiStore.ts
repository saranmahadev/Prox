import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PipelineId } from '../types/pipeline'

export type Theme = 'light' | 'dark' | null

export type DrawerState =
  | { mode: 'idea'; ideaId: string }
  | { mode: 'guide'; pipelineId: PipelineId; stageIndex: number }

interface UiState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void

  toastMessage: string | null
  toastVisible: boolean
  showToast: (message: string) => void

  drawer: DrawerState | null
  openIdea: (ideaId: string) => void
  openGuide: (pipelineId: PipelineId, stageIndex: number) => void
  closeDrawer: () => void
  setGuideStageIndex: (stageIndex: number) => void

  focusMode: boolean
  toggleFocusMode: () => void
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

      drawer: null,
      openIdea: (ideaId) => set({ drawer: { mode: 'idea', ideaId } }),
      openGuide: (pipelineId, stageIndex) => set({ drawer: { mode: 'guide', pipelineId, stageIndex } }),
      closeDrawer: () => set({ drawer: null, focusMode: false }),
      setGuideStageIndex: (stageIndex) =>
        set((s) => (s.drawer?.mode === 'guide' ? { drawer: { ...s.drawer, stageIndex } } : {})),

      focusMode: false,
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
    }),
    {
      name: 'prox-ui-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)
