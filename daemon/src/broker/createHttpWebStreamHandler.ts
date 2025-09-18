import express from 'express';
import { getHeader } from './getHeader';
import { sessionById } from '../registry/registry';
import { Message } from '../types/Message';

export function createHttpWebStreamHandler(req: express.Request, res: express.Response) {
  const sessionId = getHeader(req, 'x-session-id');
  if (!sessionId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const session = sessionById.get(sessionId);
  if (!session || session.isTimedOut()) {
    res.status(403).json({ error: 'invalid session' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  (res as any).flushHeaders?.();

  res.socket?.setKeepAlive?.(true);
  res.socket?.setNoDelay?.(true);

  res.write('retry: 2000\n\n');
  res.write(`: hello\n\n`);

  const heartbeatInterval = setInterval(() => res.write(`:hb ${Date.now()}\n\n`), 2000);

  const onMessages = (messages: Message[]) => {
    for (const message of messages) {
      console.log('Sending message via WebStream:', message);
      const base64 = Buffer.from(JSON.stringify(message)).toString('base64');
      res.write(`data: ${base64}\n\n`);
    }
  };

  session.bindToMessages(onMessages);
  session.setStreamResponse(res);

  const cleanup = () => {
    clearInterval(heartbeatInterval);
    session.unbindFromMessages(onMessages);
    res.end();
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('error', cleanup);
}
