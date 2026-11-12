import type { JargonTerm } from '../content'
import { findGuide } from '../content/guides'
import { buildPdf, pdfBlob, type PdfLine } from './pdf'

// The cheat sheet is every term and command the learner has met, in the order of the jargon file.
export const metTerms = (all: JargonTerm[], seen: string[]): JargonTerm[] => all.filter((t) => seen.includes(t.id))

export const cheatSheetFileName = (ext: 'md' | 'pdf', stamp: string) => `synccraft-cheat-sheet-${stamp}.${ext}`

export function buildCheatSheetMarkdown(terms: JargonTerm[], stamp: string): string {
  const out: string[] = ['# SyncCraft cheat sheet', '', `Terms and commands met so far. Exported ${stamp}.`, '']
  for (const t of terms) {
    out.push(`## ${t.term}`, '', t.meaning, '', `Like: ${t.analogy}`, '', `Example: ${t.example}`, '')
    if (t.command) out.push('Command:', '', '```text', t.command, '```', '')
    if (t.shortcut) out.push(`Shortcut: ${t.shortcut}`, '')
    const guide = findGuide(t.guide)
    if (guide) out.push(`Field guide: ${guide.title}`, '')
  }
  return out.join('\n').trimEnd() + '\n'
}

export function cheatSheetPdfLines(terms: JargonTerm[], stamp: string): PdfLine[] {
  const lines: PdfLine[] = [
    { text: 'SyncCraft cheat sheet', font: 'bold', size: 20 },
    { text: `Terms and commands met so far. Exported ${stamp}.`, size: 10, gapBefore: 4 },
  ]
  for (const t of terms) {
    lines.push({ text: t.term, font: 'bold', size: 13, gapBefore: 16 })
    lines.push({ text: t.meaning, gapBefore: 3 })
    lines.push({ text: `Like: ${t.analogy}`, size: 10, gapBefore: 2 })
    lines.push({ text: `Example: ${t.example}`, size: 10, gapBefore: 2 })
    if (t.command) lines.push({ text: t.command, font: 'mono', size: 10, gapBefore: 4 })
    if (t.shortcut) lines.push({ text: `Shortcut: ${t.shortcut}`, size: 10, gapBefore: 2 })
    const guide = findGuide(t.guide)
    if (guide) lines.push({ text: `Field guide: ${guide.title}`, size: 10, gapBefore: 2 })
  }
  return lines
}

export const buildCheatSheetPdf = (terms: JargonTerm[], stamp: string): string => buildPdf(cheatSheetPdfLines(terms, stamp))

export const cheatSheetPdfBlob = (terms: JargonTerm[], stamp: string): Blob => pdfBlob(cheatSheetPdfLines(terms, stamp))
export const cheatSheetMarkdownBlob = (terms: JargonTerm[], stamp: string): Blob =>
  new Blob([buildCheatSheetMarkdown(terms, stamp)], { type: 'text/markdown' })
