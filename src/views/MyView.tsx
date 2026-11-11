import { ROLE_INFO } from '../app/nav'
import { useProgressStore } from '../store/progressStore'
import { ViewIntro } from './ViewIntro'

const ZONES = [
  {
    title: 'Board and chat',
    body: 'Tickets move through To do, In progress, Review and Done. Teammate chat sits beneath the board.',
    phase: 'Phase 3',
  },
  {
    title: 'Code and Git',
    body: 'A code editor with Create branch, Commit, Pull, Push and Raise PR buttons. Each shows its real command.',
    phase: 'Phase 3',
  },
  {
    title: 'Pipeline',
    body: 'An isometric scene of the client, ticket, developer desk, GitHub, test server and live cloud.',
    phase: 'Phase 4',
  },
]

export function MyView() {
  const role = useProgressStore((s) => s.settings.role)
  const info = ROLE_INFO.find((r) => r.id === role)!

  return (
    <ViewIntro
      title="My view"
      description="The three-zone playground from the chosen role's point of view."
      phase="phase 3"
    >
      <p className="mt-6 text-body">
        <span className="font-medium">{info.label}.</span>{' '}
        <span className="text-ink-2">
          {info.playable ? 'You can play this role.' : 'This role is observe only in v1.'}
        </span>
      </p>
      {/* Real proportions of the final layout: narrow, wide, narrow. */}
      <div className="mt-4 grid grid-cols-[1fr_1.4fr_1fr] gap-4">
        {ZONES.map((zone) => (
          <div key={zone.title} className="min-h-96 rounded-panel border border-line bg-card p-5">
            <h2 className="text-body font-medium">{zone.title}</h2>
            <p className="mt-2 text-caption text-ink-2">{zone.body}</p>
            <p className="mt-3 text-meta text-ink-3">{zone.phase}</p>
          </div>
        ))}
      </div>
    </ViewIntro>
  )
}
