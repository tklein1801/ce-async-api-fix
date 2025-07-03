#!/usr/bin/env node

import {command, string, boolean, run} from '@drizzle-team/brocli';
import fs from 'fs';
import path from 'path';
import {createLogger} from './logger';

const logger = createLogger({label: 'cli', level: 'info'});

const version = async () => {
  const envVersion = '1.0.0';
  console.log(envVersion);
};

const convert = command({
  name: 'convert',
  options: {
    input: string().alias('in').desc('Path to the AsyncAPI specification file').required(),
    output: string().alias('out').desc('Path to the output file (including filename)').required(),
    namespace: string(),
    verbose: boolean('verbose').desc('Enable verbose output').default(false),
  },
  async handler(options) {
    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // Get file (check if file exists)
    const doesFileExists = fs.existsSync(options.input);
    if (!doesFileExists) {
      logger.error(`File not found: ` + options.input);
      return;
    }
    const fileExtension = path.extname(options.input).toLowerCase();
    logger.debug('File extension: ' + fileExtension);

    // FIXME: Support YAML and YML
    if (fileExtension !== '.json' /*&& fileExtension !== '.yaml' && fileExtension !== '.yml'*/) {
      // logger.error('Unsupported file type: ' + fileExtension + '! Only JSON and YAML (or YML) are supported.');
      logger.error('Unsupported file type: ' + fileExtension + '! Only JSON is supported.');
      return;
    }

    // Handle JSON
    switch (fileExtension) {
      case '.json':
        logger.info('Converting JSON file...');
        const json = JSON.parse(fs.readFileSync(options.input, 'utf-8'));
        logger.debug('Parsed JSON file');

        let components = json.components || {};
        const schemas = components.schemas || {};
        const schemaNames = Object.keys(schemas);

        // If options.namespace is provided then prefix the topic with the namespace
        if (options.namespace) {
          const namespace = options.namespace.endsWith('/') ? options.namespace : options.namespace + '/';
          if ('channels' in json) {
            const channels = json.channels || {};
            const channelNames = Object.keys(channels);

            for (const channelName of channelNames) {
              channels[namespace + channelName] = channels[channelName] as object;
              delete channels[channelName];
            }
          } else {
            logger.error('No channels are defined in the specification');
            return;
          }
        }

        // Move properties of message to data-node
        for (const schemaName of schemaNames) {
          const schema = schemas[schemaName] as object;
          if ('type' in schema && schema.type === 'object') {
            logger.debug('Processing object schema: ' + schemaName);
            if ('properties' in schema) {
              schema.properties = {
                data: {
                  type: 'object',
                  properties: schema.properties as object,
                },
              };
            } else {
              logger.debug('No properties found in schema: ' + schemaName);
              continue;
            }
          } else {
            logger.debug('Skipping non-object schema: ' + schemaName);
            continue;
          }

          logger.debug('Moved schema-properties to data-node');
        }

        // Wrap message-properties in CloudEvent-structure
        const CloudEventContext = components.messageTraits.CloudEventContext as object;
        if (CloudEventContext == undefined) {
          logger.error('CloudEventContext not found in messageTraits! Please provide a valid CloudEventContext.');
          return;
        } else {
          // @ts-expect-error
          const headers = CloudEventContext.headers;
          const required = [...headers.required, 'data'] as string[];
          const headerProperties = headers.properties as object;

          for (const schemaName of schemaNames) {
            const schema = schemas[schemaName] as object;
            if ('type' in schema && schema.type === 'object') {
              logger.debug('Processing object schema: ' + schemaName);
              if ('properties' in schema) {
                const properties = schema.properties as object;
                schema.properties = {
                  ...headerProperties,
                  ...properties,
                };

                Object.assign(schema, {
                  required: required,
                });
              } else {
                logger.debug('No properties found in schema: ' + schemaName);
                continue;
              }
            } else {
              logger.debug('Skipping non-object schema: ' + schemaName);
              continue;
            }
          }
        }

        logger.info('Writing modified JSON file...');
        writeOutput(JSON.stringify(json, null, 2), options.output);
        break;

      // FIXME: Support YAML and YML
      // case '.yaml':
      // case '.yml':
      //   // logger.info('Converting YAML file...');
      //   logger.error('YAML conversion is not supported yet.');
      //   return;

      default:
        logger.error('Unsupported file type: ' + fileExtension + '! Only JSON and YAML (or YML) are supported.');
        return;
    }

    logger.info('Applied the necessary modifications to the JSON schema for an import into the SAP AEM Event Portal!');
  },
});

run([convert], {
  name: 'NAME',
  description: 'DESCRIPTION',
  version: version,
});

function writeOutput(content: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }

  fs.writeFileSync(outputPath, content, {encoding: 'utf8'});
  logger.info('Output written to: ' + outputPath);
}
