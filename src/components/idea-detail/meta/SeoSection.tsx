import { excerptOf, slugify } from '../../../lib/articleMeta'
import { useIdeasStore } from '../../../state/useIdeasStore'
import { CharCount } from './CharCount'
import type { Idea } from '../../../types/idea'

interface SeoSectionProps {
  idea: Idea
}

export function SeoSection({ idea }: SeoSectionProps) {
  const updateMeta = useIdeasStore((s) => s.updateMeta)
  const seoTitle = idea.meta?.seoTitle || idea.title
  const description = excerptOf(idea)

  return (
    <section className="rs-sec">
      <h5>SEO</h5>
      <div className="mf">
        <label>
          SEO title
          <CharCount value={seoTitle} max={60} />
        </label>
        <input
          type="text"
          value={idea.meta?.seoTitle ?? ''}
          placeholder={idea.title}
          onChange={(e) => updateMeta(idea.id, { seoTitle: e.target.value })}
        />
      </div>
      <div className="mf">
        <label>
          Meta description
          <CharCount value={description} max={160} />
        </label>
        <textarea
          rows={3}
          value={idea.meta?.description ?? ''}
          placeholder={description}
          onChange={(e) => updateMeta(idea.id, { description: e.target.value })}
        />
      </div>
      <div className="mf">
        <label>Slug</label>
        <div className="mrow">
          <input
            type="text"
            value={idea.meta?.slug ?? ''}
            placeholder={slugify(idea.title)}
            onChange={(e) => updateMeta(idea.id, { slug: e.target.value })}
          />
          <button className="btn" type="button" onClick={() => updateMeta(idea.id, { slug: slugify(idea.title) })}>
            Generate
          </button>
        </div>
      </div>
      <div className="mf">
        <label>Canonical URL</label>
        <input
          type="text"
          value={idea.meta?.canonical ?? ''}
          placeholder="https://"
          onChange={(e) => updateMeta(idea.id, { canonical: e.target.value })}
        />
      </div>
    </section>
  )
}
