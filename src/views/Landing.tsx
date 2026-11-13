import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from '../app/Link'
import { ROLE_INFO } from '../app/nav'
import { startTarget } from '../app/route'
import { ThemeSwitch } from '../app/ThemeSwitch'
import { HowToPlay } from '../components/landing/HowToPlay'
import { HeroPicture, StorySection } from '../components/landing/LandingPictures'
import { BUTTON, BUTTON_PRIMARY } from '../components/ui'
import { CLOSING, FOOTER, HERO, HOW_TO_PLAY, ROLES, STORY } from '../content/landing'
import { useProgressStore } from '../store/progressStore'

// Phase 8: the landing page at "/". It shows the game's own world (the diorama), walks one change
// through it, introduces the five roles and explains how to play, then leads into the game at
// /play. Unlike the game, the page scrolls as a whole and works on a phone.
const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6'
const SECTION = 'scroll-mt-14 border-t border-line py-16 lg:py-20'
const NAV = [
  { href: '#follow', label: STORY.title },
  { href: '#roles', label: 'Roles' },
  { href: '#how-to-play', label: HOW_TO_PLAY.title },
]

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
          <nav aria-label="Sections" className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-body text-ink-2 transition-colors hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <Link href={target.href} className={`${BUTTON} hidden sm:flex`}>
              {target.label}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={`${WRAP} grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-20`}>
          <div className="flex flex-col gap-5">
            <h1 className="text-display font-medium">{HERO.title}</h1>
            <p className="text-lead text-ink-2">{HERO.lead}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={target.href} className={`${BUTTON_PRIMARY} h-10 px-4`}>
                {target.label}
                <ArrowRight aria-hidden size={16} strokeWidth={1.5} />
              </Link>
              <a href="#how-to-play" className={`${BUTTON} h-10 px-4`}>
                {HERO.howToPlay}
              </a>
            </div>
            <p className="text-caption text-ink-3">{HERO.note}</p>
          </div>
          <HeroPicture />
        </section>

        <section id="follow" aria-labelledby="follow-title" className={SECTION}>
          <div className={WRAP}>
            <h2 id="follow-title" className="text-title font-medium">
              {STORY.title}
            </h2>
            <p className="mt-2 max-w-2xl text-lead text-ink-2">{STORY.lead}</p>
            <div className="mt-8">
              <StorySection />
            </div>
          </div>
        </section>

        <section id="roles" aria-labelledby="roles-title" className={SECTION}>
          <div className={WRAP}>
            <h2 id="roles-title" className="text-title font-medium">
              {ROLES.title}
            </h2>
            <p className="mt-2 max-w-2xl text-lead text-ink-2">{ROLES.lead}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ROLE_INFO.map((role) => (
                <li key={role.id} className={`flex flex-col gap-3 rounded-card border bg-card p-5 ${role.playable ? 'border-accent' : 'border-line'}`}>
                  <span className={`self-start rounded-tag border px-2 py-0.5 text-meta ${role.playable ? 'border-accent text-ink' : 'border-line text-ink-3'}`}>
                    {role.playable ? ROLES.playable : ROLES.observe}
                  </span>
                  <h3 className="text-body font-medium">{role.label}</h3>
                  <p className="text-body text-ink-2">{ROLES.detail[role.id]}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-to-play" aria-labelledby="how-title" className={SECTION}>
          <div className={WRAP}>
            <h2 id="how-title" className="text-title font-medium">
              {HOW_TO_PLAY.title}
            </h2>
            <p className="mt-2 max-w-2xl text-lead text-ink-2">{HOW_TO_PLAY.intro}</p>
            <div className="mt-8">
              <HowToPlay variant="page" />
            </div>
          </div>
        </section>

        <section aria-labelledby="closing-title" className={SECTION}>
          <div className={`${WRAP} flex flex-col items-start gap-4`}>
            <h2 id="closing-title" className="text-title font-medium">
              {CLOSING.title}
            </h2>
            <p className="max-w-2xl text-lead text-ink-2">{CLOSING.lead}</p>
            <Link href={target.href} className={`${BUTTON_PRIMARY} h-10 px-4`}>
              {target.label}
              <ArrowRight aria-hidden size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <p className={`${WRAP} text-caption text-ink-3`}>{FOOTER}</p>
      </footer>
    </div>
  )
}
