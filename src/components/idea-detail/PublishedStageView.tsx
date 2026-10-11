import { useEffect, useState, type CSSProperties } from 'react'
import type { OutputData } from '@editorjs/editorjs'
import { PRIORITY_LABELS } from '../../data/pipelines'
import { CHANNELS, DISTRIBUTE_STATUS } from '../../data/distribution'
import { docToHtml } from '../../lib/docHtml'
import { hydrateImageUrls } from '../../lib/docImages'
import { readMins } from '../../lib/articleMeta'
import { headingRows, numberingFor } from '../../lib/headings'
import { wordCount, hasCover } from '../../lib/text'
import { useCoverUrl } from '../../hooks/useCoverUrl'
import { renderCoverHtml } from '../../lib/imaxtRender'
import { SourceRow } from './research/SourceRow'
import { InsightRow } from './research/InsightRow'
import { QuestionRow } from './research/QuestionRow'
import type { Idea } from '../../types/idea'
import type { Pipeline } from '../../types/pipeline'

interface PublishedStageViewProps {
  idea: Idea
  pipeline: Pipeline
}

export function PublishedStageView({ idea, pipeline }: PublishedStageViewProps) {
  if (idea.type === 'article') return <ArticleRecap idea={idea} />
  return <GenericRecap idea={idea} pipeline={pipeline} />
}

function IdeaInfo({ idea, pipeline }: PublishedStageViewProps) {
  return (
    <div className="cap-card">
      <div className="cap-row">
        <small>Idea</small>
        <p className="cap-t">{idea.title}</p>
      </div>
      {idea.summary && (
        <div className="cap-row">
          <small>Summary</small>
          <p>{idea.summary}</p>
        </div>
      )}
      {idea.link && (
        <div className="cap-row">
          <small>Reference</small>
          <a href={idea.link} target="_blank" rel="noopener noreferrer">
            {idea.link.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}
      {idea.tags.length > 0 && (
        <div className="cap-row">
          <small>Tags</small>
          <div>
            {idea.tags.map((t) => (
              <span className="tg" key={t}>
                #{t}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="cap-row">
        <small>Format</small>
        <p>
          {pipeline.icon} {pipeline.name}
        </p>
      </div>
      <div className="cap-row">
        <small>Priority</small>
        <span className={`pri ${idea.priority}`}>{PRIORITY_LABELS[idea.priority]}</span>
      </div>
    </div>
  )
}

/** Non-article recap: idea info + per-stage checklist recap. Ported from
 * legacy's publishedHTML() non-article branch (lines 1266-1289). */
function GenericRecap({ idea, pipeline }: PublishedStageViewProps) {
  const checklistStages = pipeline.stages.filter((s) => s.checklist.length > 0)
  return (
    <>
      <IdeaInfo idea={idea} pipeline={pipeline} />
      {checklistStages.length > 0 && (
        <div className="blk">
          <h5>Stages</h5>
          {checklistStages.map((stage) => {
            const items = idea.checklistState[stage.id] ?? []
            return (
              <div key={stage.id} style={{ marginBottom: 14 }}>
                <h6 style={{ margin: '0 0 4px' }}>
                  {stage.icon} {stage.title}
                </h6>
                <ul className="chk ro">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label>
                        <span>
                          {item.checked ? '✓' : '○'} {item.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Article recap: rendered body, TOC, and Idea/Research/Outline/Metadata/
 * Distribution sections. Ported from legacy's publishedHTML() article
 * branch (lines 1266-1289). */
function ArticleRecap({ idea }: { idea: Idea }) {
  const coverUrl = useCoverUrl(idea)
  const words = wordCount(idea.draft)
  const headings = headingRows(idea.draft ?? { blocks: [] })
  const numbering = numberingFor(headings)
  const [bodyHtml, setBodyHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    const doc: OutputData = idea.draft ?? { blocks: [] }
    hydrateImageUrls(doc).then((hydrated) => {
      if (!cancelled) setBodyHtml(docToHtml(hydrated.blocks))
    })
    return () => {
      cancelled = true
    }
  }, [idea.draft])
  const research = idea.research
  const hasResearch = research.sources.length > 0 || research.insights.length > 0 || research.questions.length > 0
  const postedChannels = CHANNELS.filter(([k]) => {
    const c = idea.dist?.channels[k]
    return c && (c.status !== 'todo' || c.url)
  })

  const toc: [string, string][] = [
    ...(words ? ([['article', 'Article']] as [string, string][]) : []),
    ['idea', 'Idea'],
    ...(hasResearch ? ([['research', 'Research']] as [string, string][]) : []),
    ...(headings.length ? ([['outline', 'Outline']] as [string, string][]) : []),
    ['meta', 'Metadata'],
    ...(postedChannels.length ? ([['dist', 'Distribution']] as [string, string][]) : []),
  ]

  function jumpTo(id: string) {
    document.getElementById(`pub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <nav className="pub-toc" aria-label="Sections">
        {toc.map(([id, label]) => (
          <a
            key={id}
            href={`#pub-${id}`}
            onClick={(e) => {
              e.preventDefault()
              jumpTo(id)
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <article className="ed-preview pub-article" id="pub-article">
        {hasCover(idea) && (
          <div className="pub-cover" dangerouslySetInnerHTML={{ __html: renderCoverHtml(idea.meta, idea.title, coverUrl) }} />
        )}
        <h1 className="pub-h">{idea.title}</h1>
        {idea.summary && <p className="pub-sub">{idea.summary}</p>}
        {words > 0 && (
          <>
            <div className="pub-by">
              {idea.meta?.author ? `${idea.meta.author} · ` : ''}
              {readMins(words)} min read · {words.toLocaleString()} words
            </div>
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </>
        )}
      </article>

      <section className="pub-sec" id="pub-idea">
        <h4>Idea</h4>
        <dl className="pub-kv">
          <dt>Idea</dt>
          <dd>{idea.title}</dd>
          {idea.summary && (
            <>
              <dt>Summary</dt>
              <dd>{idea.summary}</dd>
            </>
          )}
          {idea.tags.length > 0 && (
            <>
              <dt>Tags</dt>
              <dd>
                {idea.tags.map((t) => (
                  <span className="tg" key={t}>
                    #{t}
                  </span>
                ))}
              </dd>
            </>
          )}
          <dt>Priority</dt>
          <dd>
            <span className={`pri ${idea.priority}`}>{PRIORITY_LABELS[idea.priority]}</span>
          </dd>
        </dl>
      </section>

      {hasResearch && (
        <section className="pub-sec" id="pub-research">
          <h4>Research</h4>
          <h6>Sources · {research.sources.length}</h6>
          <ul className="rs-list">
            {research.sources.map((s) => (
              <SourceRow key={s.id} source={s} readOnly />
            ))}
          </ul>
          <h6>Insights · {research.insights.length}</h6>
          <ul className="rs-list">
            {research.insights.map((n) => (
              <InsightRow key={n.id} insight={n} sources={research.sources} readOnly />
            ))}
          </ul>
          <h6>Questions · {research.questions.length}</h6>
          <ul className="rs-list">
            {research.questions.map((q) => (
              <QuestionRow key={q.id} question={q} readOnly />
            ))}
          </ul>
        </section>
      )}

      {headings.length > 0 && (
        <section className="pub-sec" id="pub-outline">
          <h4>Outline</h4>
          <ul className="ro-tree">
            {headings.map((h, i) => (
              <li key={h.index} style={{ '--d': numbering[i].depth } as CSSProperties}>
                <b>H{h.level}</b> {h.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pub-sec" id="pub-meta">
        <h4>Metadata</h4>
        <dl className="pub-kv">
          {idea.meta?.seoTitle && (
            <>
              <dt>SEO title</dt>
              <dd>{idea.meta.seoTitle}</dd>
            </>
          )}
          {idea.meta?.description && (
            <>
              <dt>Description</dt>
              <dd>{idea.meta.description}</dd>
            </>
          )}
          {idea.meta?.slug && (
            <>
              <dt>Slug</dt>
              <dd>{idea.meta.slug}</dd>
            </>
          )}
          {idea.meta?.category && (
            <>
              <dt>Category</dt>
              <dd>{idea.meta.category}</dd>
            </>
          )}
          {idea.meta?.author && (
            <>
              <dt>Author</dt>
              <dd>{idea.meta.author}</dd>
            </>
          )}
        </dl>
      </section>

      {postedChannels.length > 0 && (
        <section className="pub-sec" id="pub-dist">
          <h4>Distribution</h4>
          <ul className="rs-list">
            {postedChannels.map(([k, label, icon]) => {
              const c = idea.dist!.channels[k]!
              const statusLabel = DISTRIBUTE_STATUS.find(([s]) => s === c.status)?.[1] ?? ''
              return (
                <li className="rs-row" key={k}>
                  <span className="rs-ico">{icon}</span>
                  <div className="rs-main">
                    <div className="rs-t">
                      {label}
                      <small>
                        {statusLabel}
                        {c.date ? ` · ${c.date}` : ''}
                      </small>
                    </div>
                    {c.url && (
                      <div>
                        <a href={c.url} target="_blank" rel="noopener noreferrer">
                          {c.url}
                        </a>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
