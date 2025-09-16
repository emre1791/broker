import z from 'zod';
import { createSessionProcedure } from '../types/Procedure';
import { IncompleteMessage, Message, MessageReply } from '../types/Message';
import { messageById, messages, sessions } from '../registry/registry';
import { v4 } from 'uuid';
import { MESSAGE_REPLY_TYPE, MESSAGE_TIMEOUT } from '../consts';

export type MessagesPushResponse = void;

export const MessagesPushRequest = z.object({
  messages: z.array(IncompleteMessage),
  replies: z.array(MessageReply),
});

export const MessagesPush = createSessionProcedure(
  '/messages/push',
  MessagesPushRequest,
  async (input, session): Promise<MessagesPushResponse> => {
    const newMessages: Message[] = [];

    // add new messages
    for (const incompleteMessage of input.messages) {
      const message: Message = {
        id: v4(),
        ...incompleteMessage,
        senderShortId: session.shortId,
        timeout: MESSAGE_TIMEOUT + Date.now(),
        room: session.room,
      };
      if (!messageById.has(message.id)) {
        messages.push(message);
        messageById.set(message.id, message);
        newMessages.push(message);
      }
    }
    for (const session of sessions) {
      session.addMessages(newMessages);
    }

    // add new reply messages
    for (const reply of input.replies) {
      const originalMessage = messageById.get(reply.messageId);
      if (originalMessage === undefined) {
        continue;
      }

      const originalMessageSender = sessions.find(
        (s) => s.shortId === originalMessage.senderShortId
      );
      if (originalMessageSender === undefined) {
        continue;
      }

      const message: Message = {
        id: v4(),
        type: MESSAGE_REPLY_TYPE,
        content: reply.content,
        senderShortId: session.shortId,
        room: session.room,
        replyingMessageId: originalMessage.id,
        platforms: originalMessageSender.platforms,
        timeout: MESSAGE_TIMEOUT + Date.now(),
      };
      originalMessageSender.addMessages([message]);
    }
  }
);
