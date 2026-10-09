import type { Stage } from '../../types/pipeline'

interface InfoBlocksProps {
  stage: Stage
}

/** Deliverable/time facts + tools-or-checklist + refinement tip, shown
 * beside the guide content in StageGuideView. Ported from legacy's
 * infoBlocks() (lines 1550-1554). */
export function InfoBlocks({ stage }: InfoBlocksProps) {
  const isMeta = stage.id === 'a-meta'
  return (
    <>
      <div className="facts">
        <div className="fact">
          <small>Deliverable</small>
          <b>{stage.deliverable}</b>
        </div>
        <div className="fact">
          <small>Estimated time</small>
          <b>{stage.time}</b>
        </div>
      </div>
      <div className="blk">
        <h5>{isMeta ? 'Checklist' : 'Suggested tools'}</h5>
        {isMeta ? (
          <ul className="chk ro">
            {stage.checklist.map((t) => (
              <li key={t}>
                <label>
                  <span>• {t}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tags">
            {stage.tools.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="blk">
        <h5>Proposed refinement</h5>
        <div className="refine">{stage.refine}</div>
      </div>
    </>
  )
}
