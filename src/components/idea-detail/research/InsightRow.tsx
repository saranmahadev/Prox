import { hostOf } from '../../../lib/url'
import type { Insight, Source } from '../../../types/idea'

interface InsightRowProps {
  insight: Insight
  sources: Source[]
  readOnly?: boolean
  onRemove?: (insightId: string) => void
}

export function InsightRow({ insight, sources, readOnly, onRemove }: InsightRowProps) {
  const source = insight.sourceId ? sources.find((s) => s.id === insight.sourceId) : undefined
  return (
    <li className="rs-row">
      <span className="rs-ico" aria-hidden="true">
        💡
      </span>
      <div className="rs-main">
        <div className="rs-t">{insight.text}</div>
        {source && <small className="rs-from">from {source.title || hostOf(source.url)}</small>}
      </div>
      {!readOnly && (
        <button className="rs-x" aria-label="Remove insight" title="Remove" onClick={() => onRemove?.(insight.id)}>
          ✕
        </button>
      )}
    </li>
  )
}
