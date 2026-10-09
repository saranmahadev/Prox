import { DISTRIBUTE_STATUS, snippet } from '../../../data/distribution'
import type { ChannelDist, Idea } from '../../../types/idea'

interface ChannelRowProps {
  idea: Idea
  channelKey: string
  label: string
  icon: string
  channel: ChannelDist
  onStatusChange: (status: ChannelDist['status']) => void
  onFieldChange: (field: 'url' | 'date', value: string) => void
  onCopy: () => void
}

export function ChannelRow({ idea, channelKey, label, icon, channel, onStatusChange, onFieldChange, onCopy }: ChannelRowProps) {
  return (
    <li className="ch-row">
      <div className="ch-head">
        <span className="ch-n">
          {icon} {label}
        </span>
        <div className="seg" role="radiogroup" aria-label={`${label} status`}>
          {DISTRIBUTE_STATUS.map(([s, statusLabel]) => (
            <button
              key={s}
              type="button"
              className="chip"
              role="radio"
              aria-checked={channel.status === s}
              onClick={() => onStatusChange(s as ChannelDist['status'])}
            >
              {statusLabel}
            </button>
          ))}
        </div>
      </div>
      <div className="ch-body">
        <input
          type="text"
          value={channel.url}
          placeholder="Post URL"
          aria-label={`${label} URL`}
          onChange={(e) => onFieldChange('url', e.target.value)}
        />
        <input type="date" value={channel.date} aria-label={`${label} date`} onChange={(e) => onFieldChange('date', e.target.value)} />
        <button className="btn" type="button" onClick={onCopy}>
          Copy post
        </button>
      </div>
      <pre className="ch-snip">{snippet(idea, channelKey)}</pre>
    </li>
  )
}
