import { GitGraph as GitGraphIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { hasConflictMarkers } from '../../engine/conflictResolve'
import { useCurrentStep, useLevelStore } from '../../store/levelStore'
import { useUiStore } from '../../store/uiStore'
import { ConflictResolver } from './ConflictResolver'

// Loaded on demand: the editor library is the biggest piece of the app after React.
const CodeEditor = lazy(() => import('./CodeEditor'))

const baseName = (path: string) => path.split('/').pop() ?? path

export function EditorPane() {
  const snapshot = useLevelStore((s) => s.snapshot)
  const runner = useLevelStore((s) => s.runner)
  const act = useLevelStore((s) => s.act)
  const step = useCurrentStep()
  const [chosen, setChosen] = useState<string | null>(null)
  const graphOpen = useUiStore((s) => s.gitGraphOpen)
  const toggleGraph = useUiStore((s) => s.toggleGitGraph)

  // When a step is about one file, show that file. The tab then stays put after the step
  // is done (so the file you just edited does not vanish), and you can still pick another.
  const target = step?.check?.type === 'fileContains' ? step.check.path : undefined
  useEffect(() => {
    if (target) setChosen(target)
  }, [target])

  // When a pull stops on a conflict, open the conflicted file (Phase 7b).
  const firstConflict = snapshot?.git.conflicts[0]
  useEffect(() => {
    if (firstConflict) setChosen(firstConflict)
  }, [firstConflict])
  // The file the learner chose to fix as plain text instead of with the resolver.
  const [textFor, setTextFor] = useState<string | null>(null)

  if (!snapshot) return null

  const { files, branch, behindMain } = snapshot.git
  const paths = Object.keys(files).sort()
  const path = chosen && paths.includes(chosen) ? chosen : paths[0]
  const content = files[path] ?? ''
  const conflicted = snapshot.git.conflicts.includes(path) && hasConflictMarkers(content)
  const resolving = conflicted && textFor !== path
  const merge = runner?.git.graphState().merge
  const theirsAuthor = merge ? (runner?.git.getCommit(merge.theirs)?.author ?? null) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tag border border-line">
      <div className="flex items-center justify-between border-b border-line bg-raised pr-1">
        <div role="tablist" aria-label="Files" className="flex min-w-0 overflow-x-auto">
          {paths.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === path}
              title={p}
              onClick={() => setChosen(p)}
              className={`-mb-px h-8 shrink-0 border-b-2 px-3 font-mono text-caption transition-colors ${
                p === path ? 'border-accent bg-card text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              {baseName(p)}
            </button>
          ))}
        </div>
        <p className="ml-auto flex min-w-0 items-center gap-2 overflow-hidden pl-3 font-mono text-meta text-ink-2" title={branch}>
          <span className="truncate">{branch}</span>
          {behindMain > 0 && (
            <span className="truncate text-fail">
              {behindMain} commit{behindMain === 1 ? '' : 's'} behind main
            </span>
          )}
        </p>
        {conflicted && !resolving && (
          <button type="button" onClick={() => setTextFor(null)} className="ml-2 flex h-6 shrink-0 items-center rounded-tag px-2 text-meta text-ink-2 transition-colors hover:bg-card hover:text-ink">
            Open resolver
          </button>
        )}
        {/* Shows or hides the Git graph beside the editor. The choice is remembered. */}
        <button
          type="button"
          aria-pressed={graphOpen}
          onClick={toggleGraph}
          title={graphOpen ? 'Hide the Git graph' : 'Show the Git graph'}
          className={`ml-2 flex h-6 shrink-0 items-center gap-1 rounded-tag px-2 font-sans text-meta transition-colors hover:bg-card hover:text-ink ${graphOpen ? 'text-ink' : 'text-ink-2'}`}
        >
          <GitGraphIcon size={16} strokeWidth={1.5} aria-hidden />
          Graph
        </button>
      </div>
      <div className="min-h-0 flex-1 bg-card">
        {resolving ? (
          // Keyed by the file text, so the picks start fresh if the file changes underneath.
          <ConflictResolver
            key={`${path}\n${content}`}
            path={path}
            content={content}
            theirsAuthor={theirsAuthor}
            onApply={(next) => act({ type: 'editFile', path, content: next })}
            onEditText={() => setTextFor(path)}
          />
        ) : (
          <Suspense fallback={<p className="p-4 text-caption text-ink-3">Loading editor</p>}>
            <CodeEditor key={path} value={content} label={`Editing ${path}`} onChange={(next) => act({ type: 'editFile', path, content: next })} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
