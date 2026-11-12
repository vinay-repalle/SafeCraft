// The low-poly stations, built from boxes, cylinders and 20-sided shapes in code. There are
// no model files to download, so the scene costs a few kilobytes and every station is far
// under the 5,000-polygon budget in the PRD. Faces are flat shaded (no smoothing) which is
// what gives the low-poly look.
//
// Each station is a <group>: a bundle of 3D parts that move together. Its origin is the
// centre of its floor pad. A "unit" is one step in the 3D world; a person is about 1 unit tall.
import { useMemo } from 'react'
import { CanvasTexture } from 'three'
import type { Station } from '../../engine/types'
import type { StationState } from '../../store/levelStore'
import { PAD } from './sceneLayout'
import { mix, stateColor, type SceneColors } from './sceneColors'

type Vec3 = [number, number, number]

// One flat-coloured box. `pos` is the centre of the box.
function Part({ size, pos, color, rot }: { size: Vec3; pos: Vec3; color: string; rot?: Vec3 }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  )
}

function Cylinder({ radius, height, pos, color, sides = 8, top }: { radius: number; height: number; pos: Vec3; color: string; sides?: number; top?: number }) {
  return (
    <mesh position={pos}>
      <cylinderGeometry args={[top ?? radius, radius, height, sides]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  )
}

function Blob({ radius, pos, color, detail = 0, scale }: { radius: number; pos: Vec3; color: string; detail?: number; scale?: Vec3 }) {
  return (
    <mesh position={pos} scale={scale}>
      <icosahedronGeometry args={[radius, detail]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  )
}

function Person({ pos, shirt, skin, turn = 0 }: { pos: Vec3; shirt: string; skin: string; turn?: number }) {
  return (
    <group position={pos} rotation={[0, turn, 0]}>
      <Cylinder radius={0.26} top={0.2} height={0.64} pos={[0, 0.32, 0]} color={shirt} />
      <Blob radius={0.2} pos={[0, 0.84, 0]} color={skin} />
    </group>
  )
}

// A soft round shadow, drawn once into a tiny canvas and reused. This is the "baked
// contact shadow" from the PRD: a picture of a shadow, not a real-time shadow.
function makeShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(0,0,0,1)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(canvas)
}

export function useShadowTexture(): CanvasTexture {
  const texture = useMemo(makeShadowTexture, [])
  return texture
}

function Shadow({ texture, size, pos }: { texture: CanvasTexture; size: [number, number]; pos: [number, number] }) {
  return (
    <mesh position={[pos[0], 0.172, pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent opacity={0.2} depthWrite={false} />
    </mesh>
  )
}

const PAD_HEIGHT = 0.16

// The floor pad every station stands on. Passed and failed tint the whole pad; the station
// that has the work gets a thin accent frame. Everything is flat colour.
function Pad({ state, c }: { state: StationState; c: SceneColors }) {
  const fill = state === 'pass' ? mix(c.card, c.pass, 0.5) : state === 'fail' ? mix(c.card, c.fail, 0.5) : state === 'done' ? mix(c.card, c.ink3, 0.18) : c.card
  const edge = PAD / 2 - 0.04
  return (
    <>
      <Part size={[PAD, PAD_HEIGHT, PAD]} pos={[0, PAD_HEIGHT / 2, 0]} color={fill} />
      {state === 'active' &&
        ([
          [0, -edge, PAD - 0.04, 0.08],
          [0, edge, PAD - 0.04, 0.08],
          [-edge, 0, 0.08, PAD - 0.04],
          [edge, 0, 0.08, PAD - 0.04],
        ] as const).map(([x, z, w, d]) => <Part key={`${x},${z}`} size={[w, 0.03, d]} pos={[x, PAD_HEIGHT + 0.015, z]} color={c.accent} />)}
    </>
  )
}

// A small pennant on the back corner of every pad. It repeats the station state in one
// flat colour, so the state is readable even when the pad tint is subtle.
function Pennant({ state, c }: { state: StationState; c: SceneColors }) {
  return (
    <group position={[-PAD / 2 + 0.2, 0, -PAD / 2 + 0.2]}>
      <Cylinder radius={0.03} height={0.9} sides={5} pos={[0, 0.45, 0]} color={c.ink3} />
      <Part size={[0.4, 0.22, 0.03]} pos={[0.2, 0.78, 0]} color={stateColor(state, c)} />
    </group>
  )
}

type BodyProps = { c: SceneColors; state: StationState; conflict: boolean }

function Desk({ c, width = 1.5 }: { c: SceneColors; width?: number }) {
  const wood = mix(c.raised, c.ink3, 0.55)
  return (
    <>
      <Part size={[width, 0.08, 0.8]} pos={[0, 0.72, 0]} color={wood} />
      {([-1, 1] as const).flatMap((x) =>
        ([-1, 1] as const).map((z) => <Part key={`${x}${z}`} size={[0.08, 0.68, 0.08]} pos={[x * (width / 2 - 0.1), 0.34, z * 0.32]} color={c.ink3} />),
      )}
    </>
  )
}

function ClientBody({ c }: BodyProps) {
  return (
    <>
      <Person pos={[-0.35, 0, 0.2]} shirt={c.ink2} skin={c.ink3} turn={0.4} />
      {/* A speech bubble with two lines of text: the requirement. */}
      <Part size={[1.1, 0.6, 0.1]} pos={[0.45, 1.65, 0]} color={c.raised} />
      <Part size={[0.7, 0.07, 0.02]} pos={[0.45, 1.75, 0.06]} color={c.ink3} />
      <Part size={[0.5, 0.07, 0.02]} pos={[0.35, 1.55, 0.06]} color={c.ink3} />
      <Part size={[0.2, 0.2, 0.1]} pos={[-0.05, 1.32, 0]} color={c.raised} rot={[0, 0, Math.PI / 4]} />
    </>
  )
}

function ProjectManagerBody({ c }: BodyProps) {
  // A board of sticky notes behind a desk.
  return (
    <>
      <Part size={[1.7, 1.1, 0.06]} pos={[0, 1.3, -0.85]} color={c.raised} />
      {([-0.7, 0.7] as const).map((x) => (
        <Part key={x} size={[0.06, 0.8, 0.06]} pos={[x, 0.4, -0.85]} color={c.ink3} />
      ))}
      {([-0.52, 0, 0.52] as const).map((x, i) => (
        <group key={x}>
          <Part size={[0.36, 0.22, 0.02]} pos={[x, 1.55, -0.81]} color={i === 1 ? c.accent : c.ink3} />
          <Part size={[0.36, 0.22, 0.02]} pos={[x, 1.2, -0.81]} color={i === 2 ? c.ink2 : c.card} />
        </group>
      ))}
      <group position={[0, 0, 0.1]}>
        <Desk c={c} />
      </group>
      <Person pos={[0.95, 0, 0.75]} shirt={c.ink2} skin={c.ink3} turn={-0.5} />
    </>
  )
}

function DeveloperBody({ c, conflict }: BodyProps) {
  return (
    <>
      <group position={[0, 0, -0.1]}>
        <Desk c={c} />
        {/* Monitor with a few lines of code. */}
        <Part size={[0.2, 0.2, 0.08]} pos={[0, 0.86, -0.15]} color={c.ink3} />
        <Part size={[0.8, 0.5, 0.05]} pos={[0, 1.2, -0.15]} color={c.ink} />
        <Part size={[0.42, 0.05, 0.01]} pos={[-0.12, 1.32, -0.12]} color={c.accent} />
        <Part size={[0.55, 0.05, 0.01]} pos={[-0.05, 1.2, -0.12]} color={c.ink3} />
        <Part size={[0.3, 0.05, 0.01]} pos={[-0.17, 1.08, -0.12]} color={c.ink3} />
        <Part size={[0.55, 0.03, 0.2]} pos={[0, 0.775, 0.15]} color={c.ink2} />
      </group>
      <Person pos={[0, 0, 0.85]} shirt={c.accent} skin={c.ink3} turn={Math.PI} />
      {/* A second developer arrives when two people have changed the same file. */}
      {conflict && (
        <>
          <Part size={[0.55, 0.38, 0.05]} pos={[0.55, 1.12, -0.05]} color={c.ink} rot={[0, -0.35, 0]} />
          <Person pos={[1.0, 0, 0.45]} shirt={c.ink2} skin={c.ink3} turn={-2.4} />
        </>
      )}
    </>
  )
}

function GithubBody({ c }: BodyProps) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Cylinder key={i} radius={0.8} sides={6} height={0.32} pos={[0, 0.2 + i * 0.38, 0]} color={i === 1 ? c.ink2 : mix(c.ink2, c.card, 0.25)} />
      ))}
      {/* A tiny branch graph on top: one line that splits in two. */}
      <Part size={[0.05, 0.34, 0.05]} pos={[0, 1.5, 0]} color={c.ink3} />
      <Part size={[0.05, 0.3, 0.05]} pos={[-0.16, 1.82, 0]} color={c.ink3} rot={[0, 0, 0.5]} />
      <Part size={[0.05, 0.3, 0.05]} pos={[0.16, 1.82, 0]} color={c.ink3} rot={[0, 0, -0.5]} />
      <Blob radius={0.1} pos={[0, 1.32, 0]} color={c.accent} />
      <Blob radius={0.1} pos={[-0.3, 2.0, 0]} color={c.ink} />
      <Blob radius={0.1} pos={[0.3, 2.0, 0]} color={c.ink} />
    </>
  )
}

function TestsBody({ c, state }: BodyProps) {
  return (
    <>
      <Part size={[1.2, 1.8, 0.85]} pos={[0, 0.9, 0]} color={c.ink2} />
      {[0.25, 0.5, 0.75, 1.0].map((y) => (
        <Part key={y} size={[0.9, 0.08, 0.02]} pos={[0, y, 0.44]} color={c.ink} />
      ))}
      {/* The status lamp: a flat bar that turns green or red. No glow. */}
      <Part size={[0.9, 0.2, 0.03]} pos={[0, 1.5, 0.44]} color={stateColor(state, c)} />
    </>
  )
}

function LiveBody({ c, state }: BodyProps) {
  const cloud = state === 'pass' ? mix(c.card, c.pass, 0.5) : state === 'fail' ? mix(c.card, c.fail, 0.5) : mix(c.card, c.ink3, 0.2)
  return (
    <>
      <Cylinder radius={1.0} top={0.9} sides={8} height={0.3} pos={[0, 0.15, 0]} color={c.ink2} />
      <Blob radius={0.5} detail={1} pos={[-0.5, 0.95, 0]} color={cloud} scale={[1, 0.85, 1]} />
      <Blob radius={0.72} detail={1} pos={[0.05, 1.25, 0]} color={cloud} scale={[1, 0.9, 1]} />
      <Blob radius={0.5} detail={1} pos={[0.6, 0.95, 0]} color={cloud} scale={[1, 0.85, 1]} />
    </>
  )
}

const BODIES: Record<Station, (props: BodyProps) => React.JSX.Element> = {
  client: ClientBody,
  pm: ProjectManagerBody,
  dev: DeveloperBody,
  github: GithubBody,
  tests: TestsBody,
  live: LiveBody,
}

// Footprint of the soft shadow under each station's main object.
const SHADOW: Record<Station, { size: [number, number]; pos: [number, number] }> = {
  client: { size: [1.6, 1.6], pos: [-0.3, 0.2] },
  pm: { size: [2.2, 1.9], pos: [0, 0] },
  dev: { size: [2.2, 2.4], pos: [0, 0.3] },
  github: { size: [2.2, 2.2], pos: [0, 0] },
  tests: { size: [1.9, 1.5], pos: [0, 0] },
  live: { size: [2.6, 2.6], pos: [0, 0] },
}

type StationProps = { id: Station; position: [number, number]; state: StationState; conflict: boolean; colors: SceneColors; shadow: CanvasTexture }

export function StationModel({ id, position, state, conflict, colors, shadow }: StationProps) {
  const Body = BODIES[id]
  return (
    <group position={[position[0], 0, position[1]]}>
      <Pad state={state} c={colors} />
      <Shadow texture={shadow} size={SHADOW[id].size} pos={SHADOW[id].pos} />
      <group position={[0, PAD_HEIGHT, 0]}>
        <Body c={colors} state={state} conflict={conflict} />
        <Pennant state={state} c={colors} />
      </group>
    </group>
  )
}

// The work package: a small parcel with a ribbon.
export function ParcelModel({ c }: { c: SceneColors }) {
  return (
    <group>
      <Part size={[0.42, 0.36, 0.42]} pos={[0, 0.18, 0]} color={c.accent} rot={[0, 0.5, 0]} />
      <Part size={[0.46, 0.38, 0.1]} pos={[0, 0.18, 0]} color={c.card} rot={[0, 0.5, 0]} />
      <Part size={[0.1, 0.38, 0.46]} pos={[0, 0.18, 0]} color={c.card} rot={[0, 0.5, 0]} />
    </group>
  )
}
