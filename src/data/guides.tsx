import type { ReactNode } from 'react'
import type { Stage } from '../types/pipeline'

/* Ported from legacy/index.html's GUIDES/CAP_GUIDE/RES_GUIDE/gd/guideFor
 * (lines 882-885, 1302-1310): static "what gets captured" explainer
 * content shown in the stage-guide view (template, not idea-bound). */

function GuideList({ rows }: { rows: [string, string][] }) {
  return (
    <div className="blk">
      <h5>What gets captured</h5>
      <ul className="chk ro">
        {rows.map(([label, desc]) => (
          <li key={label}>
            <label>
              <span>
                • <b>{label}</b> — {desc}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

const CAP_GUIDE = (
  <div className="blk">
    <h5>What gets captured</h5>
    <ul className="chk ro">
      <li>
        <label>
          <span>• The idea, in a line or two</span>
        </label>
      </li>
      <li>
        <label>
          <span>• A reference link, tags and priority</span>
        </label>
      </li>
      <li>
        <label>
          <span>• Nothing else. Research is where the work begins.</span>
        </label>
      </li>
    </ul>
  </div>
)

const RES_GUIDE = (
  <GuideList
    rows={[
      ['Sources', 'links and docs to read, cite or remember'],
      ['Insights', 'what you learned that is worth using'],
      ['Questions', 'what still needs an answer'],
      ['Status', 'yet to begin, in progress, completed or reviewed'],
    ]}
  />
)

const GUIDES: Record<string, ReactNode> = {
  'a-outline': (
    <GuideList
      rows={[
        ['Headings', 'H1 to H6 only, nested by level'],
        ['Sections', "drag a heading to move its whole section"],
        ['Link to Draft', 'the same headings appear in the editor'],
        ['Status', 'yet to begin, in progress, completed or reviewed'],
      ]}
    />
  ),
  'a-draft': (
    <GuideList
      rows={[
        ['Article', 'written in a Medium-style block editor'],
        ['Blocks', 'headings, quotes, lists, code, tables, images and embeds'],
        ['Structure', 'headings come from the outline and stay in sync'],
        ['Status', 'yet to begin, in progress, completed or reviewed'],
      ]}
    />
  ),
  'a-meta': (
    <GuideList
      rows={[
        ['Series', 'which series and which part'],
        ['Cover & thumbnail', 'upload, link or generate'],
        ['SEO', 'title, description, slug, canonical'],
        ['Social preview', 'how the link will look when shared'],
        ['Details', 'tags, category, author, publish date'],
      ]}
    />
  ),
  'a-distribute': (
    <GuideList
      rows={[
        ['Channels', 'blog, newsletter, LinkedIn, X, shorts'],
        ['Per channel', 'status, link and date'],
        ['Posts', 'ready-to-copy text for each channel'],
        ['Repurpose', 'ideas to cut from the article'],
      ]}
    />
  ),
}

export function guideFor(stage: Stage): ReactNode {
  if (stage.id === 'research') return RES_GUIDE
  if (stage.id === 'capture') return CAP_GUIDE
  return GUIDES[stage.id] ?? null
}
