import { getPipeline } from '../data/pipelines'
import { STAGE_STATUS_STEPS } from '../types/idea'
import type { Idea, StageStatus } from '../types/idea'
import type { Pipeline, Stage } from '../types/pipeline'
import { TOOL_STAGE_IDS } from '../types/pipeline'

/** True for 'research' and the 4 article "tool" stages: stages tracked via
 * the 4-state StatusTracker instead of a checklist. */
export function isStatusTrackedStage(stageId: string): boolean {
  return stageId === 'research' || (TOOL_STAGE_IDS as readonly string[]).includes(stageId)
}

export function stageStatusOf(idea: Idea, stageId: string): StageStatus {
  return stageId === 'research' ? idea.research.status : idea.stageStatus[stageId] ?? 'todo'
}

/* Ported from legacy/index.html's helpers (lines 1362-1372), adapted to the
 * typed/eager Idea model (no positional `checks` array - checklistState is
 * keyed by stable item id). */

export function pipeOf(idea: Idea): Pipeline {
  return getPipeline(idea.type)
}

export function stageOf(idea: Idea): Stage {
  const pipeline = pipeOf(idea)
  return pipeline.stages[Math.min(idea.stage, pipeline.stages.length - 1)]
}

export function isDone(idea: Idea): boolean {
  return idea.stage >= pipeOf(idea).stages.length - 1
}

function statusIndex(status: string): number {
  return Math.max(0, STAGE_STATUS_STEPS.findIndex(([k]) => k === status))
}

export function researchFraction(idea: Idea): number {
  return statusIndex(idea.research.status) / (STAGE_STATUS_STEPS.length - 1)
}

export function stageFraction(idea: Idea, stage: Stage): number {
  if (stage.id === 'research') return researchFraction(idea)
  if ((TOOL_STAGE_IDS as readonly string[]).includes(stage.id)) {
    return statusIndex(idea.stageStatus[stage.id] ?? 'todo') / 3
  }
  if (!stage.checklist.length) return 1
  const items = idea.checklistState[stage.id] ?? []
  if (!items.length) return 1
  return items.filter((it) => it.checked).length / items.length
}

export function progress(idea: Idea): number {
  const pipeline = pipeOf(idea)
  const n = pipeline.stages.length - 1
  if (isDone(idea)) return 1
  return (idea.stage + stageFraction(idea, stageOf(idea))) / n
}

export function liveIdeas(ideas: Idea[]): Idea[] {
  return ideas.filter((i) => !i.archived)
}

export function archivedIdeas(ideas: Idea[]): Idea[] {
  return ideas.filter((i) => i.archived)
}

/** Ported from legacy's inSeries(): other articles in the same series,
 * ordered by part. */
export function seriesMembers(ideas: Idea[], seriesId: string): Idea[] {
  return ideas
    .filter((i) => i.type === 'article' && i.meta?.seriesId === seriesId)
    .sort((a, b) => (a.meta!.part ?? 999) - (b.meta!.part ?? 999) || a.title.localeCompare(b.title))
}

export function matchesQuery(idea: Idea, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${idea.title} ${idea.summary} ${idea.tags.join(' ')}`.toLowerCase().includes(q)
}
