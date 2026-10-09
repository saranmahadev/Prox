/**
 * The 4-state progress enum shared by the Research stage and every
 * article "tool" stage (outline/draft/meta/distribute). Order matters -
 * it's also the display order in the StatusTracker.
 */
export const STAGE_STATUS_STEPS = [
  ['todo', 'Yet to Begin'],
  ['doing', 'In Progress'],
  ['done', 'Completed'],
  ['reviewed', 'Reviewed'],
] as const

export type StageStatus = (typeof STAGE_STATUS_STEPS)[number][0]
