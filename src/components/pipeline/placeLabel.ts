// Moves an HTML label to sit over a 3D point. Shared by the lazy 3D scenes (ticket journey,
// level path); only those import it, so three.js stays out of the main bundle.
//   point   the 3D point; it is overwritten with its screen position
//   anchor  the CSS that sets which part of the label touches the point,
//           for example 'translate(-50%, -100%)' puts the label's bottom centre on it
import type { Camera, Vector3 } from 'three'

export function placeLabel(el: HTMLElement | null | undefined, point: Vector3, camera: Camera, size: { width: number; height: number }, anchor: string) {
  if (!el) return
  point.project(camera)
  const x = (point.x * 0.5 + 0.5) * size.width
  const y = (-point.y * 0.5 + 0.5) * size.height
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${anchor}`
  el.style.opacity = '1'
}
