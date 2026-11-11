import { useState, type FormEvent } from 'react'
import { useLevelStore } from '../../store/levelStore'
import { JargonText } from '../jargon/JargonText'
import { BUTTON_PRIMARY, INPUT, PANEL_BUTTON } from '../ui'
import { Dialog } from './Dialog'

const COPY = {
  start: {
    title: 'Sync check: pull before you start',
    why: 'Teammates push all day. Pulling first means you build on their latest work, not on an old copy.',
  },
  push: {
    title: 'Sync check: pull before you push',
    why: 'A teammate may have changed something while you worked. Pulling first brings it in, so your push is not rejected.',
  },
} as const

// Teaches pull-before-start and pull-before-push. The learner types the command, asks for
// a hint, lets the game run it, or ignores the warning and finds out what happens.
export function SyncCheck() {
  const popup = useLevelStore((s) => s.popup)
  const close = useLevelStore((s) => s.closePopup)
  return (
    <Dialog open={popup?.type === 'sync'} onClose={close} labelledBy="sync-title">
      {popup?.type === 'sync' && <SyncBody phase={popup.phase} output={popup.output} />}
    </Dialog>
  )
}

function SyncBody({ phase, output }: { phase: 'start' | 'push'; output: string | null }) {
  const runner = useLevelStore((s) => s.runner)
  const submit = useLevelStore((s) => s.submitSyncCommand)
  const choose = useLevelStore((s) => s.syncChoice)
  const [command, setCommand] = useState('')
  const [hint, setHint] = useState(false)

  const hintText = runner?.level.steps.find((s) => s.check?.type === 'syncResolved' && s.check.phase === phase)?.hint
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (command.trim()) submit(command.trim())
  }

  return (
    <>
      <h2 id="sync-title" className="text-title font-medium">
        {COPY[phase].title}
      </h2>
      <p className="mt-2 text-body text-ink-2">
        <JargonText text={COPY[phase].why} terms={['pull']} />
      </p>

      <form onSubmit={onSubmit} className="mt-4">
        <label htmlFor="sync-command" className="text-caption font-medium">
          Type the command
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="sync-command"
            autoFocus
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="git pull origin main"
            spellCheck={false}
            autoComplete="off"
            className={INPUT}
          />
          <button type="submit" className={BUTTON_PRIMARY} disabled={!command.trim()}>
            Run
          </button>
        </div>
      </form>

      {hint && hintText && <p className="mt-2 text-caption text-ink-2">{hintText}</p>}
      {output && <pre className="mt-3 whitespace-pre-wrap rounded-tag bg-raised p-3 font-mono text-meta text-ink-2">{output}</pre>}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button type="button" className={PANEL_BUTTON} onClick={() => setHint(!hint)}>
          {hint ? 'Hide hint' : 'Hint'}
        </button>
        <button type="button" className={PANEL_BUTTON} onClick={() => choose('auto')}>
          Skip and auto-run
        </button>
        <button type="button" className={PANEL_BUTTON} onClick={() => choose('ignore')}>
          Ignore and learn the hard way
        </button>
      </div>
      <p className="mt-2 text-meta text-ink-3">Ignoring carries on without pulling. The replay at the end shows what that would have caused.</p>
    </>
  )
}
