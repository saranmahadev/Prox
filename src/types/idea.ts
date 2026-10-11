import type { OutputData } from '@editorjs/editorjs'
import type { PipelineId } from './pipeline'

/**
 * The 4-state progress enum shared by the Research stage and every
 * article "tool" stage (outline/draft/meta/distribute). Order matters -
 * it drives the progress fraction in selectors.ts (statusIndex) and the
 * status label shown in ResearchRecap.
 */
export const STAGE_STATUS_STEPS = [
  ['todo', 'Yet to Begin'],
  ['doing', 'In Progress'],
  ['done', 'Completed'],
  ['reviewed', 'Reviewed'],
] as const

export type StageStatus = (typeof STAGE_STATUS_STEPS)[number][0]

export type Priority = 'high' | 'med' | 'low'

export type ArchiveSort = 'new' | 'old' | 'az' | 'pri'

/** A single checklist item with a stable id (not a positional index - see
 * the plan's note on why the legacy `checks[stageId] = [bool, bool, ...]`
 * positional array is fragile). */
export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

export interface UploadedFile {
  key: string // fileStore blob key
  name: string
  size: number
  type: string
}

export interface Source {
  id: string
  kind: 'link' | 'doc'
  url: string
  title: string
  note: string
  file: UploadedFile | null
}

export interface Insight {
  id: string
  text: string
  sourceId: string | null
}

export interface Question {
  id: string
  text: string
  status: 'open' | 'answered'
  answer: string
}

export interface Research {
  sources: Source[]
  insights: Insight[]
  questions: Question[]
  status: StageStatus
}

export interface ChannelDist {
  status: 'todo' | 'scheduled' | 'posted'
  url: string
  date: string
}

export interface Distribution {
  channels: Record<string, ChannelDist>
  repurpose: string[]
}

/** Blog's typographic cover (Imaxt): a giant word, number, quote or
 * stacked title set in the post's series colour - the site's default
 * cover style. Mirrors Blog's `imaxtCover` frontmatter schema exactly. */
export interface TypographicCover {
  kind: 'word' | 'stat' | 'quote' | 'stack'
  text: string
  sub: string
}

export interface ArticleMeta {
  seriesId: string | null
  part: number | null
  author: string
  lang: string
  toc: boolean
  seoTitle: string
  description: string
  slug: string
  canonical: string
  category: string
  publishAt: string
  /** Which cover this article publishes with. 'typographic' is Blog's
   * convention; 'image' is schema-legal but off-convention there. */
  coverMode: 'typographic' | 'image'
  typographicCover: TypographicCover
  coverUrl: string
  coverAlt: string
  cover: { key: string } | null
}

export interface Idea {
  id: string
  type: PipelineId
  title: string
  summary: string
  link: string
  tags: string[]
  priority: Priority
  stage: number // index into pipeline.stages[]

  checklistState: Record<string, ChecklistItem[]> // keyed by stage id
  created: number
  archived: boolean
  archivedAt: number | null

  research: Research
  stageStatus: Record<string, StageStatus> // keyed by "tool stage" id

  draft: OutputData | null // Editor.js document - the article body, article pipeline only
  outline: OutputData | null // Editor.js document - free-form planning notes, article pipeline only
  meta: ArticleMeta | null // article pipeline only
  dist: Distribution | null // article pipeline only
}

export interface Series {
  id: string
  name: string
  desc: string
}
