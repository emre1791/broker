import bodyParser from 'body-parser';
import { Config } from '../types/Config';
import express from 'express';
import { procedures } from '../procedures';
import { createHttpProcedureHandler } from './createHttpProcedureHandler';

export function createHttpApp(config: Config) {
  const app = express();

  app.use(bodyParser.json({ limit: '5mb' }));

  for (const procedure of procedures) {
    const handler = createHttpProcedureHandler(config, procedure);
    app.post(procedure.path, handler);
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}
