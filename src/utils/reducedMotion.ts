import { useEffect, useState } from 'react'

// True when the operating system asks for reduced motion. Then every animation shows its end
// state straight away (docs/DESIGN.md). CSS animations handle this in index.css; this hook is
// for motion driven from code, like the 3D scenes and the test-run clock.
const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

// The same answer as a hook, updated if the learner changes the setting while the page is open.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(QUERY)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}
