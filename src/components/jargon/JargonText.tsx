import { Fragment, type ReactNode } from 'react'
import type { JargonTerm } from '../../content'
import { useProgressStore } from '../../store/progressStore'
import { findTerm, TermDetails } from './TermCard'

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// "Pull request (PR)" matches both "pull request" and "PR". Endings like -s, -ing, -ed are allowed.
function termRegex(term: JargonTerm): RegExp {
  const base = term.term.replace(/\s*\(.*?\)\s*/g, ' ').trim()
  const alias = /\((.*?)\)/.exec(term.term)?.[1]
  const words = [base, ...(alias ? [alias] : [])].map(escapeRegex)
  return new RegExp(`\\b(?:${words.join('|')})(?:s|es|ing|ed)?\\b`, 'i')
}

type Match = { start: number; end: number; term: JargonTerm }

// Shows plain text, with the listed terms given a dotted underline and a hover card.
// Which terms are marked depends on the Jargon Helper setting:
//   off          nothing is marked
//   first        only terms the learner has not met yet
//   always       every listed term
export function JargonText({ text, terms = [] }: { text: string; terms?: string[] }) {
  const mode = useProgressStore((s) => s.settings.jargonMode)
  const seen = useProgressStore((s) => s.seenTerms)

  const active = mode === 'off' ? [] : terms.filter((id) => mode === 'always' || !seen.includes(id))

  const found: Match[] = []
  for (const id of active) {
    const term = findTerm(id)
    const m = term ? termRegex(term).exec(text) : null
    if (term && m) found.push({ start: m.index, end: m.index + m[0].length, term })
  }
  // Left to right; when two overlap, keep the longer one.
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const matches: Match[] = []
  for (const m of found) if (!matches.length || m.start >= matches[matches.length - 1].end) matches.push(m)

  const nodes: ReactNode[] = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.start > cursor) nodes.push(<Fragment key={`t${i}`}>{text.slice(cursor, m.start)}</Fragment>)
    nodes.push(<TermMark key={`m${i}`} label={text.slice(m.start, m.end)} term={m.term} />)
    cursor = m.end
  })
  if (cursor < text.length) nodes.push(<Fragment key="end">{text.slice(cursor)}</Fragment>)
  return <>{nodes}</>
}

// A term in the text. The card shows on hover and on keyboard focus.
function TermMark({ label, term }: { label: string; term: JargonTerm }) {
  const id = `term-${term.id}`
  return (
    <span className="group relative inline">
      <button
        type="button"
        aria-describedby={id}
        className="cursor-help border-b border-dotted border-ink-2 text-inherit"
      >
        {label}
      </button>
      <span
        id={id}
        role="tooltip"
        className="invisible absolute top-full left-0 z-20 mt-1 block w-64 rounded-card border border-line bg-card p-3 text-left font-normal opacity-0 shadow-small transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <TermDetails term={term} />
      </span>
    </span>
  )
}
