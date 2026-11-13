// Phase 8: the landing page's 3D diorama, in its own lazy chunk (see Landing.tsx). three.js and
// the station models are shared with the game's scenes, so they download once.
//
// One component draws two things:
//   hero   the whole diorama. The camera settles once when it first appears (a small turn and
//          zoom, about a second and a half) and then stays still until the reader drags it:
//          dragging sideways turns the diorama round, dragging up or down tilts the view, and a
//          double-click puts it back. It never moves on its own.
//   story  "Follow one order". The page's scroll position (storyProgress.ts) sets the camera, the
//          parcel, the conveyor and the merge gate (story.ts). Nothing moves unless the reader
//          scrolls, and scrolling up plays it backward.
//
// Same rules as every scene in the app: orthographic isometric camera, frameloop="demand",
// pixel ratio capped at 1.5, no real-time shadows, flat colours from the theme tokens.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Vector3, type Group, type Mesh, type OrthographicCamera } from 'three'
import { STATIONS, type Station } from '../../engine/types'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { gatePoints } from '../pipeline/mergeGate'
import { placeLabel } from '../pipeline/placeLabel'
import { mix, useSceneColors } from '../pipeline/sceneColors'
import { LABEL_HEIGHT, PAD, PARCEL_OFFSET, PARCEL_Y, SPACING, ease, layoutForAspect, parcelSpot, slabSize, stationPositions } from '../pipeline/sceneLayout'
import { BAR_LIFT, Conveyor, GateModel, VIEW_DIRECTION, beltLength, fitCamera, headingY, placeSlats } from '../pipeline/sceneParts'
import { PAD_HEIGHT, ParcelModel, StationModel, TicketModel, useShadowTexture } from '../pipeline/stations'
import { STATE_TEXT, STATION_INFO } from '../pipeline/stationInfo'
import { HERO_FRAME, STORY_FRAMES, stopIndex, storyPose, type StoryFrame } from './story'
import { useStoryProgress } from './storyProgress'
import { NARROW_PX } from './useBoxLayout'

export type LandingVariant = 'hero' | 'story'
type LabelRefs = MutableRefObject<Partial<Record<Station, HTMLElement | null>>>

const SETTLE_SECONDS = 1.6
const SETTLE_TURN = -0.22 // radians about the vertical axis at the start of the settle
const SETTLE_ZOOM = 0.86 // share of the final zoom at the start of the settle
const CAMERA_DISTANCE = 40
const EDGE_PX = 6

// Dragging the hero. The camera sits on an imaginary sphere around the diorama: "azimuth" is how
// far round it is (like a compass bearing) and "elevation" how high above the floor it looks
// from. The isometric view is azimuth 45 degrees, elevation about 35 degrees (the (1,1,1) line).
const TURN_PER_PX = 0.008 // radians per pixel dragged
const BASE_AZIMUTH = Math.atan2(VIEW_DIRECTION.x, VIEW_DIRECTION.z)
const BASE_ELEVATION = Math.asin(VIEW_DIRECTION.y)
const MIN_ELEVATION = 0.2 // about 12 degrees: never down at floor level
const MAX_ELEVATION = 1.4 // about 80 degrees: nearly straight down, never past it
// Turned away from the isometric view, the diorama's corners can poke past the fitted frame, so
// the camera eases out a little the further it is turned.
const TURNED_ZOOM_OUT = 0.14

type Orbit = { yaw: number; pitch: number; dragging: number | null; x: number; y: number }

// Pointer events cover mouse, pen and touch in one API. "Pointer capture" keeps sending moves to
// the canvas while the button is held, even if the pointer leaves it. On touch, `touch-action:
// pan-y` lets an up-and-down swipe still scroll the page; only a sideways drag turns the scene.
function useDragToTurn(enabled: boolean): MutableRefObject<Orbit> {
  const orbit = useRef<Orbit>({ yaw: 0, pitch: 0, dragging: null, x: 0, y: 0 })
  const el = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!enabled) return
    const o = orbit.current
    el.style.touchAction = 'pan-y'
    el.style.cursor = 'grab'
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      o.dragging = e.pointerId
      o.x = e.clientX
      o.y = e.clientY
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (o.dragging !== e.pointerId) return
      o.yaw -= (e.clientX - o.x) * TURN_PER_PX
      const elevation = BASE_ELEVATION + o.pitch + (e.clientY - o.y) * TURN_PER_PX
      o.pitch = Math.min(MAX_ELEVATION, Math.max(MIN_ELEVATION, elevation)) - BASE_ELEVATION
      o.x = e.clientX
      o.y = e.clientY
      invalidate()
    }
    const up = (e: PointerEvent) => {
      if (o.dragging !== e.pointerId) return
      o.dragging = null
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      el.style.cursor = 'grab'
    }
    const reset = () => {
      o.yaw = 0
      o.pitch = 0
      invalidate()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('dblclick', reset)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('dblclick', reset)
      el.style.cursor = ''
    }
  }, [enabled, el, invalidate])
  return orbit
}

function Diorama({ variant, labels, onFirstFrame }: { variant: LandingVariant; labels: LabelRefs; onFirstFrame: () => void }) {
  const frames: readonly StoryFrame[] = variant === 'hero' ? [HERO_FRAME] : STORY_FRAMES
  const colors = useSceneColors()
  const shadow = useShadowTexture()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()
  const orbit = useDragToTurn(variant === 'hero')

  // The current card decides the colours and which models stand (a re-render only when the
  // card changes). Everything continuous is read straight from the store in the frame loop.
  const index = useStoryProgress((s) => (variant === 'hero' ? 0 : stopIndex(s.progress, frames.length)))
  const frame = frames[index]

  const layout = layoutForAspect(size.width / Math.max(size.height, 1))
  const positions = useMemo(() => stationPositions(layout), [layout])
  const slab = slabSize(layout)
  const gate = useMemo(() => gatePoints(positions.dev, positions.github, PARCEL_OFFSET), [positions])
  const beltFrom = parcelSpot(positions.github)
  const beltTo = parcelSpot(positions.tests)
  const belt = beltLength(beltFrom, beltTo)

  // The zoom that fits the whole diorama, and where the fitted camera looks. Worked out again
  // when the box changes size.
  const fit = useRef({ zoom: 1, target: new Vector3() })
  const settle = useRef({ start: -1, done: false })
  useLayoutEffect(() => {
    if (size.width < 10 || size.height < 10) return
    fitCamera(camera, layout, size.width, size.height)
    fit.current.zoom = camera.zoom
    fit.current.target.copy(camera.position).addScaledVector(VIEW_DIRECTION, -CAMERA_DISTANCE)
    invalidate()
  }, [camera, layout, size.width, size.height, invalidate])

  // Scrolling changes the store; ask for one frame each time it does.
  useEffect(() => (variant === 'story' ? useStoryProgress.subscribe(() => invalidate()) : undefined), [variant, invalidate])

  const parcel = useRef<Group>(null)
  const theirs = useRef<Group>(null)
  const bar = useRef<Group>(null)
  const slats = useRef<(Mesh | null)[]>([])
  const look = useRef(new Vector3())
  const dir = useRef(new Vector3())
  const point = useRef(new Vector3())
  const first = useRef(true)

  useFrame((state) => {
    const progress = variant === 'hero' ? 0 : useStoryProgress.getState().progress
    const pose = storyPose(frames, progress, positions)

    // The camera. The hero looks where fitCamera put it and settles in once; the story looks at
    // the stations of the current stop, blended with the next as the reader scrolls.
    let zoom = fit.current.zoom * pose.zoom
    dir.current.copy(VIEW_DIRECTION)
    if (variant === 'hero') {
      look.current.copy(fit.current.target)
      const s = settle.current
      let turn = 0
      if (!s.done && !reduceMotion) {
        if (s.start < 0) s.start = performance.now()
        const k = ease(Math.min(1, (performance.now() - s.start) / 1000 / SETTLE_SECONDS))
        turn = SETTLE_TURN * (1 - k)
        zoom *= SETTLE_ZOOM + (1 - SETTLE_ZOOM) * k
        if (k >= 1) s.done = true
        else state.invalidate()
      }
      // Where the reader has dragged it to, on top of the settle turn.
      const { yaw, pitch } = orbit.current
      const azimuth = BASE_AZIMUTH + yaw + turn
      const elevation = BASE_ELEVATION + pitch
      dir.current.set(Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth))
      const turned = Math.min(1, Math.abs(Math.sin(yaw * 2)) + Math.abs(pitch))
      zoom *= 1 - TURNED_ZOOM_OUT * turned
    } else {
      look.current.set(...pose.focus)
    }
    camera.position.copy(look.current).addScaledVector(dir.current, CAMERA_DISTANCE)
    camera.lookAt(look.current)
    camera.zoom = zoom
    camera.updateProjectionMatrix()

    if (parcel.current) parcel.current.position.set(pose.parcel.at[0], PARCEL_Y + pose.parcel.lift * 0.8, pose.parcel.at[1])
    if (theirs.current) {
      theirs.current.visible = pose.theirs !== null
      if (pose.theirs) theirs.current.position.set(pose.theirs.at[0], PARCEL_Y + pose.theirs.lift * 0.8, pose.theirs.at[1])
    }
    if (bar.current) bar.current.rotation.x = -(pose.gate?.barOpen ?? 0) * BAR_LIFT
    placeSlats(slats.current, pose.belt, belt)

    // The station names, laid over the canvas like the game's labels. When the camera is close,
    // a tag that would cross the edge of the picture is hidden rather than cut in half.
    for (const id of STATIONS) {
      const el = labels.current[id]
      point.current.set(positions[id][0], LABEL_HEIGHT[id], positions[id][1])
      placeLabel(el, point.current, state.camera, state.size, 'translate(-50%, -50%)')
      if (el) {
        const x = (point.current.x * 0.5 + 0.5) * state.size.width
        const y = (-point.current.y * 0.5 + 0.5) * state.size.height
        const inside = x - el.offsetWidth / 2 >= EDGE_PX && x + el.offsetWidth / 2 <= state.size.width - EDGE_PX && y - el.offsetHeight / 2 >= EDGE_PX && y + el.offsetHeight / 2 <= state.size.height - EDGE_PX
        // The hero on a phone names only the station that has the work, so the tags do not pile up.
        const crowded = variant === 'hero' && state.size.width < NARROW_PX && frame.stations[id] !== 'active'
        el.style.opacity = inside && !crowded ? '1' : '0'
      }
    }
    if (first.current) {
      first.current = false
      onFirstFrame()
    }
  })

  const strips = STATIONS.slice(0, -1).map((id, i) => {
    const [ax, az] = positions[id]
    const [bx, bz] = positions[STATIONS[i + 1]]
    const across = SPACING - PAD + 0.2
    return { key: id, pos: [(ax + bx) / 2, 0.03, (az + bz) / 2] as [number, number, number], size: (ax !== bx ? [across, 0.06, 0.5] : [0.5, 0.06, across]) as [number, number, number] }
  })
  const pm = positions.pm

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.8} />
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[slab.width, 0.4, slab.depth]} />
        <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.15)} flatShading />
      </mesh>
      {strips.map((s) => (
        <mesh key={s.key} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.3)} flatShading />
        </mesh>
      ))}
      {STATIONS.map((id) => (
        <StationModel key={id} id={id} position={[positions[id][0], positions[id][1]]} state={frame.stations[id]} conflict={id === 'dev' && frame.secondDev} colors={colors} shadow={shadow} />
      ))}
      {/* ORD-14 on the project manager's desk: the ticket the whole story is about. */}
      <group position={[pm[0] + 0.3, PAD_HEIGHT + 0.77, pm[1] + 0.25]}>
        <TicketModel c={colors} />
      </group>
      <Conveyor key={layout} from={beltFrom} to={beltTo} colors={colors} slats={slats} />
      {frame.gate && <GateModel at={gate.gate} heading={headingY(gate.yours, gate.theirs)} closed={frame.gate === 'closed'} colors={colors} bar={bar} />}
      <group ref={theirs} visible={false}>
        <ParcelModel c={colors} body={colors.ink2} ribbon={colors.ink3} />
      </group>
      <group ref={parcel}>
        <ParcelModel c={colors} />
      </group>
    </>
  )
}

const TAG = 'absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-tag border bg-card px-2 py-1 text-meta text-ink opacity-0'
const SWATCH = { idle: 'bg-ink-3/40', active: 'bg-accent', done: 'bg-ink-2', pass: 'bg-pass', fail: 'bg-fail' } as const

// The name tags over the stations. Each says the station's state in words beside its colour.
function Labels({ variant, labels }: { variant: LandingVariant; labels: LabelRefs }) {
  const frames = variant === 'hero' ? [HERO_FRAME] : STORY_FRAMES
  const index = useStoryProgress((s) => (variant === 'hero' ? 0 : stopIndex(s.progress, frames.length)))
  const frame = frames[index]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {STATIONS.map((id) => (
        <div
          key={id}
          ref={(el) => {
            labels.current[id] = el
          }}
          className={`${TAG} ${frame.stations[id] === 'active' ? 'border-accent' : 'border-line'}`}
        >
          <span className={`size-2 shrink-0 ${SWATCH[frame.stations[id]]}`} />
          {STATION_INFO[id].name}
          {frame.stations[id] !== 'idle' && <span className="text-ink-3">· {STATE_TEXT[frame.stations[id]]}</span>}
        </div>
      ))}
    </div>
  )
}

export default function LandingScene({ variant, onReady, onFail }: { variant: LandingVariant; onReady: () => void; onFail: () => void }) {
  const labels: LabelRefs = useRef({})
  return (
    <>
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 1.5]}
        flat
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [40, 40, 40], zoom: 30, near: 0.1, far: 200 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault()
            onFail()
          })
        }}
      >
        <Diorama variant={variant} labels={labels} onFirstFrame={onReady} />
      </Canvas>
      <Labels variant={variant} labels={labels} />
    </>
  )
}
