import { useBoardStore } from '../../state/useBoardStore'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'

/**
 * Dev-only escape hatch: wipes every idea/series/file and reseeds the 9
 * one-per-pipeline test ideas (see data/seed.ts). There's no backend yet,
 * so this is the fastest way to get back to a clean slate while testing -
 * remove this button once a real backend/reset flow exists.
 */
export function ResetDataButton() {
  const resetData = useIdeasStore((s) => s.resetData)
  const resetFilters = useBoardStore((s) => s.resetFilters)
  const closeDrawer = useUiStore((s) => s.closeDrawer)
  const showToast = useUiStore((s) => s.showToast)

  async function handleClick() {
    if (!confirm('Reset all data? This deletes every idea and uploaded file and reseeds the 9 test ideas. This cannot be undone.')) return
    closeDrawer()
    // Also clears any leftover search/filter - otherwise it can hide the
    // reseeded ideas and make the reset look like it did nothing.
    resetFilters()
    try {
      await resetData()
      showToast('Data reset')
    } catch (err) {
      console.error('Reset data failed', err)
      showToast('Reset failed - see console')
    }
  }

  return (
    <button className="chip" title="Dev only: wipe all data and reseed test ideas" onClick={handleClick}>
      ♻️ Reset data
    </button>
  )
}
