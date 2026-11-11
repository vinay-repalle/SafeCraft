import { useEffect, useRef, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }

// Uses the browser's built-in <dialog> element. showModal() gives us for free what is
// otherwise fiddly to build: the page behind becomes inert, focus stays inside, and
// Escape closes it. The dim backdrop is styled in index.css (flat colour, no blur).
export function Dialog({ open, onClose, labelledBy, children }: Props) {
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
      className="dialog-surface m-auto w-full max-w-xl overflow-visible rounded-panel border border-line bg-card p-6 text-ink"
    >
      {/* Content mounts only while open, so each popup starts with fresh state. */}
      {open && children}
    </dialog>
  )
}
