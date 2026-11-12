import { describe, expect, it } from 'vitest'
import { buildGitGraph, CONFLICT_ID, describeGitChange, labelRow, syncSentence } from './gitGraph'
import { GitSim, type GitEvent } from './gitSim'

const BASE = 'one\ntwo\nthree\nfour\nfive\n'

function repo() {
  const events: GitEvent[] = []
  const git = new GitSim([{ path: 'a.txt', content: BASE }], { emit: (e) => events.push(e) })
  const graph = () => buildGitGraph(git.graphState())
  // Runs a command and returns only the events it caused.
  const run = (command: string) => {
    const start = events.length
    git.exec(command)
    return events.slice(start)
  }
  return { git, events, graph, run }
}

const refNames = (g: ReturnType<typeof buildGitGraph>, id: string) => g.nodes.find((n) => n.id === id)!.refs.map((r) => r.name)

describe('buildGitGraph', () => {
  it('draws a fresh repository as one start commit with main on the laptop and on GitHub', () => {
    const { graph } = repo()
    const g = graph()
    expect(g.nodes).toHaveLength(1)
    expect(g.nodes[0]).toMatchObject({ kind: 'start', lane: 0, row: 0 })
    expect(refNames(g, g.nodes[0].id)).toEqual(['main', 'origin/main'])
    expect(g.nodes[0].refs[0].head).toBe(true)
    expect(g.lanes).toEqual(['main'])
    expect(g.edges).toEqual([])
    expect(g.conflict).toBeNull()
    expect(g.sync).toEqual([{ branch: 'main', onRemote: true, ahead: 0, behind: 0 }])
  })

  it('gives a branch its own lane once it has a commit, and moves HEAD to it', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    // A new branch with no commits shares main's commit and needs no lane yet.
    expect(graph().lanes).toEqual(['main'])
    expect(refNames(graph(), graph().nodes[0].id)).toEqual(['main', 'feature/x', 'origin/main'])

    git.editFile('a.txt', 'one\nTWO\nthree\nfour\nfive\n')
    run('git add .')
    run('git commit -m "Change line two"')
    const g = graph()
    expect(g.lanes).toEqual(['main', 'feature/x'])
    const tip = g.nodes[1]
    expect(tip).toMatchObject({ kind: 'yours', lane: 1, row: 1, message: 'Change line two' })
    expect(tip.refs).toEqual([{ key: 'local:feature/x', name: 'feature/x', kind: 'local', head: true }])
    expect(g.edges).toEqual([{ from: g.nodes[0].id, to: tip.id, fromLane: 0, fromRow: 0, toLane: 1, toRow: 1, merge: false, pending: false }])
    expect(g.sync.find((s) => s.branch === 'feature/x')).toEqual({ branch: 'feature/x', onRemote: false, ahead: 1, behind: 0 })
  })

  it('moves the origin label when you push', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    git.editFile('a.txt', 'changed\n')
    run('git commit -am "Change the whole file"')
    const before = graph()
    expect(labelRow(before, 'remote:feature/x')).toBeNull()

    const events = run('git push -u origin feature/x')
    const after = graph()
    expect(refNames(after, after.nodes[1].id)).toEqual(['feature/x', 'origin/feature/x'])
    expect(after.sync.find((s) => s.branch === 'feature/x')).toMatchObject({ onRemote: true, ahead: 0, behind: 0 })

    const change = describeGitChange(events, before, after)
    expect(change.labels).toEqual([{ key: 'remote:feature/x', fromRow: null }])
    expect(change.tone).toBe('pass')
    expect(change.captions[0]).toContain('origin/feature/x on GitHub now matches')
  })

  it('puts a teammate push in the main lane and shows the laptop as behind', () => {
    const { git, graph } = repo()
    const before = graph()
    const id = git.pushTeammateCommit('main', { 'a.txt': 'one\ntwo\nthree\nfour\nFIVE\n' }, 'Shout five', 'Aisha Khan')
    const g = graph()
    expect(g.nodes[1]).toMatchObject({ id, kind: 'teammate', lane: 0, author: 'Aisha Khan' })
    expect(refNames(g, id)).toEqual(['origin/main'])
    expect(refNames(g, g.nodes[0].id)).toEqual(['main'])
    expect(g.sync[0]).toMatchObject({ branch: 'main', behind: 1, ahead: 0 })
    expect(syncSentence(g.sync[0])).toBe('main: 1 commit on GitHub you have not pulled.')

    const change = describeGitChange([{ type: 'git:remote-commit', branch: 'main', commitId: id, author: 'Aisha Khan', message: 'Shout five' }], before, g)
    expect(change.pop).toEqual([id])
    expect(change.labels).toEqual([{ key: 'remote:main', fromRow: 0 }])
  })

  it('draws a pull that merges as a merge commit with two parents', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    git.editFile('a.txt', 'ONE\ntwo\nthree\nfour\nfive\n')
    run('git commit -am "Shout one"')
    const theirs = git.pushTeammateCommit('main', { 'a.txt': 'one\ntwo\nthree\nfour\nFIVE\n' }, 'Shout five', 'Aisha Khan')
    const before = graph()
    const events = run('git pull origin main')
    const g = graph()

    const merge = g.nodes[g.nodes.length - 1]
    expect(merge.kind).toBe('merge')
    expect(merge.lane).toBe(1)
    expect(merge.parents[1]).toBe(theirs)
    const into = g.edges.filter((e) => e.to === merge.id)
    expect(into.map((e) => e.merge)).toEqual([false, true])
    expect(into[1]).toMatchObject({ fromLane: 0, toLane: 1 })

    const change = describeGitChange(events, before, g)
    expect(change.pop).toEqual([merge.id])
    expect(change.captions[0]).toContain('merge commit')
  })

  it('shows a conflict as a placeholder, then as a real merge once you commit the fix', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    git.editFile('a.txt', 'one\nmine\nthree\nfour\nfive\n')
    run('git commit -am "Change line two my way"')
    const ours = git.localTip('feature/x')!
    const theirs = git.pushTeammateCommit('main', { 'a.txt': 'one\ntheirs\nthree\nfour\nfive\n' }, 'Change line two their way', 'Aisha Khan')
    const before = graph()
    const events = run('git pull origin main')
    const g = graph()

    expect(g.conflict).toEqual({ row: 3, lane: 1, parents: [ours, theirs], files: ['a.txt'], label: 'main' })
    expect(g.rows).toBe(4)
    const pending = g.edges.filter((e) => e.to === CONFLICT_ID)
    expect(pending).toHaveLength(2)
    expect(pending.every((e) => e.pending)).toBe(true)

    const change = describeGitChange(events, before, g)
    expect(change.pop).toEqual([CONFLICT_ID])
    expect(change.tone).toBe('fail')
    expect(change.captions[0]).toContain('a.txt')

    git.editFile('a.txt', 'one\nmine and theirs\nthree\nfour\nfive\n')
    run('git add .')
    run('git commit -m "Merge main into feature/x"')
    const done = graph()
    expect(done.conflict).toBeNull()
    expect(done.nodes[done.nodes.length - 1]).toMatchObject({ kind: 'merge', parents: [ours, theirs] })
  })

  it('leaves the origin label where it was on a rejected push, and shakes it', () => {
    const { git, graph, run } = repo()
    git.editFile('a.txt', 'mine\n')
    run('git commit -am "Commit straight on main"')
    git.pushTeammateCommit('main', { 'a.txt': 'theirs\n' }, 'Teammate change', 'Aisha Khan')
    const before = graph()
    const events = run('git push origin main')
    const after = graph()
    expect(labelRow(after, 'remote:main')).toBe(labelRow(before, 'remote:main'))
    const change = describeGitChange(events, before, after)
    expect(change).toMatchObject({ shake: ['remote:main'], labels: [], tone: 'fail' })
    expect(syncSentence(after.sync[0])).toBe('main: 1 to push and 1 to pull. Pull first.')
  })

  it('gives a branch that only exists on GitHub a lane of its own', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    git.editFile('a.txt', 'x\n')
    run('git commit -am "Work on x"')
    run('git push -u origin feature/x')
    git.pushTeammateCommit('feature/x', { 'a.txt': 'x and y\n' }, 'Teammate adds y', 'Aisha Khan')
    const g = graph()
    expect(g.lanes).toEqual(['main', 'feature/x'])
    expect(g.nodes[2]).toMatchObject({ lane: 1, kind: 'teammate' })
    expect(refNames(g, g.nodes[2].id)).toEqual(['origin/feature/x'])
  })

  it('draws a merged pull request on origin/main and says your main is behind', () => {
    const { git, graph, run } = repo()
    run('git checkout -b feature/x')
    git.editFile('a.txt', 'x\n')
    run('git commit -am "Work on x"')
    run('git push -u origin feature/x')
    const pr = git.openPullRequest('feature/x', 'Work on x')
    const before = graph()
    git.mergePullRequest(pr.pr!.id)
    const after = graph()
    const tip = after.nodes[after.nodes.length - 1]
    expect(tip).toMatchObject({ kind: 'merge', lane: 0 })
    expect(refNames(after, tip.id)).toEqual(['origin/main'])
    const change = describeGitChange([{ type: 'github:pr-merged', pr: { ...pr.pr!, status: 'merged' } }], before, after)
    expect(change.pop).toEqual([tip.id])
    expect(change.labels).toEqual([{ key: 'remote:main', fromRow: 0 }])
  })

  it('cannot change the repository through the graph state', () => {
    const { git } = repo()
    const state = git.graphState()
    state.local.main = 'nope'
    state.commits[0].parents.push('nope')
    expect(git.graphState().local.main).not.toBe('nope')
    expect(git.graphState().commits[0].parents).toEqual([])
  })
})
