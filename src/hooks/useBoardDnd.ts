import { PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { pipeOf } from '../lib/selectors'
import { useIdeasStore } from '../state/useIdeasStore'
import { useUiStore } from '../state/useUiStore'

export interface StageDropData {
  pipelineId: string
  stageIndex?: number
  archive?: boolean
}

/** Cross-column idea drag (board stages), replacing legacy's native HTML5
 * DnD (legacy/index.html ~1839-1853): dropping onto a column of the same
 * pipeline moves the idea to that stage; dropping onto the archive folder
 * archives it if it's publishable. */
export function useBoardDnd() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const ideas = useIdeasStore((s) => s.ideas)
  const goToStage = useIdeasStore((s) => s.goToStage)
  const archiveIdea = useIdeasStore((s) => s.archiveIdea)
  const showToast = useUiStore((s) => s.showToast)

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const idea = ideas.find((i) => i.id === active.id)
    if (!idea) return

    const data = over.data.current as StageDropData | undefined
    if (!data || data.pipelineId !== idea.type) return

    if (data.archive) {
      if (idea.stage >= pipeOf(idea).stages.length - 1) {
        archiveIdea(idea.id)
        showToast('📁 Moved to archive')
      } else {
        showToast('Publish the idea before archiving it')
      }
      return
    }

    if (data.stageIndex !== undefined && data.stageIndex !== idea.stage) {
      goToStage(idea.id, data.stageIndex)
      showToast(`Moved to ${pipeOf(idea).stages[data.stageIndex].title}`)
    }
  }

  return { sensors, onDragEnd }
}
