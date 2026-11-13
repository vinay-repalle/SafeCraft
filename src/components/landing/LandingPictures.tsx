// The landing page's two pictures: the hero diorama and the "Follow one order" scroll story.
// Each starts as a still SVG picture (in the main bundle, tiny) and swaps in the 3D scene, from
// its own lazy chunk, once the page has painted. Under reduced motion, with no WebGL, or on a
// weak device, the story is a still picture per stop instead.
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { STORY } from '../../content/landing'
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
  return (
    // Decoration: the headline and the story below say the same in words.
    <div ref={box} aria-hidden className="relative aspect-[4/3] w-full overflow-hidden rounded-panel border border-line bg-card">
      {use3d && ready ? <SceneOverStill still={still} variant="hero" onFail={fail} /> : <div className="absolute inset-0">{still}</div>}
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
const LG = '(min-width: 1024px)'
const HEADER_PX = 56

// "Follow one order": a card per stop, and the diorama beside them (below the header on a phone,
// above the cards). As each card crosses the reading line, the scene moves to that stop.
export function StorySection() {
  const reduceMotion = usePrefersReducedMotion()
  const [use3d, fail] = use3dHere()
  const scrub = use3d && !reduceMotion

  const section = useRef<HTMLDivElement>(null)
  const pictureBox = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])
  const setProgress = useStoryProgress((s) => s.set)
  const index = useStoryProgress((s) => stopIndex(s.progress, STOP_COUNT))
  const near = useNearViewport(section)
  const ready = useAfterFirstPaint()
  const { layout, aspect } = useBoxLayout(pictureBox)

  // Measure where the cards are on every scroll, at most once per drawn frame. The reading line
  // is half way down the part of the screen the cards scroll through: below the header on a wide
  // screen, below the picture on a phone. A "passive" listener promises the browser we will never
  // cancel the scroll, so scrolling stays smooth while we measure.
  useEffect(() => {
    if (!scrub) return
    let frame = 0
    const measure = () => {
      frame = 0
      const centers = cards.current.map((el) => {
        const r = el?.getBoundingClientRect()
        return r ? r.top + r.height / 2 : 0
      })
      const top = window.matchMedia(LG).matches ? HEADER_PX : (pictureBox.current?.getBoundingClientRect().bottom ?? HEADER_PX)
      setProgress(progressFromCenters(centers, (top + window.innerHeight) / 2))
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
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
      {/* "Sticky" keeps the picture in view while the cards scroll past. It sticks inside this
          box, so it lets go once the last card has gone by. On a phone it sits above the cards. */}
      <div className="sticky top-14 z-10 -mx-4 bg-page px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 lg:top-20 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:self-start lg:p-0">
        <div ref={pictureBox} aria-hidden className="relative h-[40vh] overflow-hidden rounded-panel border border-line bg-card lg:h-[calc(100vh-7rem)]">
          {near && ready ? <SceneOverStill still={still} variant="story" onFail={fail} /> : <div className="absolute inset-0">{still}</div>}
        </div>
      </div>
      <ol className="pb-[30vh] lg:col-start-1 lg:row-start-1">
        {STORY.stops.map((stop, i) => (
          <li
            key={stop.id}
            ref={(el) => {
              cards.current[i] = el
            }}
            className="flex min-h-[60vh] items-center py-6 lg:min-h-[70vh]"
          >
            <div
              aria-current={i === index ? 'step' : undefined}
              className={`w-full rounded-card border bg-card transition-colors ${i === index ? 'border-accent' : 'border-line'}`}
            >
              <StopText stop={stop} n={i} />
            </div>
          </li>
        ))}
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
