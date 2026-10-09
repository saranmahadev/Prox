import type { JSONContent } from '@tiptap/core'
import { createEmptyArticleMeta, createEmptyDistribution, createEmptyResearch, createIdea } from '../lib/ideaFactory'
import { uid } from '../lib/id'
import type { Idea, Series } from '../types/idea'

/* Ported from legacy/index.html's seed()/SEED_DOC() (lines 1329-1357). */

function seedDoc(): JSONContent {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why soft UI feels friendly' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Rounded shapes and gentle shadows make an interface feel ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'approachable' },
          { type: 'text', text: '. People read it as safe to touch.' },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Keeping it accessible' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Contrast first' }] },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Soft shadows are decoration. Text still needs a 4.5:1 contrast ratio against its background.',
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'If it only works when you squint, it does not work.' }],
          },
        ],
      },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Conclusion' }] },
      { type: 'paragraph' },
    ],
  }
}

function publishedDoc(): JSONContent {
  return {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Start with the reader' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Good docs answer one question per page.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Show, then tell' }] },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'An example beats a paragraph of explanation.' }],
      },
    ],
  }
}

export function createSeedSeries(): Series[] {
  return [
    {
      id: 'ser1',
      name: 'Design for Humans',
      desc: 'Interface ideas that respect the people using them.',
    },
  ]
}

export function createSeedIdeas(): Idea[] {
  const a1 = createIdea({
    type: 'article',
    title: 'Why claymorphism works for dashboards',
    summary: 'Soft 3D UI and how to keep it accessible.',
    tags: ['design', 'ui'],
    priority: 'med',
  })
  a1.stage = 3
  a1.research = {
    sources: [{ id: uid(), kind: 'link', url: 'https://www.w3.org/WAI/WCAG22/quickref/', title: 'WCAG quick reference', note: 'Contrast rules', file: null }],
    insights: [{ id: uid(), text: 'Soft shadows need a 4.5:1 text contrast to stay readable', sourceId: null }],
    questions: [{ id: uid(), text: 'Does it work in dark mode?', status: 'answered', answer: 'Yes, with inverted shadows' }],
    status: 'reviewed',
  }
  a1.stageStatus = { 'a-outline': 'reviewed', 'a-draft': 'doing' }
  a1.doc = seedDoc()
  a1.meta = { ...createEmptyArticleMeta(), seriesId: 'ser1', part: 2, author: 'Dev', lang: 'en', toc: true }

  const a2 = createIdea({
    type: 'article',
    title: 'Docs people actually read',
    summary: 'Structure tips from real onboarding docs.',
    tags: ['writing'],
    priority: 'low',
  })
  a2.stage = 6
  a2.stageStatus = { 'a-outline': 'reviewed', 'a-draft': 'reviewed', 'a-meta': 'reviewed', 'a-distribute': 'reviewed' }
  a2.doc = publishedDoc()
  a2.meta = { ...createEmptyArticleMeta(), seriesId: 'ser1', part: 1, author: 'Dev', lang: 'en' }
  a2.dist = {
    ...createEmptyDistribution(),
    channels: { blog: { status: 'posted', url: 'https://example.com/docs-people-read', date: '' } },
    repurpose: ['Carousel: 5 doc mistakes'],
  }

  const v1 = createIdea({
    type: 'video',
    title: 'Build a content pipeline with Obsidian',
    summary: 'Walkthrough of this whole workflow.',
    tags: ['workflow', 'obsidian'],
    priority: 'high',
  })
  v1.stage = 1
  v1.research = {
    ...createEmptyResearch(),
    sources: [
      { id: uid(), kind: 'link', url: 'https://help.obsidian.md', title: '', note: 'Official docs for plugins', file: null },
      { id: uid(), kind: 'doc', url: '', title: 'Notion: Q4 content plan', note: '', file: null },
    ],
    insights: [{ id: uid(), text: 'Viewers drop off when setup takes more than two minutes', sourceId: null }],
    questions: [
      { id: uid(), text: 'Which plugins are essential for beginners?', status: 'open', answer: '' },
      { id: uid(), text: 'Does the vault need a sync service?', status: 'answered', answer: 'No, a synced folder is enough' },
    ],
    status: 'doing',
  }

  const s1 = createIdea({
    type: 'short',
    title: '3 Excalidraw tricks in 30s',
    summary: 'Quick tips for cleaner diagrams.',
    tags: ['excalidraw'],
    priority: 'med',
  })

  const p1 = createIdea({
    type: 'podcast',
    title: 'Talk with Dev: an open-source maintainer',
    summary: 'Burnout, funding and community.',
    tags: ['oss'],
    priority: 'high',
  })
  p1.stage = 4

  const a3 = createIdea({
    type: 'article',
    title: 'A tour of my Obsidian vault',
    summary: 'How notes, templates and plugins fit together.',
    tags: ['obsidian'],
    priority: 'med',
  })
  a3.stage = 6
  a3.archived = true
  a3.archivedAt = Date.now() - 864e6

  const v2 = createIdea({
    type: 'video',
    title: 'Setting up OBS for tutorials',
    summary: 'Scenes, audio and recording settings.',
    tags: ['obs', 'setup'],
    priority: 'low',
  })
  v2.stage = 6
  v2.archived = true
  v2.archivedAt = Date.now() - 2592e6

  const p2 = createIdea({
    type: 'podcast',
    title: 'Talk with Dev: freelancing basics',
    summary: 'Pricing, clients and burnout.',
    tags: ['career'],
    priority: 'med',
  })
  p2.stage = 6
  p2.archived = true
  p2.archivedAt = Date.now() - 1296e6

  const c1 = createIdea({
    type: 'course',
    title: 'Scratch with Dev: Python from zero',
    summary: 'Project-based beginner course.',
    tags: ['python', 'course'],
    priority: 'high',
  })
  c1.stage = 2

  const n1 = createIdea({
    type: 'newsletter',
    title: '5 tools that fixed my content workflow',
    summary: 'A curated roundup of the apps and tricks saving me hours each week.',
    tags: ['tools', 'workflow'],
    priority: 'med',
  })
  n1.stage = 3

  const cr1 = createIdea({
    type: 'carousel',
    title: '7 Obsidian plugins I actually use daily',
    summary: 'A swipe-through carousel breaking down my core plugin stack.',
    tags: ['obsidian', 'plugins'],
    priority: 'med',
  })
  cr1.stage = 2

  const pr1 = createIdea({
    type: 'products',
    title: 'Obsidian Content OS template',
    summary: 'A ready-made Notion/Obsidian vault for planning and publishing content.',
    tags: ['notion', 'template'],
    priority: 'high',
  })
  pr1.stage = 4

  return [a1, a2, v1, s1, p1, a3, v2, p2, c1, n1, cr1, pr1]
}
