import z from 'zod';
import { Platform } from './Platform';

export type Message = z.infer<typeof IncompleteMessage> & {
  senderShortId: string;
  id: string;
  room: string | undefined;
  replyContent?: string;
  timeout: number;
};

export const IncompleteMessage = z.object({
  platforms: z.array(Platform),
  type: z.string().max(100, 'Type must be at most 100 characters'),
  content: z.string(),
});

export const MessageReply = z.object({
  messageId: z.uuid({ version: 'v4' }),
  content: z.string(),
});
