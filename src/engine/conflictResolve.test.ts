import { describe, expect, it } from 'vitest'
import { getLevel } from '../content'
import { buildResult, editPick, emptyPicks, hasConflictMarkers, isPicked, parseConflict, pickSide, theirsName, togglePick, unresolvedHunks, type Segment } from './conflictResolve'
import { LevelRunner } from './levelRunner'

const FILE = ['top', '<<<<<<< HEAD', 'mine 1', 'mine 2', '=======', 'theirs 1', '>>>>>>> main', 'bottom', ''].join('\n')

const hunkOf = (segments: Segment[], i = 0) => segments.filter((s): s is Extract<Segment, { kind: 'hunk' }> => s.kind === 'hunk')[i]

describe('parseConflict', () => {
  it('splits a file into the same parts and one hunk per conflict', () => {
    const parsed = parseConflict(FILE)
    expect(parsed).toEqual({
      ok: true,
      hunks: 1,
      segments: [
        { kind: 'same', lines: ['top'] },
        { kind: 'hunk', index: 0, ours: ['mine 1', 'mine 2'], theirs: ['theirs 1'], oursLabel: 'HEAD', theirsLabel: 'main' },
        { kind: 'same', lines: ['bottom', ''] },
      ],
    })
  })

  it('finds several conflicts in one file', () => {
    const two = `${FILE}<<<<<<< HEAD\na\n=======\nb\n>>>>>>> main\nend`
    const parsed = parseConflict(two)
    expect(parsed.ok && parsed.hunks).toBe(2)
  })

  it('refuses broken markers instead of guessing', () => {
    expect(parseConflict('a\n<<<<<<< HEAD\nb\n=======\nc')).toMatchObject({ ok: false, reason: expect.stringContaining('closing') })
    expect(parseConflict('a\n>>>>>>> main')).toMatchObject({ ok: false })
    expect(parseConflict('no markers at all')).toMatchObject({ ok: false })
    expect(hasConflictMarkers(FILE)).toBe(true)
    expect(hasConflictMarkers('clean file')).toBe(false)
  })
})

describe('picking lines', () => {
  const parsed = parseConflict(FILE)
  if (!parsed.ok) throw new Error('fixture should parse')
  const hunk = hunkOf(parsed.segments)

  it('builds the result in the order lines were picked, with no markers', () => {
    let picks = emptyPicks(1)
    expect(unresolvedHunks(picks)).toEqual([0])
    picks = togglePick(picks, hunk, 'theirs', 0)
    picks = togglePick(picks, hunk, 'ours', 1)
    expect(isPicked(picks, 0, 'ours', 1)).toBe(true)
    expect(unresolvedHunks(picks)).toEqual([])
    const result = buildResult(parsed.segments, picks)
    expect(result).toBe('top\ntheirs 1\nmine 2\nbottom\n')
    expect(hasConflictMarkers(result)).toBe(false)
  })

  it('un-picks a line when it is picked again', () => {
    let picks = togglePick(emptyPicks(1), hunk, 'ours', 0)
    picks = togglePick(picks, hunk, 'ours', 0)
    expect(picks).toEqual([[]])
  })

  it('takes a whole side at once, and lets a picked line be edited to combine both', () => {
    let picks = pickSide(emptyPicks(1), hunk, 'ours')
    expect(buildResult(parsed.segments, picks)).toBe('top\nmine 1\nmine 2\nbottom\n')
    picks = editPick(picks, 0, 1, 'mine 2 and theirs 1')
    expect(buildResult(parsed.segments, picks)).toBe('top\nmine 1\nmine 2 and theirs 1\nbottom\n')
  })

  it('names where their side came from', () => {
    expect(theirsName('main')).toBe('origin/main')
    expect(theirsName('origin/main')).toBe('origin/main')
  })
})

describe('the resolver on real conflict levels', () => {
  // Plays a level up to the conflict, resolves it only through the resolver functions,
  // and checks the engine accepts the result.
  for (const role of ['frontend', 'backend'] as const) {
    it(`resolves the Level 4 (${role}) conflict and the level moves on`, () => {
      const runner = new LevelRunner(getLevel(4, role)!)
      for (let i = 0; i < 40 && runner.currentStep()?.id !== 'resolve-conflict'; i++) {
        const step = runner.currentStep()!
        if (step.kind === 'syncCheck') runner.act({ type: 'syncCheck', phase: (step.check as { phase: 'start' | 'push' }).phase, choice: 'auto' })
        else runner.act({ type: 'autoFill' })
      }
      expect(runner.currentStep()?.id).toBe('resolve-conflict')
      const path = runner.git.conflictedFiles()[0]
      const parsed = parseConflict(runner.git.readFile(path)!)
      if (!parsed.ok) throw new Error(parsed.reason)
      const hunk = hunkOf(parsed.segments)

      // Keep their line, then edit it to carry your change too, which is what the step asks.
      const expected = (runner.currentStep()!.check as { includes: string }).includes
      let picks = togglePick(emptyPicks(parsed.hunks), hunk, 'theirs', hunk.theirs.length - 1)
      const lineIndex = picks[0].length - 1
      const original = picks[0][lineIndex].text
      const indent = original.match(/^\s*/)![0]
      picks = editPick(picks, 0, lineIndex, `${indent}${expected}`)
      // Any other lines on their side stay as they were.
      for (let line = 0; line < hunk.theirs.length - 1; line++) picks = togglePick(picks, hunk, 'theirs', line)

      runner.act({ type: 'editFile', path, content: buildResult(parsed.segments, picks) })
      expect(runner.currentStep()?.id).toBe('commit-merge')
    })
  }
})
