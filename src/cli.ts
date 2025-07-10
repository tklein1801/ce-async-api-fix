#!/usr/bin/env node

import {boolean, run} from '@drizzle-team/brocli';
import {createLogger, type LogLevel} from './logger';
import {version as cliVersion, name as cliName, description as cliDescription} from '../package.json';
import {convert, forImport} from './commands';

const DEFAULT_LOG_LEVEL: LogLevel = 'error';
export const logger = createLogger({label: 'cli', level: DEFAULT_LOG_LEVEL});

run([convert, forImport], {
  name: cliName,
  description: cliDescription,
  version: () => {
    const envVersion = cliVersion;
    console.log(envVersion);
  },
  globals: {
    verbose: boolean('verbose').desc('Enable verbose output').default(false),
    silent: boolean().desc('Enable silent mode. This will overrule verbose').default(false),
  },
  hook(event, _command, options) {
    switch (event) {
      case 'before':
        if (options.verbose || options.silent) {
          logger.setLogLevel(options.verbose ? 'debug' : 'silent');
        }
        break;

      case 'after':
        logger.setLogLevel(DEFAULT_LOG_LEVEL); // Set log level to default log level after command execution
        break;
    }
  },
});
