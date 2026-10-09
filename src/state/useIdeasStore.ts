import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createSeedIdeas, createSeedSeries } from '../data/seed'
import { createIdea, type NewIdeaInput } from '../lib/ideaFactory'
import { fileStore } from '../lib/fileStore'
import { localStorageAdapter } from '../lib/storage'
import { isDone, pipeOf, stageOf } from '../lib/selectors'
import type { Idea, Series, StageStatus } from '../types/idea'

interface IdeasState {
  ideas: Idea[]
  series: Series[]

  addIdea: (input: NewIdeaInput) => Idea
  updateIdea: (id: string, patch: Partial<Idea>) => void
  deleteIdea: (id: string) => void

  setChecklistItem: (ideaId: string, stageId: string, itemId: string, checked: boolean) => void
  setStageStatus: (ideaId: string, stageId: string, status: StageStatus) => void
  advanceStage: (ideaId: string) => void
  goToStage: (ideaId: string, stageIndex: number) => void

  archiveIdea: (id: string) => void
  restoreIdea: (id: string) => void
}

function blobKeysOf(idea: Idea): string[] {
  const keys: string[] = []
  for (const source of idea.research.sources) if (source.file) keys.push(source.file.key)
  if (idea.meta?.cover) keys.push(idea.meta.cover.key)
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }
    if (n.type === 'image' && typeof n.attrs?.fileKey === 'string') keys.push(n.attrs.fileKey)
    n.content?.forEach(walk)
  }
  walk(idea.doc)
  return keys
}

export const useIdeasStore = create<IdeasState>()(
  persist(
    (set, get) => ({
      ideas: createSeedIdeas(),
      series: createSeedSeries(),

      addIdea: (input) => {
        const idea = createIdea(input)
        set((s) => ({ ideas: [...s.ideas, idea] }))
        return idea
      },

      updateIdea: (id, patch) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
      },

      deleteIdea: (id) => {
        const idea = get().ideas.find((i) => i.id === id)
        if (!idea) return
        blobKeysOf(idea).forEach((k) => void fileStore.del(k))
        set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) }))
      },

      setChecklistItem: (ideaId, stageId, itemId, checked) => {
        set((s) => ({
          ideas: s.ideas.map((i) => {
            if (i.id !== ideaId) return i
            const items = (i.checklistState[stageId] ?? []).map((it) => (it.id === itemId ? { ...it, checked } : it))
            return { ...i, checklistState: { ...i.checklistState, [stageId]: items } }
          }),
        }))
      },

      setStageStatus: (ideaId, stageId, status) => {
        set((s) => ({
          ideas: s.ideas.map((i) => {
            if (i.id !== ideaId) return i
            if (stageId === 'research') return { ...i, research: { ...i.research, status } }
            return { ...i, stageStatus: { ...i.stageStatus, [stageId]: status } }
          }),
        }))
      },

      advanceStage: (ideaId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea) return
        const stage = stageOf(idea)
        const items = idea.checklistState[stage.id]
        if (items?.length) {
          get().updateIdea(ideaId, {
            checklistState: { ...idea.checklistState, [stage.id]: items.map((it) => ({ ...it, checked: true })) },
          })
        }
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, stage: i.stage + 1 } : i)) }))
      },

      goToStage: (ideaId, stageIndex) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea) return
        const maxStage = pipeOf(idea).stages.length - 1
        const clamped = Math.max(0, Math.min(stageIndex, maxStage))
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, stage: clamped } : i)) }))
      },

      archiveIdea: (id) => {
        const idea = get().ideas.find((i) => i.id === id)
        if (!idea || !isDone(idea)) return
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, archived: true, archivedAt: Date.now() } : i)),
        }))
      },

      restoreIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === id ? { ...i, archived: false, archivedAt: null } : i)),
        }))
      },
    }),
    {
      name: 'prox-ideas-v1',
      storage: createJSONStorage(() => localStorageAdapter),
    },
  ),
)
