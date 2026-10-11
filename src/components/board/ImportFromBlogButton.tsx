import { useState } from 'react'
import { Modal, Button, CloseButton } from '../ui'
import { fetchBlogFile } from '../../lib/githubPublish'
import { importMdxToArticle } from '../../lib/importFromMdx'
import { getPipeline } from '../../data/pipelines'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'

/** Re-imports an already-published Blog post back into Prox as an
 * editable idea (Phase 8's round trip) - fetches the live MDX by its repo
 * path, runs it through imaxt-mdx's mdxToBlocks, and lands on the Draft
 * stage with the body, cover and metadata already filled in. */
export function ImportFromBlogButton() {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('src/content/posts/')
  const [branch, setBranch] = useState('')
  const [loading, setLoading] = useState(false)
  const addIdea = useIdeasStore((s) => s.addIdea)
  const updateDraft = useIdeasStore((s) => s.updateDraft)
  const updateMeta = useIdeasStore((s) => s.updateMeta)
  const goToStage = useIdeasStore((s) => s.goToStage)
  const openIdea = useUiStore((s) => s.openIdea)
  const showToast = useUiStore((s) => s.showToast)

  async function handleImport() {
    const trimmedPath = path.trim()
    if (!trimmedPath) return
    setLoading(true)
    try {
      const source = await fetchBlogFile(trimmedPath, branch.trim() || undefined)
      const imported = importMdxToArticle(source)
      const idea = addIdea({ type: 'article', title: imported.title || trimmedPath, tags: imported.tags, priority: 'med' })
      updateDraft(idea.id, imported.draft)
      updateMeta(idea.id, imported.meta)
      const draftStageIndex = getPipeline('article').stages.findIndex((s) => s.id === 'a-draft')
      if (draftStageIndex >= 0) goToStage(idea.id, draftStageIndex)
      setOpen(false)
      openIdea(idea.id)
      showToast(`Imported "${imported.title || trimmedPath}"`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="chip" title="Re-import an already-published post from Blog" onClick={() => setOpen(true)}>
        ⬇ Import from Blog
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="import-h">
        <div className="mrow" style={{ justifyContent: 'space-between' }}>
          <h5 id="import-h">Import from Blog</h5>
          <CloseButton onClick={() => setOpen(false)} />
        </div>
        <p className="rs-hint">
          The repo path of an already-published post, e.g. <code>src/content/posts/welcome-to-drafted.mdx</code> or{' '}
          <code>src/content/series/dev-universe/a-connected-ecosystem.mdx</code>.
        </p>
        <div className="mf">
          <label>Path</label>
          <input type="text" value={path} aria-label="Blog file path" onChange={(e) => setPath(e.target.value)} />
        </div>
        <div className="mf">
          <label>Branch (optional)</label>
          <input
            type="text"
            value={branch}
            placeholder="main"
            aria-label="Branch"
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>
        <Button variant="primary" disabled={!path.trim() || loading} onClick={handleImport}>
          {loading ? 'Importing…' : 'Fetch & import'}
        </Button>
      </Modal>
    </>
  )
}
