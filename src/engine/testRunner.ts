// "Automated tests" for a learning game. Real tests would need a JavaScript runtime and
// the learner's whole project. Instead each test is a small rule about the files
// ("this file must contain this text"). The report reads like a real test run.
import type { Files } from './gitSim'

export type TestRule =
  | { type: 'includes'; path: string; text: string }
  | { type: 'excludes'; path: string; text: string }
  | { type: 'matches'; path: string; pattern: string; flags?: string }
  | { type: 'fileExists'; path: string }

export type TestCase = { id: string; name: string; rule: TestRule }

export type TestResult = { id: string; name: string; status: 'passed' | 'failed'; message?: string }

export type TestReport = {
  passed: boolean
  results: TestResult[]
  summary: { passed: number; failed: number; total: number }
  log: string[] // terminal-style lines
}

function evaluate(rule: TestRule, files: Files): string | null {
  const content = files[rule.path]
  if (content === undefined) return `Expected ${rule.path} to exist, but the file was not found.`
  switch (rule.type) {
    case 'fileExists':
      return null
    case 'includes':
      return content.includes(rule.text) ? null : `Expected ${rule.path} to contain "${rule.text}".`
    case 'excludes':
      return content.includes(rule.text) ? `Expected ${rule.path} not to contain "${rule.text}", but it does.` : null
    case 'matches':
      try {
        return new RegExp(rule.pattern, rule.flags).test(content) ? null : `Expected ${rule.path} to match /${rule.pattern}/.`
      } catch {
        return `The test pattern /${rule.pattern}/ is not a valid expression.`
      }
  }
}

export function runTests(files: Files, suite: TestCase[], suiteName = 'npm test'): TestReport {
  const results: TestResult[] = suite.map((test) => {
    const message = evaluate(test.rule, files)
    return message === null ? { id: test.id, name: test.name, status: 'passed' } : { id: test.id, name: test.name, status: 'failed', message }
  })
  const passed = results.filter((r) => r.status === 'passed').length
  const failed = results.length - passed

  const log = [`> ${suiteName}`, '']
  for (const r of results) {
    log.push(` ${r.status === 'passed' ? 'PASS' : 'FAIL'}  ${r.name}`)
    if (r.message) log.push(`       ${r.message}`)
  }
  log.push('', failed ? ` Tests  ${failed} failed | ${passed} passed (${results.length})` : ` Tests  ${passed} passed (${results.length})`)

  return { passed: failed === 0, results, summary: { passed, failed, total: results.length }, log }
}
