import { jargon, type JargonTerm } from '../../content'
import { TERM_ANIMATIONS } from '../../content/termAnimations'
import { useProgressStore } from '../../store/progressStore'
import { AnimatedSketch } from '../sketch/Sketch'
import { PANEL_BUTTON } from '../ui'
import { GuideLink } from './GuideLink'

export const findTerm = (id: string): JargonTerm | undefined => jargon.find((t) => t.id === id)

// The content of a term: meaning, everyday comparison, example, real command and shortcut.
export function TermDetails({ term }: { term: JargonTerm }) {
  return (
    <div className="space-y-2 text-caption">
      <p className="text-body font-medium text-ink">{term.term}</p>
      <p className="text-ink">{term.meaning}</p>
      <p className="text-ink-2">
        <span className="text-ink-3">Like: </span>
        {term.analogy}
      </p>
      <p className="text-ink-2">
        <span className="text-ink-3">Example: </span>
        {term.example}
      </p>
      {term.command && <code className="block rounded-tag bg-raised px-2 py-1 font-mono text-meta text-ink">{term.command}</code>}
      {term.shortcut && (
        <p className="text-ink-2">
          <span className="text-ink-3">Shortcut: </span>
          {term.shortcut}
        </p>
      )}
      <GuideLink slug={term.guide} />
    </div>
  )
}

// The card that appears the first time a term shows up in a level.
// Hidden when the Jargon Helper is off, or once every term on the step has been seen.
export function FirstTimeCard({ termIds }: { termIds: string[] }) {
  const mode = useProgressStore((s) => s.settings.jargonMode)
  const seen = useProgressStore((s) => s.seenTerms)
  const markTermSeen = useProgressStore((s) => s.markTermSeen)
  if (mode === 'off') return null

  const unseen = termIds.find((id) => !seen.includes(id))
  const term = unseen ? findTerm(unseen) : undefined
  if (!term) return null

  return (
    <div className="mt-3 rounded-tag border border-line bg-raised p-3">
      {/* Phase 7c: the core terms have a short animation that plays once as the card opens.
          Keyed by term, so the next term's card plays its own from the start. */}
      {TERM_ANIMATIONS[term.id] && (
        <div className="mb-3">
          <AnimatedSketch key={term.id} sketch={TERM_ANIMATIONS[term.id]} />
        </div>
      )}
      <TermDetails term={term} />
      <button type="button" className={`${PANEL_BUTTON} mt-3 bg-card`} onClick={() => markTermSeen(term.id)}>
        Got it
      </button>
    </div>
  )
}
