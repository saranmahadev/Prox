import type { ReactNode } from 'react'
import { fileIcon, formatFileSize, isPreviewable } from '../../../lib/fileStore'
import { hostOf, normalizeUrl } from '../../../lib/url'
import type { Source } from '../../../types/idea'

interface SourceRowProps {
  source: Source
  readOnly?: boolean
  onOpen?: (source: Source) => void
  onDownload?: (source: Source) => void
  onRemove?: (sourceId: string) => void
  onNoteChange?: (sourceId: string, note: string) => void
}

export function SourceRow({ source, readOnly, onOpen, onDownload, onRemove, onNoteChange }: SourceRowProps) {
  const url = source.url ? normalizeUrl(source.url) : ''
  let icon: string
  let kind: string
  let name: ReactNode

  if (source.file) {
    icon = fileIcon(source.file.type)
    kind = 'File'
    name = (
      <>
        <button className="rs-open" title={isPreviewable(source.file.type) ? 'Open' : 'Download'} onClick={() => onOpen?.(source)}>
          {source.title || source.file.name}
        </button>
        <small>{formatFileSize(source.file.size)}</small>
      </>
    )
  } else if (url) {
    icon = '🔗'
    kind = 'Link'
    name = (
      <>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {source.title || hostOf(source.url)}
        </a>
        {source.title && <small>{hostOf(source.url)}</small>}
      </>
    )
  } else {
    icon = '📄'
    kind = 'Docs'
    name = <span>{source.title}</span>
  }

  return (
    <li className="rs-row">
      <span className="rs-ico" aria-hidden="true">
        {icon}
      </span>
      <div className="rs-main">
        <div className="rs-t">
          {name}
          <span className="rs-kind">{kind}</span>
        </div>
        {readOnly ? (
          source.note && <p className="rs-n">{source.note}</p>
        ) : (
          <input
            type="text"
            className="rs-note"
            value={source.note}
            placeholder="Why does this matter?"
            aria-label={`Note for ${source.title || source.url}`}
            onChange={(e) => onNoteChange?.(source.id, e.target.value)}
          />
        )}
      </div>
      {source.file && (
        <button className="rs-x show" aria-label="Download" title="Download" onClick={() => onDownload?.(source)}>
          ⬇
        </button>
      )}
      {!readOnly && (
        <button className="rs-x" aria-label="Remove source" title="Remove" onClick={() => onRemove?.(source.id)}>
          ✕
        </button>
      )}
    </li>
  )
}
