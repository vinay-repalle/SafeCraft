import type { ReactNode } from 'react'

type Props = { title: string; description: string; phase?: string; children?: ReactNode }

// Shared heading block for the placeholder views. Real content arrives in later phases.
export function ViewIntro({ title, description, phase, children }: Props) {
  return (
    <section className="p-2">
      <h1 className="text-display font-medium">{title}</h1>
      <p className="mt-2 max-w-xl text-lead text-ink-2">{description}</p>
      {phase && <p className="mt-3 text-caption text-ink-3">Placeholder. Built in {phase}.</p>}
      {children}
    </section>
  )
}
