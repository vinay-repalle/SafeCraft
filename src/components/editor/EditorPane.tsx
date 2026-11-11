import { lazy, Suspense, useEffect, useState } from 'react'
import { useCurrentStep, useLevelStore } from '../../store/levelStore'

// Loaded on demand: the editor library is the biggest piece of the app after React.
const CodeEditor = lazy(() => import('./CodeEditor'))

const baseName = (path: string) => path.split('/').pop() ?? path

export function EditorPane() {
  const snapshot = useLevelStore((s) => s.snapshot)
  const act = useLevelStore((s) => s.act)
  const step = useCurrentStep()
  const [chosen, setChosen] = useState<string | null>(null)

  // When a step is about one file, show that file. The tab then stays put after the step
  // is done (so the file you just edited does not vanish), and you can still pick another.
  const target = step?.check?.type === 'fileContains' ? step.check.path : undefined
  useEffect(() => {
    if (target) setChosen(target)
  }, [target])

  if (!snapshot) return null

  const { files, branch, behindMain } = snapshot.git
  const paths = Object.keys(files).sort()
  const path = chosen && paths.includes(chosen) ? chosen : paths[0]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tag border border-line">
      <div className="flex items-center justify-between border-b border-line bg-raised pr-3">
        <div role="tablist" aria-label="Files" className="flex min-w-0 shrink-0">
          {paths.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === path}
              title={p}
              onClick={() => setChosen(p)}
              className={`-mb-px h-8 border-b-2 px-3 font-mono text-caption transition-colors ${
                p === path ? 'border-accent bg-card text-ink' : 'border-transparent text-ink-2 hover:text-ink'
              }`}
            >
              {baseName(p)}
            </button>
          ))}
        </div>
        <p className="flex min-w-0 items-center gap-2 pl-3 font-mono text-meta text-ink-2">
          <span className="truncate">{branch}</span>
          {behindMain > 0 && (
            <span className="shrink-0 text-fail">
              {behindMain} commit{behindMain === 1 ? '' : 's'} behind main
            </span>
          )}
        </p>
      </div>
      <div className="min-h-0 flex-1 bg-card">
        <Suspense fallback={<p className="p-4 text-caption text-ink-3">Loading editor</p>}>
          <CodeEditor key={path} value={files[path] ?? ''} label={`Editing ${path}`} onChange={(content) => act({ type: 'editFile', path, content })} />
        </Suspense>
      </div>
    </div>
  )
}
