import { SESSION_TIMEOUT_CHECK_INTERVAL } from '../consts';
import { messageById, messages, sessionById, sessions } from './registry';

function checkExpirations() {
  const now = Date.now();

  // Sessions
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    if (session.isTimedOut()) {
      session.expire();
      sessions.splice(i, 1);
      sessionById.delete(session.id);
      i--;
    } else {
      session.deleteExpiredMessages();
    }
  }

  // Messages
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.timeout < now) {
      messages.splice(i, 1);
      messageById.delete(message.id);
      i--;
    }
  }
}

export function listenExpirations() {
  const interval = setInterval(checkExpirations, SESSION_TIMEOUT_CHECK_INTERVAL);
  interval.unref();
  return () => clearInterval(interval);
}
