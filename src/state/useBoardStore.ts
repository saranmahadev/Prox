import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageAdapter } from '../lib/storage'
import type { Priority } from '../types/idea'
import type { PipelineId } from '../types/pipeline'

export interface PipelineFilter {
  priority: Priority[]
  tags: string[]
}

interface BoardState {
  filter: 'all' | PipelineId
  query: string
  perPipelineFilters: Partial<Record<PipelineId, PipelineFilter>>
  openFilterPopover: PipelineId | null

  setFilter: (filter: 'all' | PipelineId) => void
  setQuery: (query: string) => void
  setOpenFilterPopover: (id: PipelineId | null) => void
  toggleFilterPriority: (pipelineId: PipelineId, priority: Priority) => void
  toggleFilterTag: (pipelineId: PipelineId, tag: string) => void
  clearFilter: (pipelineId: PipelineId) => void
  /** Used by the dev-only Reset Data button - a leftover search/filter
   * would otherwise hide the reseeded ideas and look like reset failed. */
  resetFilters: () => void
}

function filterOf(state: BoardState, id: PipelineId): PipelineFilter {
  return state.perPipelineFilters[id] ?? { priority: [], tags: [] }
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      filter: 'all',
      query: '',
      perPipelineFilters: {},
      openFilterPopover: null,

      setFilter: (filter) => set({ filter }),
      setQuery: (query) => set({ query }),
      setOpenFilterPopover: (id) => set({ openFilterPopover: id }),

      toggleFilterPriority: (pipelineId, priority) => {
        const current = filterOf(get(), pipelineId)
        const priorities = current.priority.includes(priority)
          ? current.priority.filter((p) => p !== priority)
          : [...current.priority, priority]
        set((s) => ({
          perPipelineFilters: { ...s.perPipelineFilters, [pipelineId]: { ...current, priority: priorities } },
        }))
      },

      toggleFilterTag: (pipelineId, tag) => {
        const current = filterOf(get(), pipelineId)
        const tags = current.tags.includes(tag) ? current.tags.filter((t) => t !== tag) : [...current.tags, tag]
        set((s) => ({
          perPipelineFilters: { ...s.perPipelineFilters, [pipelineId]: { ...current, tags } },
        }))
      },

      clearFilter: (pipelineId) => {
        set((s) => ({
          perPipelineFilters: { ...s.perPipelineFilters, [pipelineId]: { priority: [], tags: [] } },
        }))
      },

      resetFilters: () => {
        set({ filter: 'all', query: '', perPipelineFilters: {}, openFilterPopover: null })
      },
    }),
    {
      name: 'prox-board-v1',
      storage: createJSONStorage(() => localStorageAdapter),
      partialize: (state) => ({ filter: state.filter, query: state.query, perPipelineFilters: state.perPipelineFilters }),
    },
  ),
)

export function passesPipelineFilter(filter: PipelineFilter | undefined, idea: { priority: Priority; tags: string[] }): boolean {
  if (!filter) return true
  if (filter.priority.length && !filter.priority.includes(idea.priority)) return false
  if (filter.tags.length && !filter.tags.some((t) => idea.tags.includes(t))) return false
  return true
}
