import { ArrowRight, ClipboardList, FlaskConical, GitPullRequest, Monitor, Server, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from '../app/Link'
import { ROLE_INFO } from '../app/nav'
import { playHref, startTarget } from '../app/route'
import { ThemeSwitch } from '../app/ThemeSwitch'
import { GamePreview } from '../components/landing/GamePreview'
import { HowToPlay } from '../components/landing/HowToPlay'
import { HeroPicture, StorySection } from '../components/landing/LandingPictures'
import { STATION_INFO } from '../components/pipeline/stationInfo'
import { BUTTON, BUTTON_PRIMARY } from '../components/ui'
import { jargon, levelSummaries } from '../content'
import { CLOSING, FACTS, FOOTER, FOOTER_LINKS, GAME, HERO, HOW_TO_PLAY, ROLES, STORY } from '../content/landing'
import { STATIONS } from '../engine/types'
import type { Role } from '../store/types'
import { useProgressStore } from '../store/progressStore'

// Phase 8: the landing page at "/". It shows the game's own world (the diorama), walks one change
// through it, shows the game screen, introduces the five roles and explains how to play, then
// leads into the game at /play. Unlike the game, the page scrolls as a whole and works on a phone.
//
// The page spans the whole window, with side padding that grows on wider screens. Long lines of
// body text keep their own max width so they stay easy to read. Sections alternate between the
// page colour and the raised colour (a "band"), so the reader can see where one part ends and the next
// begins without any extra decoration.
const WRAP = 'w-full px-4 sm:px-6 lg:px-10 2xl:px-16'
const SECTION = 'scroll-mt-14 py-20 lg:py-28'
const BAND = 'border-y border-line bg-raised'
const BIG_BUTTON = 'h-11 px-5 text-lead'
const NAV = [
  { href: '#follow', label: STORY.title },
  { href: '#inside', label: GAME.title },
  { href: '#roles', label: 'Roles' },
  { href: '#how-to-play', label: HOW_TO_PLAY.title },
]

const ROLE_ICON: Record<Role, LucideIcon> = {
  frontend: Monitor,
  backend: Server,
  qa: FlaskConical,
  pm: ClipboardList,
  reviewer: GitPullRequest,
}

// The numbers under the hero, each counted from the game's own data.
const FACT_LIST = [
  { n: levelSummaries.length, text: FACTS.levels },
  { n: ROLE_INFO.length, text: FACTS.roles },
  { n: jargon.length, text: FACTS.terms },
  { n: 0, text: FACTS.accounts },
]

// A section's title and lead. On a wide screen the title sits on the left and the lead on the
// right, so the heading uses the width instead of leaving it empty.
function SectionHead({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-10">
      <h2 id={id} className="text-section font-medium">
        {title}
      </h2>
      <p className="max-w-2xl text-intro text-ink-2">{lead}</p>
    </div>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-caption font-medium text-ink">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-caption text-ink-2">{children}</ul>
    </div>
  )
}

export function Landing() {
  // A returning visitor carries on where they left off (see startTarget in route.ts).
  const completed = useProgressStore((s) => s.completed)
  const seenTerms = useProgressStore((s) => s.seenTerms)
  const guidesRead = useProgressStore((s) => s.guidesRead)
  const settings = useProgressStore((s) => s.settings)
  const target = startTarget({ completed, seenTerms, guidesRead, settings })

  useEffect(() => {
    document.title = 'SyncCraft'
  }, [])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 h-14 border-b border-line bg-page">
        <div className={`${WRAP} flex h-full items-center justify-between gap-4`}>
          <Link href="/" className="text-lead font-medium">
            SyncCraft
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-body text-ink-2 transition-colors hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <Link href={target.href} className={`${BUTTON_PRIMARY} hidden sm:flex`}>
              {target.label}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: on a wide screen it fills the first screenful, so the page opens on one complete
            picture rather than a strip with the next section peeking in. */}
        <section className={`${WRAP} grid items-center gap-12 py-12 lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-16`}>
          <div className="flex flex-col gap-7">
            {/* The order-ticket tag from DESIGN.md, the same shape as the tags on the board. */}
            <span className="inline-flex self-start rounded-tag border border-line bg-raised font-mono text-meta">
              <span className="px-2 py-0.5 font-medium text-ink">SyncCraft</span>
              <span className="border-l border-dashed border-ink-3 px-2 py-0.5 text-ink-2">{HERO.eyebrow}</span>
            </span>
            <h1 className="text-hero font-medium">{HERO.title}</h1>
            <p className="max-w-xl text-intro text-ink-2">{HERO.lead}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={target.href} className={`${BUTTON_PRIMARY} ${BIG_BUTTON}`}>
                {target.label}
                <ArrowRight aria-hidden size={18} strokeWidth={1.5} />
              </Link>
              <a href="#how-to-play" className={`${BUTTON} ${BIG_BUTTON}`}>
                {HERO.howToPlay}
              </a>
            </div>
            <p className="text-caption text-ink-3">{HERO.note}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-7 sm:grid-cols-4">
              {FACT_LIST.map((fact) => (
                // flex-col-reverse shows the number above its words, while the HTML keeps the
                // term (dt) before its value (dd) as a description list should.
                <div key={fact.text} className="flex flex-col-reverse justify-end gap-1">
                  <dt className="text-caption text-ink-2">{fact.text}</dt>
                  <dd className="text-section font-medium">{fact.n}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPicture />
        </section>

        <section id="follow" aria-labelledby="follow-title" className={`${SECTION} border-t border-line`}>
          <div className={WRAP}>
            <SectionHead id="follow-title" title={STORY.title} lead={STORY.lead} />
            <div className="mt-12">
              <StorySection />
            </div>
          </div>
        </section>

        <section id="inside" aria-labelledby="inside-title" className={`${SECTION} ${BAND}`}>
          <div className={WRAP}>
            <SectionHead id="inside-title" title={GAME.title} lead={GAME.lead} />
            <div className="mt-12">
              <GamePreview />
            </div>
          </div>
        </section>

        <section id="roles" aria-labelledby="roles-title" className={SECTION}>
          <div className={WRAP}>
            <SectionHead id="roles-title" title={ROLES.title} lead={ROLES.lead} />
            {/* The two seats you can play take the first row at full width; the three roles you
                watch share the second. Six columns divide evenly into both. */}
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {ROLE_INFO.map((role) => {
                const Icon = ROLE_ICON[role.id]
                return (
                  <li
                    key={role.id}
                    className={`flex flex-col gap-4 rounded-card border bg-card p-6 ${role.playable ? 'border-accent lg:col-span-3' : 'border-line lg:col-span-2'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex size-10 items-center justify-center rounded-control border ${role.playable ? 'border-accent text-ink' : 'border-line text-ink-2'}`}>
                        <Icon aria-hidden size={18} strokeWidth={1.5} />
                      </span>
                      <span className={`rounded-tag border px-2 py-0.5 text-meta ${role.playable ? 'border-accent text-ink' : 'border-line text-ink-3'}`}>
                        {role.playable ? ROLES.playable : ROLES.observe}
                      </span>
                    </div>
                    <h3 className={`font-medium ${role.playable ? 'text-title' : 'text-lead'}`}>{role.label}</h3>
                    <p className="text-body text-ink-2">{ROLES.detail[role.id]}</p>
                    <p className="mt-auto border-t border-line pt-3 text-caption text-ink-3">
                      {ROLES.worksAt}: <span className="text-ink-2">{STATION_INFO[ROLES.station[role.id]].name}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section id="how-to-play" aria-labelledby="how-title" className={`${SECTION} ${BAND}`}>
          <div className={WRAP}>
            <SectionHead id="how-title" title={HOW_TO_PLAY.title} lead={HOW_TO_PLAY.intro} />
            <div className="mt-12">
              <HowToPlay variant="page" />
            </div>
          </div>
        </section>

        {/* The closing band uses the ink colour as its background: the strongest contrast on
            the neutral ramp, so the page ends on one clear action. Flat, no gradient. */}
        <section aria-labelledby="closing-title" className={`${WRAP} py-20 lg:py-28`}>
          <div className="grid gap-10 rounded-panel bg-ink p-8 text-page sm:p-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:p-16">
            <div className="flex flex-col items-start gap-5">
              <h2 id="closing-title" className="text-section font-medium">
                {CLOSING.title}
              </h2>
              <p className="max-w-xl text-intro text-page/75">{CLOSING.lead}</p>
              <Link href={target.href} className={`${BUTTON_PRIMARY} ${BIG_BUTTON} mt-2`}>
                {target.label}
                <ArrowRight aria-hidden size={18} strokeWidth={1.5} />
              </Link>
              <p className="text-caption text-page/60">{HERO.note}</p>
            </div>
            <div>
              <p className="text-caption font-medium text-page/60">{CLOSING.routeTitle}</p>
              <ol className="mt-4 flex flex-col">
                {STATIONS.map((id, i) => (
                  <li key={id} className="relative flex gap-4 pb-4 last:pb-0">
                    {/* The line joining one station to the next. */}
                    {i < STATIONS.length - 1 && <span aria-hidden className="absolute left-[11px] top-6 bottom-0 w-px bg-page/20" />}
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-tag border font-mono text-meta ${i === STATIONS.length - 1 ? 'border-accent bg-accent text-on-accent' : 'border-page/30 text-page/80'}`}>
                      {i + 1}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-body font-medium">{STATION_INFO[id].name}</span>
                      <span className="text-caption text-page/60">{STATION_INFO[id].detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-raised">
        <div className={`${WRAP} grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="flex flex-col gap-3">
            <Link href="/" className="text-lead font-medium">
              SyncCraft
            </Link>
            <p className="max-w-sm text-caption text-ink-2">{FOOTER}</p>
          </div>
          <FooterColumn title={FOOTER_LINKS.page}>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </FooterColumn>
          <FooterColumn title={FOOTER_LINKS.play}>
            {levelSummaries.map((level) => (
              <li key={level.id}>
                <Link href={playHref(level.id)} className="transition-colors hover:text-ink">
                  {FOOTER_LINKS.levelPrefix} {level.id}: {level.title}
                </Link>
              </li>
            ))}
          </FooterColumn>
        </div>
      </footer>
    </div>
  )
}
