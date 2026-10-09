import { useEffect } from 'react'
import { applyTheme, useUiStore } from './state/useUiStore'
import { Board } from './components/board'
import { Toast } from './components/ui'

function App() {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <>
      <Board />
      <Toast />
    </>
  )
}

export default App
