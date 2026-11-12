import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; labelledBy: string; wide?: boolean; children: ReactNode }

// Uses the browser's built-in <dialog> element. showModal() gives us for free what is
// otherwise fiddly to build: the page behind becomes inert, focus stays inside, and
// Escape closes it. The dim backdrop is styled in index.css (flat colour, no blur).
export function Dialog({ open, onClose, labelledBy, wide = false, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      className={`dialog-surface m-auto w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} overflow-visible rounded-panel border border-line bg-card p-6 text-ink`}
    >
      {/* Content mounts only while open, so each popup starts with fresh state. */}
      {open && (
        <>
          {/* A visible way out on every popup. It does the same as pressing Escape. It floats
              right, so the title wraps around it instead of running underneath. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="float-right -mt-2 -mr-2 ml-2 flex h-8 w-8 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
          {children}
        </>
      )}
    </dialog>
  )
}
