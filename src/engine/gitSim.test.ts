import { describe, expect, it } from 'vitest'
import { GitSim, type GitEvent } from './gitSim'

const BASE = 'one\ntwo\nthree\nfour\nfive\n'

function repo(files = [{ path: 'a.txt', content: BASE }]) {
  const events: GitEvent[] = []
  const git = new GitSim(files, { emit: (e) => events.push(e) })
  return { git, events }
}

describe('GitSim basics', () => {
  it('starts on a clean main', () => {
    const { git } = repo()
    expect(git.currentBranch()).toBe('main')
    expect(git.branches()).toEqual(['main'])
    const status = git.exec('git status')
    expect(status.ok).toBe(true)
    expect(status.output).toContain('nothing to commit, working tree clean')
  })

  it('creates a branch, edits, stages and commits with real-looking output', () => {
    const { git, events } = repo()
    expect(git.exec('git checkout -b feature/x').output).toBe("Switched to a new branch 'feature/x'")
    git.editFile('a.txt', 'one\nTWO\nthree\nfour\nfive\n')
    expect(git.exec('git status').output).toContain('modified:   a.txt')
    git.exec('git add .')
    expect(git.exec('git status').output).toContain('Changes to be committed')
    const commit = git.exec('git commit -m "Change line two"')
    expect(commit.ok).toBe(true)
    expect(commit.output).toMatch(/^\[feature\/x [0-9a-f]{7}\] Change line two/)
    expect(commit.output).toContain('1 file changed')
    expect(events.map((e) => e.type)).toEqual(['git:branch-created', 'git:checkout', 'git:commit'])
    expect(git.ownCommits()).toHaveLength(1)
  })

  it('supports commit -am and quoted messages with spaces', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'changed\n')
    expect(git.exec('git commit -am "tidy the file up"').ok).toBe(true)
    expect(git.headCommit().message).toBe('tidy the file up')
  })

  it('refuses an empty commit and explains why', () => {
    const { git } = repo()
    expect(git.exec('git commit -m "nothing"').output).toContain('nothing to commit, working tree clean')
    git.editFile('a.txt', 'edited\n')
    expect(git.exec('git commit -m "forgot to add"').output).toContain('no changes added to commit')
  })

  it('refuses a commit with no message', () => {
    const { git } = repo()
    git.editFile('a.txt', 'edited\n')
    git.exec('git add .')
    expect(git.exec('git commit').output).toContain('Aborting commit due to empty commit message.')
  })

  it('rejects bad input the way a shell would', () => {
    const { git } = repo()
    expect(git.exec('ls').output).toContain('command not found')
    expect(git.exec('git banana').output).toContain("'banana' is not a git command")
    expect(git.exec('git checkout -b "bad name"').output).toContain('not a valid branch name')
    expect(git.exec('git checkout nope').output).toContain("did not match any file(s) known to git")
    expect(git.exec('git switch nope').output).toContain('invalid reference: nope')
    git.exec('git checkout -b dup')
    expect(git.exec('git checkout -b dup').output).toContain("a branch named 'dup' already exists")
    expect(git.exec('git commit -m "unclosed').output).toContain('unterminated quote')
  })

  it('classifies commands for the engine', () => {
    expect(GitSim.classify('git checkout -b feature/x')).toBe('create-branch')
    expect(GitSim.classify('git switch -c feature/x')).toBe('create-branch')
    expect(GitSim.classify('git branch feature/x')).toBe('create-branch')
    expect(GitSim.classify('git branch')).toBe('other')
    expect(GitSim.classify('git checkout main')).toBe('other')
    expect(GitSim.classify('git push origin main')).toBe('push')
    expect(GitSim.classify('git pull origin main')).toBe('pull')
    expect(GitSim.classify('git commit -m "x"')).toBe('commit')
    expect(GitSim.classify('echo hi')).toBe('other')
  })

  it('moves between branches and carries safe edits, but blocks overwriting ones', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'feature version\n')
    git.exec('git commit -am "feature work"')
    git.exec('git checkout main')
    expect(git.readFile('a.txt')).toBe(BASE)
    git.editFile('a.txt', 'dirty on main\n')
    const blocked = git.exec('git checkout feature/x')
    expect(blocked.ok).toBe(false)
    expect(blocked.output).toContain('would be overwritten by checkout')
    expect(git.currentBranch()).toBe('main')
  })
})

describe('GitSim remote: push and pull', () => {
  it('pushes a new branch, then reports up to date', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'x\n')
    git.exec('git commit -am "work on x"')
    const first = git.exec('git push -u origin feature/x')
    expect(first.output).toContain('[new branch]      feature/x -> feature/x')
    expect(first.output).toContain("set up to track 'origin/feature/x'")
    expect(git.remoteBranches()).toContain('feature/x')
    expect(git.exec('git push origin feature/x').output).toBe('Everything up-to-date')
  })

  it('explains a push on a branch with no upstream', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    expect(git.exec('git push').output).toContain('--set-upstream origin feature/x')
  })

  it('knows it is behind, then fast-forwards on pull', () => {
    const { git, events } = repo()
    git.pushTeammateCommit('main', { 'a.txt': 'one\ntwo\nthree\nfour\nFIVE\n' }, 'Teammate change', 'Marcus Webb')
    expect(git.behindBy('main')).toBe(1)
    expect(git.exec('git status').output).toContain("behind 'origin/main' by 1 commit")
    const pull = git.exec('git pull origin main')
    expect(pull.ok).toBe(true)
    expect(pull.output).toContain('Fast-forward')
    expect(git.readFile('a.txt')).toContain('FIVE')
    expect(git.behindBy('main')).toBe(0)
    expect(events.some((e) => e.type === 'git:pull' && e.result === 'fast-forward')).toBe(true)
    expect(git.exec('git pull origin main').output).toBe('Already up to date.')
  })

  it('merges main into a feature branch when the edits do not overlap', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'ONE\ntwo\nthree\nfour\nfive\n')
    git.exec('git commit -am "change line one"')
    git.pushTeammateCommit('main', { 'a.txt': 'one\ntwo\nthree\nfour\nFIVE\n' }, 'Teammate edits the end', 'Marcus Webb')
    const pull = git.exec('git pull origin main')
    expect(pull.ok).toBe(true)
    expect(pull.output).toContain("Merge made by the 'ort' strategy.")
    expect(git.readFile('a.txt')).toBe('ONE\ntwo\nthree\nfour\nFIVE\n')
    expect(git.headCommit().parents).toHaveLength(2)
    expect(git.ownCommits()).toHaveLength(1) // the merge commit is not counted as the learner's own work
  })

  it('rejects a push when the remote has work you do not, with the real message', () => {
    const { git, events } = repo([
      { path: 'a.txt', content: BASE },
      { path: 'b.txt', content: 'b\n' },
    ])
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'x\n')
    git.exec('git commit -am "first push"')
    git.exec('git push -u origin feature/x')
    git.pushTeammateCommit('feature/x', { 'b.txt': 'b by teammate\n' }, 'Teammate pushes to your branch', 'Marcus Webb')
    git.editFile('a.txt', 'x again\n')
    git.exec('git commit -am "second change"')
    const push = git.exec('git push origin feature/x')
    expect(push.ok).toBe(false)
    expect(push.output).toContain('! [rejected]        feature/x -> feature/x (fetch first)')
    expect(push.output).toContain("failed to push some refs to 'github.com:bowlful/app.git'")
    expect(push.output).toContain("integrate the remote changes")
    expect(events.at(-1)).toEqual({ type: 'git:push', branch: 'feature/x', result: 'rejected' })

    // The fix is to pull first; then the push goes through.
    expect(git.exec('git pull origin feature/x').ok).toBe(true)
    expect(git.exec('git push origin feature/x').ok).toBe(true)
  })

  it('refuses to pull over uncommitted changes to the same file', () => {
    const { git } = repo()
    git.pushTeammateCommit('main', { 'a.txt': 'teammate\n' }, 'Teammate', 'Marcus Webb')
    git.editFile('a.txt', 'my uncommitted edit\n')
    const pull = git.exec('git pull origin main')
    expect(pull.ok).toBe(false)
    expect(pull.output).toContain('would be overwritten by merge')
    expect(git.readFile('a.txt')).toBe('my uncommitted edit\n')
  })

  it('explains a pull from a branch that is not on the remote', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    expect(git.exec('git pull origin feature/x').output).toContain("couldn't find remote ref feature/x")
    expect(git.exec('git pull').output).toContain('no tracking information')
  })
})

describe('GitSim merge conflicts', () => {
  function conflicted() {
    const ctx = repo()
    const { git } = ctx
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'one\ntwo changed by me\nthree\nfour\nfive\n')
    git.exec('git commit -am "my change to line two"')
    git.pushTeammateCommit('main', { 'a.txt': 'one\nTWO CHANGED BY MARCUS\nthree\nfour\nfive\n' }, 'Marcus changes line two', 'Marcus Webb')
    return ctx
  }

  it('stops with a conflict when two people change the same line', () => {
    const { git, events } = conflicted()
    const pull = git.exec('git pull origin main')
    expect(pull.ok).toBe(false)
    expect(pull.output).toContain('CONFLICT (content): Merge conflict in a.txt')
    expect(pull.output).toContain('Automatic merge failed; fix conflicts and then commit the result.')
    expect(git.isMerging()).toBe(true)
    expect(git.conflictedFiles()).toEqual(['a.txt'])
    expect(git.readFile('a.txt')).toBe(
      'one\n<<<<<<< HEAD\ntwo changed by me\n=======\nTWO CHANGED BY MARCUS\n>>>>>>> main\nthree\nfour\nfive\n',
    )
    expect(git.exec('git status').output).toContain('both modified:   a.txt')
    expect(events.some((e) => e.type === 'git:pull' && e.result === 'conflict')).toBe(true)
  })

  it('blocks commit and further pulls until the conflict is resolved, then completes the merge', () => {
    const { git } = conflicted()
    git.exec('git pull origin main')
    expect(git.exec('git commit -m "try anyway"').output).toContain('Committing is not possible because you have unmerged files')
    expect(git.exec('git pull origin main').output).toContain('You have not concluded your merge')
    expect(git.exec('git checkout main').output).toContain('resolve your current index first')

    git.editFile('a.txt', 'one\ntwo, agreed wording\nthree\nfour\nfive\n')
    git.exec('git add a.txt')
    expect(git.conflictedFiles()).toEqual([])
    const commit = git.exec('git commit -m "Resolve conflict with main"')
    expect(commit.ok).toBe(true)
    expect(git.isMerging()).toBe(false)
    expect(git.headCommit().parents).toHaveLength(2)
    expect(git.readFile('a.txt')).toContain('agreed wording')
  })

  it('treats edits on neighbouring lines as a conflict, like real Git', () => {
    const { git } = repo()
    git.exec('git checkout -b feature/x')
    git.editFile('a.txt', 'one\nTWO\nthree\nfour\nfive\n')
    git.exec('git commit -am "line two"')
    git.pushTeammateCommit('main', { 'a.txt': 'one\ntwo\nTHREE\nfour\nfive\n' }, 'line three', 'Marcus Webb')
    expect(git.exec('git pull origin main').ok).toBe(false)
  })
})

describe('GitSim pull requests (the GitHub side)', () => {
  function withBranch() {
    const ctx = repo([
      { path: 'a.txt', content: BASE },
      { path: 'b.txt', content: 'b\n' },
    ])
    ctx.git.exec('git checkout -b feature/x')
    ctx.git.editFile('a.txt', 'changed\n')
    ctx.git.exec('git commit -am "change a"')
    return ctx
  }

  it('needs the branch pushed, a title, and no duplicates', () => {
    const { git } = withBranch()
    expect(git.openPullRequest('feature/x', 'Title').message).toContain('Push your branch first')
    git.exec('git push -u origin feature/x')
    expect(git.openPullRequest('feature/x', '  ').message).toContain('needs a title')
    expect(git.openPullRequest('main', 'Title').message).toContain('same as the base')
    expect(git.openPullRequest('feature/x', 'Title').ok).toBe(true)
    expect(git.openPullRequest('feature/x', 'Again').message).toContain('already open')
  })

  it('reports out of date, merges on GitHub, and leaves local main behind until pulled', () => {
    const { git, events } = withBranch()
    git.exec('git push -u origin feature/x')
    git.pushTeammateCommit('main', { 'b.txt': 'b by marcus\n' }, 'Marcus edits b', 'Marcus Webb')
    const pr = git.openPullRequest('feature/x', 'Change a')
    expect(pr.ok).toBe(true)
    expect(git.prStatus(1)).toEqual({ outOfDate: true, conflicts: [], mergeable: true })

    const merge = git.mergePullRequest(1)
    expect(merge.ok).toBe(true)
    expect(git.pullRequest(1)?.status).toBe('merged')
    expect(git.remoteFiles('main')).toEqual({ 'a.txt': 'changed\n', 'b.txt': 'b by marcus\n' })
    expect(events.some((e) => e.type === 'github:pr-merged')).toBe(true)

    // Local main has not moved: the learner must pull to see the merged result.
    git.exec('git checkout main')
    expect(git.readFile('a.txt')).toBe(BASE)
    expect(git.exec('git pull origin main').ok).toBe(true)
    expect(git.readFile('a.txt')).toBe('changed\n')
    expect(git.mergePullRequest(1).message).toContain('already merged')
  })

  it('blocks a merge that would conflict', () => {
    const { git } = withBranch()
    git.exec('git push -u origin feature/x')
    git.pushTeammateCommit('main', { 'a.txt': 'marcus rewrote a\n' }, 'Marcus rewrites a', 'Marcus Webb')
    git.openPullRequest('feature/x', 'Change a')
    expect(git.prStatus(1)?.mergeable).toBe(false)
    expect(git.prStatus(1)?.conflicts).toEqual(['a.txt'])
    const merge = git.mergePullRequest(1)
    expect(merge.ok).toBe(false)
    expect(merge.message).toContain('conflicts that must be resolved')
  })

  it('sends a pull request back through checks when new commits are pushed', () => {
    const { git } = withBranch()
    git.exec('git push -u origin feature/x')
    git.openPullRequest('feature/x', 'Change a')
    git.setPrChecks(1, 'passed')
    git.approvePullRequest(1)
    expect(git.pullRequest(1)).toMatchObject({ checks: 'passed', approved: true })
    git.resetPrForNewCommits('feature/x')
    expect(git.pullRequest(1)).toMatchObject({ checks: 'pending', approved: false })
  })
})
