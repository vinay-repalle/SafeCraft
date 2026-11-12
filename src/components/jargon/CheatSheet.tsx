import { Download } from 'lucide-react'
import { jargon } from '../../content'
import { useProgressStore } from '../../store/progressStore'
import { cheatSheetFileName, cheatSheetMarkdownBlob, cheatSheetPdfBlob, metTerms } from '../../utils/cheatSheet'
import { dateStamp, downloadBlob } from '../../utils/download'
import { Dialog } from '../popups/Dialog'
import { PANEL_BUTTON } from '../ui'
import { GuideLink } from './GuideLink'

type Props = { open: boolean; onClose: () => void }

// Every term and command the learner has met so far, with a download as Markdown or PDF.
export function CheatSheet({ open, onClose }: Props) {
  const seen = useProgressStore((s) => s.seenTerms)
  const met = metTerms(jargon, seen)
  const stamp = dateStamp()

  return (
    <Dialog open={open} onClose={onClose} labelledBy="cheat-title">
      <h2 id="cheat-title" className="text-title font-medium">
        Cheat sheet
      </h2>
      {met.length === 0 ? (
        <p className="mt-3 text-body text-ink-2">Terms and commands you meet in a level are collected here.</p>
      ) : (
        <ul className="mt-4 max-h-[55vh] divide-y divide-line overflow-y-auto">
          {met.map((t) => (
            <li key={t.id} className="py-3">
              <p className="text-body font-medium">{t.term}</p>
              <p className="mt-1 text-caption text-ink-2">{t.meaning}</p>
              {t.command && <code className="mt-2 block rounded-tag bg-raised px-2 py-1 font-mono text-meta">{t.command}</code>}
              {t.shortcut && <p className="mt-1 text-meta text-ink-3">Shortcut: {t.shortcut}</p>}
              <GuideLink slug={t.guide} onNavigate={onClose} />
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className={PANEL_BUTTON}
            disabled={met.length === 0}
            onClick={() => downloadBlob(cheatSheetMarkdownBlob(met, stamp), cheatSheetFileName('md', stamp))}
          >
            <Download size={16} strokeWidth={1.5} />
            Markdown
          </button>
          <button
            type="button"
            className={PANEL_BUTTON}
            disabled={met.length === 0}
            onClick={() => downloadBlob(cheatSheetPdfBlob(met, stamp), cheatSheetFileName('pdf', stamp))}
          >
            <Download size={16} strokeWidth={1.5} />
            PDF
          </button>
        </div>
        <button type="button" className={PANEL_BUTTON} onClick={onClose}>
          Close
        </button>
      </div>
    </Dialog>
  )
}
