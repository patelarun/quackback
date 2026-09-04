/**
 * Every tracker integration appends a back-link to the feedback it came from.
 *
 * The label used to read "View in Quackback" — a vendor name that is wrong on
 * a fork, and that leaves the installation the moment an issue is created: it
 * is written into the body of a GitHub issue or Jira ticket, where it is read
 * by whoever has access to that tracker and cannot be corrected afterwards by
 * changing this code.
 *
 * Nine builders emit it in four different formats, and before this only Linear
 * asserted it at all. The sweep below is the point of the file: it fails if any
 * builder drifts back to naming the vendor, or quietly stops emitting a
 * back-link, in a format nobody happened to write a test for.
 */
import { describe, it, expect } from 'vitest'
import type { PostCreatedEvent } from '@/lib/server/events/types'
import { FEEDBACK_BACKLINK_LABEL } from '@/lib/server/integrations/message-utils'

import { buildClickUpTaskBody } from '@/integrations/clickup/server/message'
import { buildGitHubIssueBody } from '@/integrations/github/server/message'
import { buildAsanaTaskBody } from '@/integrations/asana/server/message'
import { buildShortcutStoryBody } from '@/integrations/shortcut/server/message'
import { buildJiraIssueBody } from '@/integrations/jira/server/message'
import { buildLinearIssueBody } from '@/integrations/linear/server/message'
import { buildMondayItem } from '@/integrations/monday/server/message'
import { buildAzureDevOpsWorkItemBody } from '@/integrations/azure-devops/server/message'
import { buildTrelloCard } from '@/integrations/trello/server/message'

const ROOT = 'https://feedback.example.com'
const POST_URL = `${ROOT}/b/features/posts/post_1`

function postCreated(): PostCreatedEvent {
  return {
    id: 'evt-1',
    type: 'post.created',
    timestamp: '2025-01-01T00:00:00Z',
    actor: { type: 'user', userId: 'user_1', email: 'test@test.com' },
    data: {
      post: {
        id: 'post_1',
        title: 'Feature request',
        content: '<p>Please add dark mode</p>',
        boardId: 'board_1',
        boardSlug: 'features',
        voteCount: 5,
        authorName: 'Jane Doe',
        authorEmail: 'jane@example.com',
      },
    },
  }
}

/** Every builder, flattened to the text it would send. */
const builders: ReadonlyArray<readonly [string, (e: PostCreatedEvent) => string]> = [
  ['clickup', (e) => JSON.stringify(buildClickUpTaskBody(e, ROOT))],
  ['github', (e) => JSON.stringify(buildGitHubIssueBody(e, ROOT))],
  ['asana', (e) => JSON.stringify(buildAsanaTaskBody(e, ROOT))],
  ['shortcut', (e) => JSON.stringify(buildShortcutStoryBody(e, ROOT))],
  ['jira', (e) => JSON.stringify(buildJiraIssueBody(e, ROOT))],
  ['linear', (e) => JSON.stringify(buildLinearIssueBody(e, ROOT))],
  ['monday', (e) => JSON.stringify(buildMondayItem(e, ROOT))],
  ['azure-devops', (e) => JSON.stringify(buildAzureDevOpsWorkItemBody(e, ROOT))],
  ['trello', (e) => JSON.stringify(buildTrelloCard(e, ROOT))],
]

describe('the feedback back-link every tracker integration writes', () => {
  it('is the same label everywhere, and names no vendor', () => {
    expect(FEEDBACK_BACKLINK_LABEL).toBe('View original feedback')
    expect(FEEDBACK_BACKLINK_LABEL.toLowerCase()).not.toContain('quackback')
  })

  it.each(builders)('%s emits the shared label', (_name, build) => {
    expect(build(postCreated())).toContain(FEEDBACK_BACKLINK_LABEL)
  })

  it.each(builders)('%s still links back to the post', (_name, build) => {
    expect(build(postCreated())).toContain(POST_URL)
  })

  it.each(builders)('%s names no vendor anywhere in what it sends', (_name, build) => {
    // Not just the label: the surrounding body is shipped to a third party too.
    expect(build(postCreated()).toLowerCase()).not.toContain('quackback')
  })
})
