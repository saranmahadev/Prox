import { useEffect } from 'react'
import { applyTheme, useUiStore } from './state/useUiStore'
import { Board } from './components/board'
import { IdeaDetailPage } from './components/idea-detail/IdeaDetailPage'
import { ArchivePage } from './components/archive/ArchivePage'
import { Toast } from './components/ui'

function App() {
  const theme = useUiStore((s) => s.theme)
  const drawer = useUiStore((s) => s.drawer)
  const openIdea = useUiStore((s) => s.openIdea)
  const openGuide = useUiStore((s) => s.openGuide)
  const openArchive = useUiStore((s) => s.openArchive)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <>
      <Board onOpenIdea={openIdea} onOpenStageGuide={openGuide} onOpenArchive={openArchive} />
      <IdeaDetailPage drawer={drawer} onEdit={() => {}} />
      <ArchivePage />
      <Toast />
    </>
  )
}

export default App
