// The 3D diorama. This file is loaded lazily (see Pipeline.tsx), so none of three.js or
// React Three Fiber is downloaded until the rest of the page is already on screen.
//
// React Three Fiber (R3F) lets us describe a 3D scene as React components. <Canvas> creates
// the WebGL drawing surface, and each lowercase tag inside (mesh, group, ambientLight) is a
// three.js object. The scene reads the same Zustand store as the rest of the app, so one
// engine event updates the board, the editor and the diorama together.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Vector3, type Group, type Mesh, type OrthographicCamera } from 'three'
import { STATIONS, type Station } from '../../engine/types'
import { useLevelStore } from '../../store/levelStore'
import { usePrefersReducedMotion } from '../../utils/reducedMotion'
import { PACKAGE_SECONDS, PAD, PARCEL_OFFSET, PARCEL_Y, SLAT_GAP, SPACING, layoutForAspect, parcelSpot, slabSize, stationPositions, type XZ } from './sceneLayout'
import { SHAKE_SECONDS, TEST_RUN_SECONDS, conveyorOffset, displayStations, nextStation, shakeOffset, testRunPhase, travel, type TravelKind } from './pipelineMotion'
import { gateFrame, gatePhase, gatePoints, type GatePhase } from './mergeGate'
import { mix, useSceneColors, type SceneColors } from './sceneColors'
import { BAR_LIFT, Conveyor, GateModel, LABEL_HEIGHT, SHAKE_SIZE, beltLength as beltLengthOf, fitCamera, headingY, placeSlats } from './sceneParts'
import { ParcelModel, StationModel, useShadowTexture } from './stations'
import { useTestRun } from './useTestRun'

// The camera fit, the conveyor and the gate's posts live in sceneParts.tsx, shared with the
// landing page's scenes. The slats keep pace with the parcel during a test run.
const BELT_SPEED = SPACING / TEST_RUN_SECONDS

// The parcel carries the work from station to station.
// "frameloop=demand" means the canvas draws a frame only when told to, so while nothing
// moves the GPU is idle. While the parcel travels we ask for the next frame ourselves
// (state.invalidate) and stop asking the moment it arrives.
// Progress is read from the clock (performance.now), not added up from each frame's `delta`:
// after the scene has been idle, the first frame's delta covers the whole idle time, which
// would make the parcel arrive in one jump.
//   kind     'hop' when carried, 'ride' when it sits on the conveyor during a test run
//   seconds  how long this trip takes
function Parcel({ target, snapKey, colors, kind, seconds }: { target: [number, number, number]; snapKey: string; colors: SceneColors; kind: TravelKind; seconds: number }) {
  const group = useRef<Group>(null)
  const move = useRef({ from: new Vector3(), to: new Vector3(target[0], target[1], target[2]), t: 1, start: 0, snapKey: '', kind: 'hop' as TravelKind, seconds: PACKAGE_SECONDS })
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const m = move.current
    const g = group.current
    if (!g) return
    const arrivedBefore = m.snapKey !== ''
    m.to.set(target[0], target[1], target[2])
    if (!arrivedBefore || m.snapKey !== snapKey || reduceMotion) {
      // First draw, a layout change, or reduced motion: jump straight there.
      g.position.copy(m.to)
      m.from.copy(m.to)
      m.t = 1
    } else {
      // Start from wherever the parcel is now (it may be mid-hop), back on the ground.
      m.from.copy(g.position)
      m.from.y = target[1]
      m.t = 0
      m.start = performance.now()
      m.kind = kind
      m.seconds = Math.max(0.1, seconds)
    }
    m.snapKey = snapKey
    invalidate()
    // target is rebuilt every render, so depend on its numbers, not the array.
  }, [target[0], target[1], target[2], snapKey, reduceMotion, invalidate]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    const m = move.current
    const g = group.current
    if (!g || m.t >= 1) return
    m.t = Math.min(1, (performance.now() - m.start) / 1000 / m.seconds)
    const { k, lift } = travel(m.kind, m.t)
    g.position.lerpVectors(m.from, m.to, k)
    // A short hop, so it reads as being carried rather than sliding. None on the belt.
    g.position.y += lift * 0.8
    if (m.t < 1) state.invalidate()
  })

  return (
    <group ref={group}>
      <ParcelModel c={colors} />
    </group>
  )
}

// Drives the two things that move with a test run: the conveyor slats while the tests run, and
// the test server's one shake when they fail. Both are worked out from the run's start time, so a
// scene opened half way through a run picks up in the right place, and one opened after it shows
// the end state with nothing moving.
function TestRunMotion({ slats, beltLength, shake }: { slats: MutableRefObject<(Mesh | null)[]>; beltLength: number; shake: MutableRefObject<Group | null> }) {
  const run = useLevelStore((s) => s.testRun)
  const reduceMotion = usePrefersReducedMotion()
  const invalidate = useThree((s) => s.invalidate)

  // A new run: draw a frame so the loop below starts.
  useEffect(() => {
    if (run) invalidate()
  }, [run, invalidate])

  useFrame((state) => {
    const phase = testRunPhase(run, Date.now(), reduceMotion)
    const seconds = run ? (Date.now() - run.startedAt) / 1000 : 0
    if (phase === 'running') {
      // Each slat moves forward and wraps back to the start of the belt.
      placeSlats(slats.current, conveyorOffset(seconds, BELT_SPEED, SLAT_GAP), beltLength)
    }
    if (shake.current) {
      shake.current.position.x = phase === 'shaking' ? shakeOffset((seconds - TEST_RUN_SECONDS) / SHAKE_SECONDS) * SHAKE_SIZE : 0
    }
    if (phase === 'running' || phase === 'shaking') state.invalidate()
  })
  return null
}

// Phase 7i: the merge gate. Two posts and a bar across the route between the developer desk
// and GitHub, with the teammate's parcel on the far side. See mergeGate.ts for the story and the
// timing. The bar is flat red while the conflict is open and shakes once when it closes; when the
// conflict is fixed it lifts (a turn about one post) and their parcel rides into yours.
// The component stays mounted with no conflict, so its clock knows the difference between "the
// conflict just happened" (play it) and "the scene opened on an old conflict" (show the end).
function MergeGate({ phase, points, theirsFrom, colors }: { phase: GatePhase | null; points: { gate: XZ; yours: XZ; theirs: XZ } | null; theirsFrom: XZ | null; colors: SceneColors }) {
  const shaker = useRef<Group>(null)
  const bar = useRef<Group>(null)
  const theirs = useRef<Group>(null)
  const clock = useRef({ ready: false, start: -Infinity })
  const invalidate = useThree((s) => s.invalidate)
  const reduceMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const c = clock.current
    c.start = c.ready && !reduceMotion && phase ? performance.now() : -Infinity
    c.ready = true
    invalidate()
  }, [phase, reduceMotion, invalidate])

  useFrame((state) => {
    if (!phase || !points || !theirsFrom || !theirs.current) return
    const f = gateFrame(phase, (performance.now() - clock.current.start) / 1000)
    const [ax, az] = phase === 'closed' ? theirsFrom : points.theirs
    const [bx, bz] = phase === 'closed' ? points.theirs : points.yours
    theirs.current.position.set(ax + (bx - ax) * f.theirsK, PARCEL_Y + f.theirsLift * 0.8, az + (bz - az) * f.theirsK)
    theirs.current.visible = f.theirsVisible
    if (shaker.current) shaker.current.position.z = f.shake * SHAKE_SIZE
    // The bar points across the route; turning it about the route's own axis lifts it upright.
    if (bar.current) bar.current.rotation.x = -f.barOpen * BAR_LIFT
    if (f.moving) state.invalidate()
  })

  if (!phase || !points) return null
  return (
    <>
      <GateModel at={points.gate} heading={headingY(points.yours, points.theirs)} closed={phase === 'closed'} colors={colors} shaker={shaker} bar={bar} />
      <group ref={theirs}>
        <ParcelModel c={colors} body={colors.ink2} ribbon={colors.ink3} />
      </group>
    </>
  )
}

// The text labels are ordinary HTML (so they use the app's fonts and are easy to style),
// laid over the canvas by Pipeline. Each frame we project the 3D point above a station onto
// the screen and move its label there. `labels` holds the label elements: one per station, and
// one for a stalled parcel.
export type LabelKey = Station | 'stall'
export type LabelRefs = MutableRefObject<Partial<Record<LabelKey, HTMLElement | null>>>

function Diorama({ labels }: { labels: LabelRefs }) {
  const colors = useSceneColors()
  const shadow = useShadowTexture()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const invalidate = useThree((s) => s.invalidate)
  const storeStations = useLevelStore((s) => s.stations)
  const packageAt = useLevelStore((s) => s.packageAt)
  const packageFrom = useLevelStore((s) => s.packageFrom)
  const stallAt = useLevelStore((s) => s.stallAt)
  const conflictOpen = useLevelStore((s) => (s.snapshot?.git.conflicts.length ?? 0) > 0)
  const conflict = useLevelStore((s) => s.teammateActive) || conflictOpen
  const { running, run } = useTestRun()
  const stations = displayStations(storeStations, running)

  const layout = layoutForAspect(size.width / Math.max(size.height, 1))
  const positions = stationPositions(layout)
  const slab = slabSize(layout)

  useLayoutEffect(() => {
    if (size.width < 10 || size.height < 10) return
    fitCamera(camera, layout, size.width, size.height)
    invalidate()
  }, [camera, layout, size.width, size.height, invalidate])

  // Phase 7i: where the merge gate stands when the parcel has stalled on a conflict, with your
  // parcel on the near side and the teammate's on the far side, coming from the next station.
  const stallNext = stallAt ? nextStation(stallAt) : null
  const gate = stallAt && stallNext ? gatePoints(positions[stallAt], positions[stallNext], PARCEL_OFFSET) : null
  const phase = gate ? gatePhase(stallAt, conflictOpen) : null

  // Runs on every frame that is drawn. With frameloop="demand" that is exactly when
  // something changed, which is also when the labels need to move.
  const point = useRef(new Vector3())
  useFrame((state) => {
    const place = (el: HTMLElement | null | undefined, x: number, y: number, z: number, anchor = 'translate(-50%, -50%)') => {
      if (!el) return
      point.current.set(x, y, z).project(state.camera)
      const sx = (point.current.x * 0.5 + 0.5) * state.size.width
      const sy = (-point.current.y * 0.5 + 0.5) * state.size.height
      el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) ${anchor}`
      el.style.opacity = '1'
    }
    for (const id of STATIONS) place(labels.current[id], positions[id][0], LABEL_HEIGHT[id], positions[id][1])
    // The gate's tag hangs below the gate, in the open corner of the base, so it hides neither the
    // two parcels nor the station labels above them.
    if (gate) place(labels.current.stall, gate.gate[0], 0, gate.gate[1], 'translate(-50%, 14px)')
  })

  const parcelAt = gate?.yours ?? parcelSpot(positions[packageAt])
  const riding = running && packageAt === 'tests' && packageFrom === 'github'
  const rideSeconds = run ? TEST_RUN_SECONDS - (Date.now() - run.startedAt) / 1000 : TEST_RUN_SECONDS

  const strips = STATIONS.slice(0, -1).map((id, i) => {
    const [ax, az] = positions[id]
    const [bx, bz] = positions[STATIONS[i + 1]]
    const horizontal = ax !== bx
    return { key: id, pos: [(ax + bx) / 2, 0.03, (az + bz) / 2] as [number, number, number], size: (horizontal ? [SPACING - PAD + 0.2, 0.06, 0.5] : [0.5, 0.06, SPACING - PAD + 0.2]) as [number, number, number] }
  })
  const stripColor = mix(colors.raised, colors.ink3, 0.3)

  const beltFrom = parcelSpot(positions.github)
  const beltTo = parcelSpot(positions.tests)
  const beltLength = beltLengthOf(beltFrom, beltTo)
  const slats = useRef<(Mesh | null)[]>([])
  const shake = useRef<Group>(null)

  return (
    <>
      {/* Two plain lights, no shadow casting: cheap on any laptop. */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.8} />

      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[slab.width, 0.4, slab.depth]} />
        <meshLambertMaterial color={mix(colors.raised, colors.ink3, 0.15)} flatShading />
      </mesh>
      {strips.map((s) => (
        <mesh key={s.key} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshLambertMaterial color={stripColor} flatShading />
        </mesh>
      ))}

      {STATIONS.map((id) => {
        const model = <StationModel key={id} id={id} position={[positions[id][0], positions[id][1]]} state={stations[id]} conflict={id === 'dev' && conflict} colors={colors} shadow={shadow} />
        // The test server sits in its own group so it can shake once on a failure.
        return id === 'tests' ? (
          <group key={id} ref={shake}>
            {model}
          </group>
        ) : (
          model
        )
      })}

      {/* key={layout}: the slat list is rebuilt when the route turns, so no stale refs remain. */}
      <Conveyor key={layout} from={beltFrom} to={beltTo} colors={colors} slats={slats} />
      <TestRunMotion slats={slats} beltLength={beltLength} shake={shake} />

      <MergeGate phase={phase} points={gate} theirsFrom={stallNext ? parcelSpot(positions[stallNext]) : null} colors={colors} />

      <Parcel target={[parcelAt[0], PARCEL_Y, parcelAt[1]]} snapKey={layout} colors={colors} kind={riding ? 'ride' : 'hop'} seconds={riding ? rideSeconds : PACKAGE_SECONDS} />
    </>
  )
}

export default function Scene({ onFail, labels }: { onFail: () => void; labels: LabelRefs }) {
  return (
    <Canvas
      orthographic
      // Draw only when something changes (see Parcel). The pixel ratio is capped at 1.5,
      // which keeps sharp screens fast. `flat` skips tone mapping so colours match the CSS.
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
      <Diorama labels={labels} />
    </Canvas>
  )
}
