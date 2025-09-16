import { Server } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { sessionById } from '../registry/registry';
import { Session } from '../registry/Session';
import { procedures } from '../procedures';
import { createWsProcedureHandler } from './createWsProcedureHandler';

export function createWsApp(server: Server) {
  const io = new SocketIoServer(server, {
    transports: ['websocket'],
  });

  io.use(async (socket, next) => {
    try {
      const sessionId = socket.handshake.auth.sessionId;
      if (typeof sessionId !== 'string') {
        return next(new Error('NO_SESSION_ID'));
      }

      const session = sessionById.get(sessionId);
      if (!session) {
        return next(new Error('BAD_SESSION'));
      }
      if (session.isTimedOut()) {
        return next(new Error('SESSION_EXPIRED'));
      }

      socket.data.session = session;
      session.setSocket(socket);

      return next();
    } catch (e) {
      return next(e as Error);
    }
  });

  io.on('connection', (socket) => {
    const session = socket.data.session;
    if (!session || !(session instanceof Session)) {
      socket.disconnect(true);
      return;
    }

    for (const procedure of procedures) {
      createWsProcedureHandler(socket, session, procedure);
    }
  });

  return io;
}
