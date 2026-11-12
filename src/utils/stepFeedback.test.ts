import { describe, expect, it } from 'vitest'
import { doneLabel, justCompleted } from './stepFeedback'

const ORDER = ['a', 'b', 'c', 'd', 'e']

describe('justCompleted', () => {
  it('finds the steps that are new since last time, as step numbers', () => {
    expect(justCompleted(['a'], ['a', 'b'], ORDER)).toEqual([2])
    expect(justCompleted(['a'], ['a', 'b', 'c', 'd'], ORDER)).toEqual([2, 3, 4])
  })

  it('reports nothing right after a level loads, or when nothing changed', () => {
    expect(justCompleted(null, ['a', 'b'], ORDER)).toEqual([])
    expect(justCompleted(['a'], ['a'], ORDER)).toEqual([])
  })
})

describe('doneLabel', () => {
  it('reads naturally for one, two, a run, or scattered steps', () => {
    expect(doneLabel([])).toBe('')
    expect(doneLabel([3])).toBe('Step 3 done')
    expect(doneLabel([3, 4])).toBe('Steps 3 and 4 done')
    expect(doneLabel([9, 10, 11])).toBe('Steps 9 to 11 done')
    expect(doneLabel([2, 5, 7])).toBe('Steps 2, 5 and 7 done')
  })
})
