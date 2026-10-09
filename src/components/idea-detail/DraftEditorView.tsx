import { useEffect, useRef, useState } from 'react'
import EditorJS, { type OutputData, type BlockToolConstructable } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Quote from '@editorjs/quote'
import CodeTool from '@editorjs/code'
import Delimiter from '@editorjs/delimiter'
import Table from '@editorjs/table'
import ImageTool from '@editorjs/image'
import Embed from '@editorjs/embed'
import InlineCode from '@editorjs/inline-code'
import Marker from '@editorjs/marker'
import Underline from '@editorjs/underline'
import Undo from 'editorjs-undo'
import { hydrateImageUrls } from '../../lib/docImages'
import { docToHtml } from '../../lib/docHtml'
import { fileStore } from '../../lib/fileStore'
import { uid } from '../../lib/id'
import { docToMarkdown } from '../../lib/markdown'
import { readMins } from '../../lib/articleMeta'
import { wordCount } from '../../lib/text'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import { AutoGrowTextarea } from '../ui'
import type { Idea } from '../../types/idea'

const EMPTY_DOC: OutputData = { blocks: [] }

interface DraftEditorViewProps {
  idea: Idea
}

/** Hydrates stored image blob keys into object URLs, then mounts a fresh
 * editor instance per idea (key={idea.id} below) - mirrors legacy's
 * mountDraft() awaiting blobURL() for each image before instantiating
 * Editor.js (lines 1102-1109). */
export function DraftEditorView({ idea }: DraftEditorViewProps) {
  const [hydrated, setHydrated] = useState<{ ideaId: string; doc: OutputData } | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrateImageUrls(idea.doc ?? EMPTY_DOC).then((doc) => {
      if (!cancelled) setHydrated({ ideaId: idea.id, doc })
    })
    return () => {
      cancelled = true
    }
  }, [idea.id])

  if (hydrated?.ideaId !== idea.id) {
    return <p className="text-muted">Loading draft…</p>
  }

  return <DraftEditor key={idea.id} idea={idea} initialDoc={hydrated.doc} />
}

function DraftEditor({ idea, initialDoc }: { idea: Idea; initialDoc: OutputData }) {
  const updateIdea = useIdeasStore((s) => s.updateIdea)
  const updateDraftDoc = useIdeasStore((s) => s.updateDraftDoc)
  const showToast = useUiStore((s) => s.showToast)
  const toggleFocusMode = useUiStore((s) => s.toggleFocusMode)

  const [preview, setPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [words, setWords] = useState(wordCount(initialDoc))
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const holderRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorJS | null>(null)
  const undoRef = useRef<Undo | null>(null)
  const latestDocRef = useRef<OutputData>(initialDoc)

  // Mounts one Editor.js instance for the lifetime of this component - the
  // parent remounts the whole tree via key={idea.id}, so this never needs
  // to re-run for a doc/idea change. Mirrors legacy's mountDraft() (lines
  // 1102-1133); autosaves on every change via onChange.
  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return

    const editor = new EditorJS({
      holder,
      data: initialDoc,
      placeholder: 'Tell your story…',
      inlineToolbar: true,
      tools: {
        header: { class: Header, inlineToolbar: true, config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 } },
        list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
        quote: { class: Quote, inlineToolbar: true, config: { quotePlaceholder: 'Quote', captionPlaceholder: 'Author' } },
        code: CodeTool,
        delimiter: Delimiter,
        // @editorjs/table's own constructor-options type makes `config`
        // required, which @editorjs/editorjs's general BlockToolConstructable
        // doesn't allow - a type mismatch in the package itself, not in this
        // config.
        table: { class: Table as unknown as BlockToolConstructable, inlineToolbar: true, config: {} },
        image: {
          class: ImageTool,
          config: {
            captionPlaceholder: 'Caption (also used as alt text)',
            uploader: {
              async uploadByFile(file: File) {
                const key = uid()
                await fileStore.put(key, file)
                return { success: 1, file: { key, url: URL.createObjectURL(file) } }
              },
              async uploadByUrl(url: string) {
                return { success: 1, file: { url } }
              },
            },
          },
        },
        embed: Embed,
        inlineCode: InlineCode,
        marker: Marker,
        underline: Underline,
      },
      onReady: () => {
        try {
          const undo = new Undo({ editor })
          undo.initialize(initialDoc)
          undoRef.current = undo
        } catch {
          undoRef.current = null
        }
      },
      onChange: async (api) => {
        setSaveState('saving')
        try {
          const out = await api.saver.save()
          latestDocRef.current = out
          updateDraftDoc(idea.id, out)
          setWords(wordCount(out))
        } finally {
          setSaveState('saved')
        }
      },
    })
    editorRef.current = editor

    return () => {
      editorRef.current = null
      undoRef.current = null
      // Destroy synchronously, not after an awaited save - React 18 Strict
      // Mode double-invokes this effect in dev (mount -> cleanup -> mount),
      // and an async destroy() would fire after the *next* instance already
      // mounted into the same holder, tearing its toolbar DOM out from
      // under it. onChange already autosaves on every edit, so nothing is
      // lost by not also flushing here.
      try {
        editor.destroy()
      } catch {
        /* not finished initializing yet - nothing to tear down */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const readMinutes = readMins(words)

  async function handleCopyMarkdown() {
    const md = docToMarkdown(latestDocRef.current.blocks ?? [])
    const full = (idea.title ? `# ${idea.title}\n\n` : '') + md
    try {
      await navigator.clipboard.writeText(full)
      showToast('Markdown copied')
    } catch {
      showToast('Could not copy. Select the text in Preview instead.')
    }
  }

  async function handleTogglePreview() {
    const next = !preview
    if (next && editorRef.current) {
      const out = await editorRef.current.save()
      latestDocRef.current = out
      const hydrated = await hydrateImageUrls(out)
      setPreviewHtml(docToHtml(hydrated.blocks))
    }
    setPreview(next)
  }

  return (
    <>
      <div className="ed-bar" role="toolbar" aria-label="Editor tools">
        <button className="btn" type="button" title="Undo" onClick={() => undoRef.current?.undo()}>
          ↶
        </button>
        <button className="btn" type="button" title="Redo" onClick={() => undoRef.current?.redo()}>
          ↷
        </button>
        <span className="ed-sp" />
        <span className="ed-words">
          {words.toLocaleString()} words · {readMinutes} min read
        </span>
        <span className="ed-saved">{saveState === 'saving' ? 'Saving…' : 'Saved'}</span>
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
        <div className="ed-holder" hidden={preview} ref={holderRef} />
        {preview && (
          <div className="ed-preview" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="rs-empty">Nothing written yet.</p>' }} />
        )}
      </article>
    </>
  )
}
