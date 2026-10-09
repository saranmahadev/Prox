import type { OutputData } from '@editorjs/editorjs'
import { createIdea } from '../lib/ideaFactory'
import { uid } from '../lib/id'
import type { Idea, Series } from '../types/idea'
import type { PipelineId } from '../types/pipeline'

/**
 * Dev-only seed data: exactly one idea per pipeline, so every stage/view in
 * the app can be exercised without first clicking through Capture every
 * time. The "article" idea starts a few stages in with real outline/draft
 * content, since Outline <-> Draft sync needs something to sync. Reset via
 * the Reset Data button in the board header (ResetDataButton.tsx) - see
 * useIdeasStore's resetData action.
 */

function seedDoc(): OutputData {
  return {
    time: Date.now(),
    blocks: [
      { type: 'header', data: { text: 'Why soft UI feels friendly', level: 2 } },
      { type: 'paragraph', data: { text: 'Rounded shapes and gentle shadows make an interface feel <b>approachable</b>. People read it as safe to touch.' } },
      { type: 'header', data: { text: 'Keeping it accessible', level: 2 } },
      { type: 'header', data: { text: 'Contrast first', level: 3 } },
      { type: 'paragraph', data: { text: 'Soft shadows are decoration. Text still needs a 4.5:1 contrast ratio against its background.' } },
      { type: 'quote', data: { text: 'If it only works when you squint, it does not work.', caption: '' } },
      { type: 'header', data: { text: 'Conclusion', level: 2 } },
      { type: 'paragraph', data: { text: '' } },
    ],
  }
}

export function createSeedSeries(): Series[] {
  return []
}

interface SeedSpec {
  type: PipelineId
  title: string
  summary: string
  tags: string[]
}

const SEED_SPECS: SeedSpec[] = [
  { type: 'article', title: 'Test article', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'newsletter', title: 'Test newsletter', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'video', title: 'Test video', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'short', title: 'Test short', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'carousel', title: 'Test carousel', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'workshop', title: 'Test workshop', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'podcast', title: 'Test podcast', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'course', title: 'Test course', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
  { type: 'products', title: 'Test product', summary: 'One sample idea per pipeline, for testing every stage.', tags: ['test'] },
]

export function createSeedIdeas(): Idea[] {
  return SEED_SPECS.map((spec) => {
    const idea = createIdea({ type: spec.type, title: spec.title, summary: spec.summary, tags: spec.tags, priority: 'med' })
    if (spec.type === 'article') {
      idea.stage = 3 // a-draft - lands straight on the stage this is meant to test
      idea.research = {
        sources: [{ id: uid(), kind: 'link', url: 'https://www.w3.org/WAI/WCAG22/quickref/', title: 'WCAG quick reference', note: 'Contrast rules', file: null }],
        insights: [{ id: uid(), text: 'Soft shadows need a 4.5:1 text contrast to stay readable', sourceId: null }],
        questions: [],
        status: 'doing',
      }
      idea.doc = seedDoc()
    }
    return idea
  })
}
