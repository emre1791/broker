import { Config } from '../types/Config';
import { Procedure } from '../types/Procedure';
import express from 'express';
import { sessionById } from '../registry/registry';
import { getHeader } from './getHeader';

export function createHttpProcedureHandler(config: Config, procedure: Procedure) {
  if ('handlerForApiToken' in procedure) {
    return (req: express.Request, res: express.Response) => {
      const apiToken = getHeader(req, 'x-api-token');
      if (!apiToken || apiToken !== config.TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const inputParseRes = procedure.inputSchema.safeParse(req.body);
      if (!inputParseRes.success) {
        res.status(400).json({ error: 'invalid input', details: inputParseRes.error });
        return;
      }

      procedure
        .handlerForApiToken(inputParseRes.data)
        .then((output) => {
          res.json(output);
        })
        .catch((err) => {
          console.error('Error in procedure handler:', err);
          res.status(500).json({ error: 'internal error' });
        });
    };
  } else if ('handlerForSession' in procedure) {
    return (req: express.Request, res: express.Response) => {
      const sessionId = getHeader(req, 'x-session-id');
      if (!sessionId) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const session = sessionById.get(sessionId);
      if (!session) {
        res.status(403).json({ error: 'invalid session' });
        return;
      }

      // continue marking the session as active
      session.addActivity();

      const inputParseRes = procedure.inputSchema.safeParse(req.body);
      if (!inputParseRes.success) {
        res.status(400).json({ error: 'invalid input', details: inputParseRes.error });
        return;
      }

      procedure
        .handlerForSession(inputParseRes.data, session)
        .then((output) => {
          res.json(output);
        })
        .catch((err) => {
          console.error('Error in procedure handler:', err);
          res.status(500).json({ error: 'internal error' });
        });
    };
  } else {
    throw new Error('invalid procedure');
  }
}
