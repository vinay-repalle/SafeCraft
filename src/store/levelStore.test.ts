// Tests the bridge between engine and screen without a browser: the same store actions
// the buttons call, run through a full Level 1.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Tests run in Node, which has no localStorage. A tiny in-memory stand-in keeps the
// progress store's saving quiet. It runs before the imports below.
vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, String(value)),
      removeItem: (key: string) => void data.delete(key),
    },
  })
})

import { useLevelStore } from './levelStore'
import { DEFAULT_PROGRESS } from './progressSchema'
import { useProgressStore } from './progressStore'

const level = () => useLevelStore.getState()
const progress = () => useProgressStore.getState()

beforeEach(() => {
  progress().replaceProgress(DEFAULT_PROGRESS)
  level().load(1)
})

describe('levelStore', () => {
  it('loads Level 1 with the recap open and the first teammate message in chat', () => {
    expect(level().popup).toEqual({ type: 'recap' })
    expect(level().snapshot?.currentStepId).toBe('read-ticket-message')
    expect(level().chat).toHaveLength(1)
    expect(level().chat[0]).toMatchObject({ speaker: 'Priya Nair', side: 'them' })
    expect(Object.values(level().stations).every((s) => s === 'idle')).toBe(true)
  })

  it('turns a chat choice into your message and the teammate reply', () => {
    level().act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    expect(level().chat.map((l) => `${l.side}:${l.speaker}`)).toEqual(['them:Priya Nair', 'you:You', 'them:Priya Nair'])
    expect(level().chat[1].text).toBe("Understood. I'll start on it.")
    expect(level().snapshot?.currentStepId).toBe('sync-start')
  })

  it('opens Sync Check when an action is held back, and replays the action once you pull', () => {
    level().act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    level().act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    expect(level().popup).toMatchObject({ type: 'sync', phase: 'start', pending: { type: 'moveTicket' } })
    expect(level().snapshot?.board.todo.map((t) => t.id)).toContain('ORD-14')

    // Only a pull is accepted in the popup.
    level().submitSyncCommand('git status')
    expect(level().popup).toMatchObject({ type: 'sync', output: expect.stringContaining('not a pull') })

    level().submitSyncCommand('git pull origin main')
    expect(level().popup).toBeNull()
    expect(level().snapshot?.board.inprogress.map((t) => t.id)).toContain('ORD-14')
    expect(level().terminal.map((l) => l.text)).toEqual(expect.arrayContaining(['git pull origin main']))
    expect(level().terminal.some((l) => l.kind === 'output' && l.text.includes('Fast-forward'))).toBe(true)
  })

  it('"Skip and auto-run" and "Ignore" both clear the popup and carry on', () => {
    level().act({ type: 'moveTicket', ticketId: 'ORD-14', to: 'inprogress' })
    level().syncChoice('ignore')
    expect(level().popup).toBeNull()
    expect(level().snapshot?.board.inprogress.map((t) => t.id)).toContain('ORD-14')
    expect(level().snapshot?.mistakes.map((m) => m.id)).toEqual(['skipped-start-pull'])

    level().load(1)
    level().act({ type: 'git', command: 'git checkout -b feature/ORD-14-x' })
    expect(level().popup).toMatchObject({ type: 'sync', phase: 'start' })
    level().syncChoice('auto')
    expect(level().snapshot?.git.branch).toBe('feature/ORD-14-x')
    expect(level().terminal.some((l) => l.kind === 'command' && l.text === 'git pull origin main')).toBe(true)
  })

  it('shows a gentle warning for a mistake and clears it on the next action', () => {
    level().act({ type: 'git', command: 'git pull origin main' })
    level().act({ type: 'git', command: 'git checkout -b my-branch' })
    expect(level().notice).toBe('You named your branch something that does not point to the ticket.')
    level().act({ type: 'git', command: 'git status' })
    expect(level().notice).toBeNull()
  })

  it('logs pull request actions as the GitHub CLI commands', () => {
    level().autoFill() // chat
    level().autoFill() // pull
    level().autoFill() // ticket
    level().autoFill() // branch
    level().autoFill() // edit
    level().autoFill() // commit
    level().autoFill() // pre-push pull
    level().autoFill() // push
    level().autoFill() // raise PR
    expect(level().terminal.some((l) => l.kind === 'command' && l.text.startsWith('git push -u origin feature/ORD-14'))).toBe(true)
    level().act({ type: 'raisePr', title: 'second' }) // refused: one is already open
    expect(level().notice).toBeNull() // pull request failures show in the PR panel, terminal logs the command
    expect(level().terminal.some((l) => l.kind === 'command' && l.text.startsWith('gh pr create --base main --title'))).toBe(true)
  })

  it('moves the package through the stations and ends live', () => {
    for (let i = 0; i < 40 && !level().snapshot?.finished; i++) level().autoFill()
    expect(level().snapshot?.finished).toBe(true)
    expect(level().stations).toEqual({ client: 'done', pm: 'done', dev: 'done', github: 'pass', tests: 'pass', live: 'pass' })
  })

  it('carries the package from station to station and ends at the live app', () => {
    expect(level().packageAt).toBe('client')
    const seen: string[] = []
    for (let i = 0; i < 40 && !level().snapshot?.finished; i++) {
      level().autoFill()
      if (seen.at(-1) !== level().packageAt) seen.push(level().packageAt)
    }
    expect(seen).toEqual(['pm', 'dev', 'github', 'tests', 'live'])
    expect(level().packageFrom).toBe('tests')
  })

  it('keeps a team feed that records who did what', () => {
    level().act({ type: 'chat', chatId: 'intro', replyId: 'ack' })
    for (let i = 0; i < 40 && !level().snapshot?.finished; i++) level().autoFill()
    const feed = level().feed
    expect(feed.some((f) => f.actor === 'qa' && f.text.startsWith('Tests passed'))).toBe(true)
    expect(feed.some((f) => f.actor === 'reviewer' && f.text.startsWith('Approved'))).toBe(true)
    expect(feed.some((f) => f.actor === 'pm' && f.text === 'Released to customers')).toBe(true)
    expect(feed.some((f) => f.actor === 'frontend' && f.text.startsWith('Created branch'))).toBe(true)
  })

  it('finishing the level opens the replay and saves progress', () => {
    expect(progress().completed[1]).toBeUndefined()
    for (let i = 0; i < 40 && !level().snapshot?.finished; i++) level().autoFill()
    expect(level().popup).toEqual({ type: 'replay' })
    expect(progress().completed[1]).toEqual({ frontend: true })
  })

  it('Play again starts a fresh run without the recap', () => {
    for (let i = 0; i < 40 && !level().snapshot?.finished; i++) level().autoFill()
    level().restart()
    expect(level().popup).toBeNull()
    expect(level().snapshot?.currentStepId).toBe('read-ticket-message')
    expect(level().terminal).toEqual([])
    expect(level().chat).toHaveLength(1)
    expect(level().feed).toEqual([])
    expect(level().packageAt).toBe('client')
    expect(progress().completed[1]).toEqual({ frontend: true }) // progress is kept
  })

  it('remembers terms as seen, and level completion survives export and import', () => {
    progress().markTermSeen('ticket')
    progress().markTermSeen('ticket')
    expect(progress().seenTerms).toEqual(['ticket'])
    progress().markLevelCompleted(1, 'frontend')
    progress().markLevelCompleted(1, 'backend')
    expect(progress().completed[1]).toEqual({ frontend: true, backend: true })
  })
})
