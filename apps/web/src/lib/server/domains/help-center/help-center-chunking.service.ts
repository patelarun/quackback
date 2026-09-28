/**
 * Help Center Chunking Service
 *
 * Splits one article's Markdown into the sections kb_article_chunks indexes, so
 * retrieval can hand back the one section that answers a question rather than a
 * whole article. Pure: no database, no network -- the index service owns both.
 *
 * The rules, in order:
 *
 * 1. Every `##` heading starts a section; text before the first one is a section
 *    with no heading. A leading `# title` is dropped (the docs sync already
 *    strips it; hand-written articles may not), and so are `---` rules.
 * 2. A section within {@link MAX_CHUNK_TOKENS} is one chunk, its `###` and
 *    deeper headings kept inside it.
 * 3. A section over the budget splits at its next heading level down (`###`,
 *    then `####`), each part becoming its own chunk under a longer heading path.
 *    This matters for this corpus in particular: every product doc has the same
 *    generic `## Hur gör jag?` / `## How do I…?` section, often 1,500 words long,
 *    whose real topics are its `###` headings -- a chunk that points at the
 *    `###` links the reader to the task, not to the top of a long list.
 * 4. A part with no deeper headings and still over budget is packed paragraph
 *    by paragraph. A list, table, code fence or `:::` container is one
 *    indivisible block, so an oversized one stays whole rather than being cut.
 */

import { createHash } from 'node:crypto'

/**
 * Soft ceiling per chunk. Four sections of this size fit comfortably in one
 * assistant tool result, and sections of the product docs average ~150 words,
 * so most are one chunk untouched.
 */
export const MAX_CHUNK_TOKENS = 400

/** Separator between the levels of a chunk's heading path. */
export const HEADING_PATH_SEPARATOR = ' › '

export interface ArticleChunk {
  /** 0-based order within the article + locale. */
  position: number
  /** The most specific heading this chunk sits under; null before the first `##`. */
  heading: string | null
  /** `"Article title › Section › Subsection"`. */
  headingPath: string
  /** The chunk's Markdown, including its own heading line when it starts a section. */
  content: string
  /** What gets embedded: the heading path, then the content. */
  embeddingInput: string
  /** sha256 of {@link embeddingInput}; the index re-embeds only when it changes. */
  contentHash: string
  tokenCount: number
}

interface Block {
  text: string
  /** Heading level (2-6) when the block is a heading line, else null. */
  headingLevel: number | null
  headingText: string | null
}

/**
 * Rough token count: ~4 characters per token holds for English and is close
 * enough for Swedish at the granularity of a 400-token budget. Avoids pulling a
 * tokenizer into the server bundle for a number that only steers splitting.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * The anchor id the public article page gives a heading. MUST match
 * `slugify` in components/help-center/help-center-article-utils.ts (the table
 * of contents) and `slugifyHeading` in lib/shared/content-html.ts (SSR), or a
 * retrieved section links to an anchor that does not exist. Note that it drops
 * every non-ASCII letter, so "Anslut ett bokföringssystem" becomes
 * `anslut-ett-bokf-ringssystem` -- odd, but it is what the page renders.
 */
export function headingAnchor(heading: string): string {
  return plainHeadingText(heading)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A heading's text with inline Markdown removed, as the page's TOC reads it. */
function plainHeadingText(heading: string): string {
  return heading
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`|~~)/g, '')
    .trim()
}

const HEADING_LINE = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const FENCE_LINE = /^\s*(```|~~~)/
const CONTAINER_LINE = /^\s*:::/
const RULE_LINE = /^\s*([-*_])(\s*\1){2,}\s*$/
const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s+/
const INDENTED = /^(\s{2,}|\t)\S/

/**
 * Split Markdown into blocks: heading lines, and runs of lines separated by
 * blank lines. A code fence or `:::` container is kept whole across its blank
 * lines, and a list that is loose (blank lines between items) is merged back
 * into one block afterwards.
 */
function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let current: string[] = []
  let inFence = false
  let containerDepth = 0

  const flush = () => {
    const text = current.join('\n').trimEnd()
    current = []
    if (!text.trim()) return
    if (RULE_LINE.test(text) && !text.includes('\n')) return
    blocks.push({ text, headingLevel: null, headingText: null })
  }

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (FENCE_LINE.test(line)) {
      inFence = !inFence
      current.push(line)
      continue
    }
    if (inFence) {
      current.push(line)
      continue
    }
    if (CONTAINER_LINE.test(line)) {
      // `:::name` opens, a bare `:::` closes.
      containerDepth = /^\s*:::\s*$/.test(line)
        ? Math.max(0, containerDepth - 1)
        : containerDepth + 1
      current.push(line)
      continue
    }
    if (containerDepth > 0) {
      current.push(line)
      continue
    }

    const heading = HEADING_LINE.exec(line)
    if (heading) {
      flush()
      blocks.push({
        text: line.trim(),
        headingLevel: heading[1].length,
        headingText: heading[2].trim(),
      })
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    current.push(line)
  }
  flush()

  return mergeLooseLists(blocks)
}

/** Rejoin a list whose items were separated by blank lines into one block. */
function mergeLooseLists(blocks: Block[]): Block[] {
  const merged: Block[] = []
  for (const block of blocks) {
    const previous = merged[merged.length - 1]
    const continuesList =
      previous !== undefined &&
      previous.headingLevel === null &&
      block.headingLevel === null &&
      LIST_ITEM.test(previous.text.split('\n')[0]) &&
      (LIST_ITEM.test(block.text) || INDENTED.test(block.text))
    if (continuesList) {
      previous.text = `${previous.text}\n\n${block.text}`
    } else {
      merged.push({ ...block })
    }
  }
  return merged
}

function joinBlocks(blocks: Block[]): string {
  return blocks.map((b) => b.text).join('\n\n')
}

/** True when a chunk holds nothing but headings and images -- nothing to retrieve. */
function hasRetrievableText(blocks: Block[]): boolean {
  return blocks.some(
    (b) => b.headingLevel === null && b.text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim().length > 0
  )
}

interface DraftChunk {
  headings: string[]
  blocks: Block[]
}

/**
 * Chunk one section. `blocks` begins with the section's own heading block when
 * it has one; `headings` is the path of heading texts down to this section.
 */
function chunkSection(headings: string[], blocks: Block[], level: number): DraftChunk[] {
  if (estimateTokens(joinBlocks(blocks)) <= MAX_CHUNK_TOKENS) {
    return hasRetrievableText(blocks) ? [{ headings, blocks }] : []
  }

  // Over budget: split at the shallowest heading level below this section's own.
  const subLevel = blocks
    .filter((b, i) => i > 0 && b.headingLevel !== null && b.headingLevel > level)
    .reduce<number | null>(
      (min, b) => (min === null ? b.headingLevel : Math.min(min, b.headingLevel!)),
      null
    )

  if (subLevel === null) return packParagraphs(headings, blocks)

  const drafts: DraftChunk[] = []
  let partHeadings = headings
  let part: Block[] = []
  const flushPart = (partLevel: number) => {
    if (part.length === 0) return
    drafts.push(...chunkSection(partHeadings, part, partLevel))
    part = []
  }
  blocks.forEach((block, i) => {
    if (i > 0 && block.headingLevel === subLevel) {
      flushPart(partHeadings === headings ? level : subLevel)
      partHeadings = [...headings, block.headingText ?? '']
    }
    part.push(block)
  })
  flushPart(partHeadings === headings ? level : subLevel)
  return drafts
}

/** Greedy pack of whole blocks up to the budget; a single oversized block stays whole. */
function packParagraphs(headings: string[], blocks: Block[]): DraftChunk[] {
  const drafts: DraftChunk[] = []
  let current: Block[] = []
  for (const block of blocks) {
    const candidate = [...current, block]
    if (current.length > 0 && estimateTokens(joinBlocks(candidate)) > MAX_CHUNK_TOKENS) {
      drafts.push({ headings, blocks: current })
      current = [block]
    } else {
      current = candidate
    }
  }
  if (current.length > 0) drafts.push({ headings, blocks: current })
  return drafts.filter((d) => hasRetrievableText(d.blocks))
}

/**
 * Split an article into retrievable chunks. `title` heads every heading path;
 * `markdown` is the article (or translation) body as stored.
 */
export function chunkArticle(title: string, markdown: string): ArticleChunk[] {
  let blocks = parseBlocks(markdown)
  // Drop a leading `# title`: the page renders the title itself.
  if (blocks[0]?.headingLevel === 1) blocks = blocks.slice(1)

  // Group into `##` sections; anything before the first `##` is a heading-less section.
  const sections: Block[][] = []
  for (const block of blocks) {
    if (block.headingLevel !== null && block.headingLevel <= 2) sections.push([block])
    else if (sections.length === 0) sections.push([block])
    else sections[sections.length - 1].push(block)
  }

  const trimmedTitle = title.trim()
  const drafts = sections.flatMap((section) => {
    const first = section[0]
    const isHeaded = first.headingLevel !== null
    return chunkSection(isHeaded ? [first.headingText ?? ''] : [], section, isHeaded ? 2 : 1)
  })

  return drafts.map((draft, position) => {
    const content = joinBlocks(draft.blocks)
    const plainHeadings = draft.headings.map(plainHeadingText).filter(Boolean)
    const headingPath = [trimmedTitle, ...plainHeadings].join(HEADING_PATH_SEPARATOR)
    const embeddingInput = `${headingPath}\n\n${content}`
    return {
      position,
      heading: plainHeadings[plainHeadings.length - 1] ?? null,
      headingPath,
      content,
      embeddingInput,
      contentHash: createHash('sha256').update(embeddingInput).digest('hex'),
      tokenCount: estimateTokens(embeddingInput),
    }
  })
}
