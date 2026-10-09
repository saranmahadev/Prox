import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { generateHTML, type JSONContent } from '@tiptap/core'
import { draftExtensions } from '../../lib/draftExtensions'
import { hydrateImageUrls } from '../../lib/docImages'
import { fileStore } from '../../lib/fileStore'
import { uid } from '../../lib/id'
import { docToMarkdown } from '../../lib/markdown'
import { stageStatusOf } from '../../lib/selectors'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import { StatusTracker, AutoGrowTextarea } from '../ui'
import type { Idea } from '../../types/idea'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

interface DraftEditorViewProps {
  idea: Idea
}

/** Hydrates stored image blob keys into object URLs, then mounts a fresh
 * editor instance per idea (key={idea.id} below) - mirrors legacy's
 * mountDraft() awaiting blobURL() for each image before instantiating
 * Editor.js (lines 1102-1109). */
export function DraftEditorView({ idea }: DraftEditorViewProps) {
  const [hydrated, setHydrated] = useState<{ ideaId: string; doc: JSONContent } | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrateImageUrls(idea.doc ?? EMPTY_DOC).then((doc) => {
      if (!cancelled) setHydrated({ ideaId: idea.id, doc })
    })
    return () => {
      cancelled = true
    }
  }, [idea.id])

  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const color = `var(--article)`

  if (hydrated?.ideaId !== idea.id) {
    return (
      <>
        <StatusTracker id="trk" status={stageStatusOf(idea, 'a-draft')} onChange={(status) => setStageStatus(idea.id, 'a-draft', status)} color={color} />
        <p className="text-muted">Loading draft…</p>
      </>
    )
  }

  return <DraftEditor key={idea.id} idea={idea} initialDoc={hydrated.doc} />
}

function DraftEditor({ idea, initialDoc }: { idea: Idea; initialDoc: JSONContent }) {
  const updateIdea = useIdeasStore((s) => s.updateIdea)
  const updateDraftDoc = useIdeasStore((s) => s.updateDraftDoc)
  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const showToast = useUiStore((s) => s.showToast)
  const toggleFocusMode = useUiStore((s) => s.toggleFocusMode)

  const [preview, setPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: draftExtensions,
    content: initialDoc,
    editorProps: { attributes: { class: 'ed-preview' } },
    onUpdate: ({ editor }) => {
      updateDraftDoc(idea.id, editor.getJSON())
    },
  })

  const words = editor?.storage.characterCount?.words() ?? 0
  const readMins = Math.max(1, Math.round(words / 200))

  async function handleInsertImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    const key = uid()
    await fileStore.put(key, file)
    const url = URL.createObjectURL(file)
    editor.chain().focus().insertContent({ type: 'image', attrs: { src: url, alt: '', fileKey: key } }).run()
  }

  async function handleCopyMarkdown() {
    const doc = editor?.getJSON() ?? initialDoc
    const md = docToMarkdown(doc)
    const full = (idea.title ? `# ${idea.title}\n\n` : '') + md
    try {
      await navigator.clipboard.writeText(full)
      showToast('Markdown copied')
    } catch {
      showToast('Could not copy. Select the text in Preview instead.')
    }
  }

  function handleTogglePreview() {
    const next = !preview
    if (next && editor) {
      setPreviewHtml(generateHTML(editor.getJSON(), draftExtensions))
    }
    setPreview(next)
  }

  return (
    <>
      <StatusTracker
        id="trk"
        status={stageStatusOf(idea, 'a-draft')}
        onChange={(status) => setStageStatus(idea.id, 'a-draft', status)}
        color="var(--article)"
      />
      <div className="ed-bar" role="toolbar" aria-label="Editor tools">
        <button className="btn" type="button" title="Undo" onClick={() => editor?.commands.undo()}>
          ↶
        </button>
        <button className="btn" type="button" title="Redo" onClick={() => editor?.commands.redo()}>
          ↷
        </button>
        <button className="btn" type="button" title="Insert image" onClick={() => fileInputRef.current?.click()}>
          🖼 Image
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleInsertImage} />
        <span className="ed-sp" />
        <span className="ed-words">
          {words.toLocaleString()} words · {readMins} min read
        </span>
        <span className="ed-saved">Saved</span>
        <span className="ed-sp" />
        <button className="btn" type="button" aria-pressed={preview} onClick={handleTogglePreview}>
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button className="btn" type="button" onClick={handleCopyMarkdown}>
          Copy Markdown
        </button>
        <button className="btn" type="button" onClick={toggleFocusMode}>
          ⤢ Focus
        </button>
      </div>
      <article className="ed-page">
        <AutoGrowTextarea
          className="ed-title"
          placeholder="Title"
          aria-label="Article title"
          value={idea.title}
          onChange={(e) => updateIdea(idea.id, { title: e.target.value })}
        />
        <AutoGrowTextarea
          className="ed-sub"
          placeholder="Subtitle"
          aria-label="Subtitle"
          value={idea.summary}
          onChange={(e) => updateIdea(idea.id, { summary: e.target.value })}
        />
        {preview ? (
          <div className="ed-preview" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="rs-empty">Nothing written yet.</p>' }} />
        ) : (
          <div className="ed-holder">
            <EditorContent editor={editor} />
          </div>
        )}
      </article>
    </>
  )
}
