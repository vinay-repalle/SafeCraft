// The bridge between the simulation engine and the screen.
//
// The engine (src/engine) knows nothing about React. This store owns one LevelRunner,
// listens to its events, and turns them into things the UI can show: chat lines,
// terminal lines, station states for the pipeline, and which popup is open.
// It is NOT saved to localStorage: a level run lives in memory, so a reload starts the
// level again. Only the result (level completed, terms seen) goes into the saved progress.
import { create } from 'zustand'
import { getLevel, type PlayableRole } from '../content'
import { LevelRunner, type RunnerSnapshot } from '../engine/levelRunner'
import { GitSim } from '../engine/gitSim'
import { STATIONS, type Action, type ActionResult, type Level, type Station, type Step } from '../engine/types'
import type { Role } from './types'
import { useProgressStore } from './progressStore'
import { describeEvent, type FeedItem } from './teamFeed'

export type StationState = 'idle' | 'active' | 'done' | 'pass' | 'fail'
export type ChatLine = { id: number; speaker: string; side: 'them' | 'you'; text: string }
export type TerminalLine = { id: number; kind: 'command' | 'output' | 'error'; text: string }
export type Popup =
  | { type: 'recap' }
  | { type: 'sync'; phase: 'start' | 'push'; pending: Action | null; output: string | null }
  | { type: 'replay' }

type LevelState = {
  levelId: number
  // Whose seat you are in: each level is written once for the frontend developer and once for the backend developer.
  playRole: PlayableRole
  runner: LevelRunner | null
  snapshot: RunnerSnapshot | null
  chat: ChatLine[]
  terminal: TerminalLine[]
  stations: Record<Station, StationState>
  // Where the work package is, and where it came from (so the 3D scene can carry it across).
  packageAt: Station
  packageFrom: Station | null
  // What each role did, newest last. Team view reads this.
  feed: FeedItem[]
  popup: Popup | null
  // A gentle warning or error from the last action, shown on the step card.
  notice: string | null

  // True while a teammate is working in the same code and the level is about a merge conflict, so the 3D scene shows a second developer.
  teammateActive: boolean

  load: (levelId: number, options?: { skipRecap?: boolean; role?: PlayableRole }) => void
  act: (action: Action) => ActionResult
  autoFill: () => void
  runCommand: (command: string) => ActionResult
  submitSyncCommand: (command: string) => void
  syncChoice: (choice: 'auto' | 'ignore') => void
  openReplay: () => void
  closePopup: () => void
  restart: () => void
}

const FEED_LIMIT = 40

// Which role a teammate's scripted push belongs to. Levels may say; otherwise it is the other
// seat, so a frontend learner's teammate is a backend developer.
function teammateRole(level: Level, message: string): Role {
  const pushes = [...(level.scenario.remoteCommits ?? []), ...level.steps.flatMap((s) => (s.after?.remoteCommit ? [s.after.remoteCommit] : []))]
  return pushes.find((c) => c.message === message)?.role ?? (level.perspective === 'backend' ? 'frontend' : 'backend')
}

const idleStations = (): Record<Station, StationState> =>
  Object.fromEntries(STATIONS.map((s) => [s, 'idle'])) as Record<Station, StationState>

let unsubscribe: (() => void) | null = null
let seq = 0
const nextId = () => ++seq

export const useLevelStore = create<LevelState>()((set, get) => {
  const pushTerminal = (lines: { kind: TerminalLine['kind']; text: string }[]) =>
    set((s) => ({ terminal: [...s.terminal, ...lines.map((l) => ({ ...l, id: nextId() }))] }))

  // One command and what came back, as a terminal would show it.
  const logCommand = (command: string, result: ActionResult) => {
    const lines: { kind: TerminalLine['kind']; text: string }[] = [{ kind: 'command', text: command }]
    if (result.message) lines.push({ kind: result.ok ? 'output' : 'error', text: result.message })
    pushTerminal(lines)
  }

  // Skip & Auto-Fill reports several commands as "$ cmd" lines followed by their output.
  const logAutoFillGit = (message: string) => {
    const lines = message.split('\n').map((text) => (text.startsWith('$ ') ? { kind: 'command' as const, text: text.slice(2) } : { kind: 'output' as const, text }))
    pushTerminal(lines)
  }

  const handleEvent = (runner: LevelRunner) => (event: Parameters<Parameters<LevelRunner['events']['on']>[0]>[0]) => {
    // Team view: whoever owns the current step is the one acting when this event fires.
    const actor = runner.currentStep()?.role ?? runner.level.perspective ?? 'frontend'
    const line = describeEvent(event, actor, event.type === 'git:remote-commit' ? teammateRole(runner.level, event.message) : undefined)
    if (line) set((s) => ({ feed: [...s.feed, { ...line, id: nextId() }].slice(-FEED_LIMIT) }))

    switch (event.type) {
      case 'step:active': {
        const chat = runner.level.steps[event.index].chat
        if (chat) set((s) => ({ chat: [...s.chat, { id: nextId(), speaker: chat.from.name, side: 'them', text: chat.message }] }))
        break
      }
      case 'chat:reply': {
        const chat = runner.level.steps.map((s) => s.chat).find((c) => c?.id === event.chatId)
        const reply = chat?.replies.find((r) => r.id === event.replyId)
        if (!chat || !reply) break
        set((s) => ({
          chat: [
            ...s.chat,
            { id: nextId(), speaker: 'You', side: 'you', text: reply.text },
            { id: nextId(), speaker: chat.from.name, side: 'them', text: event.response },
          ],
        }))
        break
      }
      case 'pipeline': {
        const { station, status, packageFrom } = event.event
        set((s) => {
          const stations = { ...s.stations }
          // The package has moved on: the station it left is "done" unless it already passed or failed.
          if (packageFrom && (stations[packageFrom] === 'active' || stations[packageFrom] === 'idle')) stations[packageFrom] = 'done'
          stations[station] = status
          // The package only travels when the event names where it came from. Otherwise it stays put
          // and the station just changes colour (for example the review passing at GitHub).
          return packageFrom ? { stations, packageFrom: s.packageAt, packageAt: station } : { stations }
        })
        break
      }
      case 'git:remote-commit':
        // Only levels about a conflict show the second developer: that is the lesson there.
        if (runner.level.steps.some((st) => st.check?.type === 'conflict')) set({ teammateActive: true })
        break
      case 'git:pull':
        set({ teammateActive: false })
        break
      case 'mistake': {
        // Gentle mode: a warning, no penalty. The full explanation comes in the replay.
        const rule = runner.level.replay.find((r) => r.mistake === event.id)
        if (rule) set({ notice: rule.you })
        break
      }
      case 'level:complete':
        useProgressStore.getState().markLevelCompleted(event.levelId, runner.level.perspective === 'backend' ? 'backend' : 'frontend')
        set({ popup: { type: 'replay' } })
        break
    }
  }

  // After a sync gate is cleared, do the thing the learner originally asked for.
  const resume = (pending: Action | null) => {
    if (!pending) return
    if (pending.type === 'autoFill') get().autoFill()
    else get().act(pending)
  }

  // A pull that stops on a conflict is not a mistake to retry inside the popup. Close it, say what
  // happened, and let the learner fix the file in the editor.
  const stoppedOnConflict = (runner: LevelRunner) => runner.snapshot().git.conflicts.length > 0
  const CONFLICT_NOTICE = 'Git stopped on a merge conflict. Open the marked file, fix it, then commit.'

  return {
    levelId: 1,
    playRole: 'frontend' as PlayableRole,
    teammateActive: false,
    runner: null,
    snapshot: null,
    chat: [],
    terminal: [],
    stations: idleStations(),
    packageAt: 'client',
    packageFrom: null,
    feed: [],
    popup: null,
    notice: null,

    load: (levelId, options) => {
      const role = options?.role ?? get().playRole
      const level = getLevel(levelId, role)
      if (!level) return
      unsubscribe?.()
      const runner = new LevelRunner(level)
      set({
        levelId,
        playRole: role,
        teammateActive: false,
        runner,
        snapshot: runner.snapshot(),
        chat: [],
        terminal: [],
        stations: idleStations(),
        packageAt: 'client',
        packageFrom: null,
        feed: [],
        popup: options?.skipRecap ? null : { type: 'recap' },
        notice: null,
      })
      unsubscribe = runner.events.on(handleEvent(runner))
      // The first step was announced inside the constructor, before we were listening.
      const first = runner.currentStep()
      if (first?.chat) set({ chat: [{ id: nextId(), speaker: first.chat.from.name, side: 'them', text: first.chat.message }] })
    },

    act: (action) => {
      const { runner } = get()
      if (!runner) return { ok: false, message: 'No level is loaded.' }
      set({ notice: null })
      const result = runner.act(action)
      if (result.gate) {
        set({ snapshot: runner.snapshot(), popup: { type: 'sync', phase: result.gate === 'start-pull' ? 'start' : 'push', pending: action, output: null } })
        return result
      }
      if (action.type === 'git') logCommand(action.command, result)
      // Pull requests are a GitHub feature, not a git command. The real equivalent is the GitHub CLI.
      else if (action.type === 'raisePr') logCommand(`gh pr create --base main --title "${action.title}"`, result)
      else if (action.type === 'mergePr') logCommand('gh pr merge --merge', result)
      else if (!result.ok) set({ notice: result.message })
      set({ snapshot: runner.snapshot() })
      return result
    },

    // The terminal and the Git buttons both go through here, so what you see is what ran.
    runCommand: (command) => get().act({ type: 'git', command }),

    autoFill: () => {
      const { runner } = get()
      if (!runner) return
      const step: Step | null = runner.currentStep()
      set({ notice: null })
      const result = runner.act({ type: 'autoFill' })
      if (result.gate) {
        set({ snapshot: runner.snapshot(), popup: { type: 'sync', phase: result.gate === 'start-pull' ? 'start' : 'push', pending: { type: 'autoFill' }, output: null } })
        return
      }
      if (step?.kind === 'git' && result.message) logAutoFillGit(result.message)
      else if (step?.kind === 'syncCheck' && step.autoFill) logCommand(step.autoFill, result)
      else if (!result.ok) set({ notice: result.message })
      set({ snapshot: runner.snapshot() })
    },

    submitSyncCommand: (command) => {
      const { runner, popup } = get()
      if (!runner || popup?.type !== 'sync') return
      if (GitSim.classify(command) !== 'pull') {
        set({ popup: { ...popup, output: 'That is not a pull. The command starts with git pull.' } })
        return
      }
      const result = runner.act({ type: 'git', command })
      logCommand(command, result)
      set({ snapshot: runner.snapshot() })
      if (result.ok && runner.snapshot().sync[popup.phase] !== null) {
        set({ popup: null })
        resume(popup.pending)
      } else if (stoppedOnConflict(runner)) {
        set({ popup: null, notice: CONFLICT_NOTICE })
      } else {
        set({ popup: { ...popup, output: result.message } })
      }
    },

    syncChoice: (choice) => {
      const { runner, popup } = get()
      if (!runner || popup?.type !== 'sync') return
      const result = runner.act({ type: 'syncCheck', phase: popup.phase, choice })
      if (choice === 'auto') logCommand('git pull origin main', result)
      set({ snapshot: runner.snapshot() })
      if (!result.ok && stoppedOnConflict(runner)) {
        set({ popup: null, notice: CONFLICT_NOTICE })
        return
      }
      if (!result.ok) {
        set({ popup: { ...popup, output: result.message } })
        return
      }
      set({ popup: null })
      resume(popup.pending)
    },

    openReplay: () => set({ popup: { type: 'replay' } }),
    closePopup: () => set({ popup: null }),
    restart: () => get().load(get().levelId, { skipRecap: true }),
  }
})

// Reads the current step in a way React re-renders on: the snapshot changes after every action.
export function useCurrentStep(): Step | null {
  const runner = useLevelStore((s) => s.runner)
  useLevelStore((s) => s.snapshot)
  return runner?.currentStep() ?? null
}
