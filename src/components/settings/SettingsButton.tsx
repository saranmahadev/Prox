import { useEffect, useState } from 'react'
import { Modal, Button, CloseButton } from '../ui'
import { clearGithubToken, hasGithubToken, setGithubToken } from '../../lib/githubPublish'
import { useUiStore } from '../../state/useUiStore'

/** App-wide settings - today, just the GitHub token that "Complete &
 * publish" uses to open a PR on saranmahadev/blog. The token never lives
 * in this component's state once saved: it goes straight to the Rust side
 * (src-tauri/src/github.rs), which puts it in the OS keychain. */
export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const showToast = useUiStore((s) => s.showToast)

  useEffect(() => {
    if (!open) return
    hasGithubToken()
      .then(setHasToken)
      .catch(() => setHasToken(false))
  }, [open])

  async function handleSave() {
    const token = draft.trim()
    if (!token) return
    setSaving(true)
    try {
      await setGithubToken(token)
      setDraft('')
      setHasToken(true)
      showToast('GitHub token saved')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save the token')
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!confirm('Remove the saved GitHub token? Publishing will stop working until a new one is added.')) return
    try {
      await clearGithubToken()
      setHasToken(false)
      showToast('GitHub token removed')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove the token')
    }
  }

  return (
    <>
      <button className="chip" title="GitHub publishing settings" onClick={() => setOpen(true)}>
        ⚙ Settings
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="settings-h">
        <div className="mrow" style={{ justifyContent: 'space-between' }}>
          <h5 id="settings-h">Publishing to Blog</h5>
          <CloseButton onClick={() => setOpen(false)} />
        </div>
        <p className="rs-hint">
          A fine-grained GitHub personal access token, scoped to <code>Contents: write</code> and{' '}
          <code>Pull requests: write</code> on <code>saranmahadev/blog</code> only. It's stored in your OS keychain, never in
          this app's data file.
        </p>
        <p className="rs-hint">Status: {hasToken === null ? 'checking…' : hasToken ? 'a token is saved' : 'no token saved yet'}</p>
        <div className="mrow">
          <input
            type="password"
            autoComplete="off"
            placeholder="github_pat_…"
            aria-label="GitHub token"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button variant="primary" disabled={!draft.trim() || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {hasToken && (
          <Button variant="danger" onClick={handleClear}>
            Remove saved token
          </Button>
        )}
      </Modal>
    </>
  )
}
