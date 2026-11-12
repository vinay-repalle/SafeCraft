import { ArrowUpRight } from 'lucide-react'
import { findGuide } from '../../content/guides'
import { useUiStore } from '../../store/uiStore'

type Props = { slug?: string; onNavigate?: () => void }

// A link from a term to its Field Guide article. Shown only when the article exists.
export function GuideLink({ slug, onNavigate }: Props) {
  const openGuide = useUiStore((s) => s.openGuide)
  const guide = findGuide(slug)
  if (!guide) return null

  return (
    <button
      type="button"
      className="mt-1 inline-flex items-center gap-1 text-meta text-accent underline-offset-2 hover:underline"
      onClick={() => {
        onNavigate?.()
        openGuide(guide.slug)
      }}
    >
      Read the guide
      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
    </button>
  )
}
