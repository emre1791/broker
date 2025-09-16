import { createServer } from 'node:http';
import { Config } from '../types/Config';
import { createHttpApp } from './createHttpApp';
import { listenExpirations } from '../registry/listenExpirations';

export function createBroker(config: Config) {
  const app = createHttpApp(config);
  const server = createServer(app);

  server.listen(config.PORT, () => {
    if (!config.NO_STARTUP_MESSAGE) {
      console.log(`Broker listening on port ${config.PORT}`);
    }
  });

  const unlistenExpirations = listenExpirations();
  const destroy = () => {
    server.close();
    unlistenExpirations();
  };

  return { app, server, unlistenExpirations, destroy };
}
