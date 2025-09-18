export interface Logger {
  log(...args: unknown[]): void;
  verbose(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export const DefaultLogger: Logger = {
  log(...args: unknown[]) {
    print('BrokerClient:', ...args);
  },
  verbose(...args: unknown[]) {
    print('[VERBOSE]', 'BrokerClient:', ...args);
  },
  error(...args: unknown[]) {
    warn('BrokerClient:', ...args);
  },
};
