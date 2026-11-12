import { Fragment, type ReactNode } from 'react'
import type { Block, Inline } from '../../utils/miniMarkdown'

function InlineText({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === 'bold') return <strong key={i} className="font-medium text-ink">{part.text}</strong>
        if (part.kind === 'code')
          return (
            <code key={i} className="rounded-tag bg-raised px-1 font-mono text-caption text-ink">
              {part.text}
            </code>
          )
        return <Fragment key={i}>{part.text}</Fragment>
      })}
    </>
  )
}

// Turns parsed Markdown blocks into elements. Text is passed to React as text, never as HTML.
export function GuideBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-lead text-ink-2">
      {blocks.map((block, i): ReactNode => {
        switch (block.kind) {
          case 'h1':
            return null
          case 'h2':
            return (
              <h3 key={i} className="pt-4 text-lead font-medium text-ink">
                {block.text}
              </h3>
            )
          case 'p':
            return (
              <p key={i}>
                <InlineText parts={block.inline} />
              </p>
            )
          case 'ul':
          case 'ol': {
            const List = block.kind === 'ul' ? 'ul' : 'ol'
            return (
              <List key={i} className={`space-y-2 pl-6 ${block.kind === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-ink-3`}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <InlineText parts={item} />
                  </li>
                ))}
              </List>
            )
          }
          case 'code':
            return (
              <pre key={i} className="overflow-x-auto rounded-card border border-line bg-raised p-4 font-mono text-caption text-ink">
                {block.text}
              </pre>
            )
        }
      })}
    </div>
  )
}
