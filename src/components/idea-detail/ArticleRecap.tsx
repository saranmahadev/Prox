import type { CSSProperties } from 'react'
import { useIdeasStore } from '../../state/useIdeasStore'
import { headingRows, numberingFor } from '../../lib/headings'
import { hasCover, wordCount } from '../../lib/text'
import { useCoverUrl } from '../../hooks/useCoverUrl'
import type { Idea } from '../../types/idea'

interface ArticleRecapProps {
  idea: Idea
}

/** Collapsed read-only article summary (headings + word count + series),
 * shown on the Distribute stage. Ported from legacy's articleRO() (lines
 * 1290-1296). */
export function ArticleRecap({ idea }: ArticleRecapProps) {
  const series = useIdeasStore((s) => s.series)
  const coverUrl = useCoverUrl(idea)
  const headings = headingRows(idea.draft ?? { blocks: [] })
  const numbering = numberingFor(headings)
  const words = wordCount(idea.draft)
  const cover = hasCover(idea)

  if (!headings.length && !words && !cover) return null

  const seriesOf = series.find((s) => s.id === idea.meta?.seriesId)

  return (
    <details className="blk rs-ro">
      <summary>
        Article · {headings.length} headings · {words.toLocaleString()} words
        {seriesOf ? ` · ${seriesOf.name}${idea.meta?.part ? ` #${idea.meta.part}` : ''}` : ''}
      </summary>
      {cover && (
        <div className="ro-cover">
          <img src={coverUrl} alt={idea.meta?.coverAlt ?? ''} />
        </div>
      )}
      <ul className="ro-tree">
        {headings.map((h, i) => (
          <li key={h.index} style={{ '--d': numbering[i].depth } as CSSProperties}>
            {h.text}
          </li>
        ))}
      </ul>
    </details>
  )
}
