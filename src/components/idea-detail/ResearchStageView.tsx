import { useState, type DragEvent } from 'react'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import { openStoredFile } from '../../lib/fileStore'
import { AddSourceForm } from './research/AddSourceForm'
import { AddTextForm } from './research/AddTextForm'
import { SourceRow } from './research/SourceRow'
import { InsightRow } from './research/InsightRow'
import { QuestionRow } from './research/QuestionRow'
import type { Idea, Source } from '../../types/idea'

interface ResearchStageViewProps {
  idea: Idea
}

export function ResearchStageView({ idea }: ResearchStageViewProps) {
  const r = idea.research
  const showToast = useUiStore((s) => s.showToast)

  const addSourceLink = useIdeasStore((s) => s.addSourceLink)
  const addSourceDoc = useIdeasStore((s) => s.addSourceDoc)
  const addSourceFiles = useIdeasStore((s) => s.addSourceFiles)
  const removeSource = useIdeasStore((s) => s.removeSource)
  const updateSourceNote = useIdeasStore((s) => s.updateSourceNote)
  const addInsight = useIdeasStore((s) => s.addInsight)
  const removeInsight = useIdeasStore((s) => s.removeInsight)
  const addQuestion = useIdeasStore((s) => s.addQuestion)
  const removeQuestion = useIdeasStore((s) => s.removeQuestion)
  const setQuestionAnswered = useIdeasStore((s) => s.setQuestionAnswered)
  const updateQuestionAnswer = useIdeasStore((s) => s.updateQuestionAnswer)

  const [dragOver, setDragOver] = useState(false)

  async function handleAddFiles(files: File[]) {
    const { added, skipped } = await addSourceFiles(idea.id, files)
    if (added) showToast(added === 1 ? 'Document uploaded' : `${added} documents uploaded`)
    if (skipped) showToast(`${skipped} file${skipped > 1 ? 's' : ''} over 25 MB skipped`)
  }

  async function handleOpenSource(source: Source) {
    if (!source.file) return
    await openStoredFile(source.file, false, () => showToast('That file is no longer stored in this browser'))
  }

  async function handleDownloadSource(source: Source) {
    if (!source.file) return
    await openStoredFile(source.file, true, () => showToast('That file is no longer stored in this browser'))
  }

  function onDragOver(e: DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setDragOver(true)
    }
  }
  function onDragLeave(e: DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files]
    if (files.length) void handleAddFiles(files)
  }

  const openQuestions = r.questions.filter((q) => q.status !== 'answered').length
  const sortedQuestions = [...r.questions].sort((a, b) => Number(a.status === 'answered') - Number(b.status === 'answered'))

  return (
    <>
      <div className="rs-sum">
        <div className="rs-stats">
          <span>
            <b>{r.sources.length}</b> sources
          </span>
          <span>
            <b>{r.insights.length}</b> insights
          </span>
          <span>
            <b>{openQuestions}</b> open questions
          </span>
        </div>
      </div>

      <section className={`rs-sec src${dragOver ? ' drop' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <h5>
          Sources <span className="rs-count">{r.sources.length}</span>
        </h5>
        <p className="rs-hint">Links and docs you read, will cite or want to remember. Drop files here to upload.</p>
        <AddSourceForm
          onAddLink={(url) => addSourceLink(idea.id, url, '')}
          onAddDoc={(title) => addSourceDoc(idea.id, title)}
          onAddFiles={handleAddFiles}
        />
        <ul className="rs-list">
          {r.sources.length ? (
            r.sources.map((s) => (
              <SourceRow
                key={s.id}
                source={s}
                onOpen={handleOpenSource}
                onDownload={handleDownloadSource}
                onRemove={(id) => removeSource(idea.id, id)}
                onNoteChange={(id, note) => updateSourceNote(idea.id, id, note)}
              />
            ))
          ) : (
            <li className="rs-empty">Nothing yet.</li>
          )}
        </ul>
      </section>

      <section className="rs-sec">
        <h5>
          Insights <span className="rs-count">{r.insights.length}</span>
        </h5>
        <p className="rs-hint">What you learned that is worth using. One idea per line.</p>
        <AddTextForm
          placeholder="Something worth saying…"
          ariaLabel="Insights"
          sources={r.sources}
          onAdd={(text, sourceId) => addInsight(idea.id, text, sourceId)}
        />
        <ul className="rs-list">
          {r.insights.length ? (
            r.insights.map((n) => (
              <InsightRow key={n.id} insight={n} sources={r.sources} onRemove={(id) => removeInsight(idea.id, id)} />
            ))
          ) : (
            <li className="rs-empty">Nothing yet.</li>
          )}
        </ul>
      </section>

      <section className="rs-sec">
        <h5>
          Questions <span className="rs-count">{r.questions.length ? `${openQuestions} open · ${r.questions.length}` : 0}</span>
        </h5>
        <p className="rs-hint">What still needs an answer before you can make this well.</p>
        <AddTextForm
          placeholder="What do I still need to find out?"
          ariaLabel="Questions"
          onAdd={(text) => addQuestion(idea.id, text)}
        />
        <ul className="rs-list">
          {sortedQuestions.length ? (
            sortedQuestions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                onToggleAnswered={(id, answered) => setQuestionAnswered(idea.id, id, answered)}
                onAnswerChange={(id, answer) => updateQuestionAnswer(idea.id, id, answer)}
                onRemove={(id) => removeQuestion(idea.id, id)}
              />
            ))
          ) : (
            <li className="rs-empty">Nothing yet.</li>
          )}
        </ul>
      </section>
    </>
  )
}
