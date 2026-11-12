import { Check, Plus, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  buildResult,
  editPick,
  emptyPicks,
  isPicked,
  parseConflict,
  pickSide,
  theirsName,
  togglePick,
  unresolvedHunks,
  type Picks,
  type Segment,
  type Side,
} from '../../engine/conflictResolve'
import { BUTTON_PRIMARY, PANEL_BUTTON } from '../ui'

type Hunk = Extract<Segment, { kind: 'hunk' }>

type Props = {
  path: string
  content: string
  theirsAuthor: string | null // who made their side, if known
  onApply: (content: string) => void
  onEditText: () => void // switch to the plain text editor instead
}

// The conflict resolver (Phase 7b): "Yours", "Theirs" and "Result". Pick lines from either side
// and the result builds below. A picked line can be edited, which is how you combine both
// changes into one line. "Use this result" writes the file without markers; you then stage and
// commit it, as in real Git. The logic lives in src/engine/conflictResolve.ts.
export function ConflictResolver({ path, content, theirsAuthor, onApply, onEditText }: Props) {
  const parsed = useMemo(() => parseConflict(content), [content])
  const [picks, setPicks] = useState<Picks>(() => emptyPicks(parsed.ok ? parsed.hunks : 0))

  if (!parsed.ok) {
    return (
      <div className="p-4 text-caption text-ink-2">
        <p>The conflict markers in this file are not complete, so the resolver cannot read them. {parsed.reason}</p>
        <button type="button" className={`${PANEL_BUTTON} mt-3`} onClick={onEditText}>
          Edit the text
        </button>
      </div>
    )
  }

  const hunks = parsed.segments.filter((s): s is Hunk => s.kind === 'hunk')
  const open = unresolvedHunks(picks)
  const fileName = path.split('/').pop()

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-1 border-b border-line p-3">
        <p className="text-caption font-medium text-fail">Merge conflict in {fileName}</p>
        <p className="text-meta text-ink-2">
          You and {theirsAuthor ?? 'a teammate'} changed the same lines. Pick the lines to keep. To keep both changes, pick one line and edit it to hold both.
        </p>
      </div>

      {hunks.map((hunk) => (
        <HunkView
          key={hunk.index}
          hunk={hunk}
          total={hunks.length}
          before={contextBefore(parsed.segments, hunk)}
          after={contextAfter(parsed.segments, hunk)}
          picks={picks}
          theirsAuthor={theirsAuthor}
          onPicks={setPicks}
        />
      ))}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line p-3">
        <button type="button" className={BUTTON_PRIMARY} disabled={open.length > 0} onClick={() => onApply(buildResult(parsed.segments, picks))}>
          <Check size={16} strokeWidth={1.5} aria-hidden />
          Use this result
        </button>
        <button type="button" className={PANEL_BUTTON} onClick={() => setPicks(emptyPicks(parsed.hunks))}>
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
          Start over
        </button>
        <button type="button" className={PANEL_BUTTON} onClick={onEditText}>
          Edit the text instead
        </button>
        {open.length > 0 && <p className="w-full text-meta text-ink-3">Pick at least one line in each conflict to continue.</p>}
      </div>
    </div>
  )
}

// One unchanged line either side of a conflict, so the learner can see where it sits.
function contextBefore(segments: Segment[], hunk: Hunk): string | null {
  const i = segments.indexOf(hunk)
  const prev = segments[i - 1]
  return prev?.kind === 'same' ? (prev.lines[prev.lines.length - 1] ?? null) : null
}
function contextAfter(segments: Segment[], hunk: Hunk): string | null {
  const i = segments.indexOf(hunk)
  const next = segments[i + 1]
  return next?.kind === 'same' ? (next.lines.find((l) => l.trim() !== '') ?? null) : null
}

type HunkProps = { hunk: Hunk; total: number; before: string | null; after: string | null; picks: Picks; theirsAuthor: string | null; onPicks: (p: Picks) => void }

function HunkView({ hunk, total, before, after, picks, theirsAuthor, onPicks }: HunkProps) {
  const picked = picks[hunk.index] ?? []
  return (
    <section aria-label={`Conflict ${hunk.index + 1} of ${total}`} className="space-y-3 border-b border-line p-3">
      {total > 1 && <p className="text-meta text-ink-3">Conflict {hunk.index + 1} of {total}</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <SidePanel title="Yours" subtitle="Your branch" side="ours" hunk={hunk} picks={picks} onPicks={onPicks} />
        <SidePanel title="Theirs" subtitle={`${theirsAuthor ? `${theirsAuthor}, ` : ''}from ${theirsName(hunk.theirsLabel)}`} side="theirs" hunk={hunk} picks={picks} onPicks={onPicks} />
      </div>

      <div className="rounded-tag border border-line">
        <div className="flex items-baseline justify-between gap-2 border-b border-line bg-raised px-3 py-1.5">
          <h4 className="text-caption font-medium">Result</h4>
          <span className="text-meta text-ink-3">{picked.length === 0 ? 'Nothing picked yet' : `${picked.length} line${picked.length === 1 ? '' : 's'}`}</span>
        </div>
        <ol className="space-y-1 p-2 font-mono text-meta">
          {before !== null && <li className="truncate px-1 text-ink-3">{before || ' '}</li>}
          {picked.map((p, position) => (
            // Keyed by where the line came from, so a newly picked line fades in once.
            <li key={`${p.side}-${p.line}`} className="motion-fade flex items-center gap-1">
              <span className="w-12 shrink-0 font-sans text-ink-3">{p.side === 'ours' ? 'Yours' : 'Theirs'}</span>
              <input
                value={p.text}
                onChange={(e) => onPicks(editPick(picks, hunk.index, position, e.target.value))}
                aria-label={`Result line ${position + 1}, from ${p.side === 'ours' ? 'yours' : 'theirs'}`}
                spellCheck={false}
                className="h-7 min-w-0 flex-1 rounded-tag border border-line bg-card px-1 font-mono text-meta text-ink"
              />
              <button
                type="button"
                onClick={() => onPicks(togglePick(picks, hunk, p.side, p.line))}
                aria-label={`Remove result line ${position + 1}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tag text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              >
                <X size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </li>
          ))}
          {after !== null && <li className="truncate px-1 text-ink-3">{after}</li>}
        </ol>
      </div>
    </section>
  )
}

type SideProps = { title: string; subtitle: string; side: Side; hunk: Hunk; picks: Picks; onPicks: (p: Picks) => void }

function SidePanel({ title, subtitle, side, hunk, picks, onPicks }: SideProps) {
  const lines = hunk[side]
  return (
    <div className="flex min-w-0 flex-col rounded-tag border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-raised px-3 py-1.5">
        <div className="min-w-0">
          <h4 className="text-caption font-medium">{title}</h4>
          <p className="truncate text-meta text-ink-3">{subtitle}</p>
        </div>
        {lines.length > 1 && (
          <button type="button" onClick={() => onPicks(pickSide(picks, hunk, side))} className="shrink-0 rounded-tag px-2 py-1 text-meta text-ink-2 hover:bg-card hover:text-ink">
            Use all
          </button>
        )}
      </div>
      <ul className="space-y-1 p-2">
        {lines.length === 0 && <li className="px-1 text-meta text-ink-3">No lines on this side.</li>}
        {lines.map((text, line) => {
          const on = isPicked(picks, hunk.index, side, line)
          return (
            <li key={line}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onPicks(togglePick(picks, hunk, side, line))}
                className={`flex w-full items-start gap-2 rounded-tag border px-2 py-1 text-left transition-colors ${
                  on ? 'border-accent bg-card' : 'border-line bg-card hover:border-ink-3'
                }`}
              >
                <span className={`mt-0.5 flex shrink-0 items-center gap-0.5 text-meta ${on ? 'text-accent' : 'text-ink-3'}`}>
                  {on ? <Check size={16} strokeWidth={1.5} aria-hidden /> : <Plus size={16} strokeWidth={1.5} aria-hidden />}
                  {on ? 'Picked' : 'Pick'}
                </span>
                <code className="min-w-0 flex-1 break-all whitespace-pre-wrap font-mono text-meta text-ink">{text || ' '}</code>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
