import { RotateCcw } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { buildGitGraph, CONFLICT_ID, describeGitChange, NO_CHANGE, syncSentence, type GitGraph as Graph, type GraphChange, type GraphEdge, type GraphNode, type RefLabel } from '../../engine/gitGraph'
import { useLevelStore } from '../../store/levelStore'

// The Git graph (Phase 7a): every commit in the simulated repository, newest at the top, one
// column ("lane") per branch. Labels show where each branch is on your laptop and on GitHub
// (origin/...). After each Git action the part that changed animates once; Replay plays it again.
//
// The lines and dots are inline SVG. The words beside them are ordinary HTML in rows of the same
// height, so text can be truncated, read by screen readers, and styled like the rest of the app.

const ROW = 40 // px per commit row
const LANE = 16 // px between lanes
const PAD = 10 // px from the left edge to lane 0
const R = 5 // commit dot radius

const laneX = (lane: number) => PAD + lane * LANE
const rowY = (graph: Graph, row: number) => (graph.rows - 1 - row) * ROW + ROW / 2

function edgePath(e: GraphEdge, graph: Graph): string {
  const x1 = laneX(e.fromLane)
  const y1 = rowY(graph, e.fromRow)
  const x2 = laneX(e.toLane)
  const y2 = rowY(graph, e.toRow)
  if (x1 === x2) return `M${x1} ${y1} L${x2} ${y2}`
  // A branch leaves its parent straight away; a merge joins just below the merge commit.
  if (!e.merge) return `M${x1} ${y1} C${x1} ${y1 - ROW * 0.6} ${x2} ${y1 - ROW * 0.4} ${x2} ${y1 - ROW} L${x2} ${y2}`
  return `M${x1} ${y1} L${x1} ${y2 + ROW} C${x1} ${y2 + ROW * 0.4} ${x2} ${y2 + ROW * 0.6} ${x2} ${y2}`
}

const KIND_TEXT: Record<GraphNode['kind'], string> = {
  start: 'Starting commit',
  yours: 'Your commit',
  teammate: 'Teammate commit',
  merge: 'Merge commit',
}

function NodeShape({ node, x, y, animate }: { node: GraphNode; x: number; y: number; animate: boolean }) {
  // The animation sits on a wrapping group: a CSS transform on the shape itself would replace
  // the diamond's SVG rotate while it plays.
  return <g className={animate ? 'motion-pop' : undefined}>{shapeFor(node.kind, x, y)}</g>
}

function shapeFor(kind: GraphNode['kind'], x: number, y: number) {
  switch (kind) {
    case 'yours':
      return <circle cx={x} cy={y} r={R} className="fill-accent" />
    case 'teammate':
      return <circle cx={x} cy={y} r={R} strokeWidth={1.5} className="fill-card stroke-ink-2" />
    case 'merge':
      return <rect x={x - R} y={y - R} width={R * 2} height={R * 2} transform={`rotate(45 ${x} ${y})`} className="fill-ink" />
    case 'start':
      return <rect x={x - R + 1} y={y - R + 1} width={R * 2 - 2} height={R * 2 - 2} strokeWidth={1.5} className="fill-card stroke-ink-3" />
  }
}

function RefChip({ label, change, row }: { label: RefLabel; change: GraphChange; row: number }) {
  const move = change.labels.find((l) => l.key === label.key)
  const shake = change.shake.includes(label.key)
  let motion = ''
  let style: CSSProperties | undefined
  if (shake) motion = 'motion-shake'
  else if (move && move.fromRow === null) motion = 'motion-pop'
  else if (move && move.fromRow !== row) {
    motion = 'motion-slide'
    // Start where the label was before (an older row sits lower), then slide up to here.
    style = { '--from-y': `${(row - (move.fromRow ?? row)) * ROW}px` } as CSSProperties
  }
  const look =
    label.kind === 'remote'
      ? `border-dashed ${shake ? 'border-fail text-fail' : 'border-ink-3 text-ink-2'}`
      : label.head
        ? 'border-accent text-ink'
        : 'border-line text-ink'
  return (
    <span style={style} className={`inline-block max-w-full shrink-0 truncate rounded-tag border bg-card px-1 font-mono text-meta ${look} ${motion}`}>
      {label.head ? `HEAD → ${label.name}` : label.name}
    </span>
  )
}

export function GitGraph() {
  const runner = useLevelStore((s) => s.runner)
  const snapshot = useLevelStore((s) => s.snapshot)
  const gitChange = useLevelStore((s) => s.gitChange)
  const [replays, setReplays] = useState(0)

  // Rebuilt after every action (the snapshot changes), so the graph always matches the repository.
  const graph = useMemo(() => (runner && snapshot ? buildGitGraph(runner.git.graphState()) : null), [runner, snapshot])
  const change = useMemo(
    () => (graph && gitChange.events.length ? describeGitChange(gitChange.events, gitChange.before ? buildGitGraph(gitChange.before) : null, graph) : NO_CHANGE),
    [gitChange, graph],
  )
  if (!graph) return null

  const hasMotion = change.pop.length + change.labels.length + change.shake.length > 0
  const width = PAD * 2 + (graph.lanes.length - 1) * LANE
  const height = graph.rows * ROW
  const popped = new Set(change.pop)
  // A new key remounts the drawing, which is how an animation plays again. It changes on each
  // new Git change and on Replay, never by itself.
  const playKey = `${gitChange.seq}:${replays}`
  const toneClass = change.tone === 'fail' ? 'text-fail' : change.tone === 'pass' ? 'text-pass' : 'text-ink-2'
  const syncLines = graph.sync.filter((s) => s.branch === graph.head || s.branch === 'main')

  return (
    <div className="flex min-h-0 w-[232px] shrink-0 flex-col overflow-hidden rounded-tag border border-line bg-card">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-line bg-raised pr-1 pl-3">
        <h3 className="text-caption font-medium">Git graph</h3>
        <button
          type="button"
          onClick={() => setReplays((n) => n + 1)}
          disabled={!hasMotion}
          className="flex h-6 items-center gap-1 rounded-tag px-2 text-meta text-ink-2 transition-colors hover:bg-card hover:text-ink disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-transparent"
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
          Replay
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={playKey} className="flex gap-1 py-1 pr-2">
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
            {graph.edges.map((e) => (
              <path
                key={`${e.from}-${e.to}`}
                d={edgePath(e, graph)}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray={e.pending ? '3 3' : undefined}
                className={`${e.pending ? 'stroke-fail' : 'stroke-ink-3'} ${popped.has(e.to) ? 'motion-fade' : ''}`}
              />
            ))}
            {graph.nodes.map((n) => (
              <NodeShape key={n.id} node={n} x={laneX(n.lane)} y={rowY(graph, n.row)} animate={popped.has(n.id)} />
            ))}
            {graph.conflict && (
              <circle
                cx={laneX(graph.conflict.lane)}
                cy={rowY(graph, graph.conflict.row)}
                r={R + 1}
                strokeWidth={1.5}
                strokeDasharray="3 2"
                className={`fill-card stroke-fail ${popped.has(CONFLICT_ID) ? 'motion-pop' : ''}`}
              />
            )}
          </svg>

          <ol aria-label="Commits, newest first" className="min-w-0 flex-1">
            {graph.conflict && (
              <li style={{ height: ROW }} className={`flex flex-col justify-center ${popped.has(CONFLICT_ID) ? 'motion-fade' : ''}`}>
                <span className="truncate text-caption font-medium text-fail">Conflict, not committed</span>
                <span className="truncate text-meta text-ink-2" title={graph.conflict.files.join(', ')}>
                  Fix {graph.conflict.files.map((f) => f.split('/').pop()).join(', ')}, then commit
                </span>
              </li>
            )}
            {[...graph.nodes].reverse().map((n) => (
              <li key={n.id} style={{ height: ROW }} className={`flex min-w-0 flex-col justify-center ${popped.has(n.id) ? 'motion-fade' : ''}`}>
                <span className="truncate text-caption text-ink" title={`${n.id.slice(0, 7)} ${n.message} (${n.author})`}>
                  <span className="sr-only">{KIND_TEXT[n.kind]}: </span>
                  {n.message}
                </span>
                <span className="flex min-w-0 gap-1 overflow-hidden">
                  {n.refs.length > 0 ? (
                    n.refs.map((r) => <RefChip key={r.key} label={r} change={change} row={n.row} />)
                  ) : (
                    <span className="truncate text-meta text-ink-3">{n.kind === 'merge' ? 'Merge' : n.author === runner?.git.author ? 'You' : n.author}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="max-h-[45%] shrink-0 space-y-2 overflow-y-auto border-t border-line p-3">
        <p aria-live="polite" className={`text-meta ${toneClass}`}>
          {change.captions.length ? change.captions.join(' ') : 'Each mark is a commit, newest at the top. Do a Git step and watch what changes.'}
        </p>
        <ul className="space-y-0.5 text-meta text-ink-2">
          {syncLines.map((s) => (
            <li key={s.branch}>{syncSentence(s)}</li>
          ))}
        </ul>
        <Legend />
      </div>
    </div>
  )
}

// Every shape with its meaning in words, so colour and shape are never the only signal.
function Legend() {
  const item = 'flex items-center gap-1'
  return (
    <ul aria-label="Legend" className="flex flex-wrap gap-x-3 gap-y-1 text-meta text-ink-3">
      <li className={item}>
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r={R} className="fill-accent" />
        </svg>
        Yours
      </li>
      <li className={item}>
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r={R - 0.75} strokeWidth={1.5} className="fill-card stroke-ink-2" />
        </svg>
        Teammate
      </li>
      <li className={item}>
        <svg width="12" height="12" aria-hidden>
          <rect x="2" y="2" width="8" height="8" transform="rotate(45 6 6)" className="fill-ink" />
        </svg>
        Merge
      </li>
      <li className={item}>
        <span className="rounded-tag border border-dashed border-ink-3 px-1 font-mono">origin</span>
        GitHub
      </li>
    </ul>
  )
}
