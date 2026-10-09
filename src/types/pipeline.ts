export type PipelineId =
  | 'article'
  | 'newsletter'
  | 'video'
  | 'short'
  | 'carousel'
  | 'workshop'
  | 'podcast'
  | 'course'
  | 'products'

export interface Stage {
  id: string
  title: string
  icon: string
  summary: string
  checklist: string[]
  tools: string[]
  deliverable: string
  time: string
  refine: string
  final?: boolean
}

export interface Pipeline {
  id: PipelineId
  name: string
  sub: string
  icon: string
  color: PipelineId // the CSS custom-property name to use for this pipeline's accent, e.g. var(--article)
  outputs: string[]
  stages: Stage[]
}

/** Ids of the 4 article-only "tool" stages with bespoke UI (not generic checklists). */
export const TOOL_STAGE_IDS = ['a-outline', 'a-draft', 'a-meta', 'a-distribute'] as const
export type ToolStageId = (typeof TOOL_STAGE_IDS)[number]
