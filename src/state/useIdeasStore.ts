import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { OutputData } from '@editorjs/editorjs'
import { createSeedIdeas, createSeedSeries } from '../data/seed'
import { createChecklistState, createIdea, type NewIdeaInput } from '../lib/ideaFactory'
import { fileStore, MAX_FILE_SIZE } from '../lib/fileStore'
import { stripImageUrls } from '../lib/docImages'
import { migrateTiptapDoc } from '../lib/migrateTiptapDoc'
import { uid } from '../lib/id'
import { debounced, localStorageAdapter } from '../lib/storage'
import { isDone, pipeOf, stageOf } from '../lib/selectors'
import type { ArticleMeta, ChannelDist, Distribution, Idea, Research, Series, StageStatus } from '../types/idea'
import { createEmptyArticleMeta, createEmptyDistribution } from '../lib/ideaFactory'

const ideasStorage = debounced(localStorageAdapter)

interface IdeasState {
  ideas: Idea[]
  series: Series[]

  /** Dev-only: wipes every idea/series/file and reseeds from scratch - see
   * ResetDataButton.tsx. Remove once there's a real backend to reset against. */
  resetData: () => Promise<void>

  addIdea: (input: NewIdeaInput) => Idea
  updateIdea: (id: string, patch: Partial<Idea>) => void
  /** Applies the capture-modal's edit fields; if the pipeline type changed,
   * clamps the stage and resets checklist state for the new type (matches
   * legacy's submit handler, lines 1524-1528). */
  editIdeaFromCapture: (id: string, fields: NewIdeaInput) => void
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

  updateDraft: (ideaId: string, doc: OutputData) => void
  updateOutline: (ideaId: string, doc: OutputData) => void

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

  addTag: (ideaId: string, tag: string) => void
  removeTag: (ideaId: string, tag: string) => void

  addSeries: (name: string) => Series
  updateSeriesName: (seriesId: string, name: string) => void
  updateSeriesDesc: (seriesId: string, desc: string) => void
  deleteSeries: (seriesId: string) => void
  setIdeaSeries: (ideaId: string, seriesId: string | null) => void
  setIdeaPart: (ideaId: string, part: number | null) => void
  reorderSeriesMembers: (seriesId: string, orderedIdeaIds: string[]) => void

  updateMeta: (ideaId: string, patch: Partial<ArticleMeta>) => void
  setCoverFile: (ideaId: string, file: File) => Promise<void>
  setCoverFromBlob: (ideaId: string, blob: Blob) => Promise<void>

  setChannelStatus: (ideaId: string, channel: string, status: ChannelDist['status']) => void
  setChannelField: (ideaId: string, channel: string, field: 'url' | 'date', value: string) => void
  addRepurpose: (ideaId: string, text: string) => void
  removeRepurpose: (ideaId: string, index: number) => void
}

function updateResearch(set: (fn: (s: IdeasState) => Partial<IdeasState>) => void, ideaId: string, updater: (r: Research) => Research) {
  set((s) => ({
    ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, research: updater(i.research) } : i)),
  }))
}

function updateMetaFn(set: (fn: (s: IdeasState) => Partial<IdeasState>) => void, ideaId: string, updater: (m: ArticleMeta) => ArticleMeta) {
  set((s) => ({
    ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, meta: updater(i.meta ?? createEmptyArticleMeta()) } : i)),
  }))
}

function updateDistFn(set: (fn: (s: IdeasState) => Partial<IdeasState>) => void, ideaId: string, updater: (d: Distribution) => Distribution) {
  set((s) => ({
    ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, dist: updater(i.dist ?? createEmptyDistribution()) } : i)),
  }))
}

function blobKeysOf(idea: Idea): string[] {
  const keys: string[] = []
  for (const source of idea.research.sources) if (source.file) keys.push(source.file.key)
  if (idea.meta?.cover) keys.push(idea.meta.cover.key)
  for (const block of idea.draft?.blocks ?? []) {
    const key = (block.data as { file?: { key?: string } } | undefined)?.file?.key
    if (block.type === 'image' && typeof key === 'string') keys.push(key)
  }
  return keys
}

export const useIdeasStore = create<IdeasState>()(
  persist(
    (set, get) => ({
      ideas: createSeedIdeas(),
      series: createSeedSeries(),

      resetData: async () => {
        // The actual reset must never be gated on file cleanup - if
        // fileStore.clear() ever hangs or rejects, ideas/series still need
        // to flip immediately. Blob cleanup is best-effort afterward.
        set({ ideas: createSeedIdeas(), series: createSeedSeries() })
        await fileStore.clear().catch(() => {})
      },

      addIdea: (input) => {
        const idea = createIdea(input)
        set((s) => ({ ideas: [...s.ideas, idea] }))
        return idea
      },

      updateIdea: (id, patch) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
      },

      editIdeaFromCapture: (id, fields) => {
        set((s) => ({
          ideas: s.ideas.map((i) => {
            if (i.id !== id) return i
            const base = {
              ...i,
              title: fields.title,
              summary: fields.summary ?? '',
              link: fields.link ?? '',
              tags: fields.tags ?? [],
              priority: fields.priority ?? i.priority,
            }
            if (fields.type === i.type) return base
            const pipeline = pipeOf({ ...i, type: fields.type })
            return {
              ...base,
              type: fields.type,
              stage: Math.min(i.stage, pipeline.stages.length - 1),
              checklistState: createChecklistState(fields.type),
            }
          }),
        }))
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

      updateDraft: (ideaId, doc) => {
        const stripped = stripImageUrls(doc)
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, draft: stripped } : i)) }))
        get().touchStage(ideaId, 'a-draft')
      },

      updateOutline: (ideaId, doc) => {
        set((s) => ({ ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, outline: doc } : i)) }))
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

      addTag: (ideaId, tag) => {
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === ideaId && !i.tags.includes(tag) && i.tags.length < 12 ? { ...i, tags: [...i.tags, tag] } : i)),
        }))
        get().touchStage(ideaId, 'a-meta')
      },

      removeTag: (ideaId, tag) => {
        set((s) => ({
          ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, tags: i.tags.filter((t) => t !== tag) } : i)),
        }))
      },

      addSeries: (name) => {
        const series: Series = { id: uid(), name, desc: '' }
        set((s) => ({ series: [...s.series, series] }))
        return series
      },

      updateSeriesName: (seriesId, name) => {
        set((s) => ({ series: s.series.map((ser) => (ser.id === seriesId ? { ...ser, name } : ser)) }))
      },

      updateSeriesDesc: (seriesId, desc) => {
        set((s) => ({ series: s.series.map((ser) => (ser.id === seriesId ? { ...ser, desc } : ser)) }))
      },

      deleteSeries: (seriesId) => {
        set((s) => ({
          series: s.series.filter((ser) => ser.id !== seriesId),
          ideas: s.ideas.map((i) => (i.meta?.seriesId === seriesId ? { ...i, meta: { ...i.meta!, seriesId: null, part: null } } : i)),
        }))
      },

      setIdeaSeries: (ideaId, seriesId) => {
        const members = seriesId ? get().ideas.filter((i) => i.meta?.seriesId === seriesId && i.id !== ideaId) : []
        updateMetaFn(set, ideaId, (m) => ({ ...m, seriesId, part: seriesId && !m.part ? members.length + 1 : m.part }))
        get().touchStage(ideaId, 'a-meta')
      },

      setIdeaPart: (ideaId, part) => {
        updateMetaFn(set, ideaId, (m) => ({ ...m, part }))
      },

      reorderSeriesMembers: (_seriesId, orderedIdeaIds) => {
        set((s) => ({
          ideas: s.ideas.map((i) => {
            const part = orderedIdeaIds.indexOf(i.id)
            return part >= 0 && i.meta ? { ...i, meta: { ...i.meta, part: part + 1 } } : i
          }),
        }))
      },

      updateMeta: (ideaId, patch) => {
        updateMetaFn(set, ideaId, (m) => ({ ...m, ...patch }))
        get().touchStage(ideaId, 'a-meta')
      },

      setCoverFile: async (ideaId, file) => {
        if (file.size > MAX_FILE_SIZE) return
        const key = uid()
        await fileStore.put(key, file)
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (idea?.meta?.cover) void fileStore.del(idea.meta.cover.key)
        updateMetaFn(set, ideaId, (m) => ({ ...m, coverMode: 'image', cover: { key }, coverUrl: '' }))
        get().touchStage(ideaId, 'a-meta')
      },

      setCoverFromBlob: async (ideaId, blob) => {
        const key = uid()
        await fileStore.put(key, blob)
        const idea = get().ideas.find((i) => i.id === ideaId)
        if (idea?.meta?.cover) void fileStore.del(idea.meta.cover.key)
        updateMetaFn(set, ideaId, (m) => ({ ...m, coverMode: 'image', cover: { key }, coverUrl: '' }))
        get().touchStage(ideaId, 'a-meta')
      },

      setChannelStatus: (ideaId, channel, status) => {
        updateDistFn(set, ideaId, (d) => ({
          ...d,
          channels: { ...d.channels, [channel]: { ...(d.channels[channel] ?? { status: 'todo', url: '', date: '' }), status } },
        }))
        get().touchStage(ideaId, 'a-distribute')
      },

      setChannelField: (ideaId, channel, field, value) => {
        updateDistFn(set, ideaId, (d) => ({
          ...d,
          channels: {
            ...d.channels,
            [channel]: { ...(d.channels[channel] ?? { status: 'todo', url: '', date: '' }), [field]: value },
          },
        }))
        get().touchStage(ideaId, 'a-distribute')
      },

      addRepurpose: (ideaId, text) => {
        updateDistFn(set, ideaId, (d) => ({ ...d, repurpose: [...d.repurpose, text] }))
        get().touchStage(ideaId, 'a-distribute')
      },

      removeRepurpose: (ideaId, index) => {
        updateDistFn(set, ideaId, (d) => ({ ...d, repurpose: d.repurpose.filter((_, i) => i !== index) }))
      },
    }),
    {
      name: 'prox-ideas-v1',
      storage: createJSONStorage(() => ideasStorage),
      version: 2,
      migrate: (persisted, version) => {
        type LegacyIdea = Idea & { doc?: unknown }
        const state = persisted as { ideas?: LegacyIdea[]; series?: Series[] }
        // v0 -> v1: Idea.doc moved from a Tiptap/ProseMirror document to an
        // Editor.js OutputData document - convert any already-persisted docs
        // instead of silently losing them (see migrateTiptapDoc.ts).
        if (version < 1 && state?.ideas) {
          state.ideas = state.ideas.map((idea) =>
            idea.doc && (idea.doc as { type?: string }).type === 'doc' ? { ...idea, doc: migrateTiptapDoc(idea.doc as OutputData) } : idea,
          )
        }
        // v1 -> v2: the single shared Idea.doc field split into independent
        // `draft` and `outline` fields (Outline is no longer a view over the
        // Draft's headings) - old doc content is intentionally discarded
        // rather than carried over, since it was a product of the removed
        // sync behavior.
        if (version < 2 && state?.ideas) {
          state.ideas = state.ideas.map(({ doc: _doc, ...idea }) => ({
            ...idea,
            draft: idea.type === 'article' ? { blocks: [] } : null,
            outline: idea.type === 'article' ? { blocks: [] } : null,
          }))
        }
        return state as IdeasState
      },
    },
  ),
)
