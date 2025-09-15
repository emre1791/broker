import z from 'zod';
import { Message } from '../types/Message';
import { Procedure } from '../types/Procedure';
import { POLL_KEEPALIVE_TIMEOUT } from '../consts';

export interface MessagesPollResponse {
  messages: Message[];
}

export const MessagesPollRequest = z.object({
  ackMessageIds: z.array(z.uuid({ version: 'v4' })).optional(),
  longPolling: z.boolean().optional(),
});

export const MessagesPoll: Procedure<z.infer<typeof MessagesPollRequest>, MessagesPollResponse> = {
  path: '/messages/poll',
  inputSchema: MessagesPollRequest,
  async handlerForSession(input, session) {
    if (input.ackMessageIds) {
      session.ackMessages(input.ackMessageIds);
    }
    if (input.longPolling) {
      const messages = await session.promiseMessages(POLL_KEEPALIVE_TIMEOUT);
      return { messages };
    } else {
      const messages = session.getMessages();
      return { messages };
    }
  },
};
