// Works out the Git graph (Phase 7a) from the simulated repository.
//
// This is a "pure function": it reads a GraphState and returns a description of what to draw,
// with no React, no side effects and no hidden state. The same input always gives the same
// output, which is why every rule below can be checked in gitGraph.test.ts without a browser.
//
// How the picture is worked out:
// - Rows: one per commit, in the order the commits were made (parents always come first).
// - Lanes (columns): main gets lane 0. Every other branch, on your laptop or only on GitHub,
//   gets the next lane the first time it owns a commit. A branch "owns" the commits you reach
//   from its tip by following first parents that no earlier branch has claimed. So a teammate's
//   push to origin/main sits in the main lane, and your work sits in your branch's lane.
// - Edges: a line from each parent to its child. A merge commit has two.
// - Labels: where each branch points on your laptop ("feature/x") and on GitHub ("origin/feature/x").
// - Conflict: while a pull is stopped on a conflict, a placeholder node joins your tip and theirs.
//   It becomes a real merge commit when you commit the fixed file.
import type { GitEvent, GraphState } from './gitSim'

export type CommitKind = 'start' | 'yours' | 'teammate' | 'merge'

export type RefLabel = {
  key: string // "local:main" or "remote:main", stable across redraws
  name: string // what is printed: "main" or "origin/main"
  kind: 'local' | 'remote'
  head: boolean // the branch you are on
}

export type GraphNode = {
  id: string
  message: string
  author: string
  parents: string[]
  row: number // 0 is the oldest commit
  lane: number
  kind: CommitKind
  refs: RefLabel[]
}

export type PendingConflict = { row: number; lane: number; parents: [string, string]; files: string[]; label: string }

export type GraphEdge = { from: string; to: string; fromLane: number; fromRow: number; toLane: number; toRow: number; merge: boolean; pending: boolean }

// Your laptop compared with GitHub, per local branch.
export type BranchSync = { branch: string; onRemote: boolean; ahead: number; behind: number }

export type GitGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lanes: string[] // branch name per lane index
  rows: number // including the conflict placeholder
  conflict: PendingConflict | null
  sync: BranchSync[]
  head: string
}

export const CONFLICT_ID = 'conflict'

function ancestorsOf(parents: Map<string, string[]>, id: string | undefined): Set<string> {
  const seen = new Set<string>()
  const stack = id ? [id] : []
  while (stack.length) {
    const next = stack.pop()!
    if (seen.has(next)) continue
    seen.add(next)
    stack.push(...(parents.get(next) ?? []))
  }
  return seen
}

// main first, then every other branch in the order it first appeared (laptop or GitHub).
function branchOrder(state: GraphState): string[] {
  const names = [...new Set([...Object.keys(state.local), ...Object.keys(state.remote)])]
  return names.includes('main') ? ['main', ...names.filter((n) => n !== 'main')] : names
}

export function buildGitGraph(state: GraphState): GitGraph {
  const parents = new Map(state.commits.map((c) => [c.id, c.parents]))
  const rowOf = new Map(state.commits.map((c, i) => [c.id, i]))

  // Lanes: each branch claims the unclaimed commits on its first-parent chain.
  const laneOf = new Map<string, number>()
  const lanes: string[] = []
  for (const branch of branchOrder(state)) {
    let lane = -1
    for (const tip of [state.local[branch], state.remote[branch]]) {
      let id: string | undefined = tip
      while (id && !laneOf.has(id)) {
        if (lane === -1) {
          lane = lanes.length
          lanes.push(branch)
        }
        laneOf.set(id, lane)
        id = parents.get(id)?.[0]
      }
    }
  }

  // Labels: laptop branches first (with HEAD), then GitHub's copies.
  const refs = new Map<string, RefLabel[]>()
  const addRef = (id: string | undefined, ref: RefLabel) => {
    if (!id) return
    refs.set(id, [...(refs.get(id) ?? []), ref])
  }
  for (const branch of branchOrder(state)) {
    addRef(state.local[branch], { key: `local:${branch}`, name: branch, kind: 'local', head: branch === state.head })
  }
  for (const branch of branchOrder(state)) {
    addRef(state.remote[branch], { key: `remote:${branch}`, name: `origin/${branch}`, kind: 'remote', head: false })
  }

  const nodes: GraphNode[] = state.commits.map((c, row) => ({
    id: c.id,
    message: c.message,
    author: c.author,
    parents: [...c.parents],
    row,
    lane: laneOf.get(c.id) ?? 0,
    kind: c.parents.length === 0 ? 'start' : c.parents.length > 1 ? 'merge' : c.author === state.author ? 'yours' : 'teammate',
    refs: refs.get(c.id) ?? [],
  }))

  const edges: GraphEdge[] = []
  const edge = (from: string, to: string, toLane: number, toRow: number, merge: boolean, pending: boolean) => {
    const fromRow = rowOf.get(from)
    if (fromRow === undefined) return
    edges.push({ from, to, fromLane: laneOf.get(from) ?? 0, fromRow, toLane, toRow, merge, pending })
  }
  for (const n of nodes) n.parents.forEach((p, i) => edge(p, n.id, n.lane, n.row, i > 0, false))

  let conflict: PendingConflict | null = null
  if (state.merge && state.merge.conflicts.length > 0) {
    const { ours, theirs, conflicts, label } = state.merge
    conflict = { row: nodes.length, lane: laneOf.get(ours) ?? 0, parents: [ours, theirs], files: [...conflicts], label }
    edge(ours, CONFLICT_ID, conflict.lane, conflict.row, false, true)
    edge(theirs, CONFLICT_ID, conflict.lane, conflict.row, true, true)
  }

  // Everything GitHub has on any branch, for branches that were never pushed.
  const onGitHub = new Set(Object.values(state.remote).flatMap((tip) => [...ancestorsOf(parents, tip)]))
  const sync: BranchSync[] = Object.keys(state.local)
    .sort()
    .map((branch) => {
      const local = ancestorsOf(parents, state.local[branch])
      const remoteTip = state.remote[branch]
      if (!remoteTip) return { branch, onRemote: false, ahead: [...local].filter((id) => !onGitHub.has(id)).length, behind: 0 }
      const remote = ancestorsOf(parents, remoteTip)
      return {
        branch,
        onRemote: true,
        ahead: [...local].filter((id) => !remote.has(id)).length,
        behind: [...remote].filter((id) => !local.has(id)).length,
      }
    })

  return { nodes, edges, lanes, rows: nodes.length + (conflict ? 1 : 0), conflict, sync, head: state.head }
}

// ---- what just changed --------------------------------------------------------------

// What to animate after an action, and one plain sentence per change for the caption.
// `before` is the graph from before the action, so a label that moved knows where it came from.
export type LabelMove = { key: string; fromRow: number | null }
export type GraphChange = {
  pop: string[] // node ids (or CONFLICT_ID) that appear
  labels: LabelMove[] // labels that appear or slide to a new commit
  shake: string[] // label keys that shake once (a rejected push)
  captions: string[]
  tone: 'neutral' | 'pass' | 'fail'
}

export const NO_CHANGE: GraphChange = { pop: [], labels: [], shake: [], captions: [], tone: 'neutral' }

const shortMessage = (text: string) => (text.length > 48 ? `${text.slice(0, 47)}…` : text)

export function labelRow(graph: GitGraph | null, key: string): number | null {
  const node = graph?.nodes.find((n) => n.refs.some((r) => r.key === key))
  return node ? node.row : null
}

export function describeGitChange(events: GitEvent[], before: GitGraph | null, after: GitGraph): GraphChange {
  const change: GraphChange = { pop: [], labels: [], shake: [], captions: [], tone: 'neutral' }
  const moveLabel = (key: string) => {
    if (labelRow(after, key) === null) return
    if (change.labels.some((l) => l.key === key)) return
    change.labels.push({ key, fromRow: labelRow(before, key) })
  }
  const tipOf = (key: string) => after.nodes.find((n) => n.refs.some((r) => r.key === key))?.id

  for (const e of events) {
    switch (e.type) {
      case 'git:commit':
        change.pop.push(e.commitId)
        moveLabel(`local:${e.branch}`)
        change.captions.push(`You saved a commit on ${e.branch}: "${shortMessage(e.message)}". It is only on your laptop until you push.`)
        break
      case 'git:remote-commit':
        change.pop.push(e.commitId)
        moveLabel(`remote:${e.branch}`)
        change.captions.push(`${e.author} pushed to ${e.branch} on GitHub: "${shortMessage(e.message)}". Your copy does not have it until you pull.`)
        break
      case 'git:branch-created':
        moveLabel(`local:${e.branch}`)
        change.captions.push(`New branch ${e.branch} starts at the same commit as ${e.from}. Nothing is copied until you commit.`)
        break
      case 'git:checkout':
        moveLabel(`local:${e.branch}`)
        break
      case 'git:pull':
        if (e.result === 'up-to-date') change.captions.push(`Pulled origin/${e.remoteBranch}: already up to date, nothing new on GitHub.`)
        else if (e.result === 'fast-forward') {
          moveLabel(`local:${e.into}`)
          change.captions.push(`Pulled origin/${e.remoteBranch}: your ${e.into} moved forward to the newest commit on GitHub.`)
        } else if (e.result === 'merged') {
          const tip = tipOf(`local:${e.into}`)
          if (tip) change.pop.push(tip)
          moveLabel(`local:${e.into}`)
          change.captions.push(`Pulled origin/${e.remoteBranch}: Git joined their work and yours in a merge commit.`)
        } else {
          change.pop.push(CONFLICT_ID)
          change.tone = 'fail'
          const files = after.conflict?.files.join(', ') ?? 'a file'
          change.captions.push(`Conflict: you and a teammate changed the same lines in ${files}. Fix the file, then commit to finish the merge.`)
        }
        break
      case 'git:push':
        if (e.result === 'ok') {
          moveLabel(`remote:${e.branch}`)
          if (change.tone !== 'fail') change.tone = 'pass'
          change.captions.push(`Pushed: origin/${e.branch} on GitHub now matches your ${e.branch}.`)
        } else if (e.result === 'up-to-date') {
          change.captions.push(`Push: GitHub already has everything on ${e.branch}.`)
        } else {
          change.shake.push(`remote:${e.branch}`)
          change.tone = 'fail'
          change.captions.push(`Push rejected: origin/${e.branch} has commits you do not have. Pull first, then push again.`)
        }
        break
      case 'github:pr-opened':
        change.captions.push(`Pull request #${e.pr.id} opened: asks to merge ${e.pr.head} into ${e.pr.base}.`)
        break
      case 'github:pr-approved':
        change.captions.push(`Pull request #${e.prId} approved by the reviewer.`)
        break
      case 'github:pr-merged': {
        const tip = tipOf(`remote:${e.pr.base}`)
        if (tip) change.pop.push(tip)
        moveLabel(`remote:${e.pr.base}`)
        if (change.tone !== 'fail') change.tone = 'pass'
        change.captions.push(`Pull request #${e.pr.id} merged: origin/${e.pr.base} has a new merge commit. Your laptop's ${e.pr.base} is behind until you pull.`)
        break
      }
    }
  }
  return change
}

// One line per local branch, in plain words, for under the graph.
export function syncSentence(s: BranchSync): string {
  if (!s.onRemote) return `${s.branch}: not on GitHub yet. Push it to share it.`
  if (s.ahead && s.behind) return `${s.branch}: ${s.ahead} to push and ${s.behind} to pull. Pull first.`
  if (s.ahead) return `${s.branch}: ${s.ahead} commit${s.ahead === 1 ? '' : 's'} not on GitHub yet.`
  if (s.behind) return `${s.branch}: ${s.behind} commit${s.behind === 1 ? '' : 's'} on GitHub you have not pulled.`
  return `${s.branch}: same as GitHub.`
}
