import z from 'zod';
import { Procedure } from '../types/Procedure';
import { IncompleteMessage, MessageReply } from '../types/Message';
import { messages, sessions } from '../registry/registry';
import { v4 } from 'uuid';
import { MESSAGE_TIMEOUT } from '../consts';

export type MessagesPushResponse = void;

export const MessagesPushRequest = z.object({
  messages: z.array(IncompleteMessage),
  replies: z.array(MessageReply),
});

export const MessagesPush: Procedure<z.infer<typeof MessagesPushRequest>, MessagesPushResponse> = {
  path: '/messages/push',
  inputSchema: MessagesPushRequest,
  async handlerForSession(input, session) {
    const newMessages = input.messages.map((incompleteMessage) => ({
      ...incompleteMessage,
      senderShortId: session.shortId,
      id: v4(),
      timeout: MESSAGE_TIMEOUT + Date.now(),
      room: session.room,
    }));

    // push new messages before adding replies
    messages.push(...newMessages);

    for (const reply of input.replies) {
      const originalMessage = messages.find((m) => m.id === reply.messageId);
      if (originalMessage) {
        originalMessage.replyContent = reply.content;
        newMessages.push(originalMessage);
      }
    }

    for (const session of sessions) {
      session.addMessages(newMessages);
    }
  },
};
