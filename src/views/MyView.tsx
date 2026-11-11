import { useEffect, useState } from 'react'
import { ROLE_INFO } from '../app/nav'
import { MiniTerminal } from '../components/editor/MiniTerminal'
import { EditorPane } from '../components/editor/EditorPane'
import { GitButtons } from '../components/editor/GitButtons'
import { Board } from '../components/jira/Board'
import { ChatPanel } from '../components/jira/ChatPanel'
import { PullRequestPanel } from '../components/pipeline/PullRequestPanel'
import { StationList } from '../components/pipeline/StationList'
import { MistakesReplay } from '../components/popups/MistakesReplay'
import { RecapDialog } from '../components/popups/RecapDialog'
import { SyncCheck } from '../components/popups/SyncCheck'
import { StepCard } from '../components/StepCard'
import { PANEL } from '../components/ui'
import { useLevelStore } from '../store/levelStore'
import { useProgressStore } from '../store/progressStore'
import { ViewIntro } from './ViewIntro'

type BottomTab = 'terminal' | 'pr'

// My view: the three-zone playground from the PRD. Left: board and chat. Centre: code and
// Git. Right: the pipeline. Level 1 is playable here.
export function MyView() {
  const role = useProgressStore((s) => s.settings.role)
  const completed = useProgressStore((s) => s.completed[1]?.frontend === true)
  const runner = useLevelStore((s) => s.runner)
  const load = useLevelStore((s) => s.load)
  const prCount = useLevelStore((s) => s.snapshot?.pullRequests.length ?? 0)
  const [tab, setTab] = useState<BottomTab>('terminal')

  // Start Level 1 the first time My view opens. The run is kept when you switch tabs.
  useEffect(() => {
    if (!runner) load(1)
  }, [runner, load])

  // Show the pull request page as soon as one exists.
  useEffect(() => {
    if (prCount > 0) setTab('pr')
  }, [prCount])

  if (role !== 'frontend') {
    const info = ROLE_INFO.find((r) => r.id === role)!
    return (
      <ViewIntro
        title="My view"
        description={
          role === 'backend'
            ? 'Level 1 is written for the frontend developer. The backend version of the levels arrives in phase 5.'
            : `${info.label} is observe only in v1. Choose Frontend developer in the role bar to play Level 1.`
        }
        phase="phase 5"
      />
    )
  }

  const level = runner?.level

  return (
    <div className="grid h-full grid-cols-[minmax(300px,1fr)_minmax(480px,1.6fr)_minmax(260px,0.9fr)] gap-4">
      <h1 className="sr-only">My view</h1>

      <section aria-label="Board and chat" className={`${PANEL} p-4`}>
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-body font-medium">{level ? `Level ${level.id}: ${level.title}` : 'Level'}</h2>
          {completed && <span className="text-meta text-pass">Completed</span>}
        </header>
        <div className="mt-3 min-h-0 flex-[3] overflow-y-auto">
          <Board />
        </div>
        <div className="mt-3 flex min-h-0 flex-[2] flex-col border-t border-line pt-3">
          <h2 className="mb-2 text-body font-medium">Team chat</h2>
          <ChatPanel />
        </div>
      </section>

      <section aria-label="Code and Git" className={`${PANEL} gap-3 overflow-x-hidden overflow-y-auto p-4`}>
        <StepCard />
        <div className="flex min-h-56 flex-1 flex-col">
          <EditorPane />
        </div>
        <GitButtons />
        <div className={`flex shrink-0 flex-col rounded-tag border border-line ${tab === 'pr' ? 'h-80' : 'h-48'}`}>
          <div role="tablist" aria-label="Output" className="flex border-b border-line bg-raised">
            {(['terminal', 'pr'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px h-8 border-b-2 px-3 text-caption transition-colors ${
                  tab === id ? 'border-accent bg-card font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                }`}
              >
                {id === 'terminal' ? 'Terminal' : 'Pull request'}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">{tab === 'terminal' ? <MiniTerminal /> : <PullRequestPanel />}</div>
        </div>
      </section>

      <section aria-label="Pipeline" className={`${PANEL} overflow-y-auto p-4`}>
        <h2 className="text-body font-medium">Pipeline</h2>
        <p className="mb-3 mt-1 text-caption text-ink-2">Where your change is on its way to customers.</p>
        <StationList />
      </section>

      <RecapDialog />
      <SyncCheck />
      <MistakesReplay />
    </div>
  )
}
