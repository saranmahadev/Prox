import {
  attachCodeWalk,
  attachScrolly,
  attachStatCountUp,
  attachTicker,
  attachTypeLab,
  renderBanner,
  renderBars,
  renderCallout,
  renderChangelog,
  renderChecklist,
  renderCodeWalk,
  renderCompare,
  renderCurvedText,
  renderDelta,
  renderDiff,
  renderDropCap,
  renderErrorBox,
  renderFaq,
  renderFileTree,
  renderFootnote,
  renderFormula,
  renderFunnel,
  renderGauge,
  renderGlossary,
  renderHeatmap,
  renderMarquee,
  renderMatrix,
  renderPullQuote,
  renderRanked,
  renderRedacted,
  renderScorecard,
  renderScrolly,
  renderSidenote,
  renderSparkline,
  renderStamp,
  renderStatRow,
  renderStatement,
  renderSteps,
  renderTakeaways,
  renderTerminal,
  renderTicker,
  renderTimeline,
  renderTypeLab,
  renderVersus,
} from '@inflate-ai/imaxt-core'

/**
 * Maps every Editor.js block type registered via imaxt-editorjs's `imaxtTools`
 * (keyed by that same camelCase tool name) to the imaxt-core render function
 * that turns its saved data into the exact HTML Blog's Astro build would emit.
 * Used so Prox's draft preview shows blocks exactly as they will publish.
 */
// Each imaxt-core render* function takes its own specific *Data type; a
// shared signature here just needs "some data object in, HTML string out".
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IMAXT_RENDERERS: Record<string, (data: any) => string> = {
  banner: renderBanner,
  bars: renderBars,
  callout: renderCallout,
  changelog: renderChangelog,
  checklist: renderChecklist,
  codeWalk: renderCodeWalk,
  compare: renderCompare,
  curvedText: renderCurvedText,
  delta: renderDelta,
  diff: renderDiff,
  dropCap: renderDropCap,
  errorBox: renderErrorBox,
  faq: renderFaq,
  fileTree: renderFileTree,
  footnote: renderFootnote,
  formula: renderFormula,
  funnel: renderFunnel,
  gauge: renderGauge,
  glossary: renderGlossary,
  heatmap: renderHeatmap,
  marquee: renderMarquee,
  matrix: renderMatrix,
  pullQuote: renderPullQuote,
  ranked: renderRanked,
  redacted: renderRedacted,
  scorecard: renderScorecard,
  scrolly: renderScrolly,
  sidenote: renderSidenote,
  sparkline: renderSparkline,
  stamp: renderStamp,
  statRow: renderStatRow,
  statement: renderStatement,
  steps: renderSteps,
  takeaways: renderTakeaways,
  terminal: renderTerminal,
  ticker: renderTicker,
  timeline: renderTimeline,
  typeLab: renderTypeLab,
  versus: renderVersus,
}

/** Block types whose rendered HTML needs a post-mount hydration pass
 * (count-up numbers, scroll-synced steps, marquee/ticker motion, the font
 * lab's live sample) to behave as it will once Astro ships it. */
const IMAXT_ATTACHERS: Record<string, (root: HTMLElement) => () => void> = {
  codeWalk: attachCodeWalk,
  scrolly: attachScrolly,
  statRow: attachStatCountUp,
  ticker: attachTicker,
  typeLab: attachTypeLab,
}

export function isImaxtBlockType(type: string): boolean {
  return type in IMAXT_RENDERERS
}

export function renderImaxtBlock(type: string, data: unknown): string | null {
  const render = IMAXT_RENDERERS[type]
  return render ? render(data) : null
}

/** Runs every applicable attach* hydrator inside `root` and returns a single
 * cleanup function that tears all of them down. Call after the HTML from
 * renderImaxtBlock() has been mounted into the DOM. */
export function hydrateImaxtBlocks(root: HTMLElement): () => void {
  const cleanups = Object.values(IMAXT_ATTACHERS).map((attach) => attach(root))
  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}
