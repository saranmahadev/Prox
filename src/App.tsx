import { useEffect, useState } from 'react'
import { applyTheme, useUiStore } from './state/useUiStore'
import { Button, Chip, ProgressBar, ProgressRing, StatusTracker, Toast, Modal, DrawerShell } from './components/ui'
import type { StageStatus } from './types/idea'

const PIPELINE_COLORS = [
  'article',
  'video',
  'short',
  'workshop',
  'podcast',
  'course',
  'newsletter',
  'carousel',
  'products',
] as const

function App() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const showToast = useUiStore((s) => s.showToast)

  const [pressedChip, setPressedChip] = useState(false)
  const [status, setStatus] = useState<StageStatus>('doing')
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      <header className="flex items-center justify-between border-b border-border pb-4 mb-8">
        <h1 className="font-serif text-2xl font-bold">Prox</h1>
        <Button onClick={toggleTheme}>Toggle theme</Button>
      </header>

      <section className="mb-8">
        <h2 className="font-serif text-lg font-bold mb-3">Pipeline colors</h2>
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          {PIPELINE_COLORS.map((c) => (
            <div
              key={c}
              className="rounded-card border border-border p-3 text-sm font-medium"
              style={{ background: `var(--${c})`, color: 'var(--ink-on-clay)' }}
            >
              {c}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="icon" on>
          ⚙
        </Button>
        <Chip pressed={pressedChip} dot color="var(--article)" count={4} onClick={() => setPressedChip((p) => !p)}>
          Article
        </Chip>
        <Button onClick={() => showToast('📁 Moved to archive')}>Show toast</Button>
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-8">
        <ProgressRing frac={0.58} size={64} color="var(--article)" />
        <div className="w-40">
          <ProgressBar frac={0.4} color="var(--article)" />
        </div>
      </section>

      <section className="mb-8 max-w-xl">
        <StatusTracker status={status} onChange={setStatus} color="var(--article)" />
      </section>

      <section className="flex gap-3">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="mTitle">
        <h2 id="mTitle">Sample modal</h2>
        <p className="text-muted">Overlay shell atom check.</p>
        <Button onClick={() => setModalOpen(false)}>Close</Button>
      </Modal>

      <DrawerShell open={drawerOpen} onClose={() => setDrawerOpen(false)} ariaLabel="Sample drawer">
        <div className="p-8">
          <h2 className="font-serif text-2xl font-bold">Sample drawer</h2>
          <p className="text-muted">Overlay shell atom check.</p>
          <Button onClick={() => setDrawerOpen(false)}>Close</Button>
        </div>
      </DrawerShell>

      <Toast />
    </div>
  )
}

export default App
