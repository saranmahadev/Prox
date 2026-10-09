import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { JSONContent } from '@tiptap/core'
import { createSeedIdeas, createSeedSeries } from '../data/seed'
import { createIdea, type NewIdeaInput } from '../lib/ideaFactory'
import { fileStore, MAX_FILE_SIZE } from '../lib/fileStore'
import { stripImageUrls } from '../lib/docImages'
import { uid } from '../lib/id'
import { debounced, localStorageAdapter } from '../lib/storage'
import { isDone, pipeOf, stageOf } from '../lib/selectors'
import type { Idea, Research, Series, StageStatus } from '../types/idea'

const ideasStorage = debounced(localStorageAdapter)

interface IdeasState {
  ideas: Idea[]
  series: Series[]

  addIdea: (input: NewIdeaInput) => Idea
  updateIdea: (id: string, patch: Partial<Idea>) => void
  deleteIdea: (id: string) => void

  setChecklistItem: (ideaId: string, stageId: string, itemId: string, checked: boolean) => void
  setStageStatus: (ideaId: string, stageId: string, status: StageStatus) => void
  /** Bumps a tool stage's status from 'todo' to 'doing' the first time its content is edited. */
  touchStage: (ideaId: string, stageId: string) => void
  advanceStage: (ideaId: string) => void
  goToStage: (ideaId: string, stageIndex: number) => void
  goBackStage: (ideaId: string) => void

  archiveIdea: (id: string) => void
  restoreIdea: (id: string) => void

  updateDraftDoc: (ideaId: string, doc: JSONContent) => void
  updateOutlineDoc: (ideaId: string, doc: JSONContent) => void

  addSourceLink: (ideaId: string, url: string, title: string) => void
  addSourceDoc: (ideaId: string, title: string) => void
  addSourceFiles: (ideaId: string, files: File[]) => Promise<{ added: number; skipped: number }>
  removeSource: (ideaId: string, sourceId: string) => void
  updateSourceNote: (ideaId: string, sourceId: string, note: string) => void
  addInsight: (ideaId: string, text: string, sourceId: string | null) => void
  removeInsight: (ideaId: string, insightId: string) => void
  addQuestion: (ideaId: string, text: string) => void
  removeQuestion: (ideaId: string, questionId: string) => void
  setQuestionAnswered: (ideaId: string, questionId: string, answered: boolean) => void
  updateQuestionAnswer: (ideaId: string, questionId: string, answer: string) => void
}

function updateResearch(set: (fn: (s: IdeasState) => Partial<IdeasState>) => void, ideaId: string, updater: (r: Research) => Research) {
  set((s) => ({
    ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, research: updater(i.research) } : i)),
  }))
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

      touchStage: (ideaId, stageId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (idea && (idea.stageStatus[stageId] ?? 'todo') === 'todo') {
          get().setStageStatus(ideaId, stageId, 'doing')
        }
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
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, stage: i.stage + 1, archived: false, archivedAt: null } : i)),
        }))
      },

      goToStage: (ideaId, stageIndex) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea) return
        const maxStage = pipeOf(idea).stages.length - 1
        const clamped = Math.max(0, Math.min(stageIndex, maxStage))
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, stage: clamped, archived: false, archivedAt: null } : i)),
        }))
      },

      goBackStage: (ideaId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (!idea || idea.stage <= 0) return
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, stage: i.stage - 1, archived: false, archivedAt: null } : i)),
        }))
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

      updateDraftDoc: (ideaId, doc) => {
        const stripped = stripImageUrls(doc)
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, doc: stripped } : i)) }))
        get().touchStage(ideaId, 'a-draft')
      },

      updateOutlineDoc: (ideaId, doc) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, doc } : i)) }))
        get().touchStage(ideaId, 'a-outline')
      },

      addSourceLink: (ideaId, url, title) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          sources: [...r.sources, { id: uid(), kind: 'link', url, title, note: '', file: null }],
          status: r.status === 'todo' ? 'doing' : r.status,
        }))
      },

      addSourceDoc: (ideaId, title) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          sources: [...r.sources, { id: uid(), kind: 'doc', url: '', title, note: '', file: null }],
          status: r.status === 'todo' ? 'doing' : r.status,
        }))
      },

      addSourceFiles: async (ideaId, files) => {
        let added = 0
        let skipped = 0
        for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
            skipped++
            continue
          }
          const key = uid()
          await fileStore.put(key, file)
          updateResearch(set, ideaId, (r) => ({
            ...r,
            sources: [
              ...r.sources,
              {
                id: uid(),
                kind: 'doc',
                url: '',
                title: file.name,
                note: '',
                file: { key, name: file.name, size: file.size, type: file.type || '' },
              },
            ],
            status: r.status === 'todo' ? 'doing' : r.status,
          }))
          added++
        }
        return { added, skipped }
      },

      removeSource: (ideaId, sourceId) => {
        const idea = get().ideas.find((i) => i.id === ideaId)
        const source = idea?.research.sources.find((s) => s.id === sourceId)
        if (source?.file) void fileStore.del(source.file.key)
        updateResearch(set, ideaId, (r) => ({
          ...r,
          sources: r.sources.filter((s) => s.id !== sourceId),
          insights: r.insights.map((n) => (n.sourceId === sourceId ? { ...n, sourceId: null } : n)),
        }))
      },

      updateSourceNote: (ideaId, sourceId, note) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          sources: r.sources.map((s) => (s.id === sourceId ? { ...s, note } : s)),
        }))
      },

      addInsight: (ideaId, text, sourceId) => {
        updateResearch(set, ideaId, (r) => ({ ...r, insights: [...r.insights, { id: uid(), text, sourceId }] }))
      },

      removeInsight: (ideaId, insightId) => {
        updateResearch(set, ideaId, (r) => ({ ...r, insights: r.insights.filter((n) => n.id !== insightId) }))
      },

      addQuestion: (ideaId, text) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          questions: [...r.questions, { id: uid(), text, status: 'open', answer: '' }],
        }))
      },

      removeQuestion: (ideaId, questionId) => {
        updateResearch(set, ideaId, (r) => ({ ...r, questions: r.questions.filter((q) => q.id !== questionId) }))
      },

      setQuestionAnswered: (ideaId, questionId, answered) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          questions: r.questions.map((q) => (q.id === questionId ? { ...q, status: answered ? 'answered' : 'open' } : q)),
        }))
      },

      updateQuestionAnswer: (ideaId, questionId, answer) => {
        updateResearch(set, ideaId, (r) => ({
          ...r,
          questions: r.questions.map((q) => (q.id === questionId ? { ...q, answer } : q)),
        }))
      },
    }),
    {
      name: 'prox-ideas-v1',
      storage: createJSONStorage(() => ideasStorage),
    },
  ),
)
