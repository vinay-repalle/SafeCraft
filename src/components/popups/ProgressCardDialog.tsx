import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { jargon } from '../../content'
import { selectProgress, useProgressStore } from '../../store/progressStore'
import { buildCardData } from '../../utils/badges'
import { dateStamp, downloadBlob } from '../../utils/download'
import { CARD_SIZE, drawProgressCard, readCardColors, renderProgressCardPng } from '../../utils/progressCard'
import { BUTTON_PRIMARY, PANEL_BUTTON } from '../ui'
import { Dialog } from './Dialog'

type Props = { open: boolean; onClose: () => void }

// A preview of the Progress Card with a button to download it as a PNG picture.
export function ProgressCardDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="card-title" wide>
      <CardContent onClose={onClose} />
    </Dialog>
  )
}

function CardContent({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  // useProgressStore returns the whole saved data; selectProgress keeps only the saved fields.
  const completed = useProgressStore((s) => s.completed)
  const seenTerms = useProgressStore((s) => s.seenTerms)
  const guidesRead = useProgressStore((s) => s.guidesRead)
  const stamp = dateStamp()

  const build = () => buildCardData(selectProgress(useProgressStore.getState()), jargon.length, stamp)

  // Draw once the fonts are ready, so the preview uses the same type as the app.
  useEffect(() => {
    let cancelled = false
    const draw = () => {
      const ctx = canvas.current?.getContext('2d')
      if (!cancelled && ctx) drawProgressCard(ctx, build(), readCardColors())
    }
    draw()
    void document.fonts?.ready.then(draw)
    return () => {
      cancelled = true
    }
    // The card redraws when any of the progress it shows changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, seenTerms, guidesRead])

  const download = async () => {
    try {
      downloadBlob(await renderProgressCardPng(build()), `synccraft-progress-card-${stamp}.png`)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The card could not be saved.')
    }
  }

  return (
    <>
      <h2 id="card-title" className="text-title font-medium">
        Progress card
      </h2>
      <p className="mt-1 text-body text-ink-2">A picture of your levels and badges. It is made in your browser and saved to your computer.</p>
      <canvas
        ref={canvas}
        width={CARD_SIZE.width}
        height={CARD_SIZE.height}
        role="img"
        aria-label="Preview of your progress card"
        className="mt-4 block w-full rounded-card border border-line"
      />
      {error && (
        <p role="alert" className="mt-3 text-caption text-fail">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={PANEL_BUTTON} onClick={onClose}>
          Close
        </button>
        <button type="button" className={BUTTON_PRIMARY} onClick={download}>
          <Download size={16} strokeWidth={1.5} />
          Download PNG
        </button>
      </div>
    </>
  )
}
