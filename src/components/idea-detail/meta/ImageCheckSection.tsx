import type { JSONContent } from '@tiptap/core'
import type { Idea } from '../../../types/idea'

interface ImageNode {
  alt: string
}

function collectImages(doc: JSONContent | null): ImageNode[] {
  const out: ImageNode[] = []
  const walk = (node: JSONContent) => {
    if (node.type === 'image') out.push({ alt: (node.attrs?.alt as string) ?? '' })
    node.content?.forEach(walk)
  }
  if (doc) walk(doc)
  return out
}

interface ImageCheckSectionProps {
  idea: Idea
  onFixInDraft: () => void
}

export function ImageCheckSection({ idea, onFixInDraft }: ImageCheckSectionProps) {
  const images = collectImages(idea.doc)

  return (
    <section className="rs-sec">
      <h5>
        Image check <span className="rs-count">{images.length}</span>
      </h5>
      {images.length ? (
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
      ) : (
        <p className="rs-empty">No images in the article yet.</p>
      )}
    </section>
  )
}
