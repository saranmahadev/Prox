import { useEffect } from 'react'
import { applyTheme, useUiStore } from './state/useUiStore'
import { Board } from './components/board'
import { IdeaDetailPage } from './components/idea-detail/IdeaDetailPage'
import { Toast } from './components/ui'

function App() {
  const theme = useUiStore((s) => s.theme)
  const drawer = useUiStore((s) => s.drawer)
  const openIdea = useUiStore((s) => s.openIdea)
  const openGuide = useUiStore((s) => s.openGuide)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <>
      <Board onOpenIdea={openIdea} onOpenStageGuide={openGuide} />
      <IdeaDetailPage drawer={drawer} onEdit={() => {}} />
      <Toast />
    </>
  )
}

export default App
