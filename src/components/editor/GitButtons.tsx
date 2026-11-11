import { ArrowDownToLine, ArrowUpFromLine, GitBranch, GitCommitHorizontal, GitPullRequest, type LucideIcon } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useLevelStore } from '../../store/levelStore'
import { BUTTON_PRIMARY, INPUT } from '../ui'

type Tool = 'branch' | 'commit' | 'pull' | 'push' | 'pr'

const TOOLS: { id: Tool; label: string; Icon: LucideIcon; placeholder?: string; field?: string }[] = [
  { id: 'branch', label: 'Create branch', Icon: GitBranch, placeholder: 'feature/ORD-14-short-name', field: 'Branch name' },
  { id: 'commit', label: 'Commit', Icon: GitCommitHorizontal, placeholder: 'ORD-14 What changed', field: 'Commit message' },
  { id: 'pull', label: 'Pull', Icon: ArrowDownToLine },
  { id: 'push', label: 'Push', Icon: ArrowUpFromLine },
  { id: 'pr', label: 'Raise PR', Icon: GitPullRequest, placeholder: 'ORD-14 Title of the pull request', field: 'Pull request title' },
]

// The Git buttons from the PRD. Choosing a button does not run it: it shows the real
// command first, then Run executes exactly that. The terminal below logs what ran.
export function GitButtons() {
  const snapshot = useLevelStore((s) => s.snapshot)
  const act = useLevelStore((s) => s.act)
  const runCommand = useLevelStore((s) => s.runCommand)
  const [tool, setTool] = useState<Tool>('pull')
  const [value, setValue] = useState('')
  if (!snapshot) return null

  const branch = snapshot.git.branch
  const current = TOOLS.find((t) => t.id === tool)!
  const text = value.trim()
  const needsText = Boolean(current.field)

  const run = () => {
    if (needsText && !text) return
    if (tool === 'branch') runCommand(`git checkout -b ${text}`)
    if (tool === 'commit') {
      // The terminal has no quote escaping, so quotes inside a message become apostrophes.
      runCommand('git add .')
      runCommand(`git commit -m "${text.replaceAll('"', "'")}"`)
    }
    if (tool === 'pull') runCommand('git pull origin main')
    if (tool === 'push') runCommand(`git push -u origin ${branch}`)
    if (tool === 'pr') act({ type: 'raisePr', title: text })
    setValue('')
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') run()
  }

  const choose = (id: Tool) => {
    setTool(id)
    setValue('')
  }

  return (
    <div className="rounded-tag border border-line bg-raised p-3">
      <div role="group" aria-label="Git actions" className="flex flex-wrap gap-1.5">
        {TOOLS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tool === id}
            onClick={() => choose(id)}
            className={`flex h-8 items-center gap-2 whitespace-nowrap rounded-control border px-3 text-body transition-colors ${
              tool === id ? 'border-accent bg-card font-medium text-ink' : 'border-line text-ink-2 hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1 font-mono text-caption text-ink-2">
          {tool === 'commit' && <p>git add .</p>}
          <div className="flex items-center gap-2">
            {tool === 'branch' && <span className="shrink-0">git checkout -b</span>}
            {tool === 'commit' && <span className="shrink-0">git commit -m</span>}
            {tool === 'pull' && <span className="text-ink">git pull origin main</span>}
            {tool === 'push' && <span className="text-ink">git push -u origin {branch}</span>}
            {tool === 'pr' && <span className="shrink-0">gh pr create --base main --title</span>}
            {needsText && (
              <input
                aria-label={current.field}
                className={INPUT}
                placeholder={current.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKey}
                spellCheck={false}
              />
            )}
          </div>
        </div>
        <button type="button" className={BUTTON_PRIMARY} onClick={run} disabled={needsText && !text}>
          Run
        </button>
      </div>
      <p className="mt-1 text-meta text-ink-3">
        {tool === 'pr' ? 'Pull requests live on GitHub; this is the GitHub command line equivalent.' : 'This is the real command that runs.'}
        {tool === 'commit' && ' Press Enter to commit.'}
      </p>
    </div>
  )
}
