import { Check } from 'lucide-react'
import { useEffect } from 'react'
import { GuideBody } from '../components/guide/GuideBody'
import { HowToPlay } from '../components/landing/HowToPlay'
import { Sketch } from '../components/sketch/Sketch'
import { PANEL } from '../components/ui'
import { GUIDE_DIAGRAMS } from '../content/guideDiagrams'
import { HOW_TO_PLAY_SLUG, findGuide, guides } from '../content/guides'
import { useProgressStore } from '../store/progressStore'
import { useUiStore } from '../store/uiStore'

// Field guide: short articles in plain language. A list on the left, the open article on the right.
// Opening an article from a highlighted term lands here with that article selected.
export function FieldGuide() {
  const slug = useUiStore((s) => s.guideSlug)
  const openGuide = useUiStore((s) => s.openGuide)
  const read = useProgressStore((s) => s.guidesRead)
  const markGuideRead = useProgressStore((s) => s.markGuideRead)

  const current = findGuide(slug) ?? guides[0]

  // Opening an article counts as reading it.
  useEffect(() => {
    if (current) markGuideRead(current.slug)
  }, [current, markGuideRead])

  if (!current) return <p className="p-2 text-body text-ink-2">No guides yet.</p>

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)] gap-4">
      <nav aria-label="Articles" className={`${PANEL} overflow-y-auto p-4`}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h1 className="text-body font-medium">Field guide</h1>
          <span className="text-meta text-ink-3">
            {guides.filter((g) => read.includes(g.slug)).length} of {guides.length} read
          </span>
        </div>
        <ul className="space-y-1">
          {guides.map((g) => {
            const active = g.slug === current.slug
            return (
              <li key={g.slug}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => openGuide(g.slug)}
                  className={`flex w-full items-start gap-2 rounded-control border px-3 py-2 text-left transition-colors ${
                    active ? 'border-accent bg-card' : 'border-transparent hover:bg-raised'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-body ${active ? 'font-medium text-ink' : 'text-ink-2'}`}>{g.title}</span>
                    <span className="block text-meta text-ink-3">{g.minutes} min read</span>
                  </span>
                  {read.includes(g.slug) && <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-pass" aria-label="Read" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <article className={`${PANEL} overflow-y-auto p-6`} aria-labelledby="guide-title">
        <div className="max-w-2xl">
          <p className="text-meta text-ink-3">{current.minutes} min read</p>
          <h2 id="guide-title" className="mt-1 text-display font-medium">
            {current.title}
          </h2>
          {/* Phase 8: How to play is drawn by the same component as on the landing page. */}
          {current.slug === HOW_TO_PLAY_SLUG && (
            <div className="mt-4">
              <HowToPlay variant="guide" />
            </div>
          )}
          {/* Phase 7d: one still diagram per article, drawn from data in guideDiagrams.ts. */}
          {GUIDE_DIAGRAMS[current.slug] && (
            <figure className="mt-4 rounded-card border border-line bg-card p-4">
              <Sketch sketch={GUIDE_DIAGRAMS[current.slug]} />
              <figcaption className="mt-2 text-caption text-ink-2">{GUIDE_DIAGRAMS[current.slug].caption}</figcaption>
            </figure>
          )}
          {current.slug !== HOW_TO_PLAY_SLUG && (
            <div className="mt-4">
              <GuideBody blocks={current.blocks} />
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
