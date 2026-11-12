import { describe, expect, it } from 'vitest'
import { jargon } from '../content'
import { buildCheatSheetMarkdown, buildCheatSheetPdf, cheatSheetFileName, metTerms } from './cheatSheet'
import { buildPdf, toPdfText, wrapText } from './pdf'

const STAMP = '2026-11-12'

describe('metTerms', () => {
  it('keeps only seen terms, in jargon file order', () => {
    const terms = metTerms(jargon, ['pull-request', 'ticket'].filter((id) => jargon.some((t) => t.id === id)))
    expect(terms.map((t) => t.id)).toEqual(jargon.filter((t) => ['pull-request', 'ticket'].includes(t.id)).map((t) => t.id))
  })

  it('is empty when nothing has been seen', () => {
    expect(metTerms(jargon, [])).toEqual([])
  })
})

describe('Markdown export', () => {
  const branch = jargon.find((t) => t.id === 'branch')!
  const md = buildCheatSheetMarkdown([branch], STAMP)

  it('has a title, the term, its meaning and the real command', () => {
    expect(md).toContain('# SyncCraft cheat sheet')
    expect(md).toContain('## Branch')
    expect(md).toContain(branch.meaning)
    expect(md).toContain(branch.command!)
  })

  it('links the term to its Field Guide article by name', () => {
    expect(md).toContain('Field guide: What is a branch?')
  })

  it('names files with the date', () => {
    expect(cheatSheetFileName('md', STAMP)).toBe('synccraft-cheat-sheet-2026-11-12.md')
  })
})

describe('PDF writer', () => {
  it('writes a file with a valid header, trailer and a table that points at each object', () => {
    const pdf = buildPdf([{ text: 'Hello (world) \\ test' }])
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)

    const startxref = Number(/startxref\n(\d+)\n/.exec(pdf)![1])
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref')

    // Every table entry must point at "<n> 0 obj".
    const entries = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)]
    expect(entries.length).toBeGreaterThanOrEqual(7)
    entries.forEach((m, i) => {
      expect(pdf.slice(Number(m[1])).startsWith(`${i + 1} 0 obj`)).toBe(true)
    })
  })

  it('escapes brackets and backslashes so text cannot break out of its string', () => {
    const pdf = buildPdf([{ text: 'a (b) c \\ d' }])
    expect(pdf).toContain('(a \\(b\\) c \\\\ d)')
  })

  it('turns non-ASCII characters into safe ones', () => {
    expect(toPdfText('“quoted” — café →')).toBe('"quoted" - caf? ?')
  })

  it('wraps long lines and starts a new page when one fills', () => {
    expect(wrapText('word '.repeat(60), 'regular', 11).length).toBeGreaterThan(1)
    const many = Array.from({ length: 120 }, (_, i) => ({ text: `Line ${i}` }))
    const pdf = buildPdf(many)
    expect(/\/Count (\d+)/.exec(pdf)![1]).not.toBe('1')
  })

  it('builds a full cheat sheet PDF', () => {
    const pdf = buildCheatSheetPdf(jargon, STAMP)
    expect(pdf).toContain('SyncCraft cheat sheet')
    expect(pdf).toContain('Courier')
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    // ASCII only, so byte offsets equal string offsets.
    expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(pdf)).toBe(true)
  })
})
