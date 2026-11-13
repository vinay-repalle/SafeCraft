// The landing page's two pictures: the hero diorama and the "Follow one order" scroll story.
// Each starts as a still SVG picture (in the main bundle, tiny) and swaps in the 3D scene, from
// its own lazy chunk, once the page has painted. Under reduced motion, with no WebGL, or on a
// weak device, the story is a still picture per stop instead.
import { Rotate3d } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { HERO, STORY } from '../../content/landing'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { detectSupport, shouldUse3d, usePipelineMode } from '../pipeline/pipelineMode'
import { SceneBoundary, useAfterFirstPaint } from '../pipeline/sceneShell'
import { DioramaStill } from './DioramaStill'
import { HERO_FRAME, STORY_FRAMES, progressFromCenters, stopIndex } from './story'
import { useStoryProgress } from './storyProgress'
import { useBoxLayout } from './useBoxLayout'

// Nothing 3D loads before first paint: this import() runs only when a scene is first drawn.
const LandingScene = lazy(() => import('./LandingScene'))

const HERO_FRAMES = [HERO_FRAME]

// The 3D scene over its still picture. The scene stays see-through until it has drawn its first
// frame, then fades in over the still (opacity only), so the swap never shows an empty box.
function SceneOverStill({ still, variant, onFail }: { still: ReactNode; variant: 'hero' | 'story'; onFail: () => void }) {
  const [drawn, setDrawn] = useState(false)
  return (
    <>
      <div className={`absolute inset-0 transition-opacity duration-[400ms] ${drawn ? 'opacity-0' : 'opacity-100'}`}>{still}</div>
      <div className={`absolute inset-0 transition-opacity duration-[400ms] ${drawn ? 'opacity-100' : 'opacity-0'}`}>
        <SceneBoundary onError={onFail} fallback={null}>
          <Suspense fallback={null}>
            <LandingScene variant={variant} onReady={() => setDrawn(true)} onFail={onFail} />
          </Suspense>
        </SceneBoundary>
      </div>
    </>
  )
}

// Whether to draw 3D here: the device can (and the learner has not chosen the flat views in the
// game), and the scene has not crashed.
function use3dHere(): [boolean, () => void] {
  const mode = usePipelineMode((s) => s.mode)
  const [failed, setFailed] = useState(false)
  return [shouldUse3d(mode, detectSupport()) && !failed, () => setFailed(true)]
}

export function HeroPicture() {
  const box = useRef<HTMLDivElement>(null)
  const { layout, narrow } = useBoxLayout(box)
  const ready = useAfterFirstPaint()
  const [use3d, fail] = use3dHere()
  const still = <DioramaStill frames={HERO_FRAMES} index={0} layout={layout} crop={false} few={narrow} className="size-full" />
  const live = use3d && ready
  return (
    // Decoration: the headline and the story below say the same in words. On a wide screen the
    // box takes most of the window's height rather than a fixed shape, so a full-width page does
    // not make it taller than the screen.
    <div ref={box} aria-hidden className="relative aspect-[4/3] w-full overflow-hidden rounded-panel border border-line bg-card lg:aspect-auto lg:h-[min(72vh,52rem)]">
      {live ? <SceneOverStill still={still} variant="hero" onFail={fail} /> : <div className="absolute inset-0">{still}</div>}
      {live && (
        <p className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-tag border border-line bg-card px-2 py-1 text-meta text-ink-3">
          <Rotate3d aria-hidden size={16} strokeWidth={1.5} />
          {HERO.drag}
        </p>
      )}
    </div>
  )
}

// True once the element comes within a screen's height of the viewport. An IntersectionObserver
// tells the page when an element enters or leaves view, so the story's 3D code downloads only
// when the reader heads that way, not for someone who reads the hero and leaves.
function useNearViewport(ref: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true)
    }, { rootMargin: '100% 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, near])
  return near
}

const STOP_COUNT = STORY.stops.length

// The cards stack like a deck. Each card is "sticky": it scrolls up normally until it reaches
// its resting line near the top of the screen, then stays there while the page scrolls on. The
// next card comes up from below and lands on top of it, a little lower, so the top edges of the
// cards underneath still show (the "peek"). Each card sits in a tall slot (the <li>), and that
// slot's height is how far the reader scrolls between one card landing and the next.
//
// The resting line is a CSS variable so the page and the measuring code agree: below the header
// on a wide screen, below the picture on a phone.
const DECK =
  '[--deck-top:calc(5.25rem_+_40vh)] [--deck-peek:6px] lg:[--deck-top:5rem] lg:[--deck-peek:12px]'
const SLOT = 'sticky h-[45vh] lg:h-[70vh]'
// How much a card shrinks for each card that has landed on it, and the most it shrinks.
const SHRINK_PER_CARD = 0.04
const SHRINK_CARDS = 2.5

// "Follow one order": a deck of cards, one per stop, and the diorama beside them (below the
// header on a phone, above the cards). As each card lands on the deck, the scene moves to that
// stop; while a card slides up, the scene is part way between the two stops.
export function StorySection() {
  const reduceMotion = usePrefersReducedMotion()
  const [use3d, fail] = use3dHere()
  const scrub = use3d && !reduceMotion

  const section = useRef<HTMLDivElement>(null)
  const pictureBox = useRef<HTMLDivElement>(null)
  const deck = useRef<HTMLOListElement>(null)
  const slots = useRef<(HTMLElement | null)[]>([])
  const cards = useRef<(HTMLElement | null)[]>([])
  const setProgress = useStoryProgress((s) => s.set)
  const index = useStoryProgress((s) => stopIndex(s.progress, STOP_COUNT))
  const near = useNearViewport(section)
  const ready = useAfterFirstPaint()
  const { layout, aspect } = useBoxLayout(pictureBox)

  // Measure the deck on every scroll, at most once per drawn frame. A "passive" listener
  // promises the browser we will never cancel the scroll, so scrolling stays smooth.
  //
  // Card i lands when its slot's natural place (i slot heights below the top of the list) meets
  // its resting line. So the reader has scrolled `i * slot - rest` into the list when card i
  // lands, and progressFromCenters turns "how far scrolled" into "how far through the story".
  useEffect(() => {
    if (!scrub) return
    let frame = 0

    // Every card gets the height of the tallest one, so a card that lands always covers the
    // one under it completely, apart from the peek.
    const evenHeights = () => {
      const els = cards.current.filter((el): el is HTMLElement => el !== null)
      for (const el of els) el.style.minHeight = ''
      const tallest = Math.max(0, ...els.map((el) => el.offsetHeight))
      for (const el of els) el.style.minHeight = `${tallest}px`
    }

    const measure = () => {
      frame = 0
      const list = deck.current
      const first = slots.current[0]
      if (!list || !first) return
      const slot = first.offsetHeight
      const landings = slots.current.map((el, i) => i * slot - (el ? parseFloat(getComputedStyle(el).top) || 0 : 0))
      const progress = progressFromCenters(landings, -list.getBoundingClientRect().top)
      setProgress(progress)
      // Cards further down the deck shrink a little, from their top edge (transform only).
      cards.current.forEach((el, i) => {
        if (!el) return
        const under = Math.min(SHRINK_CARDS, Math.max(0, progress - i))
        el.style.transform = under > 0 ? `scale(${1 - SHRINK_PER_CARD * under})` : ''
      })
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    const onResize = () => {
      evenHeights()
      onScroll()
    }
    evenHeights()
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(frame)
    }
  }, [scrub, setProgress])

  if (!scrub) {
    // A still picture per stop: no scroll tracking, nothing moves.
    return (
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORY.stops.map((stop, i) => (
          <li key={stop.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-card">
            <DioramaStill frames={STORY_FRAMES} index={i} layout="wide" crop aspect={16 / 10} className="aspect-[16/10] w-full border-b border-line bg-page" />
            <StopText stop={stop} n={i} />
          </li>
        ))}
      </ol>
    )
  }

  const still = <DioramaStill frames={STORY_FRAMES} index={index} layout={layout} crop aspect={aspect} className="size-full" />
  return (
    <div ref={section} className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      {/* The picture is sticky too: it stays in view while the cards stack beside it (above
          them on a phone), and lets go once the deck has gone by. */}
      <div className="sticky top-14 z-10 -mx-4 bg-page px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 lg:top-20 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:self-start lg:p-0">
        <div ref={pictureBox} aria-hidden className="relative h-[40vh] overflow-hidden rounded-panel border border-line bg-card lg:h-[calc(100vh-7rem)]">
          {near && ready ? <SceneOverStill still={still} variant="story" onFail={fail} /> : <div className="absolute inset-0">{still}</div>}
        </div>
      </div>
      <ol ref={deck} className={`${DECK} pt-2 lg:col-start-1 lg:row-start-1 lg:pt-0`}>
        {STORY.stops.map((stop, i) => (
          <li
            key={stop.id}
            ref={(el) => {
              slots.current[i] = el
            }}
            className={SLOT}
            style={{ top: `calc(var(--deck-top) + ${i} * var(--deck-peek))` }}
          >
            <div
              ref={(el) => {
                cards.current[i] = el
              }}
              aria-current={i === index ? 'step' : undefined}
              className={`origin-top rounded-card border bg-card transition-colors ${i === index ? 'border-accent' : 'border-line'}`}
            >
              <StopText stop={stop} n={i} />
            </div>
          </li>
        ))}
        {/* Room after the last card lands, so the full deck holds for a moment before the
            page moves on. Sticky cards cannot leave their list, so the room has to be inside it. */}
        <li aria-hidden className="h-[30vh] list-none" />
      </ol>
    </div>
  )
}

function StopText({ stop, n }: { stop: (typeof STORY.stops)[number]; n: number }) {
  return (
    <div className="flex flex-col gap-2 p-5">
      <p className="flex items-center justify-between gap-3 text-meta text-ink-3">
        <span>
          Stop {n + 1} of {STOP_COUNT}
        </span>
        <span>Level {stop.level}</span>
      </p>
      <h3 className="text-lead font-medium">{stop.title}</h3>
      <p className="text-body text-ink-2">{stop.body}</p>
    </div>
  )
}
