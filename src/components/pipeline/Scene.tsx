// The 3D diorama. This file is loaded lazily (see Pipeline.tsx), so none of three.js or
// React Three Fiber is downloaded until the rest of the page is already on screen.
//
// React Three Fiber (R3F) lets us describe a 3D scene as React components. <Canvas> creates
// the WebGL drawing surface, and each lowercase tag inside (mesh, group, ambientLight) is a
// three.js object. The scene reads the same Zustand store as the rest of the app, so one
// engine event updates the board, the editor and the diorama together.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject } from 'react'
import { Vector3, type Group, type OrthographicCamera } from 'three'
import { STATIONS, type Station } from '../../engine/types'
import { useLevelStore } from '../../store/levelStore'
import { PACKAGE_SECONDS, PAD, SPACING, ease, layoutForAspect, slabSize, stationPositions, type SceneLayout } from './sceneLayout'
import { mix, useSceneColors, type SceneColors } from './sceneColors'
import { ParcelModel, StationModel, useShadowTexture } from './stations'

// Height of the label above each station, in scene units.
const LABEL_HEIGHT: Record<Station, number> = { client: 2.3, pm: 2.1, dev: 1.9, github: 2.55, tests: 2.2, live: 2.05 }
// The highest thing in the scene, used to fit the camera.
const SCENE_TOP = 2.9
// Camera direction for true isometric: equal angles to all three axes.
const VIEW_DIRECTION = new Vector3(1, 1, 1).normalize()
const FIT_PADDING_PX = 16

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

function usePrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// The parcel carries the work from station to station. It is the only thing that moves.
// "frameloop=demand" means the canvas draws a frame only when told to, so while nothing
// moves the GPU is idle. While the parcel travels we ask for the next frame ourselves
// (state.invalidate) and stop asking the moment it arrives.
function Parcel({ target, snapKey, colors }: { target: [number, number, number]; snapKey: string; colors: SceneColors }) {
  const group = useRef<Group>(null)
  const move = useRef({ from: new Vector3(), to: new Vector3(target[0], target[1], target[2]), t: 1, snapKey: '' })
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
    }
    m.snapKey = snapKey
    invalidate()
    // target is rebuilt every render, so depend on its numbers, not the array.
  }, [target[0], target[1], target[2], snapKey, reduceMotion, invalidate]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    const m = move.current
    const g = group.current
    if (!g || m.t >= 1) return
    m.t = Math.min(1, m.t + delta / PACKAGE_SECONDS)
    const k = ease(m.t)
    g.position.lerpVectors(m.from, m.to, k)
    // A short hop, so it reads as being carried rather than sliding.
    g.position.y += Math.sin(Math.PI * k) * 0.8
    if (m.t < 1) state.invalidate()
  })

  return (
    <group ref={group}>
      <ParcelModel c={colors} />
    </group>
  )
}

// The text labels are ordinary HTML (so they use the app's fonts and are easy to style),
// laid over the canvas by Pipeline. Each frame we project the 3D point above a station onto
// the screen and move its label there. `labels` holds the label elements, by station.
export type LabelRefs = MutableRefObject<Partial<Record<Station, HTMLElement | null>>>

function Diorama({ labels }: { labels: LabelRefs }) {
  const colors = useSceneColors()
  const shadow = useShadowTexture()
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const invalidate = useThree((s) => s.invalidate)
  const stations = useLevelStore((s) => s.stations)
  const packageAt = useLevelStore((s) => s.packageAt)
  const conflict = useLevelStore((s) => (s.snapshot?.git.conflicts.length ?? 0) > 0)

  const layout = layoutForAspect(size.width / Math.max(size.height, 1))
  const positions = stationPositions(layout)
  const slab = slabSize(layout)

  useLayoutEffect(() => {
    if (size.width < 10 || size.height < 10) return
    fitCamera(camera, layout, size.width, size.height)
    invalidate()
  }, [camera, layout, size.width, size.height, invalidate])

  // Runs on every frame that is drawn. With frameloop="demand" that is exactly when
  // something changed, which is also when the labels need to move.
  const point = useRef(new Vector3())
  useFrame((state) => {
    for (const id of STATIONS) {
      const el = labels.current[id]
      if (!el) continue
      point.current.set(positions[id][0], LABEL_HEIGHT[id], positions[id][1]).project(state.camera)
      const x = (point.current.x * 0.5 + 0.5) * state.size.width
      const y = (-point.current.y * 0.5 + 0.5) * state.size.height
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
      el.style.opacity = '1'
    }
  })

  const [px, pz] = positions[packageAt]
  const strips = STATIONS.slice(0, -1).map((id, i) => {
    const [ax, az] = positions[id]
    const [bx, bz] = positions[STATIONS[i + 1]]
    const horizontal = ax !== bx
    return { key: id, pos: [(ax + bx) / 2, 0.03, (az + bz) / 2] as [number, number, number], size: (horizontal ? [SPACING - PAD + 0.2, 0.06, 0.5] : [0.5, 0.06, SPACING - PAD + 0.2]) as [number, number, number] }
  })
  const stripColor = mix(colors.raised, colors.ink3, 0.3)

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

      {STATIONS.map((id) => (
        <StationModel key={id} id={id} position={[positions[id][0], positions[id][1]]} state={stations[id]} conflict={id === 'dev' && conflict} colors={colors} shadow={shadow} />
      ))}

      <Parcel target={[px + 0.85, 0.16, pz + 0.85]} snapKey={layout} colors={colors} />
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
