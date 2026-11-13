// 3D pieces shared by the game's diorama (Scene.tsx) and the landing page's scenes
// (src/components/landing/LandingScene.tsx): the isometric camera fit, the conveyor and the
// merge gate. Only lazy 3D chunks import this file, so three.js stays out of the main bundle.
import type { MutableRefObject, RefObject } from 'react'
import { Vector3, type Group, type Mesh, type OrthographicCamera } from 'three'
import { BELT_OVERHANG, LABEL_HEIGHT, PAD, SCENE_TOP, SLAT_GAP, SPACING, slabSize, stationPositions, type SceneLayout, type XZ } from './sceneLayout'
import { mix, type SceneColors } from './sceneColors'
import { Cylinder, Part } from './stations'

export { LABEL_HEIGHT, SCENE_TOP }
// Camera direction for true isometric: equal angles to all three axes.
export const VIEW_DIRECTION = new Vector3(1, 1, 1).normalize()
const FIT_PADDING_PX = 16

// An orthographic camera has no perspective: far things are not smaller. Looking along the
// (1,1,1) diagonal gives the classic isometric view. This places the camera, then picks
// the zoom so the whole base slab fits the panel with a little air around it.
export function fitCamera(camera: OrthographicCamera, layout: SceneLayout, width: number, height: number, padding = FIT_PADDING_PX) {
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
  camera.zoom = Math.max(1, Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY)))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
}

// Rotation about the vertical axis that turns the local x axis to point from `a` to `b`.
export const headingY = (a: XZ, b: XZ) => -Math.atan2(b[1] - a[1], b[0] - a[0])

// Length of the conveyor belt between two parcel spots, and how many slats it has.
export const beltLength = (from: XZ, to: XZ) => Math.hypot(to[0] - from[0], to[1] - from[1]) + BELT_OVERHANG * 2

// The conveyor from GitHub to the test server: a belt with slats and two rollers. Whoever owns
// the conveyor moves the slats (through `slats`), only while something is running.
export function Conveyor({ from, to, colors, slats }: { from: XZ; to: XZ; colors: SceneColors; slats: MutableRefObject<(Mesh | null)[]> }) {
  const length = beltLength(from, to)
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

// Moves every slat `offset` along the belt, wrapping back to the start. Shared so the game's
// test run and the landing page's scroll story move the belt the same way.
export function placeSlats(slats: (Mesh | null)[], offset: number, length: number) {
  slats.forEach((m, i) => {
    if (!m) return
    m.position.x = ((i * SLAT_GAP + SLAT_GAP / 2 + offset) % (slats.length * SLAT_GAP)) - length / 2
  })
}

// The merge gate's posts and bar (Phase 7i), standing across the route at `at`, facing along
// it. The caller moves it through the refs: `shaker` for the one shake, `bar` to lift the bar.
export const GATE_HALF = 0.32
export function GateModel({ at, heading, closed, colors, shaker, bar }: { at: XZ; heading: number; closed: boolean; colors: SceneColors; shaker?: RefObject<Group | null>; bar?: RefObject<Group | null> }) {
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, heading, 0]}>
      <group ref={shaker}>
        {([-1, 1] as const).map((side) => (
          <Cylinder key={side} radius={0.04} height={0.6} sides={5} pos={[0, 0.3, side * GATE_HALF]} color={colors.ink3} />
        ))}
        {/* The bar hinges on the near post. Flat red while closed, plain grey once lifted. */}
        <group ref={bar} position={[0, 0.5, -GATE_HALF]}>
          <Part size={[0.06, 0.12, GATE_HALF * 2 + 0.12]} pos={[0, 0, GATE_HALF]} color={closed ? colors.fail : colors.ink3} />
        </group>
      </group>
    </group>
  )
}

// Turning the bar about the route's own axis lifts it upright. `open` is 0 closed, 1 lifted.
export const BAR_LIFT = Math.PI * 0.45
export const SHAKE_SIZE = 0.12
