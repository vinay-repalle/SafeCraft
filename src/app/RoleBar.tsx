import { useProgressStore } from '../store/progressStore'
import { ROLE_INFO } from './nav'
import { ProgressTransfer } from './ProgressTransfer'

export function RoleBar() {
  const role = useProgressStore((s) => s.settings.role)
  const setRole = useProgressStore((s) => s.setRole)

  const groups = [
    { label: 'Play', roles: ROLE_INFO.filter((r) => r.playable) },
    { label: 'Observe only', roles: ROLE_INFO.filter((r) => !r.playable) },
  ]

  return (
    // Phase 9: on a narrow window the bar wraps onto more rows instead of squeezing the role names.
    // (Not a sideways scroll: that would clip the import message that hangs below the buttons.)
    <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-2 lg:px-6">
      <div role="group" aria-label="Role" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {groups.map((group, i) => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            {i > 0 && <span aria-hidden className="mr-4 hidden h-5 w-px bg-line md:block" />}
            <span className="mr-1 whitespace-nowrap text-meta text-ink-3">{group.label}</span>
            {group.roles.map(({ id, label }) => {
              const active = role === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRole(id)}
                  className={`h-8 whitespace-nowrap rounded-control border px-3 text-body transition-colors ${
                    active
                      ? 'border-accent bg-card font-medium text-ink'
                      : 'border-transparent text-ink-2 hover:bg-raised hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <ProgressTransfer />
    </div>
  )
}
