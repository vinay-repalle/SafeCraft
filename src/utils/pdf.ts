// A very small PDF writer: left-aligned text in three fonts, wrapped to the page, over as many
// pages as needed. It exists so the cheat sheet can be a real PDF without adding a library.
//
// A PDF is a list of numbered objects (the catalog, the pages, the fonts, one text stream per
// page) followed by a table that records the byte position of each object. Readers jump straight
// to an object using that table, so the positions must be exact. That is why this file only
// writes plain ASCII: one character is one byte, and the positions can be counted by length.

export type PdfFont = 'regular' | 'bold' | 'mono'
export type PdfLine = { text: string; font?: PdfFont; size?: number; gapBefore?: number }

const PAGE = { width: 612, height: 792, margin: 56 } // US Letter in points (1 point = 1/72 inch)
const FONT_NAME: Record<PdfFont, string> = { regular: 'F1', bold: 'F2', mono: 'F3' }
const BASE_FONT: Record<PdfFont, string> = { regular: 'Helvetica', bold: 'Helvetica-Bold', mono: 'Courier' }
// Average glyph width as a share of the font size. Helvetica varies by letter, so this is
// slightly wide on purpose: lines may wrap a little early but never run off the page.
const WIDTH_FACTOR: Record<PdfFont, number> = { regular: 0.52, bold: 0.56, mono: 0.6 }

// The standard PDF fonts only cover basic Latin, so map common typographic characters
// to plain ones and replace anything else.
export function toPdfText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7e]/g, '?')
}

const escapePdf = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`)

export function wrapText(text: string, font: PdfFont, size: number, width = PAGE.width - PAGE.margin * 2): string[] {
  const maxChars = Math.max(10, Math.floor(width / (size * WIDTH_FACTOR[font])))
  if (font === 'mono') {
    // Commands should not be re-flowed at spaces mid-word; cut at the limit.
    const out: string[] = []
    for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars))
    return out.length ? out : ['']
  }
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!current) current = word
    else if ((current + ' ' + word).length <= maxChars) current += ' ' + word
    else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function buildPdf(input: PdfLine[]): string {
  // Lay the lines out page by page.
  type Placed = { text: string; font: PdfFont; size: number; y: number }
  const pages: Placed[][] = [[]]
  let y = PAGE.height - PAGE.margin
  for (const line of input) {
    const font = line.font ?? 'regular'
    const size = line.size ?? 11
    const leading = size * 1.4
    const wrapped = wrapText(toPdfText(line.text), font, size)
    y -= line.gapBefore ?? 0
    for (const text of wrapped) {
      if (y - leading < PAGE.margin) {
        pages.push([])
        y = PAGE.height - PAGE.margin
      }
      y -= leading
      pages[pages.length - 1].push({ text, font, size, y })
    }
  }

  // Object numbers: 1 catalog, 2 page list, 3 to 5 fonts, then a page and its text for each page.
  const objects: string[] = []
  const pageIds = pages.map((_, i) => 6 + i * 2)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ;(['regular', 'bold', 'mono'] as const).forEach((font, i) => {
    objects[3 + i] = `<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT[font]} /Encoding /WinAnsiEncoding >>`
  })
  pages.forEach((placed, i) => {
    const pageId = pageIds[i]
    const stream = placed
      .map((p) => `BT /${FONT_NAME[p.font]} ${p.size} Tf ${PAGE.margin} ${p.y.toFixed(2)} Td (${escapePdf(p.text)}) Tj ET`)
      .join('\n')
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageId + 1} 0 R >>`
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  // Write each object and note where it starts.
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xrefAt = out.length
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return out
}

export function pdfBlob(lines: PdfLine[]): Blob {
  return new Blob([buildPdf(lines)], { type: 'application/pdf' })
}
