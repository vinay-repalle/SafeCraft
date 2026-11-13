// Phase 7h: the level map as a 3D path. A stepping-stone per level, a plinth of badges at the
// end, and the learner's figure standing on the level that is loaded. Loaded lazily (see
// LevelMap.tsx) in its own small chunk; three.js itself is shared with the other scenes, so it
// is only downloaded once.
//
// Same rules as the pipeline and the ticket journey: orthographic camera, render on demand,
// pixel ratio capped at 1.5, no real-time shadows, low-poly parts built in code, flat colours.
// Motion plays once, when the learner does something: the figure hops along the path when a
// level is chosen, and a medal rises onto a stone when its badge is earned. Nothing loops.
//
// The level buttons are ordinary HTML laid over the stones (see PathLabels in LevelMap.tsx), so
// they work with the keyboard and screen readers. This file only moves them into place.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Vector3, type Group, type OrthographicCamera } from 'three'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { travel } from '../pipeline/pipelineMotion'
import { placeLabel } from '../pipeline/placeLabel'
import { mix, useSceneColors, type SceneColors } from '../pipeline/sceneColors'
import { ease } from '../pipeline/sceneLayout'
import { Cylinder, Part, Person } from '../pipeline/stations'
import {
  HOP_SECONDS,
  MEDAL_SECONDS,
  PATH_STOPS,
  PLINTH_INDEX,
  STOP_RADIUS,
  ZIG,
  pathFit,
  pebbleSpots,
  stopX,
  stopZ,
  walkHops,
  type LevelMapModel,
  type PlinthBadge,
} from './levelPath'

// Labels laid over the canvas: one button per level (keyed by level id) and the plinth's tag.
export type PathLabelKey = number | 'badges'
export type PathLabelRefs = MutableRefObject<Partial<Record<PathLabelKey, HTMLElement | null>>>

const STONE_H = 0.18
const PLINTH_H = 0.34
const HOP_ARC = 0.5
// Empty pixels around the scene. The level buttons hang under the stones and the badge tag sits
// over the plinth, so there is room for one label row below and one above.
const PAD_X = 8
const PAD_TOP = 28
const PAD_BOTTOM = 30
// From the front and a little above (about 37 degrees), like the ticket journey.
const VIEW_DIRECTION = new Vector3(0, 0.75, 1).normalize()
const SCREEN_UP = new Vector3(0, VIEW_DIRECTION.z, -VIEW_DIRECTION.y)
const screenY = (y: number, z: number) => SCREEN_UP.y * y + SCREEN_UP.z * z
// A medal is 0.62 units tall at scale 1. Level medals are drawn larger than the plinth's three,
// which share one stone.
const MEDAL_HEIGHT = 0.62
const LEVEL_MEDAL_SCALE = 1.4
const PLINTH_MEDAL_SCALE = 0.9
// The scene's extent on screen, in scene units: from the front edge of the front stones to the
// top of whichever is higher, the figure or a medal, on a back stone.
const SCENE_BOTTOM = screenY(0, ZIG + STOP_RADIUS)
const SCENE_TOP = Math.max(screenY(STONE_H + 1.06, -ZIG + 0.08), screenY(STONE_H + MEDAL_HEIGHT * LEVEL_MEDAL_SCALE, -ZIG - 0.22))

// Where the figure stands on a stone, and where a level's medal stands (back left, so the figure
// does not hide it).
const walkerSpot = (i: number, step: number) => new Vector3(stopX(i, step) + 0.2, STONE_H, stopZ(i) + 0.08)
const medalSpot = (i: number, step: number): [number, number, number] => [stopX(i, step) - 0.32, STONE_H, stopZ(i) - 0.22]

// Points the camera at the path. The scene's middle sits a little above the band's middle when
// the room left below (for the buttons) is bigger than the room above.
function aimCamera(camera: OrthographicCamera, zoom: number) {
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(40)
  camera.lookAt(0, 0, 0)
  camera.position.addScaledVector(SCREEN_UP, (SCENE_BOTTOM + SCENE_TOP) / 2 - (PAD_BOTTOM - PAD_TOP) / 2 / zoom)
  camera.zoom = zoom
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}

// A medal on a short post, facing the camera. About 0.62 units tall.
function Medal({ rim, face, ribbon, post }: { rim: string; face: string; ribbon: string; post: string }) {
  return (
    <>
      <Cylinder radius={0.025} height={0.3} sides={5} pos={[0, 0.15, 0]} color={post} />
      {([-1, 1] as const).map((side) => (
        <Part key={side} size={[0.06, 0.16, 0.02]} pos={[side * 0.06, 0.32, 0.01]} rot={[0, 0, side * 0.3]} color={ribbon} />
      ))}
      {/* The disc lies along the vertical axis by default; a quarter turn stands it up. */}
      <group position={[0, 0.45, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <Cylinder radius={0.17} height={0.05} sides={10} pos={[0, 0, 0]} color={rim} />
        <Cylinder radius={0.1} height={0.06} sides={10} pos={[0, 0, 0]} color={face} />
      </group>
    </>
  )
}

// A level's medal. It rises onto the stone once, the moment the badge is earned. On the first
// draw, or with reduced motion, it is simply there.
function LevelMedal({ earned, pos, colors }: { earned: boolean; pos: [number, number, number]; colors: SceneColors }) {
  const group = useRef<Group>(null)
  const anim = useRef({ ready: false, was: earned, t: 1, start: 0 })
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const a = anim.current
    const g = group.current
    if (!g) return
    const newlyEarned = a.ready && !a.was && earned
    if (newlyEarned && !reduceMotion) {
      a.t = 0
      a.start = performance.now()
      g.scale.setScalar(0.001)
    } else {
      a.t = 1
      g.scale.setScalar(1)
    }
    a.ready = true
    a.was = earned
    invalidate()
  }, [earned, reduceMotion, invalidate])

  useFrame((state) => {
    const a = anim.current
    const g = group.current
    if (!g || a.t >= 1) return
    a.t = Math.min(1, (performance.now() - a.start) / 1000 / MEDAL_SECONDS)
    g.scale.setScalar(Math.max(0.001, ease(a.t)))
    if (a.t < 1) state.invalidate()
  })

  return (
    <group ref={group} position={pos} visible={earned}>
      <group scale={LEVEL_MEDAL_SCALE}>
        <Medal rim={colors.accent} face={colors.card} ribbon={colors.ink2} post={colors.ink3} />
      </group>
    </group>
  )
}

// The learner's figure. It hops across every stone between where it is and the level chosen,
// one stone at a time. Timing comes from the clock, not frame deltas (see Parcel in the pipeline).
function Walker({ index, step, colors }: { index: number; step: number; colors: SceneColors }) {
  const group = useRef<Group>(null)
  const anim = useRef({ ready: false, at: index, step: 0, queue: [] as number[], from: new Vector3(), to: new Vector3(), t: 1, start: 0 })
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const a = anim.current
    const g = group.current
    if (!g) return
    // First draw, a resize (the stones move) or reduced motion: stand on the stone straight away.
    if (!a.ready || reduceMotion || a.step !== step) {
      g.position.copy(walkerSpot(index, step))
      a.queue = []
      a.t = 1
      a.at = index
    } else {
      // From the stone it is on, or heading for, to the new one.
      a.queue = walkHops(a.at, index)
    }
    a.ready = true
    a.step = step
    invalidate()
  }, [index, step, reduceMotion, invalidate])

  useFrame((state) => {
    const a = anim.current
    const g = group.current
    if (!g) return
    const now = performance.now()
    if (a.t >= 1 && a.queue.length > 0) {
      a.from.copy(g.position)
      a.at = a.queue.shift()!
      a.to.copy(walkerSpot(a.at, a.step))
      a.t = 0
      a.start = now
    }
    if (a.t < 1) {
      a.t = Math.min(1, (now - a.start) / 1000 / HOP_SECONDS)
      const { k, lift } = travel('hop', a.t)
      g.position.lerpVectors(a.from, a.to, k)
      g.position.y += lift * HOP_ARC
    }
    if (a.t < 1 || a.queue.length > 0) state.invalidate()
  })

  return (
    <group ref={group}>
      <Person pos={[0, 0, 0]} shirt={colors.accent} skin={colors.ink3} />
    </group>
  )
}

// One level's stone. Finished in this seat: the top turns flat green, as a passed station does.
// The level loaded now: a thin accent rim shows under the stone.
function Stone({ x, z, done, current, colors }: { x: number; z: number; done: boolean; current: boolean; colors: SceneColors }) {
  return (
    <group position={[x, 0, z]}>
      {current && <Cylinder radius={STOP_RADIUS + 0.09} height={STONE_H * 0.6} sides={6} pos={[0, STONE_H * 0.3, 0]} color={colors.accent} />}
      <Cylinder radius={STOP_RADIUS} height={STONE_H} sides={6} pos={[0, STONE_H / 2, 0]} color={done ? mix(colors.card, colors.pass, 0.5) : colors.card} />
    </group>
  )
}

// The plinth at the end of the path, with one medal for each badge that is not about a single
// level. An earned medal is in the accent; one still to earn is plain grey.
function Plinth({ x, z, badges, colors }: { x: number; z: number; badges: PlinthBadge[]; colors: SceneColors }) {
  const grey = mix(colors.raised, colors.ink3, 0.45)
  const gap = 0.42
  return (
    <group position={[x, 0, z]}>
      <Cylinder radius={STOP_RADIUS + 0.05} height={PLINTH_H} sides={6} pos={[0, PLINTH_H / 2, 0]} color={colors.raised} />
      {badges.map((badge, i) => (
        <group key={badge.id} position={[(i - (badges.length - 1) / 2) * gap, PLINTH_H, -0.1]} scale={PLINTH_MEDAL_SCALE}>
          <Medal rim={badge.earned ? colors.accent : grey} face={badge.earned ? colors.card : colors.raised} ribbon={badge.earned ? colors.ink2 : grey} post={colors.ink3} />
        </group>
      ))}
    </group>
  )
}

function Path({ model, labels }: { model: LevelMapModel; labels: PathLabelRefs }) {
  const colors = useSceneColors()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const invalidate = useThree((s) => s.invalidate)

  const { zoom, step } = pathFit(size.width, size.height, SCENE_TOP - SCENE_BOTTOM, PAD_X, PAD_TOP + PAD_BOTTOM)

  useLayoutEffect(() => {
    if (size.width < 10 || size.height < 10) return
    aimCamera(camera, zoom)
    invalidate()
  }, [camera, zoom, size.width, size.height, invalidate])

  // Each drawn frame, move the buttons under their stones and the badge tag over the plinth.
  const point = useRef(new Vector3())
  useFrame((state) => {
    model.stops.forEach((stop, i) => {
      point.current.set(stopX(i, step), 0, stopZ(i) + STOP_RADIUS)
      placeLabel(labels.current[stop.id], point.current, state.camera, state.size, 'translate(-50%, 3px)')
    })
    point.current.set(stopX(PLINTH_INDEX, step) + STOP_RADIUS, PLINTH_H + MEDAL_HEIGHT * PLINTH_MEDAL_SCALE, stopZ(PLINTH_INDEX) - 0.1)
    placeLabel(labels.current.badges, point.current, state.camera, state.size, 'translate(-100%, calc(-100% - 3px))')
  })

  const currentIndex = Math.max(0, model.stops.findIndex((s) => s.current))
  const pebble = mix(colors.raised, colors.ink3, 0.3)
  const groundWidth = (PATH_STOPS - 1) * step + 2 * STOP_RADIUS + 0.5
  const groundDepth = 2 * (ZIG + STOP_RADIUS) + 0.4

  return (
    <>
      {/* Two plain lights, no shadow casting: cheap on any laptop. */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 10, 6]} intensity={1.8} />
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[groundWidth, 0.1, groundDepth]} />
        <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.15)} flatShading />
      </mesh>

      {/* Pebbles in the gaps, so the stones read as one path. */}
      {Array.from({ length: PATH_STOPS - 1 }, (_, i) =>
        pebbleSpots([stopX(i, step), stopZ(i)], [stopX(i + 1, step), stopZ(i + 1)], STOP_RADIUS).map(([px, pz], j) => (
          <Cylinder key={`${i}-${j}`} radius={0.14} height={0.05} sides={6} pos={[px, 0.025, pz]} color={pebble} />
        )),
      )}

      {model.stops.map((stop, i) => (
        <group key={stop.id}>
          <Stone x={stopX(i, step)} z={stopZ(i)} done={stop.doneHere} current={stop.current} colors={colors} />
          <LevelMedal earned={stop.badge} pos={medalSpot(i, step)} colors={colors} />
        </group>
      ))}
      <Plinth x={stopX(PLINTH_INDEX, step)} z={stopZ(PLINTH_INDEX)} badges={model.plinth} colors={colors} />
      <Walker index={currentIndex} step={step} colors={colors} />
    </>
  )
}

export default function LevelPathScene({ model, labels, onFail }: { model: LevelMapModel; labels: PathLabelRefs; onFail: () => void }) {
  return (
    <Canvas
      orthographic
      // Draw only when something changes; the pixel ratio is capped at 1.5; `flat` keeps the
      // colours the same as the CSS. Same settings as the other scenes.
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 30, 40], zoom: 30, near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onFail()
        })
      }}
    >
      <Path model={model} labels={labels} />
    </Canvas>
  )
}
