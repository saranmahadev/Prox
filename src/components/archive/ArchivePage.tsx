import type { CSSProperties } from 'react'
import { PIPELINES } from '../../data/pipelines'
import { ARCHIVE_SORTERS, archivedIdeas, matchesQuery } from '../../lib/selectors'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import type { ArchiveSort } from '../../types/idea'
import { Modal } from '../ui'
import { ArchiveSidebar } from './ArchiveSidebar'
import { ArchiveCard } from './ArchiveCard'

const SORT_OPTIONS: [ArchiveSort, string][] = [
  ['new', 'Newest first'],
  ['old', 'Oldest first'],
  ['az', 'Title A–Z'],
  ['pri', 'Priority'],
]

export function ArchivePage() {
  const archiveView = useUiStore((s) => s.archiveView)
  const closeArchive = useUiStore((s) => s.closeArchive)
  const setArchiveFilter = useUiStore((s) => s.setArchiveFilter)
  const setArchiveQuery = useUiStore((s) => s.setArchiveQuery)
  const setArchiveSort = useUiStore((s) => s.setArchiveSort)
  const openIdea = useUiStore((s) => s.openIdea)
  const showToast = useUiStore((s) => s.showToast)

  const ideas = useIdeasStore((s) => s.ideas)
  const restoreIdea = useIdeasStore((s) => s.restoreIdea)
  const deleteIdea = useIdeasStore((s) => s.deleteIdea)

  const open = archiveView !== null
  const view = archiveView ?? { filter: 'all' as const, query: '', sort: 'new' as ArchiveSort }

  const all = archivedIdeas(ideas)
  const countsByPipeline: Record<string, number> = {}
  for (const i of all) countsByPipeline[i.type] = (countsByPipeline[i.type] ?? 0) + 1

  const sorter = ARCHIVE_SORTERS[view.sort] ?? ARCHIVE_SORTERS.new
  const shownPipelines = PIPELINES.filter((p) => view.filter === 'all' || view.filter === p.id)
  const sections = shownPipelines
    .map((p) => ({
      pipeline: p,
      list: all.filter((i) => i.type === p.id && matchesQuery(i, view.query)).sort(sorter),
    }))
    .filter((s) => s.list.length > 0)

  function handleOpen(id: string) {
    closeArchive()
    openIdea(id)
  }

  function handleDelete(id: string) {
    const idea = ideas.find((i) => i.id === id)
    if (!idea) return
    if (confirm(`Delete "${idea.title}" permanently?`)) {
      deleteIdea(id)
      showToast('Idea deleted')
    }
  }

  return (
    <Modal open={open} onClose={closeArchive} full labelledBy="archiveTitle" style={{ '--c': 'var(--accent)' } as CSSProperties}>
      <>
        <header className="arc-top">
          <button className="btn" onClick={closeArchive}>
            ← Back to board
          </button>
          <div className="ttl">
            <div className="kicker">Collection</div>
            <h2 id="archiveTitle">📁 Archive</h2>
          </div>
          <label className="search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Search archive…"
              aria-label="Search archive"
              value={view.query}
              onChange={(e) => setArchiveQuery(e.target.value)}
            />
          </label>
          <select className="sel" aria-label="Sort archive" value={view.sort} onChange={(e) => setArchiveSort(e.target.value as ArchiveSort)}>
            {SORT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </header>
        <div className="arc-layout">
          <ArchiveSidebar total={all.length} filter={view.filter} countsByPipeline={countsByPipeline} onFilterChange={setArchiveFilter} />
          <main className="arc-main">
            {sections.length > 0 ? (
              sections.map(({ pipeline, list }) => (
                <section className="arc-sec" key={pipeline.id} style={{ '--c': `var(--${pipeline.color})` } as CSSProperties}>
                  <h3>
                    {pipeline.icon} {pipeline.name} <span>{list.length}</span>
                  </h3>
                  <div className="arc-grid">
                    {list.map((idea) => (
                      <ArchiveCard key={idea.id} idea={idea} onOpen={handleOpen} onRestore={restoreIdea} onDelete={handleDelete} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="arc-empty">
                <div>📁</div>
                <b>{view.query ? 'No matches' : 'Nothing here yet'}</b>
                <p>{view.query ? 'Try a different search.' : 'Published ideas you archive are saved here as a collection.'}</p>
              </div>
            )}
          </main>
        </div>
      </>
    </Modal>
  )
}
