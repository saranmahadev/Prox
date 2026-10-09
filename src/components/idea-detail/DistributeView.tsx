import { useState, type FormEvent } from 'react'
import { CHANNELS, snippet } from '../../data/distribution'
import { stageStatusOf } from '../../lib/selectors'
import { useIdeasStore } from '../../state/useIdeasStore'
import { useUiStore } from '../../state/useUiStore'
import { StatusTracker } from '../ui'
import { ChannelRow } from './distribute/ChannelRow'
import type { ChannelDist, Idea } from '../../types/idea'

interface DistributeViewProps {
  idea: Idea
}

const EMPTY_CHANNEL: ChannelDist = { status: 'todo', url: '', date: '' }

export function DistributeView({ idea }: DistributeViewProps) {
  const setStageStatus = useIdeasStore((s) => s.setStageStatus)
  const setChannelStatus = useIdeasStore((s) => s.setChannelStatus)
  const setChannelField = useIdeasStore((s) => s.setChannelField)
  const addRepurpose = useIdeasStore((s) => s.addRepurpose)
  const removeRepurpose = useIdeasStore((s) => s.removeRepurpose)
  const showToast = useUiStore((s) => s.showToast)

  const [newRepurpose, setNewRepurpose] = useState('')
  const channels = idea.dist?.channels ?? {}
  const repurpose = idea.dist?.repurpose ?? []
  const postedCount = CHANNELS.filter(([k]) => channels[k]?.status === 'posted').length

  async function handleCopy(channelKey: string) {
    try {
      await navigator.clipboard.writeText(snippet(idea, channelKey))
      showToast('Post copied')
    } catch {
      showToast('Could not copy')
    }
  }

  function handleAddRepurpose(e: FormEvent) {
    e.preventDefault()
    const v = newRepurpose.trim()
    if (!v) return
    addRepurpose(idea.id, v)
    setNewRepurpose('')
  }

  return (
    <>
      <StatusTracker id="trk" status={stageStatusOf(idea, 'a-distribute')} onChange={(status) => setStageStatus(idea.id, 'a-distribute', status)} color="var(--article)" />
      <section className="rs-sec">
        <h5>
          Channels <span className="rs-count">{postedCount}/{CHANNELS.length} posted</span>
        </h5>
        <ul className="ch-list">
          {CHANNELS.map(([key, label, icon]) => (
            <ChannelRow
              key={key}
              idea={idea}
              channelKey={key}
              label={label}
              icon={icon}
              channel={channels[key] ?? EMPTY_CHANNEL}
              onStatusChange={(status) => setChannelStatus(idea.id, key, status)}
              onFieldChange={(field, value) => setChannelField(idea.id, key, field, value)}
              onCopy={() => handleCopy(key)}
            />
          ))}
        </ul>
      </section>
      <section className="rs-sec">
        <h5>
          Repurpose <span className="rs-count">{repurpose.length}</span>
        </h5>
        <p className="rs-hint">Shorts, carousels, threads you can cut from this article.</p>
        <form className="rs-add" autoComplete="off" onSubmit={handleAddRepurpose}>
          <input
            type="text"
            value={newRepurpose}
            placeholder="Add a repurpose idea…"
            aria-label="Repurpose idea"
            onChange={(e) => setNewRepurpose(e.target.value)}
          />
          <button className="btn primary" type="submit">
            + Add
          </button>
        </form>
        <ul className="rs-list">
          {repurpose.length ? (
            repurpose.map((r, i) => (
              <li className="rs-row" key={i}>
                <span className="rs-ico">♻️</span>
                <div className="rs-main">
                  <div className="rs-t">{r}</div>
                </div>
                <button className="rs-x" aria-label="Remove" type="button" onClick={() => removeRepurpose(idea.id, i)}>
                  ✕
                </button>
              </li>
            ))
          ) : (
            <li className="rs-empty">Nothing yet.</li>
          )}
        </ul>
      </section>
    </>
  )
}
