import { BookOpen, FastForward, HardDrive, Highlighter, Library, type LucideIcon } from 'lucide-react'
import { Link } from '../../app/Link'
import { playHref } from '../../app/route'
import { levelSummaries } from '../../content'
import { HOW_TO_PLAY, type HelperId } from '../../content/landing'
import { Sketch } from '../sketch/Sketch'

const HELPER_ICON: Record<HelperId, LucideIcon> = {
  jargon: Highlighter,
  guide: Library,
  cheat: BookOpen,
  skip: FastForward,
}

const H3 = 'text-lead font-medium'

// "How to play", written once (src/content/landing.ts) and drawn in two places:
//   page   a section of the landing page; each level links into the game
//   guide  the first Field Guide article, inside the game
//
// It uses container queries: `@container` on the outer element lets the inner parts change
// layout with the width of this box, not the window. So the same component sits in the wide
// landing page and in the narrower article column and looks right in both.
export function HowToPlay({ variant }: { variant: 'page' | 'guide' }) {
  const h = HOW_TO_PLAY
  return (
    <div className="@container flex flex-col gap-10">
      {variant === 'guide' && <p className="text-lead text-ink-2">{h.intro}</p>}

      <section aria-labelledby={`${variant}-steps`}>
        <h3 id={`${variant}-steps`} className={H3}>
          {h.stepsTitle}
        </h3>
        <ol className="mt-4 grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
          {h.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
              <p className="flex items-baseline gap-2 text-body font-medium">
                <span className="text-meta text-ink-3">{i + 1}</span>
                {step.title}
              </p>
              <div className="rounded-tag bg-page p-2">
                <Sketch sketch={step.sketch} />
              </div>
              <p className="text-body text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={`${variant}-levels`}>
        <h3 id={`${variant}-levels`} className={H3}>
          {h.levelsTitle}
        </h3>
        <p className="mt-1 text-body text-ink-2">{h.levelsLead}</p>
        <ol className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
          {levelSummaries.map((level) => {
            const body = (
              <>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-tag border border-line text-caption font-medium">{level.id}</span>
                <span className="min-w-0">
                  <span className="block text-body font-medium text-ink">{level.title}</span>
                  <span className="mt-0.5 block text-caption text-ink-2">{level.whyItExists}</span>
                </span>
              </>
            )
            return (
              <li key={level.id}>
                {variant === 'page' ? (
                  <Link href={playHref(level.id)} aria-label={`Play level ${level.id}: ${level.title}`} className="flex items-start gap-4 px-5 py-4 transition-colors first:rounded-t-card last:rounded-b-card hover:bg-raised">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-4 px-5 py-4">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby={`${variant}-helpers`}>
        <h3 id={`${variant}-helpers`} className={H3}>
          {h.helpersTitle}
        </h3>
        <ul className="mt-4 grid gap-4 @xl:grid-cols-2">
          {h.helpers.map((helper) => {
            const Icon = HELPER_ICON[helper.id]
            return (
              <li key={helper.id} className="flex gap-3 rounded-card border border-line bg-card p-5">
                <Icon aria-hidden size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-2" />
                <span>
                  <span className="block text-body font-medium">{helper.name}</span>
                  <span className="mt-1 block text-body text-ink-2">{helper.body}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby={`${variant}-progress`} className="flex gap-3">
        <HardDrive aria-hidden size={18} strokeWidth={1.5} className="mt-1 shrink-0 text-ink-2" />
        <div>
          <h3 id={`${variant}-progress`} className={H3}>
            {h.progressTitle}
          </h3>
          <p className="mt-1 max-w-2xl text-body text-ink-2">{h.progressBody}</p>
        </div>
      </section>
    </div>
  )
}
