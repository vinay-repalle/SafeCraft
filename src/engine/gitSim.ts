// A small fake Git repository plus a fake GitHub, all in memory.
//
// Model: every commit stores a full snapshot of the files. A "local" copy (what is on
// the learner's laptop) and a "remote" copy (origin, i.e. GitHub) each map branch names
// to commit ids. Commands go in as the real text ("git commit -m ...") and come out as
// output close to what real Git prints, so buttons and a terminal share one code path.
//
// Known simplifications (on purpose, to keep it small):
// - Merging works on whole files, using a "common start and end" rule. If two people
//   change overlapping lines of a file it is a conflict; edits in separate parts merge.
// - There is no stash, rebase, tags or remote-tracking refs. Status and "behind" counts
//   look at the real remote, as if you had just fetched.
import type { SimFile } from './types'

export type Files = Record<string, string>

export type Commit = { id: string; parents: string[]; message: string; author: string; files: Files }

export type PullRequest = {
  id: number
  title: string
  head: string
  base: string
  author: string
  status: 'open' | 'merged'
  checks: 'pending' | 'passed' | 'failed'
  approved: boolean
}

export type GitEvent =
  | { type: 'git:branch-created'; branch: string; from: string }
  | { type: 'git:checkout'; branch: string }
  | { type: 'git:commit'; branch: string; commitId: string; message: string }
  | { type: 'git:pull'; into: string; remoteBranch: string; result: 'up-to-date' | 'fast-forward' | 'merged' | 'conflict' }
  | { type: 'git:push'; branch: string; result: 'ok' | 'up-to-date' | 'rejected' }
  | { type: 'git:remote-commit'; branch: string; commitId: string; author: string; message: string }
  | { type: 'github:pr-opened'; pr: PullRequest }
  | { type: 'github:pr-approved'; prId: number }
  | { type: 'github:pr-merged'; pr: PullRequest }

// A read-only picture of the repository for the Git graph (Phase 7). `merge` is set while a
// pull has stopped on a conflict: `ours` is your tip, `theirs` the commit you were pulling in.
export type GraphCommit = Pick<Commit, 'id' | 'parents' | 'message' | 'author'>
export type GraphState = {
  commits: GraphCommit[]
  local: Record<string, string>
  remote: Record<string, string>
  head: string
  author: string
  merge: { ours: string; theirs: string; label: string; conflicts: string[] } | null
}

export type GitResult = { ok: boolean; output: string }
export type CommandKind = 'create-branch' | 'push' | 'pull' | 'commit' | 'other'

type Options = { author?: string; remoteUrl?: string; emit?: (event: GitEvent) => void }

type MergeOutcome = {
  files: Files // merged result, with conflict markers inside conflicted files
  cleanFiles: Files // same, but conflicted files keep our side (what gets staged)
  conflicts: string[]
}

const ok = (output: string): GitResult => ({ ok: true, output })
const fail = (output: string): GitResult => ({ ok: false, output })

function tokenize(input: string): string[] | null {
  const tokens: string[] = []
  let current = ''
  let started = false
  let quote: string | null = null
  for (const ch of input.trim()) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      started = true
      continue
    }
    if (/\s/.test(ch)) {
      if (current || started) tokens.push(current)
      current = ''
      started = false
      continue
    }
    current += ch
  }
  if (quote) return null
  if (current || started) tokens.push(current)
  return tokens
}

const isValidBranchName = (name: string) =>
  /^[\w./-]+$/.test(name) && !name.startsWith('-') && !name.endsWith('/') && !name.endsWith('.') && !name.includes('..') && !name.includes('//')

const short = (id: string) => id.slice(0, 7)
const copy = (files: Files): Files => ({ ...files })

function sameFiles(a: Files, b: Files): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

function lineCounts(text: string | undefined): Map<string, number> {
  const counts = new Map<string, number>()
  if (text === undefined || text === '') return counts
  for (const line of text.split('\n')) counts.set(line, (counts.get(line) ?? 0) + 1)
  return counts
}

// Rough insertions and deletions between two versions of a file (for "N files changed").
function diffCounts(before: string | undefined, after: string | undefined): { ins: number; del: number } {
  const a = lineCounts(before)
  const b = lineCounts(after)
  let ins = 0
  let del = 0
  for (const [line, n] of b) ins += Math.max(0, n - (a.get(line) ?? 0))
  for (const [line, n] of a) del += Math.max(0, n - (b.get(line) ?? 0))
  return { ins, del }
}

function diffStat(before: Files, after: Files): string {
  const lines: string[] = []
  let files = 0
  let ins = 0
  let del = 0
  for (const path of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (before[path] === after[path]) continue
    const d = diffCounts(before[path], after[path])
    files++
    ins += d.ins
    del += d.del
    lines.push(` ${path} | ${d.ins + d.del} ${'+'.repeat(Math.min(d.ins, 10))}${'-'.repeat(Math.min(d.del, 10))}`)
  }
  if (files === 0) return ''
  const parts = [`${files} file${files === 1 ? '' : 's'} changed`]
  if (ins) parts.push(`${ins} insertion${ins === 1 ? '' : 's'}(+)`)
  if (del) parts.push(`${del} deletion${del === 1 ? '' : 's'}(-)`)
  return `${lines.join('\n')}\n ${parts.join(', ')}`
}

// Merge two versions of one file that both started from `base`.
// Find what each side changed (everything between the shared start and shared end).
// If the two changed areas do not overlap, apply both. If they overlap, keep both
// sides between conflict markers, exactly like Git does.
function mergeText(base: string, ours: string, theirs: string, label: string): { text: string; conflict: boolean } {
  const b = base.split('\n')
  const o = ours.split('\n')
  const t = theirs.split('\n')

  const region = (other: string[]) => {
    let start = 0
    while (start < b.length && start < other.length && b[start] === other[start]) start++
    let tail = 0
    while (tail < b.length - start && tail < other.length - start && b[b.length - 1 - tail] === other[other.length - 1 - tail]) tail++
    return { start, end: b.length - tail, replacement: other.slice(start, other.length - tail) }
  }

  const ro = region(o)
  const rt = region(t)
  // Regions that overlap or touch count as a conflict, as in real Git (adjacent lines too).
  const overlap = ro.start <= rt.end && rt.start <= ro.end
  if (!overlap) {
    const [first, second] = ro.start < rt.start ? [ro, rt] : [rt, ro]
    const merged = [
      ...b.slice(0, first.start),
      ...first.replacement,
      ...b.slice(first.end, second.start),
      ...second.replacement,
      ...b.slice(second.end),
    ]
    return { text: merged.join('\n'), conflict: false }
  }

  const start = Math.min(ro.start, rt.start)
  const end = Math.max(ro.end, rt.end)
  const side = (r: typeof ro) => [...b.slice(start, r.start), ...r.replacement, ...b.slice(r.end, end)]
  const ourSide = side(ro)
  const theirSide = side(rt)
  if (ourSide.join('\n') === theirSide.join('\n')) return { text: [...b.slice(0, start), ...ourSide, ...b.slice(end)].join('\n'), conflict: false }
  const text = [...b.slice(0, start), '<<<<<<< HEAD', ...ourSide, '=======', ...theirSide, `>>>>>>> ${label}`, ...b.slice(end)]
  return { text: text.join('\n'), conflict: true }
}

export class GitSim {
  readonly author: string
  private readonly remoteUrl: string
  private readonly emit: (event: GitEvent) => void

  private commits = new Map<string, Commit>()
  private local: Record<string, string> = {}
  private remote: Record<string, string> = {}
  private upstream = new Set<string>(['main'])
  private head = 'main'
  private working: Files
  private index: Files
  private merge: { theirs: string; label: string; conflicts: string[] } | null = null
  private prs: PullRequest[] = []
  private counter = 0

  constructor(files: SimFile[], options: Options = {}) {
    this.author = options.author ?? 'You'
    this.remoteUrl = options.remoteUrl ?? 'github.com:bowlful/app.git'
    this.emit = options.emit ?? (() => {})
    const initial: Files = {}
    for (const f of files) initial[f.path] = f.content
    const root = this.addCommit([], 'Initial commit', 'Team', initial)
    this.local.main = root.id
    this.remote.main = root.id
    this.working = copy(initial)
    this.index = copy(initial)
  }

  // ---- reading state -------------------------------------------------------

  currentBranch(): string {
    return this.head
  }
  branches(): string[] {
    return Object.keys(this.local).sort()
  }
  remoteBranches(): string[] {
    return Object.keys(this.remote).sort()
  }
  localTip(branch: string): string | undefined {
    return this.local[branch]
  }
  remoteTip(branch: string): string | undefined {
    return this.remote[branch]
  }
  headCommit(): Commit {
    return this.commits.get(this.local[this.head])!
  }
  getCommit(id: string): Commit | undefined {
    return this.commits.get(id)
  }
  files(): Files {
    return copy(this.working)
  }
  readFile(path: string): string | undefined {
    return this.working[path]
  }
  remoteFiles(branch: string): Files {
    const tip = this.remote[branch]
    return tip ? copy(this.commits.get(tip)!.files) : {}
  }
  isMerging(): boolean {
    return this.merge !== null
  }
  conflictedFiles(): string[] {
    return this.merge ? [...this.merge.conflicts] : []
  }
  pullRequests(): PullRequest[] {
    return this.prs.map((pr) => ({ ...pr }))
  }
  pullRequest(id: number): PullRequest | undefined {
    const pr = this.prs.find((p) => p.id === id)
    return pr ? { ...pr } : undefined
  }

  // Everything the Git graph needs, as plain data (added in Phase 7). Commits come in the order
  // they were made, which always puts a parent before its children. Nothing here can change
  // the repository: the arrays and objects are copies.
  graphState(): GraphState {
    return {
      commits: [...this.commits.values()].map(({ id, parents, message, author }) => ({ id, parents: [...parents], message, author })),
      local: { ...this.local },
      remote: { ...this.remote },
      head: this.head,
      author: this.author,
      merge: this.merge ? { ours: this.local[this.head], theirs: this.merge.theirs, label: this.merge.label, conflicts: [...this.merge.conflicts] } : null,
    }
  }

  // Commits made by the learner on the current branch: not on origin/main, not a merge.
  ownCommits(): Commit[] {
    const mainHistory = this.remote.main ? this.ancestors(this.remote.main) : new Set<string>()
    return [...this.ancestors(this.local[this.head])]
      .filter((id) => !mainHistory.has(id))
      .map((id) => this.commits.get(id)!)
      .filter((c) => c.parents.length === 1 && c.author === this.author)
  }

  // How many commits origin/<base> has that `branch` does not.
  behindBy(branch: string, base = 'main'): number {
    const tip = this.local[branch]
    const baseTip = this.remote[base]
    if (!tip || !baseTip) return 0
    const have = this.ancestors(tip)
    return [...this.ancestors(baseTip)].filter((id) => !have.has(id)).length
  }

  prStatus(id: number): { outOfDate: boolean; conflicts: string[]; mergeable: boolean } | null {
    const pr = this.prs.find((p) => p.id === id)
    if (!pr) return null
    const headTip = this.remote[pr.head]
    const baseTip = this.remote[pr.base]
    const behind = [...this.ancestors(baseTip)].filter((c) => !this.ancestors(headTip).has(c)).length
    const merged = this.computeMerge(baseTip, headTip, pr.head)
    return { outOfDate: behind > 0, conflicts: merged.conflicts, mergeable: merged.conflicts.length === 0 }
  }

  // ---- changing state from outside the learner's terminal -------------------

  editFile(path: string, content: string): void {
    this.working[path] = content
  }

  deleteFile(path: string): void {
    delete this.working[path]
  }

  // A scripted teammate pushes straight to origin. Local state does not change,
  // so the learner's copy is now behind until they pull.
  pushTeammateCommit(branch: string, changes: Record<string, string | null>, message: string, author: string): string {
    const tip = this.remote[branch]
    if (!tip) throw new Error(`Remote branch ${branch} does not exist`)
    const files = copy(this.commits.get(tip)!.files)
    for (const [path, content] of Object.entries(changes)) {
      if (content === null) delete files[path]
      else files[path] = content
    }
    const commit = this.addCommit([tip], message, author, files)
    this.remote[branch] = commit.id
    this.emit({ type: 'git:remote-commit', branch, commitId: commit.id, author, message })
    return commit.id
  }

  // ---- the command line ----------------------------------------------------

  // Tells the engine what a command is about, without running it.
  static classify(command: string): CommandKind {
    const tokens = tokenize(command)
    if (!tokens || tokens[0] !== 'git') return 'other'
    const sub = tokens[1]
    const args = tokens.slice(2)
    const flags = args.filter((a) => a.startsWith('-'))
    const positional = args.filter((a) => !a.startsWith('-'))
    if (sub === 'checkout' && flags.some((f) => f === '-b' || f === '-B')) return 'create-branch'
    if (sub === 'switch' && flags.some((f) => f === '-c' || f === '-C')) return 'create-branch'
    if (sub === 'branch' && positional.length > 0 && !flags.some((f) => ['-d', '-D', '-m', '-M'].includes(f))) return 'create-branch'
    if (sub === 'push' || sub === 'pull' || sub === 'commit') return sub
    return 'other'
  }

  exec(command: string): GitResult {
    const tokens = tokenize(command)
    if (!tokens) return fail("error: unterminated quote. Check that every quote is closed.")
    if (tokens.length === 0) return fail('')
    if (tokens[0] !== 'git') return fail(`bash: ${tokens[0]}: command not found. Commands here start with git.`)
    const [, sub, ...args] = tokens
    switch (sub) {
      case undefined:
        return fail("usage: git <command> [<args>]")
      case 'status':
        return this.cmdStatus()
      case 'add':
        return this.cmdAdd(args)
      case 'commit':
        return this.cmdCommit(args)
      case 'checkout':
        return this.cmdCheckout(args, 'checkout')
      case 'switch':
        return this.cmdCheckout(args, 'switch')
      case 'branch':
        return this.cmdBranch(args)
      case 'pull':
        return this.cmdPull(args)
      case 'push':
        return this.cmdPush(args)
      case 'fetch':
        return ok('')
      case 'log':
        return this.cmdLog()
      default:
        return fail(`git: '${sub}' is not a git command. See 'git --help'.`)
    }
  }

  private cmdStatus(): GitResult {
    const lines = [`On branch ${this.head}`]
    const remoteTip = this.remote[this.head]
    if (remoteTip && this.upstream.has(this.head)) {
      const ahead = [...this.ancestors(this.local[this.head])].filter((id) => !this.ancestors(remoteTip).has(id)).length
      const behind = [...this.ancestors(remoteTip)].filter((id) => !this.ancestors(this.local[this.head]).has(id)).length
      if (ahead && behind) lines.push(`Your branch and 'origin/${this.head}' have diverged.`)
      else if (behind) lines.push(`Your branch is behind 'origin/${this.head}' by ${behind} commit${behind === 1 ? '' : 's'}, and can be fast-forwarded.`)
      else if (ahead) lines.push(`Your branch is ahead of 'origin/${this.head}' by ${ahead} commit${ahead === 1 ? '' : 's'}.`)
      else lines.push(`Your branch is up to date with 'origin/${this.head}'.`)
    }
    const headFiles = this.headCommit().files
    if (this.merge) {
      if (this.merge.conflicts.length) {
        lines.push('', 'You have unmerged paths.', '  (fix conflicts and run "git commit")')
        lines.push('', 'Unmerged paths:', ...this.merge.conflicts.map((p) => `\tboth modified:   ${p}`))
      } else {
        lines.push('', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)')
      }
    }
    const label = (path: string, from: Files, to: Files) => (from[path] === undefined ? 'new file' : to[path] === undefined ? 'deleted' : 'modified')
    const unmerged = new Set(this.merge?.conflicts ?? [])
    const staged = [...new Set([...Object.keys(headFiles), ...Object.keys(this.index)])].filter((p) => headFiles[p] !== this.index[p] && !unmerged.has(p)).sort()
    const unstaged = Object.keys(this.index).filter((p) => this.working[p] !== this.index[p] && !unmerged.has(p)).sort()
    const untracked = Object.keys(this.working).filter((p) => this.index[p] === undefined).sort()
    if (staged.length) lines.push('', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)', ...staged.map((p) => `\t${label(p, headFiles, this.index)}:   ${p}`))
    if (unstaged.length) lines.push('', 'Changes not staged for commit:', '  (use "git add <file>..." to update what will be committed)', ...unstaged.map((p) => `\t${label(p, this.index, this.working)}:   ${p}`))
    if (untracked.length) lines.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)', ...untracked.map((p) => `\t${p}`))
    if (!staged.length && !unstaged.length && !untracked.length && !this.merge) lines.push('', 'nothing to commit, working tree clean')
    return ok(lines.join('\n'))
  }

  private cmdAdd(args: string[]): GitResult {
    const paths = args.filter((a) => !a.startsWith('-'))
    if (paths.length === 0) return fail('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?')
    const all = paths.includes('.') || args.includes('-A') || args.includes('--all')
    const targets = all ? [...new Set([...Object.keys(this.working), ...Object.keys(this.index)])] : paths
    for (const path of targets) {
      if (path in this.working) this.index[path] = this.working[path]
      else if (path in this.index) delete this.index[path]
      else return fail(`fatal: pathspec '${path}' did not match any files`)
      if (this.merge) this.merge.conflicts = this.merge.conflicts.filter((c) => c !== path)
    }
    return ok('')
  }

  private cmdCommit(args: string[]): GitResult {
    let message: string | null = null
    let all = false
    for (let i = 0; i < args.length; i++) {
      const a = args[i]
      if (a === '-m' || a === '--message') {
        if (args[i + 1] === undefined) return fail("error: switch `m' requires a value")
        message = args[++i]
      } else if (a === '-am' || a === '-ma') {
        all = true
        if (args[i + 1] === undefined) return fail("error: switch `m' requires a value")
        message = args[++i]
      } else if (a === '-a' || a === '--all') all = true
      else if (a === '--no-edit') continue
      else if (a.startsWith('--message=')) message = a.slice('--message='.length)
      else return fail(`error: unknown switch \`${a.replace(/^-+/, '')}'`)
    }

    if (this.merge?.conflicts.length) {
      return fail(
        "error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.",
      )
    }
    const headFiles = this.headCommit().files
    if (all) {
      for (const path of Object.keys(this.index)) {
        if (path in this.working) this.index[path] = this.working[path]
        else delete this.index[path]
      }
    }
    if (!this.merge && sameFiles(this.index, headFiles)) {
      const unstaged = Object.keys(this.index).some((p) => this.working[p] !== this.index[p])
      const untracked = Object.keys(this.working).some((p) => this.index[p] === undefined)
      if (unstaged)
        return fail(`On branch ${this.head}\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n\nno changes added to commit (use "git add" and/or "git commit -a")`)
      if (untracked) return fail(`On branch ${this.head}\nnothing added to commit but untracked files present (use "git add" to track)`)
      return fail(`On branch ${this.head}\nnothing to commit, working tree clean`)
    }
    if (message === null && this.merge) message = `Merge branch '${this.merge.label}' of ${this.remoteUrl} into ${this.head}`
    if (message === null || message.trim() === '') return fail('Aborting commit due to empty commit message.')

    const parents = [this.local[this.head]]
    if (this.merge) parents.push(this.merge.theirs)
    const before = headFiles
    const commit = this.addCommit(parents, message, this.author, copy(this.index))
    this.local[this.head] = commit.id
    this.merge = null
    this.emit({ type: 'git:commit', branch: this.head, commitId: commit.id, message })
    const stat = diffStat(before, commit.files)
    const summary = stat.split('\n').pop() ?? ''
    return ok(`[${this.head} ${short(commit.id)}] ${message}${summary ? `\n${summary}` : ''}`)
  }

  private cmdBranch(args: string[]): GitResult {
    const flags = args.filter((a) => a.startsWith('-'))
    const names = args.filter((a) => !a.startsWith('-'))
    if (names.length === 0 && flags.length === 0) {
      return ok(this.branches().map((b) => `${b === this.head ? '*' : ' '} ${b}`).join('\n'))
    }
    if (flags.some((f) => ['-d', '-D', '-m', '-M'].includes(f))) return fail('error: that branch option is not available in this simulator.')
    return this.createBranch(names[0], false)
  }

  private cmdCheckout(args: string[], command: 'checkout' | 'switch'): GitResult {
    const create = args.some((a) => (command === 'checkout' ? a === '-b' || a === '-B' : a === '-c' || a === '-C'))
    const names = args.filter((a) => !a.startsWith('-'))
    if (names.length === 0) return fail(command === 'switch' ? 'fatal: missing branch or commit argument' : 'error: you must name a branch.')
    const name = names[0]
    if (create) return this.createBranch(name, true)
    if (!(name in this.local)) {
      return fail(command === 'switch' ? `fatal: invalid reference: ${name}` : `error: pathspec '${name}' did not match any file(s) known to git`)
    }
    if (name === this.head) return ok(`Already on '${name}'`)
    if (this.merge?.conflicts.length) return fail('error: you need to resolve your current index first')
    return this.switchTo(name)
  }

  private createBranch(name: string, checkout: boolean): GitResult {
    if (!name || !isValidBranchName(name)) return fail(`fatal: '${name ?? ''}' is not a valid branch name`)
    if (name in this.local) return fail(`fatal: a branch named '${name}' already exists`)
    this.local[name] = this.local[this.head]
    this.emit({ type: 'git:branch-created', branch: name, from: this.head })
    if (!checkout) return ok('')
    this.head = name
    this.emit({ type: 'git:checkout', branch: name })
    return ok(`Switched to a new branch '${name}'`)
  }

  // Move to another branch, carrying uncommitted edits along unless they would be overwritten.
  private switchTo(name: string): GitResult {
    const from = this.headCommit().files
    const to = this.commits.get(this.local[name])!.files
    const paths = new Set([...Object.keys(from), ...Object.keys(to), ...Object.keys(this.working), ...Object.keys(this.index)])
    const blocked: string[] = []
    for (const p of paths) {
      const dirty = this.working[p] !== from[p] || this.index[p] !== from[p]
      if (dirty && from[p] !== to[p]) blocked.push(p)
    }
    if (blocked.length) {
      return fail(`error: Your local changes to the following files would be overwritten by checkout:\n${blocked.sort().map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`)
    }
    for (const p of paths) {
      const dirty = this.working[p] !== from[p] || this.index[p] !== from[p]
      if (dirty) continue
      if (to[p] === undefined) {
        delete this.working[p]
        delete this.index[p]
      } else {
        this.working[p] = to[p]
        this.index[p] = to[p]
      }
    }
    this.head = name
    this.emit({ type: 'git:checkout', branch: name })
    return ok(`Switched to branch '${name}'`)
  }

  private cmdPull(args: string[]): GitResult {
    const positional = args.filter((a) => !a.startsWith('-'))
    let remoteBranch: string
    if (positional.length === 0) {
      if (!this.upstream.has(this.head)) {
        return fail(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull <remote> <branch>`)
      }
      remoteBranch = this.head
    } else {
      if (positional[0] !== 'origin') return fail(`fatal: '${positional[0]}' does not appear to be a git repository`)
      remoteBranch = positional[1] ?? this.head
    }
    const theirs = this.remote[remoteBranch]
    if (!theirs) return fail(`fatal: couldn't find remote ref ${remoteBranch}`)
    if (this.merge) return fail('error: You have not concluded your merge (MERGE_HEAD exists).\nhint: Please, commit your changes before merging.\nfatal: Exiting because of unfinished merge.')

    const ours = this.local[this.head]
    const fetched = `From ${this.remoteUrl}\n * branch            ${remoteBranch} -> FETCH_HEAD`
    if (this.ancestors(ours).has(theirs)) {
      this.emit({ type: 'git:pull', into: this.head, remoteBranch, result: 'up-to-date' })
      return ok('Already up to date.')
    }

    const before = this.commits.get(ours)!.files
    const result = this.computeMerge(ours, theirs, remoteBranch)
    const fastForward = this.ancestors(theirs).has(ours)
    const target = fastForward ? this.commits.get(theirs)!.files : result.files
    const changed = [...new Set([...Object.keys(before), ...Object.keys(target)])].filter((p) => before[p] !== target[p])
    const overlap = changed.filter((p) => this.working[p] !== before[p] || this.index[p] !== before[p])
    if (overlap.length) {
      return fail(`error: Your local changes to the following files would be overwritten by merge:\n${overlap.sort().map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting`)
    }
    const apply = (files: Files, staged: Files) => {
      for (const p of changed) {
        if (files[p] === undefined) delete this.working[p]
        else this.working[p] = files[p]
        if (staged[p] === undefined) delete this.index[p]
        else this.index[p] = staged[p]
      }
    }

    if (fastForward) {
      this.local[this.head] = theirs
      apply(target, target)
      this.emit({ type: 'git:pull', into: this.head, remoteBranch, result: 'fast-forward' })
      const stat = diffStat(before, target)
      return ok(`${fetched}\nUpdating ${short(ours)}..${short(theirs)}\nFast-forward${stat ? `\n${stat}` : ''}`)
    }

    if (result.conflicts.length) {
      apply(result.files, result.cleanFiles)
      this.merge = { theirs, label: remoteBranch, conflicts: [...result.conflicts] }
      this.emit({ type: 'git:pull', into: this.head, remoteBranch, result: 'conflict' })
      const lines = result.conflicts.flatMap((p) => [`Auto-merging ${p}`, `CONFLICT (content): Merge conflict in ${p}`])
      return fail(`${fetched}\n${lines.join('\n')}\nAutomatic merge failed; fix conflicts and then commit the result.`)
    }

    const commit = this.addCommit([ours, theirs], `Merge branch '${remoteBranch}' of ${this.remoteUrl} into ${this.head}`, this.author, result.files)
    this.local[this.head] = commit.id
    apply(result.files, result.files)
    this.emit({ type: 'git:pull', into: this.head, remoteBranch, result: 'merged' })
    const stat = diffStat(before, result.files)
    return ok(`${fetched}\nMerge made by the 'ort' strategy.${stat ? `\n${stat}` : ''}`)
  }

  private cmdPush(args: string[]): GitResult {
    const setUpstream = args.includes('-u') || args.includes('--set-upstream')
    const positional = args.filter((a) => !a.startsWith('-'))
    let branch: string
    if (positional.length === 0) {
      if (!this.upstream.has(this.head)) {
        return fail(`fatal: The current branch ${this.head} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${this.head}`)
      }
      branch = this.head
    } else {
      if (positional[0] !== 'origin') return fail(`fatal: '${positional[0]}' does not appear to be a git repository`)
      branch = positional[1] ?? this.head
    }
    const tip = this.local[branch]
    if (!tip) return fail(`error: src refspec ${branch} does not match any\nerror: failed to push some refs to '${this.remoteUrl}'`)

    const remoteTip = this.remote[branch]
    const to = `To ${this.remoteUrl}`
    if (remoteTip === tip) {
      if (setUpstream) this.upstream.add(branch)
      this.emit({ type: 'git:push', branch, result: 'up-to-date' })
      return ok('Everything up-to-date')
    }
    if (remoteTip && !this.ancestors(tip).has(remoteTip)) {
      this.emit({ type: 'git:push', branch, result: 'rejected' })
      return fail(
        `${to}\n ! [rejected]        ${branch} -> ${branch} (fetch first)\nerror: failed to push some refs to '${this.remoteUrl}'\nhint: Updates were rejected because the remote contains work that you do\nhint: not have locally. This is usually caused by another repository pushing\nhint: to the same ref. You may want to first integrate the remote changes\nhint: (e.g., 'git pull ...') before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.`,
      )
    }
    this.remote[branch] = tip
    if (setUpstream) this.upstream.add(branch)
    this.emit({ type: 'git:push', branch, result: 'ok' })
    const line = remoteTip ? `   ${short(remoteTip)}..${short(tip)}  ${branch} -> ${branch}` : ` * [new branch]      ${branch} -> ${branch}`
    return ok(`${to}\n${line}${setUpstream ? `\nbranch '${branch}' set up to track 'origin/${branch}'.` : ''}`)
  }

  private cmdLog(): GitResult {
    const lines: string[] = []
    let id: string | undefined = this.local[this.head]
    while (id) {
      const c: Commit = this.commits.get(id)!
      lines.push(`${short(c.id)} ${c.message}`)
      id = c.parents[0]
    }
    return ok(lines.join('\n'))
  }

  // ---- the GitHub side ------------------------------------------------------

  openPullRequest(head: string, title: string, base = 'main', author?: string): { ok: boolean; message: string; pr?: PullRequest } {
    if (!this.remote[head]) return { ok: false, message: 'Push your branch first. A pull request needs the branch to be on GitHub.' }
    if (head === base) return { ok: false, message: `The head branch is the same as the base branch (${base}). Create a branch first.` }
    if (!title.trim()) return { ok: false, message: 'A pull request needs a title.' }
    if (this.prs.some((p) => p.head === head && p.status === 'open')) return { ok: false, message: `A pull request for ${head} is already open.` }
    const pr: PullRequest = { id: this.prs.length + 1, title: title.trim(), head, base, author: author ?? this.author, status: 'open', checks: 'pending', approved: false }
    this.prs.push(pr)
    this.emit({ type: 'github:pr-opened', pr: { ...pr } })
    return { ok: true, message: `Pull request #${pr.id} opened: ${pr.title}`, pr: { ...pr } }
  }

  setPrChecks(id: number, checks: PullRequest['checks']): void {
    const pr = this.prs.find((p) => p.id === id)
    if (!pr) return
    pr.checks = checks
    if (checks !== 'passed') pr.approved = false
  }

  // New commits pushed to a PR's branch send it back through checks and review.
  resetPrForNewCommits(head: string): void {
    for (const pr of this.prs) {
      if (pr.head === head && pr.status === 'open') {
        pr.checks = 'pending'
        pr.approved = false
      }
    }
  }

  approvePullRequest(id: number): void {
    const pr = this.prs.find((p) => p.id === id)
    if (!pr || pr.status !== 'open') return
    pr.approved = true
    this.emit({ type: 'github:pr-approved', prId: id })
  }

  // Like GitHub's default "Create a merge commit": origin/<base> gets a merge commit.
  // The learner's own copy of main is not touched, so it is behind until they pull.
  mergePullRequest(id: number): { ok: boolean; message: string } {
    const pr = this.prs.find((p) => p.id === id)
    if (!pr) return { ok: false, message: `There is no pull request #${id}.` }
    if (pr.status !== 'open') return { ok: false, message: `Pull request #${id} is already merged.` }
    const baseTip = this.remote[pr.base]
    const headTip = this.remote[pr.head]
    const merged = this.computeMerge(baseTip, headTip, pr.head)
    if (merged.conflicts.length) {
      return { ok: false, message: `This branch has conflicts that must be resolved: ${merged.conflicts.join(', ')}` }
    }
    const commit = this.addCommit([baseTip, headTip], `Merge pull request #${pr.id} from bowlful/${pr.head}`, this.author, merged.files)
    this.remote[pr.base] = commit.id
    pr.status = 'merged'
    this.emit({ type: 'github:pr-merged', pr: { ...pr } })
    return { ok: true, message: `Pull request #${pr.id} merged into ${pr.base}.` }
  }

  // ---- internals -------------------------------------------------------------

  private addCommit(parents: string[], message: string, author: string, files: Files): Commit {
    let id: string
    do {
      let h = 0x811c9dc5
      for (const ch of `${parents.join(',')}|${message}|${author}|${this.counter++}`) {
        h ^= ch.codePointAt(0)!
        h = Math.imul(h, 0x01000193) >>> 0
      }
      id = h.toString(16).padStart(8, '0').slice(0, 7)
    } while (this.commits.has(id))
    const commit: Commit = { id, parents, message, author, files }
    this.commits.set(id, commit)
    return commit
  }

  // A commit and everything before it.
  private ancestors(id: string): Set<string> {
    const seen = new Set<string>()
    const queue = [id]
    while (queue.length) {
      const next = queue.pop()!
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(...this.commits.get(next)!.parents)
    }
    return seen
  }

  // The newest commit both sides share (their "common ancestor").
  private mergeBase(a: string, b: string): string {
    const aSet = this.ancestors(a)
    const queue = [b]
    const seen = new Set<string>()
    while (queue.length) {
      const next = queue.shift()!
      if (seen.has(next)) continue
      seen.add(next)
      if (aSet.has(next)) return next
      queue.push(...this.commits.get(next)!.parents)
    }
    throw new Error('No common ancestor')
  }

  private computeMerge(oursId: string, theirsId: string, label: string): MergeOutcome {
    const ours = this.commits.get(oursId)!.files
    const theirs = this.commits.get(theirsId)!.files
    const base = this.commits.get(this.mergeBase(oursId, theirsId))!.files
    const files: Files = {}
    const cleanFiles: Files = {}
    const conflicts: string[] = []
    for (const path of [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort()) {
      const b = base[path]
      const o = ours[path]
      const t = theirs[path]
      let result: string | undefined
      if (o === t) result = o
      else if (o === b) result = t
      else if (t === b) result = o
      else if (o === undefined || t === undefined || b === undefined) {
        // One side deleted or both added different content: keep ours, flag it.
        conflicts.push(path)
        if (o !== undefined) {
          files[path] = o
          cleanFiles[path] = o
        } else if (t !== undefined) {
          files[path] = t
        }
        continue
      } else {
        const merged = mergeText(b, o, t, label)
        if (merged.conflict) {
          conflicts.push(path)
          files[path] = merged.text
          cleanFiles[path] = o
          continue
        }
        result = merged.text
      }
      if (result !== undefined) {
        files[path] = result
        cleanFiles[path] = result
      }
    }
    return { files, cleanFiles, conflicts }
  }
}
