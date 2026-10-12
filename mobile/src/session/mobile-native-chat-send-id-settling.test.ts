// A structured send settles by the id the host records it under, never by matching text: once a
// not-sent row is drawn, rows with the same text no longer prove anything about a new send.

import { describe, expect, it } from 'vitest'
import { agentJournalSubmissionKey } from '../../../src/shared/agent-session-journal-item-key'
import type { AgentJournalSubmission } from '../../../src/shared/agent-session-journal-types'
import type { NativeChatMessage } from '../../../src/shared/native-chat-types'
import {
  findLandedImagePreviewEchoes,
  findLandedUnconfirmedSends,
  findQueuedUnconfirmedSends,
  type UnconfirmedSend
} from './mobile-native-chat-draft-reconcile'
import {
  mobileRecordedSendIds,
  type MobileNativeChatPendingMessage
} from './mobile-native-chat-pending-echo'
import {
  retireLandedMobileNativeChatPending,
  selectGluedPendingIds
} from './mobile-native-chat-pending-retirement'

const NONE: ReadonlySet<string> = new Set()

function row(clientMessageId: string, text: string, unsent = false): NativeChatMessage {
  return {
    id: agentJournalSubmissionKey(clientMessageId),
    role: 'user',
    blocks: [{ type: 'text', text }],
    timestamp: 1,
    source: 'transcript',
    ...(unsent ? { unsent: true as const } : {})
  }
}

function echo(
  id: string,
  text: string,
  clientMessageId: string,
  images?: string[]
): MobileNativeChatPendingMessage {
  return {
    id,
    text,
    expectedOccurrence: 1,
    baselineTailMessageId: null,
    baselineResolved: true,
    clientMessageId,
    ...(images ? { images } : {})
  }
}

function recorded(clientMessageId: string, patch: Partial<AgentJournalSubmission> = {}) {
  return {
    clientMessageId,
    fence: 1,
    payloadFingerprint: 'hello',
    dispatchState: 'accepted',
    providerItemId: null,
    reason: null,
    submittedAt: 1,
    resolvedAt: 2,
    ...patch
  } satisfies AgentJournalSubmission
}

describe('a structured send settling by its own id', () => {
  // Resending "hello" after a not-sent "hello": the host hides the old copy, so text counts never
  // reach two, and a text match left the new bubble there for good.
  it('retires on its own record and never on a row that only shares its text', () => {
    const notSent = row('first', 'hello', true)
    const pending = [echo('p1', 'hello', 'second')]
    expect(retireLandedMobileNativeChatPending([notSent], pending, NONE, NONE)).toEqual(pending)
    expect(
      retireLandedMobileNativeChatPending(
        [notSent],
        pending,
        NONE,
        mobileRecordedSendIds([recorded('first'), recorded('second')])
      )
    ).toEqual([])
  })

  it('is never glued onto a neighbouring send', () => {
    const pending = [echo('p1', 'run the tests', 'a'), echo('p2', 'again', 'b')]
    expect(selectGluedPendingIds([row('x', 'run the tests again')], pending)).toEqual(new Set())
  })

  it('keeps its photo on its own row, not sent, whatever the row says', () => {
    const photo = echo('p1', 'look', 'sent', ['file:///local.png'])
    const messages = [row('older', 'look'), row('sent', 'look', true)]
    const ids = mobileRecordedSendIds([recorded('sent')])
    // Recorded, but the row is drawn: the photo waits to bind to it.
    expect(retireLandedMobileNativeChatPending(messages, [photo], NONE, ids)).toEqual([photo])
    expect(findLandedImagePreviewEchoes(messages, [photo])).toEqual([
      { pendingId: 'p1', messageId: agentJournalSubmissionKey('sent'), images: photo.images }
    ])
    expect(retireLandedMobileNativeChatPending(messages, [photo], new Set(['p1']), ids)).toEqual([])
  })

  describe('a send whose acknowledgement was lost', () => {
    const held = (clientMessageId: string): UnconfirmedSend => ({
      draftKey: 'draft',
      pendingKey: 'pending',
      text: 'hello',
      normalizedText: 'hello',
      baselineTailMessageId: null,
      clientMessageId,
      deadline: null
    })

    it('settles once the host records it, directly or as a draft it handed off', () => {
      const entries = [held('direct'), held('drained')]
      const ids = mobileRecordedSendIds([
        recorded('direct'),
        recorded('fresh', { queuedMessageId: 'drained' })
      ])
      expect(findLandedUnconfirmedSends([row('other', 'hello')], entries, NONE)).toEqual([])
      expect(findLandedUnconfirmedSends([], entries, ids)).toEqual(entries)
    })

    it('settles on a card under its own id, never a card that only shares its text', () => {
      const entry = held('mine')
      expect(findQueuedUnconfirmedSends([{ messageId: 'other', text: 'hello' }], [entry])).toEqual(
        []
      )
      expect(findQueuedUnconfirmedSends([{ messageId: 'mine', text: 'hello' }], [entry])).toEqual([
        entry
      ])
    })
  })
})
