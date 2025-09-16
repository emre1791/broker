import { createServer } from 'node:http';
import { Config } from '../types/Config';
import { createHttpApp } from './createHttpApp';
import { listenExpirations } from '../registry/listenExpirations';
import { createWsApp } from './createWsApp';

export function createBroker(config: Config) {
  const app = createHttpApp(config);
  const server = createServer(app);
  const io = createWsApp(server);

  server.listen(config.PORT, () => {
    if (!config.NO_STARTUP_MESSAGE) {
      console.log(`Broker listening on port ${config.PORT}`);
    }
  });

  const unlistenExpirations = listenExpirations();
  const destroy = () => {
    io.close();
    server.close();
    unlistenExpirations();
  };

  return { app, server, io, unlistenExpirations, destroy };
}
