export interface Logger {
  log(...args: unknown[]): void;
  verbose(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export const DefaultLogger: Logger = {
  log(...args: unknown[]) {
    console.log('BrokerClient:', ...args);
  },
  verbose(...args: unknown[]) {
    console.debug('BrokerClient:', ...args);
  },
  error(...args: unknown[]) {
    console.error('BrokerClient:', ...args);
  },
};
