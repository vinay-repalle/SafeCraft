// A tiny Markdown reader for the Field Guide articles. It understands only what the articles use:
// headings, paragraphs, bullet and numbered lists, fenced code, and **bold** and `code` inside text.
// Writing our own keeps the app free of a Markdown library for this one job. It never produces
// HTML: it returns plain data, and React turns that into elements, so article text can never
// inject markup.

export type Inline = { kind: 'text' | 'bold' | 'code'; text: string }

export type Block =
  | { kind: 'h1' | 'h2'; text: string }
  | { kind: 'p'; inline: Inline[] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }
  | { kind: 'code'; text: string }

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  // Either **bold** or `code`; everything between matches is plain text.
  const pattern = /\*\*(.+?)\*\*|`([^`]+)`/g
  let cursor = 0
  for (const m of text.matchAll(pattern)) {
    if (m.index > cursor) out.push({ kind: 'text', text: text.slice(cursor, m.index) })
    out.push(m[1] !== undefined ? { kind: 'bold', text: m[1] } : { kind: 'code', text: m[2] })
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) })
  return out
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
    } else if (line.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++ // the closing fence
      blocks.push({ kind: 'code', text: body.join('\n') })
    } else if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3).trim() })
      i++
    } else if (line.startsWith('# ')) {
      blocks.push({ kind: 'h1', text: line.slice(2).trim() })
      i++
    } else if (/^- /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line)
      const marker = ordered ? /^\d+\. / : /^- /
      const items: Inline[][] = []
      while (i < lines.length && marker.test(lines[i])) items.push(parseInline(lines[i++].replace(marker, '')))
      blocks.push({ kind: ordered ? 'ol' : 'ul', items })
    } else {
      // A paragraph runs until a blank line or the start of another kind of block.
      const para: string[] = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !/^- /.test(lines[i]) &&
        !/^\d+\. /.test(lines[i])
      ) {
        para.push(lines[i++].trim())
      }
      blocks.push({ kind: 'p', inline: parseInline(para.join(' ')) })
    }
  }
  return blocks
}

// Plain text of inline pieces, for word counts and summaries.
export const inlineText = (inline: Inline[]): string => inline.map((p) => p.text).join('')
