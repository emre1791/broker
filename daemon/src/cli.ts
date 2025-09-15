#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Config } from './types/Config';
import { createBroker } from './broker/createBroker';

function getArgvConfig(): Partial<Config> {
  const argv = yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      type: 'number',
      describe: 'Port to listen on (env: PORT)',
    })
    .option('token', {
      alias: 't',
      type: 'string',
      describe: 'Auth token (env: TOKEN)',
    })
    .parseSync();

  return Config.partial().parse({
    PORT: argv.port,
    TOKEN: argv.token,
  });
}

function getEnvConfig(): Partial<Config> {
  return Config.partial().parse({
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    TOKEN: process.env.TOKEN,
  });
}

function stripUndef<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function getConfig(): Config {
  const envConfig = getEnvConfig();
  const argvConfig = getArgvConfig();
  return Config.parse({
    ...stripUndef(envConfig),
    ...stripUndef(argvConfig),
  });
}

createBroker(getConfig());
