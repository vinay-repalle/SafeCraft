// The logic behind the conflict resolver (Phase 7b). Pure functions, no React.
//
// When a pull stops on a merge conflict, Git writes both versions into the file between
// "conflict markers":
//
//   <<<<<<< HEAD          your version starts
//   ...your lines...
//   =======               their version starts
//   ...their lines...
//   >>>>>>> main          end, and where their version came from
//
// The resolver splits a file like that into "same" parts and "hunks" (one per conflict), lets the
// learner pick lines from each side (and edit a picked line, to combine both), and builds the
// file that results. Picked lines appear in the order they were picked.

export type Segment = { kind: 'same'; lines: string[] } | { kind: 'hunk'; index: number; ours: string[]; theirs: string[]; oursLabel: string; theirsLabel: string }

export type ParsedConflict = { ok: true; segments: Segment[]; hunks: number } | { ok: false; reason: string }

export type Side = 'ours' | 'theirs'
export type Pick = { side: Side; line: number; text: string }
// One entry per hunk: the lines picked so far, in order.
export type Picks = Pick[][]

export const hasConflictMarkers = (text: string) => /^<<<<<<< /m.test(text) && /^>>>>>>> /m.test(text)

export function parseConflict(text: string): ParsedConflict {
  const segments: Segment[] = []
  let same: string[] = []
  let hunk: { ours: string[]; theirs: string[]; oursLabel: string; theirsLabel: string } | null = null
  let side: Side = 'ours'
  let hunks = 0

  for (const line of text.split('\n')) {
    if (line.startsWith('<<<<<<<')) {
      if (hunk) return { ok: false, reason: 'A conflict starts inside another conflict.' }
      if (same.length) segments.push({ kind: 'same', lines: same })
      same = []
      hunk = { ours: [], theirs: [], oursLabel: line.slice(7).trim() || 'HEAD', theirsLabel: '' }
      side = 'ours'
    } else if (line === '=======' && hunk) {
      if (side === 'theirs') return { ok: false, reason: 'A conflict has two ======= lines.' }
      side = 'theirs'
    } else if (line.startsWith('>>>>>>>')) {
      if (!hunk || side !== 'theirs') return { ok: false, reason: 'A >>>>>>> line has no matching <<<<<<< and ======= above it.' }
      hunk.theirsLabel = line.slice(7).trim()
      segments.push({ kind: 'hunk', index: hunks++, ...hunk })
      hunk = null
    } else if (hunk) {
      hunk[side].push(line)
    } else {
      same.push(line)
    }
  }
  if (hunk) return { ok: false, reason: 'A conflict is missing its closing >>>>>>> line.' }
  if (hunks === 0) return { ok: false, reason: 'There are no conflict markers in this file.' }
  if (same.length) segments.push({ kind: 'same', lines: same })
  return { ok: true, segments, hunks }
}

export const emptyPicks = (hunks: number): Picks => Array.from({ length: hunks }, () => [])

// Pick a line, or un-pick it if it was already picked.
export function togglePick(picks: Picks, segment: Extract<Segment, { kind: 'hunk' }>, side: Side, line: number): Picks {
  const current = picks[segment.index] ?? []
  const has = current.some((p) => p.side === side && p.line === line)
  const next = has ? current.filter((p) => !(p.side === side && p.line === line)) : [...current, { side, line, text: segment[side][line] }]
  return picks.map((p, i) => (i === segment.index ? next : p))
}

// Pick every line of one side, replacing what was picked (the "use all of yours" shortcut).
export function pickSide(picks: Picks, segment: Extract<Segment, { kind: 'hunk' }>, side: Side): Picks {
  const next = segment[side].map((text, line) => ({ side, line, text }))
  return picks.map((p, i) => (i === segment.index ? next : p))
}

// Change the text of a picked line, to combine both sides into one line.
export function editPick(picks: Picks, hunk: number, position: number, text: string): Picks {
  return picks.map((p, i) => (i === hunk ? p.map((pick, j) => (j === position ? { ...pick, text } : pick)) : p))
}

export const isPicked = (picks: Picks, hunk: number, side: Side, line: number) => (picks[hunk] ?? []).some((p) => p.side === side && p.line === line)

// Every hunk needs at least one line before the file can be used.
export const unresolvedHunks = (picks: Picks): number[] => picks.flatMap((p, i) => (p.length === 0 ? [i] : []))

// The whole file with each conflict replaced by the picked lines. No markers are left.
export function buildResult(segments: Segment[], picks: Picks): string {
  return segments.flatMap((s) => (s.kind === 'same' ? s.lines : (picks[s.index] ?? []).map((p) => p.text))).join('\n')
}

// Where their side came from, in plain words ("main" -> "origin/main").
export const theirsName = (label: string) => (label && !label.startsWith('origin/') ? `origin/${label}` : label || 'their branch')
