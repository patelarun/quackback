/**
 * Chunker tests against three real product docs (bos-v3/product-docs, copied
 * into fixtures/ so the suite does not depend on another repository) and a set
 * of synthetic edge cases for the block rules.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  chunkArticle,
  headingAnchor,
  estimateTokens,
  MAX_CHUNK_TOKENS,
  HEADING_PATH_SEPARATOR,
} from '../help-center-chunking.service'

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, 'fixtures', 'product-docs', name), 'utf8')
}

/** Every non-heading, non-rule paragraph of the source must land in some chunk. */
function expectNoTextLost(markdown: string, chunkContents: string[]) {
  const all = chunkContents.join('\n\n')
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,6}\s/.test(p) && !/^-{3,}$/.test(p))
    // An image-only block belongs to a section that may be dropped as unretrievable.
    .filter((p) => p.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim())
  for (const paragraph of paragraphs) {
    expect(all).toContain(paragraph)
  }
}

describe('chunkArticle — sv/account-and-settings/settings.md', () => {
  const markdown = fixture('sv-settings.md')
  const chunks = chunkArticle('Inställningar', markdown)

  it('drops the leading # title and the --- rules', () => {
    for (const chunk of chunks) {
      expect(chunk.content).not.toMatch(/^# Inställningar/m)
      expect(chunk.content).not.toMatch(/^---$/m)
    }
  })

  it('keeps a short ## section whole', () => {
    const intro = chunks.find((c) => c.heading === 'Vad är det?')
    expect(intro?.headingPath).toBe(['Inställningar', 'Vad är det?'].join(HEADING_PATH_SEPARATOR))
    expect(intro?.content.startsWith('## Vad är det?')).toBe(true)
  })

  it('splits the long "Hur gör jag?" section at its ### headings', () => {
    const task = chunks.find((c) => c.heading === 'Anslut ett bokföringssystem')
    expect(task?.headingPath).toBe(
      ['Inställningar', 'Hur gör jag?', 'Anslut ett bokföringssystem'].join(HEADING_PATH_SEPARATOR)
    )
    expect(task?.content.startsWith('### Anslut ett bokföringssystem')).toBe(true)
    // No chunk is the bare generic heading on its own.
    expect(chunks.some((c) => c.heading === 'Hur gör jag?')).toBe(false)
  })

  it('splits an oversized ### further at its #### headings', () => {
    const nested = chunks.find((c) => c.heading === 'Betalningsvillkor')
    expect(nested?.headingPath).toBe(
      ['Inställningar', 'Hur gör jag?', 'Ange allmänna företagsregler', 'Betalningsvillkor'].join(
        HEADING_PATH_SEPARATOR
      )
    )
  })

  it('stays within budget and numbers positions from 0', () => {
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(MAX_CHUNK_TOKENS + 20)
    }
    expect(chunks.map((c) => c.position)).toEqual(chunks.map((_, i) => i))
  })

  it('loses no text', () => {
    expectNoTextLost(
      markdown,
      chunks.map((c) => c.content)
    )
  })
})

describe('chunkArticle — en/calendar/calendar.md', () => {
  const markdown = fixture('en-calendar.md')
  const chunks = chunkArticle('Calendar', markdown)

  it('never splits a table across chunks', () => {
    const withTable = chunks.filter((c) => c.content.includes('| Entry type |'))
    expect(withTable).toHaveLength(1)
    expect(withTable[0].content).toContain('| --- | --- |')
    expect(withTable[0].content).toContain('| Absence | View, **Approve**, **Delete** |')
  })

  it('loses no text', () => {
    expectNoTextLost(
      markdown,
      chunks.map((c) => c.content)
    )
  })
})

describe('chunkArticle — sv/people/users.md', () => {
  const markdown = fixture('sv-users.md')
  const chunks = chunkArticle('Användare', markdown)

  it('indexes each task as its own chunk', () => {
    const headings = chunks.map((c) => c.heading)
    expect(headings).toContain('Lägg till en användare')
    expect(headings).toContain('Lås upp en användare')
  })

  it('loses no text', () => {
    expectNoTextLost(
      markdown,
      chunks.map((c) => c.content)
    )
  })
})

describe('chunkArticle — block rules', () => {
  const longParagraph = (n: number) =>
    `Paragraph ${n}. ` + 'This sentence pads the paragraph to a realistic length. '.repeat(20)

  it('keeps a loose list (blank lines between items) in one block', () => {
    const items = Array.from({ length: 12 }, (_, i) => `${i + 1}. ${longParagraph(i)}`)
    const chunks = chunkArticle('T', `## Steps\n\n${items.join('\n\n')}`)
    // Oversized, but a list is indivisible: one chunk holding every item.
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toContain('1. Paragraph 0.')
    expect(chunks[0].content).toContain('12. Paragraph 11.')
  })

  it('keeps a code fence whole across its blank lines and ignores # inside it', () => {
    const fence = '```\n# not a heading\n\nstill code\n```'
    const chunks = chunkArticle('T', `## Example\n\nIntro.\n\n${fence}`)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toContain(fence)
  })

  it('packs paragraphs when an oversized section has no deeper headings', () => {
    const body = Array.from({ length: 8 }, (_, i) => longParagraph(i)).join('\n\n')
    const chunks = chunkArticle('T', `## Long\n\n${body}`)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.heading).toBe('Long')
      expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(MAX_CHUNK_TOKENS)
    }
  })

  it('drops a section holding only an image', () => {
    const chunks = chunkArticle('T', '## Picture\n\n![Screen](images/a.png)\n\n## Text\n\nWords.')
    expect(chunks.map((c) => c.heading)).toEqual(['Text'])
  })

  it('gives text before the first ## a chunk with no heading', () => {
    const [intro] = chunkArticle('Title', 'Opening words.\n\n## Next\n\nMore.')
    expect(intro.heading).toBeNull()
    expect(intro.headingPath).toBe('Title')
  })

  it('hashes the embedding input, so only a real change re-embeds', () => {
    const a = chunkArticle('T', '## A\n\nOne.')[0]
    const same = chunkArticle('T', '## A\n\nOne.')[0]
    const changed = chunkArticle('T', '## A\n\nTwo.')[0]
    const renamed = chunkArticle('T2', '## A\n\nOne.')[0]
    expect(same.contentHash).toBe(a.contentHash)
    expect(changed.contentHash).not.toBe(a.contentHash)
    // The title is part of the heading path, which is part of the embedding input.
    expect(renamed.contentHash).not.toBe(a.contentHash)
    expect(a.embeddingInput).toBe('T › A\n\n## A\n\nOne.')
  })
})

describe('headingAnchor', () => {
  it('matches the public page, which drops non-ASCII letters', () => {
    expect(headingAnchor('Anslut ett bokföringssystem')).toBe('anslut-ett-bokf-ringssystem')
    expect(headingAnchor('Vad är det?')).toBe('vad-r-det')
  })

  it('reads the heading as plain text', () => {
    expect(headingAnchor('Use **bold** and `code`')).toBe('use-bold-and-code')
  })
})
