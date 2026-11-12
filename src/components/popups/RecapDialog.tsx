import { ROLE_INFO } from '../../app/nav'
import { useLevelStore } from '../../store/levelStore'
import { BUTTON_PRIMARY } from '../ui'
import { Dialog } from './Dialog'

// Opens every level: why it exists, a short recap, and the scenario. From the PRD.
export function RecapDialog() {
  const popup = useLevelStore((s) => s.popup)
  const runner = useLevelStore((s) => s.runner)
  const close = useLevelStore((s) => s.closePopup)
  const level = runner?.level
  // Each level is written from one seat. Name that seat, not always the frontend one.
  const seat = ROLE_INFO.find((r) => r.id === (level?.perspective ?? 'frontend'))?.label.toLowerCase() ?? 'frontend developer'

  return (
    <Dialog open={popup?.type === 'recap' && !!level} onClose={close} labelledBy="recap-title">
      {level && (
        <>
          <p className="text-meta text-ink-3">Level {level.id}</p>
          <h2 id="recap-title" className="mt-1 text-title font-medium">
            {level.title}
          </h2>
          <p className="mt-4 text-body font-medium">Why this exists</p>
          <p className="mt-1 text-body text-ink-2">{level.whyItExists}</p>
          <p className="mt-4 text-body font-medium">Recap</p>
          <p className="mt-1 text-body text-ink-2">{level.recap}</p>
          <p className="mt-4 text-body font-medium">Scenario</p>
          <p className="mt-1 text-body text-ink-2">
            You are the {seat} on {level.scenario.app}. {level.scenario.ticket.id} is assigned to you.
          </p>
          <div className="mt-6 flex justify-end">
            <button type="button" className={BUTTON_PRIMARY} onClick={close}>
              Start level
            </button>
          </div>
        </>
      )}
    </Dialog>
  )
}
