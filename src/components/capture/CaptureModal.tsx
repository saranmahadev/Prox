import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { PIPELINES, PRIORITY_LABELS, getPipeline } from '../../data/pipelines'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useBoardStore } from '../../state/useBoardStore'
import { useUiStore, type CaptureModalState } from '../../state/useUiStore'
import { Modal } from '../ui'
import type { Priority } from '../../types/idea'
import type { PipelineId } from '../../types/pipeline'

interface FormState {
  type: PipelineId
  title: string
  summary: string
  link: string
  tags: string
  priority: Priority
}

function initialForm(state: CaptureModalState, ideas: ReturnType<typeof useIdeasStore.getState>['ideas'], boardFilter: 'all' | PipelineId): FormState {
  if (state.mode === 'edit') {
    const idea = ideas.find((i) => i.id === state.ideaId)
    if (idea) {
      return {
        type: idea.type,
        title: idea.title,
        summary: idea.summary,
        link: idea.link,
        tags: idea.tags.join(', '),
        priority: idea.priority,
      }
    }
  }
  return {
    type: state.mode === 'new' ? state.pipelineId ?? (boardFilter !== 'all' ? boardFilter : 'article') : 'article',
    title: '',
    summary: '',
    link: '',
    tags: '',
    priority: 'med',
  }
}

export function CaptureModal() {
  const captureModal = useUiStore((s) => s.captureModal)
  const closeCaptureModal = useUiStore((s) => s.closeCaptureModal)
  const showToast = useUiStore((s) => s.showToast)

  const ideas = useIdeasStore((s) => s.ideas)
  const addIdea = useIdeasStore((s) => s.addIdea)
  const editIdeaFromCapture = useIdeasStore((s) => s.editIdeaFromCapture)
  const boardFilter = useBoardStore((s) => s.filter)
  const setBoardFilter = useBoardStore((s) => s.setFilter)

  const open = captureModal !== null
  const editingId = captureModal?.mode === 'edit' ? captureModal.ideaId : null

  const [form, setForm] = useState<FormState>(() =>
    captureModal ? initialForm(captureModal, ideas, boardFilter) : initialForm({ mode: 'new' }, ideas, boardFilter),
  )
  const [showError, setShowError] = useState(false)

  // Re-seed the form whenever the modal is (re)opened for a different target.
  useEffect(() => {
    if (captureModal) {
      setForm(initialForm(captureModal, ideas, boardFilter))
      setShowError(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureModal?.mode === 'edit' ? captureModal.ideaId : captureModal?.mode, open])

  const pipeline = getPipeline(form.type)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setShowError(true)
      return
    }
    const tags = form.tags
      .split(',')
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 6)
    let link = form.link.trim()
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link

    if (editingId) {
      editIdeaFromCapture(editingId, { type: form.type, title, summary: form.summary.trim(), link, tags, priority: form.priority })
      closeCaptureModal()
      showToast('Idea updated')
      return
    }

    const idea = addIdea({ type: form.type, title, summary: form.summary.trim(), link, tags, priority: form.priority })
    if (boardFilter !== 'all' && boardFilter !== idea.type) setBoardFilter('all')
    closeCaptureModal()
    showToast('💡 Idea captured — entering Prox')
    requestAnimationFrame(() => {
      document.querySelector(`.idea[data-id="${idea.id}"]`)?.classList.add('pop')
    })
  }

  return (
    <Modal open={open} onClose={closeCaptureModal} labelledBy="mTitle" style={{ '--c': `var(--${pipeline.color})` } as CSSProperties}>
      <button className="btn x" aria-label="Close" onClick={closeCaptureModal}>
        ✕
      </button>
      <div className="kicker">{editingId ? 'Edit idea' : 'New idea'}</div>
      <h2 id="mTitle">{editingId ? 'Edit idea' : 'Capture Idea'}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="fTitle">Idea title *</label>
          <input
            id="fTitle"
            type="text"
            maxLength={120}
            value={form.title}
            placeholder="e.g. How I plan videos in Obsidian"
            required
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="field">
          <span className="lab" id="lType">
            Format
          </span>
          <div className="chips" role="radiogroup" aria-labelledby="lType">
            {PIPELINES.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                role="radio"
                style={{ '--c': `var(--${p.color})` } as CSSProperties}
                aria-checked={form.type === p.id}
                onClick={() => setForm((f) => ({ ...f, type: p.id }))}
              >
                <span className="dot" />
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="fSum">One-line pitch</label>
          <textarea
            id="fSum"
            maxLength={400}
            placeholder="What is it and why would anyone care?"
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="fLink">Inspiration link</label>
          <input
            id="fLink"
            type="url"
            value={form.link}
            placeholder="https://…"
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="fTags">Tags (comma separated)</label>
          <input
            id="fTags"
            type="text"
            value={form.tags}
            placeholder="design, workflow"
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </div>
        <div className="field">
          <span className="lab" id="lPri">
            Priority
          </span>
          <div className="chips" role="radiogroup" aria-labelledby="lPri">
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className="chip"
                role="radio"
                aria-checked={form.priority === k}
                onClick={() => setForm((f) => ({ ...f, priority: k }))}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {showError && (
          <p style={{ color: '#b4503f', fontWeight: 800, margin: '0 0 6px' }}>Give your idea a title first.</p>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={closeCaptureModal}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            {editingId ? 'Save changes' : 'Capture idea →'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
