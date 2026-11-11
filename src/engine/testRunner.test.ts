import { describe, expect, it } from 'vitest'
import { runTests, type TestCase } from './testRunner'

const suite: TestCase[] = [
  { id: 'label', name: 'Button shows "Place order"', rule: { type: 'includes', path: 'b.jsx', text: 'Place order' } },
  { id: 'old', name: 'Button no longer shows "Pay now"', rule: { type: 'excludes', path: 'b.jsx', text: 'Pay now' } },
  { id: 'exists', name: 'Cart exists', rule: { type: 'fileExists', path: 'c.jsx' } },
  { id: 'shape', name: 'Exports a component', rule: { type: 'matches', path: 'b.jsx', pattern: '^export function \\w+' } },
]

describe('testRunner', () => {
  it('passes when every rule holds', () => {
    const report = runTests({ 'b.jsx': 'export function B() { return "Place order" }', 'c.jsx': '' }, suite)
    expect(report.passed).toBe(true)
    expect(report.summary).toEqual({ passed: 4, failed: 0, total: 4 })
    expect(report.log.at(-1)).toBe(' Tests  4 passed (4)')
  })

  it('fails with a message per failing rule, in a terminal-style log', () => {
    const report = runTests({ 'b.jsx': 'export function B() { return "Pay now" }', 'c.jsx': '' }, suite)
    expect(report.passed).toBe(false)
    expect(report.summary).toEqual({ passed: 2, failed: 2, total: 4 })
    expect(report.results.find((r) => r.id === 'label')?.message).toBe('Expected b.jsx to contain "Place order".')
    expect(report.results.find((r) => r.id === 'old')?.message).toContain('not to contain "Pay now", but it does')
    expect(report.log).toContain(' FAIL  Button shows "Place order"')
    expect(report.log).toContain(' PASS  Cart exists')
    expect(report.log.at(-1)).toBe(' Tests  2 failed | 2 passed (4)')
  })

  it('fails clearly when a file is missing', () => {
    const report = runTests({}, suite)
    expect(report.passed).toBe(false)
    expect(report.results[0].message).toBe('Expected b.jsx to exist, but the file was not found.')
  })

  it('reports a broken pattern instead of throwing', () => {
    const report = runTests({ 'b.jsx': 'x' }, [{ id: 'bad', name: 'Bad', rule: { type: 'matches', path: 'b.jsx', pattern: '(' } }])
    expect(report.passed).toBe(false)
    expect(report.results[0].message).toContain('not a valid expression')
  })

  it('treats an empty suite as passing', () => {
    expect(runTests({}, []).passed).toBe(true)
  })
})
