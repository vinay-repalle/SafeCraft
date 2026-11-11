import { useLevelStore } from '../../store/levelStore'
import { BUTTON_PRIMARY, PANEL_BUTTON } from '../ui'
import { Dialog } from './Dialog'

// After the level: what went wrong, and what it would have caused on a real team.
export function MistakesReplay() {
  const popup = useLevelStore((s) => s.popup)
  const runner = useLevelStore((s) => s.runner)
  const close = useLevelStore((s) => s.closePopup)
  const restart = useLevelStore((s) => s.restart)
  const open = popup?.type === 'replay' && !!runner

  const result = open ? runner!.result() : null
  const skipped = result?.autoFilledSteps.length ?? 0

  return (
    <Dialog open={open} onClose={close} labelledBy="replay-title">
      {result && (
        <>
          <h2 id="replay-title" className="text-title font-medium">
            Mistakes replay
          </h2>
          {result.replay.length === 0 ? (
            <p className="mt-3 text-body text-ink-2">This run had none of the mistakes the level watches for.</p>
          ) : (
            <ul className="mt-4 max-h-[55vh] divide-y divide-line overflow-y-auto">
              {result.replay.map((item) => (
                <li key={item.mistake} className="py-3">
                  <p className="text-body font-medium text-ink">
                    {item.you}
                    {item.count > 1 && <span className="font-normal text-ink-3"> ({item.count} times)</span>}
                  </p>
                  <p className="mt-1 text-body text-ink-2">{item.result}</p>
                </li>
              ))}
            </ul>
          )}
          {skipped > 0 && (
            <p className="mt-3 text-caption text-ink-3">
              You used Skip and auto-fill on {skipped} step{skipped === 1 ? '' : 's'}. Try those by hand next time to see how they work.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={PANEL_BUTTON} onClick={close}>
              Close
            </button>
            <button type="button" className={BUTTON_PRIMARY} onClick={restart}>
              Play again
            </button>
          </div>
        </>
      )}
    </Dialog>
  )
}
