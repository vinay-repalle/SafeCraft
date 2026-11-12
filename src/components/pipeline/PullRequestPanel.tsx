import { GitMerge } from 'lucide-react'
import { useLevelStore } from '../../store/levelStore'
import { BUTTON_PRIMARY } from '../ui'

const statusColour = { good: 'text-pass', bad: 'text-fail', wait: 'text-ink-2' } as const

function Row({ name, value, tone }: { name: string; value: string; tone: keyof typeof statusColour }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="text-ink-2">{name}</dt>
      <dd className={`text-right font-medium ${statusColour[tone]}`}>{value}</dd>
    </div>
  )
}

// The pull request page and the automated test log: the second "moment" in DESIGN.md.
export function PullRequestPanel() {
  const snapshot = useLevelStore((s) => s.snapshot)
  const act = useLevelStore((s) => s.act)
  const notice = useLevelStore((s) => s.notice)
  if (!snapshot) return null

  const pr = snapshot.pullRequests.at(-1)
  if (!pr) {
    return <p className="text-caption text-ink-3">No pull request yet. Push your branch, then raise one.</p>
  }

  const report = snapshot.lastTestReport
  const merged = pr.status === 'merged'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto text-caption">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-medium text-ink">
            #{pr.id} {pr.title}
          </p>
          <p className="mt-0.5 font-mono text-meta text-ink-2">
            {pr.head} into {pr.base}
          </p>
        </div>
        {!merged && (
          <button type="button" className={BUTTON_PRIMARY} onClick={() => act({ type: 'mergePr' })}>
            <GitMerge size={16} strokeWidth={1.5} />
            Merge pull request
          </button>
        )}
      </div>

      <dl>
        <Row name="Status" value={merged ? 'Merged' : 'Open'} tone={merged ? 'good' : 'wait'} />
        <Row
          name="Checks"
          value={pr.checks === 'passed' ? 'Passed' : pr.checks === 'failed' ? 'Failed' : 'Running'}
          tone={pr.checks === 'passed' ? 'good' : pr.checks === 'failed' ? 'bad' : 'wait'}
        />
        <Row name="Review" value={pr.approved ? 'Approved' : 'Required'} tone={pr.approved ? 'good' : 'wait'} />
        {!merged && (
          <Row
            name="Branch"
            value={pr.outOfDate ? 'Out of date with main' : 'Up to date with main'}
            tone={pr.outOfDate ? 'bad' : 'good'}
          />
        )}
        {!merged && !pr.mergeable && <Row name="Conflicts" value="Must be resolved before merging" tone="bad" />}
        {snapshot.deployed && <Row name="Release" value="Live" tone="good" />}
      </dl>

      {notice && <p className="text-fail">{notice}</p>}

      {report && (
        <div>
          <p className="mb-1 text-meta text-ink-3">Test log</p>
          <pre className="whitespace-pre-wrap rounded-tag bg-raised p-3 font-mono text-meta">
            {report.log.map((line, i) => (
              <span key={i} className={line.startsWith(' PASS') ? 'text-pass' : line.startsWith(' FAIL') ? 'text-fail' : 'text-ink-2'}>
                {line}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}
