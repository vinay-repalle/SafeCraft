import { inlineText, parseMarkdown, type Block } from '../utils/miniMarkdown'

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

// The reading order. The first eight are the PRD's starting set; a new article is added by
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

export const guides: Guide[] = GUIDE_ORDER.flatMap((slug) => {
  const source = files[`./guides/${slug}.md`]
  return source ? [toGuide(slug, source)] : []
})

export const findGuide = (slug: string | null | undefined): Guide | undefined => guides.find((g) => g.slug === slug)
