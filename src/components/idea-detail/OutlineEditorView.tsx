import { useEffect, useRef } from 'react'
import EditorJS, { type OutputData } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Quote from '@editorjs/quote'
import Delimiter from '@editorjs/delimiter'
import { useIdeasStore } from '../../state/useIdeasStore'
import type { Idea } from '../../types/idea'

const EMPTY_DOC: OutputData = { blocks: [] }

interface OutlineEditorViewProps {
  idea: Idea
}

/** Free-form planning canvas - rough notes, structure ideas, anything the
 * author wants to jot down before writing. Entirely separate from the Draft
 * document; nothing written here ever appears in the Draft stage, and
 * nothing typed in Draft appears here. */
export function OutlineEditorView({ idea }: OutlineEditorViewProps) {
  return <OutlineEditor key={idea.id} ideaId={idea.id} initialDoc={idea.outline ?? EMPTY_DOC} />
}

function OutlineEditor({ ideaId, initialDoc }: { ideaId: string; initialDoc: OutputData }) {
  const updateOutline = useIdeasStore((s) => s.updateOutline)
  const holderRef = useRef<HTMLDivElement>(null)
  const initChainRef = useRef<Promise<void>>(Promise.resolve())

  // Mirrors DraftEditorView's mount/cleanup strategy: React 18 Strict Mode
  // double-invokes this effect in dev (mount -> cleanup -> mount), and
  // Editor.js's own initialization is asynchronous internally - destroying
  // an instance that hasn't finished constructing yet is a no-op, so it can
  // still finish *later* and insert its toolbar/blocks into the holder after
  // the next mount's instance already rendered into it ("two editors"
  // visible at once). Chaining every mount/destroy through one promise per
  // component instance guarantees each instance is fully destroyed - after
  // confirming it actually finished initializing - before the next one is
  // ever constructed.
  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return
    let editor: EditorJS | null = null
    let cancelled = false

    initChainRef.current = initChainRef.current.then(async () => {
      if (cancelled) return
      editor = new EditorJS({
        holder,
        data: initialDoc,
        placeholder: 'Jot down your rough structure, notes, and ideas before you start writing…',
        inlineToolbar: true,
        tools: {
          header: { class: Header, inlineToolbar: true, config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 } },
          list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
          quote: { class: Quote, inlineToolbar: true, config: { quotePlaceholder: 'Quote', captionPlaceholder: 'Author' } },
          delimiter: Delimiter,
        },
        onChange: async (api) => {
          const out = await api.saver.save()
          updateOutline(ideaId, out)
        },
      })
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
        editor = null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="ol-sec">
      <h5>Synopsis & planning notes</h5>
      <p className="rs-hint">Rough copy only - nothing here is shared with the Draft.</p>
      <div className="ed-holder ol-holder" ref={holderRef} />
    </section>
  )
}
