import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { selectProgress, useProgressStore } from '../store/progressStore'
import { downloadProgressFile, parseProgressFile } from '../utils/progressFile'

type Message = { kind: 'ok' | 'error'; text: string }

const BUTTON =
  'flex h-8 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-card px-3 text-body text-ink transition-colors hover:bg-raised'

export function ProgressTransfer() {
  const replaceProgress = useProgressStore((s) => s.replaceProgress)
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message | null>(null)

  // Clear the status line after a few seconds.
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 8000)
    return () => window.clearTimeout(timer)
  }, [message])

  const handleExport = () => {
    // getState() reads the store right now without subscribing, which is what we want
    // inside a click handler (no re-render needed).
    downloadProgressFile(selectProgress(useProgressStore.getState()))
    setMessage({ kind: 'ok', text: 'Progress exported' })
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return

    const result = parseProgressFile(await file.text())
    if (result.ok) {
      replaceProgress(result.progress)
      setMessage({ kind: 'ok', text: 'Progress imported. Your previous progress was replaced.' })
    } else {
      setMessage({ kind: 'error', text: `Import failed. ${result.error}` })
    }
  }

  return (
    <div className="relative flex shrink-0 items-center gap-3">
      {/* The status sits below the buttons instead of beside them, so a long message
          can never squeeze the role bar. The live region stays in the page at all
          times so screen readers announce changes to it. */}
      <div role="status" className="absolute top-full right-0 z-10 mt-2">
        {message && (
          <p
            className={`w-max max-w-md rounded-control border border-line bg-card px-3 py-2 text-caption shadow-small ${
              message.kind === 'error' ? 'text-fail' : 'text-ink'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
      <button type="button" className={BUTTON} onClick={handleExport}>
        <Download size={16} strokeWidth={1.5} />
        Export progress
      </button>
      <button type="button" className={BUTTON} onClick={() => fileInput.current?.click()}>
        <Upload size={16} strokeWidth={1.5} />
        Import progress
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />
    </div>
  )
}
