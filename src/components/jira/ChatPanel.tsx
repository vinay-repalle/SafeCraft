import { useEffect, useRef, type CSSProperties } from 'react'
import { useCurrentStep, useLevelStore } from '../../store/levelStore'
import { useNewSince } from '../../utils/useNewSince'
import { spotClass, spotProps, useNextAction } from '../spotlight'
import { PANEL_BUTTON } from '../ui'

// Scripted teammate chat. The learner answers by choosing one of the replies.
export function ChatPanel() {
  const chat = useLevelStore((s) => s.chat)
  const act = useLevelStore((s) => s.act)
  const step = useCurrentStep()
  const log = useRef<HTMLDivElement>(null)
  // Phase 9: lines that arrive while you watch rise in; the teammate's answer follows yours.
  const isNew = useNewSince(chat)
  const spot = useNextAction()?.kind === 'chat'

  // Keep the newest line in view. Scrolls only the chat box, never the page around it.
  useEffect(() => {
    const el = log.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.length, step?.id])

  const script = step?.kind === 'chat' ? step.chat : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={log} role="log" aria-label="Team chat" className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {chat.length === 0 && <p className="text-meta text-ink-3">No messages yet.</p>}
        {chat.map((line) => (
          <div
            key={line.id}
            style={isNew(line.id) && line.side === 'them' ? ({ '--delay': '150ms' } as CSSProperties) : undefined}
            className={`rounded-tag p-3 ${line.side === 'you' ? 'ml-8 bg-raised' : 'mr-8 border border-line'} ${isNew(line.id) ? 'motion-rise' : ''}`}
          >
            <p className="text-meta text-ink-3">{line.speaker}</p>
            <p className="mt-0.5 text-body text-ink">{line.text}</p>
          </div>
        ))}
      </div>
      {script && (
        <div {...spotProps(spot)} className={`mt-2 flex flex-col gap-1.5 rounded-tag${spotClass(spot)}`} role="group" aria-label="Choose a reply">
          {script.replies.map((reply) => (
            <button
              key={reply.id}
              type="button"
              className={`${PANEL_BUTTON} h-auto justify-start whitespace-normal py-2 text-left`}
              onClick={() => act({ type: 'chat', chatId: script.id, replyId: reply.id })}
            >
              {reply.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
