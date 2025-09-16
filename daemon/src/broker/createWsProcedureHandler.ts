import { Session } from '../registry/Session';
import { Procedure } from '../types/Procedure';
import { Socket } from 'socket.io';

type Ack<T = unknown> = (res: { ok: true; message: T } | { ok: false; message: string }) => void;

export function createWsProcedureHandler(socket: Socket, session: Session, procedure: Procedure) {
  if (!('handlerForSession' in procedure)) {
    return;
  }

  socket.on(procedure.path, (payload: unknown, ack?: Ack) => {
    if (session.isTimedOut()) {
      ack?.({ ok: false, message: 'SESSION_EXPIRED' });
      socket.disconnect(true);
      return;
    }

    const parseResult = procedure.inputSchema.safeParse(payload);
    if (!parseResult.success) {
      ack?.({ ok: false, message: 'INVALID_INPUT' });
      return;
    }

    procedure
      .handlerForSession(parseResult.data, session)
      .then((output) => {
        ack?.({ ok: true, message: output });
      })
      .catch((err) => {
        console.error('Error in procedure handler:', err);
        ack?.({ ok: false, message: 'INTERNAL_ERROR' });
      });
  });
}
