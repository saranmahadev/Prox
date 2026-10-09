import { useRef, useState, type ChangeEvent } from 'react'
import { PALETTES } from '../../../lib/articleMeta'
import { MAX_FILE_SIZE } from '../../../lib/fileStore'
import { useIdeasStore } from '../../../state/useIdeasStore'
import { useUiStore } from '../../../state/useUiStore'
import type { Idea } from '../../../types/idea'

interface CoverSectionProps {
  idea: Idea
}

function drawThumbnail(canvas: HTMLCanvasElement, paletteIndex: number, text: string, author: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const [a, b, fg] = PALETTES[paletteIndex][1]
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630)
  gradient.addColorStop(0, a)
  gradient.addColorStop(1, b)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1200, 630)
  ctx.fillStyle = fg
  ctx.font = '700 72px Georgia, serif'
  ctx.textBaseline = 'top'

  const words = String(text || '').split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const t = current ? current + ' ' + w : w
    if (ctx.measureText(t).width > 1000 && current) {
      lines.push(current)
      current = w
    } else current = t
  }
  if (current) lines.push(current)

  const shown = lines.slice(0, 4)
  const h = shown.length * 88
  const y0 = (630 - h) / 2
  shown.forEach((l, n) => ctx.fillText(l, 100, y0 + n * 88))

  ctx.font = '500 30px Inter, sans-serif'
  ctx.globalAlpha = 0.8
  ctx.fillText(author || 'Dev', 100, 550)
  ctx.globalAlpha = 1
}

export function CoverSection({ idea }: CoverSectionProps) {
  const updateMeta = useIdeasStore((s) => s.updateMeta)
  const setCoverFile = useIdeasStore((s) => s.setCoverFile)
  const setCoverFromBlob = useIdeasStore((s) => s.setCoverFromBlob)
  const showToast = useUiStore((s) => s.showToast)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [thumbText, setThumbText] = useState(idea.title)
  const [paletteIndex, setPaletteIndex] = useState(0)

  async function handleCoverUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      showToast('Image is over 25 MB')
      return
    }
    await setCoverFile(idea.id, file)
    showToast('Cover uploaded')
  }

  async function handleGenerateThumbnail() {
    const canvas = canvasRef.current
    if (!canvas) return
    drawThumbnail(canvas, paletteIndex, thumbText, idea.meta?.author ?? '')
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    await setCoverFromBlob(idea.id, blob)
    showToast('Thumbnail set as cover')
  }

  return (
    <section className="rs-sec">
      <h5>Cover &amp; thumbnail</h5>
      <p className="rs-hint">Upload a cover, paste a URL, or generate a thumbnail from the title.</p>
      <div className="mrow">
        <label className="btn rs-upl">
          ⬆ Upload cover
          <input type="file" accept="image/*" hidden onChange={handleCoverUpload} />
        </label>
        <input
          type="text"
          value={idea.meta?.coverUrl ?? ''}
          placeholder="…or paste an image URL"
          aria-label="Cover image URL"
          onChange={(e) => updateMeta(idea.id, { coverUrl: e.target.value })}
        />
      </div>
      <div className="mf">
        <label>Alt text</label>
        <input
          type="text"
          value={idea.meta?.coverAlt ?? ''}
          placeholder="Describe the cover for screen readers"
          onChange={(e) => updateMeta(idea.id, { coverAlt: e.target.value })}
        />
      </div>
      <details className="thumb">
        <summary>Thumbnail maker</summary>
        <div className="mrow">
          <input type="text" value={thumbText} aria-label="Thumbnail text" onChange={(e) => setThumbText(e.target.value)} />
          <select aria-label="Palette" value={paletteIndex} onChange={(e) => setPaletteIndex(+e.target.value)}>
            {PALETTES.map(([name], k) => (
              <option key={name} value={k}>
                {name}
              </option>
            ))}
          </select>
          <button className="btn primary" type="button" onClick={handleGenerateThumbnail}>
            Generate &amp; use as cover
          </button>
        </div>
        <canvas ref={canvasRef} width={1200} height={630} aria-hidden="true" />
      </details>
    </section>
  )
}
