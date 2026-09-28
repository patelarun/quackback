/**
 * Ordering rules of section retrieval that need no database: fusion of the two
 * arms, and the section link. The SQL paths are covered by
 * help-center-chunks.integration.test.ts.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/server/config', () => ({ getBaseUrl: () => 'https://help.example.test' }))

import { fuseCandidates, sectionUrl, type Candidate } from '../help-center-chunk-search.service'

function candidate(chunkId: string, keyword: number | null, semantic: number | null): Candidate {
  return {
    chunkId,
    articleId: 'kb_article_1',
    slug: 'users',
    urlId: 12,
    articleTitle: 'Användare',
    heading: chunkId,
    headingPath: `Användare › ${chunkId}`,
    content: chunkId,
    keyword,
    semantic,
  }
}

describe('fuseCandidates', () => {
  it('rrf ranks a chunk found by both arms above one found by either alone', () => {
    const fused = fuseCandidates(
      [
        candidate('keyword-top', 0.9, null),
        candidate('both', 0.2, 0.5),
        candidate('semantic-top', null, 0.8),
      ],
      'rrf'
    )
    expect(fused[0].chunkId).toBe('both')
  })

  it('rrf is scale-free: only the order within each arm matters', () => {
    const small = fuseCandidates([candidate('a', 0.02, 0.4), candidate('b', 0.01, 0.39)], 'rrf')
    const large = fuseCandidates([candidate('a', 0.9, 0.9), candidate('b', 0.8, 0.8)], 'rrf')
    expect(small.map((c) => c.fusedScore)).toEqual(large.map((c) => c.fusedScore))
  })

  it('weighted blends raw scores 0.4 keyword / 0.6 semantic', () => {
    const [only] = fuseCandidates([candidate('a', 0.5, 0.5)], 'weighted')
    expect(only.fusedScore).toBeCloseTo(0.5)
    const fused = fuseCandidates([candidate('kw', 1, null), candidate('sem', null, 1)], 'weighted')
    expect(fused.map((c) => c.chunkId)).toEqual(['sem', 'kw'])
  })

  it('returns nothing for no candidates', () => {
    expect(fuseCandidates([], 'rrf')).toEqual([])
  })
})

describe('sectionUrl', () => {
  it('anchors at the heading the page renders', () => {
    expect(
      sectionUrl({ locale: 'sv', urlId: 12, slug: 'users', heading: 'Lägg till en användare' })
    ).toBe('https://help.example.test/hc/sv/articles/12-users#l-gg-till-en-anv-ndare')
  })

  it('links the article itself when the chunk has no heading', () => {
    expect(sectionUrl({ locale: 'en', urlId: 12, slug: 'users', heading: null })).toBe(
      'https://help.example.test/hc/en/articles/12-users'
    )
  })
})
