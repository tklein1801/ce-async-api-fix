#!/usr/bin/env node

import {boolean, run} from '@drizzle-team/brocli';
import {createLogger} from './logger';
import {version as cliVersion, name as cliName, description as cliDescription} from '../package.json';
import {convert} from './commands';

export const logger = createLogger({label: 'cli', level: 'info'});

const version = async () => {
  const envVersion = cliVersion;
  console.log(envVersion);
};

run([convert], {
  name: cliName,
  description: cliDescription,
  version: version,
  globals: {
    verbose: boolean('verbose').desc('Enable verbose output').default(false),
  },
  hook(event, _command, options) {
    switch (event) {
      case 'before':
        if (options.verbose) {
          logger.setLogLevel('debug'); // Set log level to debug if verbose is enabled
        }
        break;

      case 'after':
        logger.setLogLevel('info'); // Set log level to default log level after command execution
        break;
    }
  },
});
