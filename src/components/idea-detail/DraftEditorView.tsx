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
import { imaxtTools } from '@inflate-ai/imaxt-editorjs'
import { hydrateImageUrls } from '../../lib/docImages'
import { docToHtml } from '../../lib/docHtml'
import { hydrateImaxtBlocks } from '../../lib/imaxtRender'
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
 * editor instance per idea (key={idea.id} below). The Draft document is its
 * own field (`idea.draft`) - fully independent from `idea.outline`. */
export function DraftEditorView({ idea }: DraftEditorViewProps) {
  const [hydrated, setHydrated] = useState<{ ideaId: string; doc: OutputData } | null>(null)

  useEffect(() => {
    let cancelled = false
    hydrateImageUrls(idea.draft ?? EMPTY_DOC).then((doc) => {
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
  const updateDraft = useIdeasStore((s) => s.updateDraft)
  const showToast = useUiStore((s) => s.showToast)
  const toggleFocusMode = useUiStore((s) => s.toggleFocusMode)

  const [preview, setPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [words, setWords] = useState(wordCount(initialDoc))
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const holderRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorJS | null>(null)
  const undoRef = useRef<Undo | null>(null)
  const latestDocRef = useRef<OutputData>(initialDoc)
  const initChainRef = useRef<Promise<void>>(Promise.resolve())

  // Mounts one Editor.js instance for the lifetime of this component - the
  // parent remounts the whole tree via key={idea.id}, so this never needs
  // to re-run for a doc/idea change. Autosaves on every change via onChange.
  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return
    let editor: EditorJS | null = null
    let cancelled = false

    // React 18 Strict Mode double-invokes this effect in dev (mount ->
    // cleanup -> mount). Editor.js's own initialization is asynchronous
    // internally - calling destroy() on an instance that hasn't finished
    // constructing yet is a no-op, so that instance's init can still
    // complete *later* and insert its toolbar/blocks into the holder after
    // the next mount's instance has already rendered into it ("two
    // editors" visible at once). Chaining every mount/destroy through one
    // promise per component instance (the ref survives Strict Mode's
    // simulated unmount/remount) guarantees each instance is fully
    // destroyed - after confirming it actually finished initializing -
    // before the next one is ever constructed.
    initChainRef.current = initChainRef.current.then(async () => {
      if (cancelled) return
      editor = new EditorJS({
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
          // Imaxt's typographic blocks (Statement, Callout, Stat, Timeline,
          // CodeWalk, ...) - same tool set Blog's authors would reach for,
          // so a draft written here publishes with no block left behind.
          ...imaxtTools,
        },
        onReady: () => {
          try {
            const undo = new Undo({ editor: editor! })
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
            updateDraft(idea.id, out)
            setWords(wordCount(out))
          } finally {
            setSaveState('saved')
          }
        },
      })
      editorRef.current = editor
      try {
        await editor.isReady
      } catch {
        /* failed to initialize - nothing more to do */
      }
    })

    return () => {
      cancelled = true
      initChainRef.current = initChainRef.current.then(async () => {
        if (!editor) return
        try {
          await editor.isReady
        } catch {
          /* never finished initializing - nothing to tear down */
        }
        try {
          editor.destroy()
        } catch {
          /* already torn down */
        }
        holder.innerHTML = ''
        if (editorRef.current === editor) editorRef.current = null
        undoRef.current = null
        editor = null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-hydrate Imaxt's interactive blocks (count-up stats, scroll-synced
  // steps, marquee/ticker motion, the font lab) every time the preview's
  // HTML changes, since dangerouslySetInnerHTML replaces the DOM each time.
  useEffect(() => {
    if (!preview || !previewRef.current) return
    return hydrateImaxtBlocks(previewRef.current)
  }, [preview, previewHtml])

  const readMinutes = readMins(words)
  const outlineHtml = docToHtml(idea.outline?.blocks ?? [])

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
        <button className="btn" type="button" aria-pressed={outlineOpen} onClick={() => setOutlineOpen(true)}>
          Outline
        </button>
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
          <div
            className="ed-preview"
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="rs-empty">Nothing written yet.</p>' }}
          />
        )}
      </article>
      {outlineOpen && (
        <>
          <div className="ed-outline-backdrop" onClick={() => setOutlineOpen(false)} />
          <aside className="ed-outline-panel open" aria-label="Outline">
            <div className="ed-outline-head">
              <h5>Synopsis & planning notes</h5>
              <button className="btn" type="button" aria-label="Close outline" onClick={() => setOutlineOpen(false)}>
                ✕
              </button>
            </div>
            <div
              className="ed-outline-body ed-preview"
              dangerouslySetInnerHTML={{ __html: outlineHtml || '<p class="rs-empty">No planning notes yet.</p>' }}
            />
          </aside>
        </>
      )}
    </>
  )
}
