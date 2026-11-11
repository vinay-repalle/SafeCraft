import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLevelStore } from '../../store/levelStore'

// Shows every command that ran (from the buttons, Skip & Auto-Fill or typing) and its
// output. You can also type git commands here yourself.
export function MiniTerminal() {
  const terminal = useLevelStore((s) => s.terminal)
  const runCommand = useLevelStore((s) => s.runCommand)
  const [command, setCommand] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [terminal.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = command.trim()
    if (!text) return
    runCommand(text)
    setCommand('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col font-mono text-caption">
      <div role="log" aria-label="Terminal output" className="min-h-0 flex-1 overflow-y-auto">
        {terminal.length === 0 && <p className="text-ink-3">Commands you run appear here.</p>}
        {terminal.map((line) =>
          line.kind === 'command' ? (
            <p key={line.id} className="mt-2 text-ink first:mt-0">
              <span className="text-ink-3">$ </span>
              {line.text}
            </p>
          ) : (
            <pre key={line.id} className={`whitespace-pre-wrap break-words font-mono ${line.kind === 'error' ? 'text-fail' : 'text-ink-2'}`}>
              {line.text}
            </pre>
          ),
        )}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="mt-2 flex items-center gap-2 border-t border-line pt-2">
        <label htmlFor="terminal-input" className="text-ink-3">
          $
        </label>
        <input
          id="terminal-input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a git command, for example git status"
          spellCheck={false}
          autoComplete="off"
          className="h-7 min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-3"
        />
      </form>
    </div>
  )
}
