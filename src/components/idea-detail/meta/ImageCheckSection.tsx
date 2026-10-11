import type { OutputData } from '@editorjs/editorjs'
import { stripHtml } from '../../../lib/editorjsBlocks'
import { useIdeasStore } from '../../../state/useIdeasStore'
import type { Idea } from '../../../types/idea'

interface ImageNode {
  alt: string
}

/** Editor.js's image tool has no separate alt field - its caption doubles
 * as alt text (see DraftEditorView's captionPlaceholder). */
function collectImages(doc: OutputData | null): ImageNode[] {
  return (doc?.blocks ?? [])
    .filter((block) => block.type === 'image')
    .map((block) => ({ alt: stripHtml(block.data?.caption as string) }))
}

interface ImageCheckSectionProps {
  idea: Idea
  onFixInDraft: () => void
}

export function ImageCheckSection({ idea, onFixInDraft }: ImageCheckSectionProps) {
  const images = collectImages(idea.draft)
  const updateMeta = useIdeasStore((s) => s.updateMeta)
  const allowImages = idea.meta?.allowImages ?? false

  return (
    <section className="rs-sec">
      <h5>
        Image check <span className="rs-count">{images.length}</span>
      </h5>
      {images.length ? (
        <>
          <p className="rs-hint">
            Blog's posts use no images by policy - this is the rare, explicit exception. Publishing will set{' '}
            <code>allowImages: true</code> in frontmatter and commit each image to <code>public/articles/&lt;slug&gt;/</code>.
          </p>
          <ul className="rs-list">
            {images.map((img, i) => {
              const ok = img.alt.trim()
              return (
                <li className="rs-row" key={i}>
                  <span className="rs-ico">{ok ? '✓' : '⚠️'}</span>
                  <div className="rs-main">
                    <div className="rs-t">{ok || 'Image without caption / alt text'}</div>
                  </div>
                  {!ok && (
                    <button className="btn" type="button" onClick={onFixInDraft}>
                      Fix in Draft
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <label className="mrow" style={{ alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={allowImages}
              onChange={(e) => updateMeta(idea.id, { allowImages: e.target.checked })}
            />
            Publish with these images anyway
          </label>
          {!allowImages && <p className="rs-hint">Leave this unchecked and publishing will fail until it's confirmed.</p>}
        </>
      ) : (
        <p className="rs-empty">No images in the article yet.</p>
      )}
    </section>
  )
}
