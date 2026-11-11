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
    <div className="flex h-14 items-center justify-between border-b border-line px-6">
      <div role="group" aria-label="Role" className="flex items-center gap-6">
        {groups.map((group, i) => (
          <div key={group.label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="mr-4 h-5 w-px bg-line" />}
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
