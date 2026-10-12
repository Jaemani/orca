import { useCallback } from 'react'
import type { StructuredAgentId } from '../../../src/shared/agent-session-provider-handle'
import { isStructuredAgentSessionComposerCommand } from '../../../src/shared/structured-agent-session-composer'
import { structuredSessionOperationId } from './structured-session-operation-id'
import type { MobileNativeChatSendOutcome } from './mobile-native-chat-send'
import type { MobileNativeChatSendOrigin } from './use-mobile-native-chat-drafts'

type StructuredNativeChatAttachment = {
  id?: string
  path: string
  previewUri: string
}

export function useMobileStructuredNativeChatSendBridge(args: {
  agent: StructuredAgentId | undefined
  sendStructured: (
    text: string,
    images?: string[],
    deadline?: number,
    attachments?: readonly StructuredNativeChatAttachment[],
    clientMessageId?: string
  ) => Promise<MobileNativeChatSendOutcome>
  captureSendOrigin: (text: string) => MobileNativeChatSendOrigin | null
  clearDraftForSend: (origin: MobileNativeChatSendOrigin, text: string) => void
  acceptSend: (
    origin: MobileNativeChatSendOrigin,
    text: string,
    images?: string[],
    clientMessageId?: string
  ) => void
  holdUnconfirmedSend: (
    origin: MobileNativeChatSendOrigin,
    text: string,
    onUnconfirmed: () => void,
    clientMessageId?: string
  ) => void
  restoreRejectedDraft: (origin: MobileNativeChatSendOrigin, text: string) => void
  onSendError: (message: string) => void
}): {
  send: (text: string, images?: string[]) => Promise<boolean>
  sendWithOutcome: (
    text: string,
    images?: string[],
    deadline?: number,
    attachments?: readonly StructuredNativeChatAttachment[]
  ) => Promise<MobileNativeChatSendOutcome>
} {
  const {
    acceptSend,
    agent,
    captureSendOrigin,
    clearDraftForSend,
    holdUnconfirmedSend,
    onSendError,
    restoreRejectedDraft,
    sendStructured
  } = args
  const sendWithOutcome = useCallback(
    async (
      text: string,
      images?: string[],
      deadline?: number,
      attachments?: readonly StructuredNativeChatAttachment[]
    ): Promise<MobileNativeChatSendOutcome> => {
      const origin = captureSendOrigin(text.trimEnd())
      if (!origin) {
        onSendError('Message not sent (disconnected)')
        return 'rejected'
      }
      const isHostCommand = isStructuredAgentSessionComposerCommand(text, agent)
      clearDraftForSend(origin, text)
      // The host records the send under this id, so its bubble and hold settle by it, not by text.
      const clientMessageId = structuredSessionOperationId()
      const outcome = await sendStructured(text, images, deadline, attachments, clientMessageId)
      if (outcome === 'accepted') {
        if (!isHostCommand) {
          acceptSend(origin, text.trimEnd(), images, clientMessageId)
        }
        return 'accepted'
      }
      if (outcome === 'queued') {
        // The host holds the draft and publishes it as a card above the
        // composer — never an optimistic transcript bubble.
        return 'queued'
      }
      if (outcome === 'unknown') {
        if (isHostCommand) {
          restoreRejectedDraft(origin, text)
          return 'unknown'
        }
        holdUnconfirmedSend(
          origin,
          text.trimEnd(),
          () => onSendError('Delivery unconfirmed — check chat before retrying'),
          clientMessageId
        )
        return 'unknown'
      }
      restoreRejectedDraft(origin, text)
      return 'rejected'
    },
    [
      acceptSend,
      agent,
      captureSendOrigin,
      clearDraftForSend,
      holdUnconfirmedSend,
      onSendError,
      restoreRejectedDraft,
      sendStructured
    ]
  )
  const send = useCallback(
    async (
      text: string,
      images?: string[],
      deadline?: number,
      attachments?: readonly StructuredNativeChatAttachment[]
    ) => (await sendWithOutcome(text, images, deadline, attachments)) !== 'rejected',
    [sendWithOutcome]
  )
  return { send, sendWithOutcome }
}
