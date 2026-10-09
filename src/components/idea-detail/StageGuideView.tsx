import { guideFor } from '../../data/guides'
import { InfoBlocks } from './InfoBlocks'
import type { Pipeline } from '../../types/pipeline'

interface StageGuideViewProps {
  pipeline: Pipeline
  stageIndex: number
}

export function StageGuideView({ pipeline, stageIndex }: StageGuideViewProps) {
  const stage = pipeline.stages[stageIndex]
  if (stage.final) {
    return (
      <>
        <div className="blk">
          <h5>Outputs</h5>
          <div className="outs">
            {pipeline.outputs.map((o) => (
              <span key={o}>{o}</span>
            ))}
          </div>
        </div>
        <div className="blk">
          <h5>Proposed refinement</h5>
          <div className="refine">{stage.refine}</div>
        </div>
      </>
    )
  }
  return (
    <div className="cols">
      {guideFor(stage) ?? (
        <div className="blk">
          <h5>What happens here</h5>
          <ul className="chk ro">
            {stage.checklist.map((t) => (
              <li key={t}>
                <label>
                  <span>• {t}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <InfoBlocks stage={stage} />
      </div>
    </div>
  )
}
