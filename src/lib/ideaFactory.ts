import { uid } from './id'
import { getPipeline } from '../data/pipelines'
import type { ArticleMeta, ChecklistItem, Distribution, Idea, Research } from '../types/idea'
import type { PipelineId } from '../types/pipeline'

/** Eager (non-lazy) checklist state for every stage of a pipeline, all unchecked. */
export function createChecklistState(pipelineId: PipelineId): Record<string, ChecklistItem[]> {
  const pipeline = getPipeline(pipelineId)
  const state: Record<string, ChecklistItem[]> = {}
  for (const stage of pipeline.stages) {
    state[stage.id] = stage.checklist.map((label) => ({ id: uid(), label, checked: false }))
  }
  return state
}

export function createEmptyResearch(): Research {
  return { sources: [], insights: [], questions: [], status: 'todo' }
}

export function createEmptyDistribution(): Distribution {
  return { channels: {}, repurpose: [] }
}

export function createEmptyArticleMeta(): ArticleMeta {
  return {
    seriesId: null,
    part: null,
    author: '',
    lang: 'en',
    toc: false,
    seoTitle: '',
    description: '',
    slug: '',
    canonical: '',
    category: '',
    publishAt: '',
    coverUrl: '',
    coverAlt: '',
    cover: null,
  }
}

export interface NewIdeaInput {
  type: PipelineId
  title: string
  summary?: string
  link?: string
  tags?: string[]
  priority?: Idea['priority']
}

/** The single source of truth for "what does a freshly created idea look like" -
 * used by both the seed data and the capture modal. */
export function createIdea(input: NewIdeaInput): Idea {
  const isArticle = input.type === 'article'
  return {
    id: uid(),
    type: input.type,
    title: input.title,
    summary: input.summary ?? '',
    link: input.link ?? '',
    tags: input.tags ?? [],
    priority: input.priority ?? 'med',
    stage: 0,
    checklistState: createChecklistState(input.type),
    created: Date.now(),
    archived: false,
    archivedAt: null,
    research: createEmptyResearch(),
    stageStatus: {},
    doc: isArticle ? { blocks: [] } : null,
    meta: isArticle ? createEmptyArticleMeta() : null,
    dist: isArticle ? createEmptyDistribution() : null,
  }
}
