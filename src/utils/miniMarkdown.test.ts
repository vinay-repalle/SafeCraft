import { describe, expect, it } from 'vitest'
import { inlineText, parseInline, parseMarkdown } from './miniMarkdown'

describe('parseInline', () => {
  it('splits bold and code from plain text', () => {
    expect(parseInline('Use **main** and `git pull` now')).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'bold', text: 'main' },
      { kind: 'text', text: ' and ' },
      { kind: 'code', text: 'git pull' },
      { kind: 'text', text: ' now' },
    ])
  })

  it('leaves unmatched markers as text', () => {
    expect(parseInline('2 ** 3 and one `tick')).toEqual([{ kind: 'text', text: '2 ** 3 and one `tick' }])
  })
})

describe('parseMarkdown', () => {
  const source = [
    '# Title',
    '',
    'First line',
    'continues here.',
    '',
    '## Steps',
    '',
    '1. One',
    '2. Two',
    '',
    '- Alpha',
    '- **Beta**',
    '',
    '```text',
    '<<<<<<< HEAD',
    '```',
  ].join('\n')

  const blocks = parseMarkdown(source)

  it('reads headings, joins wrapped paragraph lines and keeps block order', () => {
    expect(blocks.map((b) => b.kind)).toEqual(['h1', 'p', 'h2', 'ol', 'ul', 'code'])
    expect(blocks[0]).toEqual({ kind: 'h1', text: 'Title' })
    const p = blocks[1]
    expect(p.kind === 'p' && inlineText(p.inline)).toBe('First line continues here.')
  })

  it('reads list items and fenced code as written', () => {
    const ol = blocks[3]
    const ul = blocks[4]
    expect(ol.kind === 'ol' && ol.items.length).toBe(2)
    expect(ul.kind === 'ul' && ul.items[1]).toEqual([{ kind: 'bold', text: 'Beta' }])
    expect(blocks[5]).toEqual({ kind: 'code', text: '<<<<<<< HEAD' })
  })

  it('never turns text into markup', () => {
    const [block] = parseMarkdown('<script>alert(1)</script>')
    expect(block).toEqual({ kind: 'p', inline: [{ kind: 'text', text: '<script>alert(1)</script>' }] })
  })
})
