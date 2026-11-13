import { inlineText, parseInline, parseMarkdown, type Block } from '../utils/miniMarkdown'
import { levelSummaries } from './index'
import { HOW_TO_PLAY } from './landing'

// Field Guide articles are Markdown files in src/content/guides/. Vite's import.meta.glob finds
// every file that matches the pattern and, with "eager" and "?raw", hands back its text.
const files = import.meta.glob<string>('./guides/*.md', { query: '?raw', import: 'default', eager: true })

export type Guide = {
  slug: string
  title: string
  summary: string // the first sentence after the title
  blocks: Block[] // everything after the title
  minutes: number
}

// The reading order of the Markdown articles, after "How to play". The eight are the PRD's starting set; a new article is added by
// dropping a .md file in the folder and listing its name here.
export const GUIDE_ORDER = [
  'reading-a-jira-board',
  'what-is-a-branch',
  'what-is-a-pull-request',
  'why-we-never-push-directly-to-main',
  'how-frontend-and-backend-work-in-parallel',
  'what-is-an-api-contract',
  'what-are-automated-tests',
  'what-is-a-merge-conflict',
] as const

const WORDS_PER_MINUTE = 200

function toGuide(slug: string, source: string): Guide {
  const blocks = parseMarkdown(source)
  const title = blocks.find((b) => b.kind === 'h1')
  const body = blocks.filter((b) => b !== title)
  const first = body.find((b) => b.kind === 'p')
  const words = source.split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: title && title.kind === 'h1' ? title.text : slug,
    summary: first && first.kind === 'p' ? inlineText(first.inline) : '',
    blocks: body,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  }
}

// Phase 8: "How to play" is the first article. It is not a Markdown file: it is written once in
// landing.ts and shown on the landing page too, and its level list comes from the level data. The
// Field Guide draws it with the same component as the landing page (HowToPlay.tsx); these blocks
// give it a summary and a reading time like every other article.
export const HOW_TO_PLAY_SLUG = HOW_TO_PLAY.slug

export function howToPlayGuide(): Guide {
  const h = HOW_TO_PLAY
  const named = (name: string, body: string) => parseInline(`**${name}.** ${body}`)
  const blocks: Block[] = [
    { kind: 'p', inline: parseInline(h.intro) },
    { kind: 'h2', text: h.stepsTitle },
    { kind: 'ol', items: h.steps.map((s) => named(s.title, s.body)) },
    { kind: 'h2', text: h.levelsTitle },
    { kind: 'p', inline: parseInline(h.levelsLead) },
    { kind: 'ol', items: levelSummaries.map((l) => named(l.title, l.whyItExists)) },
    { kind: 'h2', text: h.helpersTitle },
    { kind: 'ul', items: h.helpers.map((x) => named(x.name, x.body)) },
    { kind: 'h2', text: h.progressTitle },
    { kind: 'p', inline: parseInline(h.progressBody) },
  ]
  const text = [
    h.intro,
    ...h.steps.flatMap((x) => [x.title, x.body]),
    h.levelsLead,
    ...levelSummaries.flatMap((l) => [l.title, l.whyItExists]),
    ...h.helpers.flatMap((x) => [x.name, x.body]),
    h.progressBody,
  ].join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return { slug: h.slug, title: h.title, summary: h.intro, blocks, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) }
}

export const guides: Guide[] = [
  howToPlayGuide(),
  ...GUIDE_ORDER.flatMap((slug) => {
    const source = files[`./guides/${slug}.md`]
    return source ? [toGuide(slug, source)] : []
  }),
]

export const findGuide = (slug: string | null | undefined): Guide | undefined => guides.find((g) => g.slug === slug)
