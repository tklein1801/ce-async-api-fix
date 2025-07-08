import {command, string, TypeOf} from '@drizzle-team/brocli';
import {logger} from '../cli';
import fs from 'fs';
import path from 'path';
import {v2, v3} from '../spec-types';
import {writeOutput} from '../utils';
import {ComponentNotFoundError} from '../error';

const convertOptions = {
  input: string().alias('in').desc('Path to the AsyncAPI specification file').required(),
  output: string().alias('out').desc('Path to the output file (including filename)').required(),
  ignoreSchema: string().alias('is').desc('Regular expression to skip modifying matching schemas'),
  namespace: string(),
};

export async function convertCmdHandler(options: TypeOf<typeof convertOptions>) {
  // Get file (check if file exists)
  const doesFileExists = fs.existsSync(options.input);
  if (!doesFileExists) {
    logger.error(`File not found: ` + options.input);
    return;
  }
  const fileExtension = path.extname(options.input).toLowerCase();
  logger.debug('File extension: ' + fileExtension);

  const file = fs.readFileSync(options.input, 'utf-8');
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
      const json = JSON.parse(file) as v2.AsyncAPIObject | v3.AsyncAPIObject;
      logger.debug('Parsed JSON file');

      let components = json.components;
      if (!components) throw new ComponentNotFoundError('components');

      const schemas = components.schemas;
      if (!schemas) throw new ComponentNotFoundError('schemas');
      const schemaNames = Object.keys(schemas);

      // If options.namespace is provided then prefix the topic with the namespace
      if (options.namespace) {
        const namespace = options.namespace.endsWith('/') ? options.namespace : options.namespace + '/';
        json.channels = prefixTopicnamespace(namespace, json.channels);
      }

      const messageTraits = components.messageTraits;
      if (!messageTraits) {
        throw new ComponentNotFoundError('messageTraits', 'components');
      }
      const CloudEventContext = messageTraits.CloudEventContext as v2.MessageTraitObject | v3.MessageTraitObject;
      if (!CloudEventContext) {
        throw new ComponentNotFoundError('CloudEventContext', 'messageTraits');
      }

      const CECHeaders = CloudEventContext.headers as v2.AsyncAPISchemaDefinition | v3.AsyncAPISchemaDefinition; // | v3.MessageTraitObject['headers']; // | v2.MessageTraitObject['headers']
      const CECHeadersRequriedAttrs = ['data', ...(CECHeaders.required || [])];
      const CECHeadersProperties = CECHeaders.properties;

      // Modify schemas
      logger.info('Processing schemas...');
      for (const schemaName of schemaNames) {
        if (options.ignoreSchema && new RegExp(options.ignoreSchema).test(schemaName)) {
          logger.debug('Skipping schema: ' + schemaName, options);
          continue;
        }

        logger.debug('Processing schema for: ' + schemaName);
        let updatedSchema = schemas[schemaName];

        // Wrap properties below data-node
        updatedSchema = wrapInDataNode(updatedSchema);

        if (updatedSchema)
          Object.assign(updatedSchema, {
            properties: {
              // FIXME:
              // @ts-expect-error
              ...updatedSchema.properties,
              // Add CloudEventContext headers to the schema properties
              // These will contain the attributes for an CloudEvent
              ...CECHeadersProperties,
            },
            required: CECHeadersRequriedAttrs,
          });

        components.schemas![schemaName] = updatedSchema;
      }
      logger.info('Modifying of schemas completed!');

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
}

export const convert = command({
  name: 'convert',
  options: convertOptions,
  handler: convertCmdHandler,
});

function wrapInDataNode(schema: v2.SchemaObject | v3.SchemaObject): v2.SchemaObject | v3.SchemaObject {
  const schemaValue = schema.valueOf();
  // Check if schema is the type of an object and contains properties
  if (
    typeof schemaValue !== 'boolean' &&
    'type' in schemaValue &&
    schemaValue.type === 'object' &&
    'properties' in schemaValue
  ) {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: schemaValue.properties,
        },
      },
    } as v2.SchemaObject | v3.SchemaObject;
  }

  logger.warn(
    "Couldn't wrap properties in data-node because schema is not an object or does not contain properties",
    schema,
  );
  return schema;
}

/**
 * Prefixes the topic namespace for all channels.
 * @param namespacePrefix The namespace prefix to add.
 * @param channels The channels to modify.
 * @returns The modified channels with prefixed topic namespaces.
 */
function prefixTopicnamespace(
  namespacePrefix: string,
  channels: v2.ChannelsObject | v3.ChannelsObject | undefined,
): v2.ChannelsObject | v3.ChannelsObject {
  if (!channels) {
    throw new ComponentNotFoundError('channels', 'channel');
  }

  return Object.keys(channels).reduce(
    (mapped, channelName) => {
      mapped[namespacePrefix + channelName] = channels[channelName];
      return mapped;
    },
    {} as v2.ChannelsObject | v3.ChannelsObject,
  );
}
