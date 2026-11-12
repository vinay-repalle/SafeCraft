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
import { PACKAGE_SECONDS, PAD, SPACING, layoutForAspect, slabSize, stationPositions, type SceneLayout, type XZ } from './sceneLayout'
import { SHAKE_SECONDS, TEST_RUN_SECONDS, conveyorOffset, displayStations, nextStation, shakeOffset, stallPoint, testRunPhase, travel, type TravelKind } from './pipelineMotion'
import { mix, useSceneColors, type SceneColors } from './sceneColors'
import { ParcelModel, Part, StationModel, Cylinder, useShadowTexture } from './stations'
import { useTestRun } from './useTestRun'

// Height of the label above each station, in scene units.
const LABEL_HEIGHT: Record<Station, number> = { client: 2.3, pm: 2.1, dev: 1.9, github: 2.55, tests: 2.2, live: 2.05 }
// The highest thing in the scene, used to fit the camera.
const SCENE_TOP = 2.9
// Camera direction for true isometric: equal angles to all three axes.
const VIEW_DIRECTION = new Vector3(1, 1, 1).normalize()
const FIT_PADDING_PX = 16

// The parcel waits on the front corner of each pad, this far from the station centre on both
// axes. Its base sits on the conveyor belt's height so it rides the belt without sinking in.
const PARCEL_OFFSET: XZ = [0.85, 0.85]
const PARCEL_Y = 0.19
const parcelSpot = (p: XZ): XZ => [p[0] + PARCEL_OFFSET[0], p[1] + PARCEL_OFFSET[1]]

// The conveyor between GitHub and the test server (Phase 7g).
const BELT_OVERHANG = 0.3 // past each parcel spot, so the parcel starts and ends on the belt
const SLAT_GAP = 0.3
const BELT_SPEED = SPACING / TEST_RUN_SECONDS // the slats keep pace with the parcel
const SHAKE_SIZE = 0.12

// An orthographic camera has no perspective: far things are not smaller. Looking along the
// (1,1,1) diagonal gives the classic isometric view. This places the camera, then picks
// the zoom so the whole base slab fits the panel with a little air around it.
function fitCamera(camera: OrthographicCamera, layout: SceneLayout, width: number, height: number) {
  const { width: slabWidth, depth: slabDepth } = slabSize(layout)
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(40)
  camera.lookAt(0, 0, 0)
  camera.zoom = 1
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)

  // Project the points the scene really occupies into the camera's own space: the base
  // slab's corners, and the top and bottom corners of every station's pad (which includes the
  // labels above them). Using the real extents, not a box around everything, wastes less room.
  const points: [number, number, number][] = []
  for (const x of [-slabWidth / 2, slabWidth / 2]) for (const z of [-slabDepth / 2, slabDepth / 2]) points.push([x, -0.4, z])
  for (const [sx, sz] of Object.values(stationPositions(layout))) {
    for (const dx of [-PAD / 2, PAD / 2]) for (const dz of [-PAD / 2, PAD / 2]) for (const y of [0, SCENE_TOP]) points.push([sx + dx, y, sz + dz])
  }
  const corner = new Vector3()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y, z] of points) {
    corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse)
    minX = Math.min(minX, corner.x)
    maxX = Math.max(maxX, corner.x)
    minY = Math.min(minY, corner.y)
    maxY = Math.max(maxY, corner.y)
  }
  // Slide the camera sideways and up so the scene is centred on screen.
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  camera.position.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2)
  camera.zoom = Math.max(1, Math.min((width - FIT_PADDING_PX * 2) / (maxX - minX), (height - FIT_PADDING_PX * 2) / (maxY - minY)))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}

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

// Rotation about the vertical axis that turns the local x axis to point from `a` to `b`.
const headingY = (a: XZ, b: XZ) => -Math.atan2(b[1] - a[1], b[0] - a[0])

// The conveyor from GitHub to the test server: a belt with slats and two rollers. The slats are
// moved by TestRunMotion below, only while a test run plays; the rest of the time it is still.
function Conveyor({ from, to, colors, slats }: { from: XZ; to: XZ; colors: SceneColors; slats: MutableRefObject<(Mesh | null)[]> }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) + BELT_OVERHANG * 2
  const count = Math.floor(length / SLAT_GAP)
  const frame = mix(colors.ink2, colors.ink3, 0.4)
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation={[0, headingY(from, to), 0]}>
      {/* Legs in the gap between the two pads, so the belt does not float. */}
      <Part size={[SPACING - PAD, 0.15, 0.36]} pos={[0, 0.075, 0]} color={frame} />
      <Part size={[length, 0.03, 0.42]} pos={[0, 0.165, 0]} color={colors.ink2} />
      {([-1, 1] as const).map((side) => (
        <Part key={side} size={[length, 0.06, 0.04]} pos={[0, 0.17, side * 0.23]} color={frame} />
      ))}
      {([-1, 1] as const).map((end) => (
        <group key={end} position={[end * (length / 2), 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <Cylinder radius={0.06} height={0.5} pos={[0, 0, 0]} color={colors.ink3} sides={6} />
        </group>
      ))}
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            slats.current[i] = m
          }}
          position={[i * SLAT_GAP - length / 2 + SLAT_GAP / 2, 0.185, 0]}
        >
          <boxGeometry args={[0.05, 0.01, 0.36]} />
          <meshLambertMaterial color={colors.ink3} flatShading />
        </mesh>
      ))}
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
      const offset = conveyorOffset(seconds, BELT_SPEED, SLAT_GAP)
      slats.current.forEach((m, i) => {
        if (!m) return
        // Each slat moves forward and wraps back to the start of the belt.
        const x = ((i * SLAT_GAP + SLAT_GAP / 2 + offset) % (slats.current.length * SLAT_GAP)) - beltLength / 2
        m.position.x = x
      })
    }
    if (shake.current) {
      shake.current.position.x = phase === 'shaking' ? shakeOffset((seconds - TEST_RUN_SECONDS) / SHAKE_SECONDS) * SHAKE_SIZE : 0
    }
    if (phase === 'running' || phase === 'shaking') state.invalidate()
  })
  return null
}

// A flat red gate across the route, where the parcel stopped. Shown only while the conflict is open.
function Barrier({ at, toward, colors }: { at: XZ; toward: XZ; colors: SceneColors }) {
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, headingY(at, toward), 0]}>
      <group position={[0.45, 0, 0]}>
        {([-1, 1] as const).map((side) => (
          <Cylinder key={side} radius={0.04} height={0.6} sides={5} pos={[0, 0.3, side * 0.32]} color={colors.ink3} />
        ))}
        <Part size={[0.06, 0.12, 0.76]} pos={[0, 0.5, 0]} color={colors.fail} />
      </group>
    </group>
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

  // Where the parcel waits when it has stalled on a conflict, and the station it was heading for.
  const stallNext = stallAt ? nextStation(stallAt) : null
  const stall = stallAt && stallNext ? stallPoint(positions[stallAt], positions[stallNext], PARCEL_OFFSET) : null

  // Runs on every frame that is drawn. With frameloop="demand" that is exactly when
  // something changed, which is also when the labels need to move.
  const point = useRef(new Vector3())
  useFrame((state) => {
    const place = (el: HTMLElement | null | undefined, x: number, y: number, z: number) => {
      if (!el) return
      point.current.set(x, y, z).project(state.camera)
      const sx = (point.current.x * 0.5 + 0.5) * state.size.width
      const sy = (-point.current.y * 0.5 + 0.5) * state.size.height
      el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`
      el.style.opacity = '1'
    }
    for (const id of STATIONS) place(labels.current[id], positions[id][0], LABEL_HEIGHT[id], positions[id][1])
    if (stall) place(labels.current.stall, stall[0], 1.05, stall[1])
  })

  const parcelAt = stall ?? parcelSpot(positions[packageAt])
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
  const beltLength = Math.hypot(beltTo[0] - beltFrom[0], beltTo[1] - beltFrom[1]) + BELT_OVERHANG * 2
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

      {stall && stallNext && conflictOpen && <Barrier at={stall} toward={parcelSpot(positions[stallNext])} colors={colors} />}

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
