import { excerptOf, slugify } from '../../../lib/articleMeta'
import { hostOf } from '../../../lib/url'
import { useCoverUrl } from '../../../hooks/useCoverUrl'
import { renderCoverHtml } from '../../../lib/imaxtRender'
import type { Idea } from '../../../types/idea'

interface MetaPreviewsProps {
  idea: Idea
}

export function MetaPreviews({ idea }: MetaPreviewsProps) {
  const m = idea.meta
  const title = m?.seoTitle || idea.title
  const slug = m?.slug || slugify(idea.title)
  const desc = excerptOf(idea)
  const host = hostOf(m?.canonical || 'prox.example')
  const coverUrl = useCoverUrl(idea)
  const coverHtml = renderCoverHtml(m, idea.title, coverUrl)
  const img = coverHtml ? <div className="mp-cover-html" dangerouslySetInnerHTML={{ __html: coverHtml }} /> : null

  return (
    <>
      <div className="mp-card">
        <small>Search result</small>
        <div className="gp">
          <span className="gp-url">
            {host} › {slug}
          </span>
          <b>{title}</b>
          <p>{desc}</p>
        </div>
      </div>
      <div className="mp-card">
        <small>Social card</small>
        <div className="sc">
          <div className="sc-img">{img ?? <span>No cover yet</span>}</div>
          <div className="sc-t">
            <em>{host}</em>
            <b>{title}</b>
            <p>{desc}</p>
          </div>
        </div>
      </div>
      <div className="mp-card">
        <small>Cover crops</small>
        <div className="crops">
          <figure>
            <div className="cr c169">{img}</div>
            <figcaption>16:9</figcaption>
          </figure>
          <figure>
            <div className="cr c191">{img}</div>
            <figcaption>1.91:1</figcaption>
          </figure>
          <figure>
            <div className="cr c11">{img}</div>
            <figcaption>1:1</figcaption>
          </figure>
        </div>
      </div>
    </>
  )
}
