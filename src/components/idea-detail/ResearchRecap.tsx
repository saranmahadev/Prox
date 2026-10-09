import { STAGE_STATUS_STEPS } from '../../types/idea'
import { SourceRow } from './research/SourceRow'
import { InsightRow } from './research/InsightRow'
import { QuestionRow } from './research/QuestionRow'
import type { Idea } from '../../types/idea'

interface ResearchRecapProps {
  idea: Idea
}

/** Collapsed read-only research recap shown on later stages. Ported from
 * legacy's researchRO() (lines 861-868). */
export function ResearchRecap({ idea }: ResearchRecapProps) {
  const r = idea.research
  const hasAny = r.sources.length || r.insights.length || r.questions.length
  if (!hasAny) return null

  const openQuestions = r.questions.filter((q) => q.status !== 'answered').length
  const statusLabel = STAGE_STATUS_STEPS.find(([k]) => k === r.status)?.[1] ?? r.status

  return (
    <details className="blk rs-ro">
      <summary>
        Research · {r.sources.length} sources · {r.insights.length} insights · {openQuestions} open questions · {statusLabel}
      </summary>
      {r.sources.length > 0 && (
        <>
          <h6>Sources</h6>
          <ul className="rs-list">
            {r.sources.map((s) => (
              <SourceRow key={s.id} source={s} readOnly />
            ))}
          </ul>
        </>
      )}
      {r.insights.length > 0 && (
        <>
          <h6>Insights</h6>
          <ul className="rs-list">
            {r.insights.map((n) => (
              <InsightRow key={n.id} insight={n} sources={r.sources} readOnly />
            ))}
          </ul>
        </>
      )}
      {r.questions.length > 0 && (
        <>
          <h6>Questions</h6>
          <ul className="rs-list">
            {r.questions.map((q) => (
              <QuestionRow key={q.id} question={q} readOnly />
            ))}
          </ul>
        </>
      )}
    </details>
  )
}
