import { useEffect, useState, type CSSProperties } from 'react'
import { PRIORITY_LABELS, getPipeline } from '../../data/pipelines'
import { guideFor } from '../../data/guides'
import { isDone, isStatusTrackedStage, pipeOf, progress, stageOf, stageStatusOf } from '../../lib/selectors'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore, type DrawerState } from '../../state/useUiStore'
import type { PipelineId } from '../../types/pipeline'
import { DrawerShell, ProgressRing, StatusTracker } from '../ui'
import { StageRail } from './StageRail'
import { StageGuideView } from './StageGuideView'
import { CaptureStageView } from './CaptureStageView'
import { GenericChecklistStageView } from './GenericChecklistStageView'
import { PublishedStageView } from './PublishedStageView'

interface IdeaDetailPageProps {
  drawer: DrawerState | null
  onEdit: (ideaId: string) => void
}

export function IdeaDetailPage({ drawer, onEdit }: IdeaDetailPageProps) {
  const closeDrawer = useUiStore((s) => s.closeDrawer)
  const setGuideStageIndex = useUiStore((s) => s.setGuideStageIndex)
  const showToast = useUiStore((s) => s.showToast)

  const ideas = useIdeasStore((s) => s.ideas)
  const setChecklistItem = useIdeasStore((s) => s.setChecklistItem)
  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const advanceStage = useIdeasStore((s) => s.advanceStage)
  const goBackStage = useIdeasStore((s) => s.goBackStage)
  const goToStage = useIdeasStore((s) => s.goToStage)
  const archiveIdea = useIdeasStore((s) => s.archiveIdea)
  const restoreIdea = useIdeasStore((s) => s.restoreIdea)
  const deleteIdea = useIdeasStore((s) => s.deleteIdea)

  const open = drawer !== null

  // Keep rendering the last-known content while the drawer animates closed
  // (legacy never repaints on close, it just removes the `.open` class) -
  // otherwise the content would vanish instantly instead of sliding out.
  const [cached, setCached] = useState<DrawerState | null>(null)
  useEffect(() => {
    if (drawer) setCached(drawer)
  }, [drawer])
  const effective = drawer ?? cached

  if (effective?.mode === 'guide') {
    return (
      <GuideDrawer
        open={open}
        pipelineId={effective.pipelineId}
        stageIndex={effective.stageIndex}
        onClose={closeDrawer}
        onJump={setGuideStageIndex}
        onPrev={() => setGuideStageIndex(Math.max(0, effective.stageIndex - 1))}
        onNext={() => setGuideStageIndex(effective.stageIndex + 1)}
      />
    )
  }

  const idea = effective?.mode === 'idea' ? ideas.find((i) => i.id === effective.ideaId) : undefined
  if (!idea) {
    if (open) closeDrawer() // the open idea was deleted out from under the drawer
    return null
  }

  const pipeline = pipeOf(idea)
  const stageIndex = Math.min(idea.stage, pipeline.stages.length - 1)
  const stage = pipeline.stages[stageIndex]
  const prog = progress(idea)
  const done = isDone(idea)
  const showSummaryMeta = stage.id !== 'capture'

  const handleNext = () => {
    const fromStage = stageOf(idea)
    const openQuestions =
      fromStage.id === 'research' ? idea.research.questions.filter((q) => q.status !== 'answered').length : 0
    const newStageIndex = idea.stage + 1
    const nowDone = newStageIndex >= pipeline.stages.length - 1
    advanceStage(idea.id)
    if (nowDone) {
      showToast(`🚀 "${idea.title}" published!`)
    } else {
      const suffix = openQuestions ? ` · ${openQuestions} question${openQuestions > 1 ? 's' : ''} still open` : ''
      showToast(`✓ ${fromStage.title} done → ${pipeline.stages[newStageIndex].title}${suffix}`)
    }
  }

  const handleDelete = () => {
    if (confirm(`Delete "${idea.title}"?`)) {
      deleteIdea(idea.id)
      closeDrawer()
      showToast('Idea deleted')
    }
  }

  return (
    <DrawerShell open={open} onClose={closeDrawer} ariaLabel="Details">
      <div style={{ '--c': `var(--${pipeline.color})` } as CSSProperties}>
        <header className="dlg-head">
          <div className="dlg-title">
            <div className="kicker">
              {pipeline.name} Prox · {PRIORITY_LABELS[idea.priority]} priority
              {idea.archived ? ' · 📁 Archived' : ''}
            </div>
            <div className="title-row">
              <ProgressRing frac={prog} size={52} strokeWidth={4} color={`var(--${pipeline.color})`}>
                <span className="pi">{pipeline.icon}</span>
              </ProgressRing>
              <h2>{idea.title}</h2>
            </div>
            {showSummaryMeta && idea.summary && <p className="sum">{idea.summary}</p>}
            {showSummaryMeta && (idea.tags.length > 0 || idea.link) && (
              <div className="dlg-meta">
                {idea.tags.map((t) => (
                  <span className="tg" key={t}>
                    #{t}
                  </span>
                ))}
                {idea.link && (
                  <a href={idea.link} target="_blank" rel="noopener noreferrer">
                    🔗 {idea.link.replace(/^https?:\/\//, '').slice(0, 40)}
                  </a>
                )}
              </div>
            )}
          </div>
          <button className="btn x" aria-label="Close" onClick={closeDrawer}>
            ✕
          </button>
        </header>
        <div className="dlg-body">
          <StageRail pipeline={pipeline} currentIndex={stageIndex} onJump={(n) => goToStage(idea.id, n)} />
          <section className="dlg-main">
            <div className="stage-head">
              <span className="big-ico">{stage.icon}</span>
              <div>
                <h3>{stage.title}</h3>
              </div>
            </div>
            {stage.id === 'capture' ? (
              <CaptureStageView idea={idea} onEdit={() => onEdit(idea.id)} />
            ) : stage.final ? (
              <PublishedStageView idea={idea} pipeline={pipeline} />
            ) : stage.checklist.length > 0 ? (
              <GenericChecklistStageView
                items={idea.checklistState[stage.id] ?? []}
                onToggle={(itemId, checked) => setChecklistItem(idea.id, stage.id, itemId, checked)}
              />
            ) : isStatusTrackedStage(stage.id) ? (
              <div className="blk">
                <StatusTracker
                  status={stageStatusOf(idea, stage.id)}
                  onChange={(status) => setStageStatus(idea.id, stage.id, status)}
                  color={`var(--${pipeline.color})`}
                />
                {guideFor(stage)}
              </div>
            ) : (
              <div className="blk">
                <h5>Checklist · 0/0</h5>
                <p className="text-muted">Nothing to check off at this stage yet.</p>
              </div>
            )}
          </section>
        </div>
        <footer className="dlg-foot">
          <div className="grp">
            <button className="btn" onClick={() => onEdit(idea.id)}>
              ✎ Edit idea
            </button>
            <button className="btn danger" onClick={handleDelete}>
              🗑 Delete
            </button>
          </div>
          <div className="grp">
            <button className="btn" disabled={idea.stage === 0} onClick={() => goBackStage(idea.id)}>
              ← Back a stage
            </button>
            {done ? (
              idea.archived ? (
                <button className="btn" onClick={() => restoreIdea(idea.id)}>
                  ↩ Restore from archive
                </button>
              ) : (
                <button className="btn primary" onClick={() => archiveIdea(idea.id)}>
                  📁 Move to archive
                </button>
              )
            ) : (
              <button className="btn primary" onClick={handleNext}>
                {stageIndex === pipeline.stages.length - 2
                  ? 'Complete & publish 🚀'
                  : stageIndex === 0
                    ? 'Start research →'
                    : 'Complete & advance →'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </DrawerShell>
  )
}

interface GuideDrawerProps {
  open: boolean
  pipelineId: PipelineId
  stageIndex: number
  onClose: () => void
  onJump: (stageIndex: number) => void
  onPrev: () => void
  onNext: () => void
}

function GuideDrawer({ open, pipelineId, stageIndex, onClose, onJump, onPrev, onNext }: GuideDrawerProps) {
  const pipeline = getPipeline(pipelineId)
  const stage = pipeline.stages[stageIndex]

  return (
    <DrawerShell open={open} onClose={onClose} ariaLabel="Stage guide">
      <div style={{ '--c': `var(--${pipeline.color})` } as CSSProperties}>
        <header className="dlg-head">
          <div className="dlg-title">
            <div className="kicker">
              {pipeline.icon} {pipeline.name} Prox · Stage guide
            </div>
            <h2>{stage.title}</h2>
            <p className="sum">
              Stage {stageIndex + 1} of {pipeline.stages.length}. This is the template every idea follows at this stage.
            </p>
          </div>
          <button className="btn x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="dlg-body">
          <StageRail pipeline={pipeline} currentIndex={stageIndex} onJump={onJump} />
          <section className="dlg-main">
            <div className="stage-head">
              <span className="big-ico">{stage.icon}</span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.summary}</p>
              </div>
            </div>
            <StageGuideView pipeline={pipeline} stageIndex={stageIndex} />
          </section>
        </div>
        <footer className="dlg-foot">
          <div className="grp" />
          <div className="grp">
            <button className="btn" disabled={stageIndex === 0} onClick={onPrev}>
              ← Prev stage
            </button>
            <button className="btn primary" disabled={stageIndex === pipeline.stages.length - 1} onClick={onNext}>
              Next stage →
            </button>
          </div>
        </footer>
      </div>
    </DrawerShell>
  )
}
