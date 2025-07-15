import {command, string} from '@drizzle-team/brocli';
import fs from 'fs';
import path from 'path';
import {logger} from '../../cli';
import {v2} from '../../spec-types';
import {ComponentNotFoundError, ReferenceNotSupportedError} from '../../error';
import {writeOutput} from '../../utils/writeOutput.util';

/**
 * @see - The [documentation](https://wiki.tchibo-intranet.de/x/eY-xOw) defines what changes need to be made to the AsyncAPI specification in order to be used for th generation of an Event Consumption Model
 */
export const forImport = command({
  name: 'for-import',
  desc: 'Prepare an Async API 2.0.0 specification for import into an event consumption model and make the necessary adjustments',
  shortDesc: 'Prepare an Async API 2.0.0 specification for import',
  options: {
    input: string().alias('in').desc('Path to the AsyncAPI specification file').required(),
    output: string().alias('out').desc('Path to the output file (including filename)').required(),
    description: string().alias('desc').desc('Description for the Async API document').required(),
  },
  handler(options) {
    // Get file (check if file exists)
    const doesFileExists = fs.existsSync(options.input);
    if (!doesFileExists) {
      logger.error('File not found: %s', options.input, {options});
      return;
    }

    const fileExtension = path.extname(options.input).toLowerCase();
    logger.debug('File extension: %s', fileExtension);

    const fileContents = fs.readFileSync(options.input, 'utf-8');
    // FIXME: Support YAML and YML
    if (fileExtension !== '.json' /*&& fileExtension !== '.yaml' && fileExtension !== '.yml'*/) {
      // logger.error('Unsupported file type: ' + fileExtension + '! Only JSON and YAML (or YML) are supported.');
      logger.error('Unsupported file type: %s! Only JSON is supported.', fileExtension);
      return;
    }

    let asyncApiObject = JSON.parse(fileContents) as v2.AsyncAPIObject;
    if (asyncApiObject.asyncapi !== '2.0.0') {
      logger.error(
        'Unsupported AsyncAPI version: %s. This tool only supports AsyncAPI 2.0.0. You can export the schema for version 2.0.0 with the @tklein1801/ep-async-api-export CLI',
        asyncApiObject.asyncapi,
      );
      return;
    }

    /**
     * 1. Get value for `name` under `components.messages[schemaName]`
     * from `components.messages[schemaName].payload.$ref.substring(2)` (<-- this is the schema to the according message)
     * and select the actual name from `properties.type.const` (should contain the `name` for the message)
     */
    logger.info("Retrieving and setting 'name' for messages...");
    const messages = asyncApiObject.components?.messages;
    if (!messages) {
      logger.error(new ComponentNotFoundError('messages', 'components').toString());
      return;
    }
    const messageKeys = Object.keys(messages);
    for (const msgName of messageKeys) {
      const path = ['components', 'messages', msgName];
      logger.debug('Processing message: %s', msgName, {path: path.join('.')});

      try {
        const msgObj = messages[msgName];
        // Assign name
        Object.assign(msgObj, {
          name: getMessageName(asyncApiObject, msgObj, msgName),
        });

        // Update AsyncAPI object
        // T00707: No need to explicity update the messages
        // Object.assign(messages[msgName], msgObj);
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError || e instanceof ComponentNotFoundError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        }
        logger.error(e instanceof Error ? e.message : String(e), e);
        process.exit(1);
      }
    }
    logger.info("Set 'name' for messages!");

    /**
     * 2. Set `headers` for `components.messages[schemaName]`. Should look like this
     * ```json
     * "headers": {
     *   "properties": {
     *     "type": {
     *       "const": "<MESSAGE_NAME>"
     *     },
     *     "datacontenttype": {
     *       "const": "application/json"
     *     }
     *   }
     * }
     * ```
     */
    logger.info("Setting 'headers' for messages...");
    for (const msgName of messageKeys) {
      const path = ['components', 'messages', msgName];
      logger.debug('Processing message: %s', msgName, {path: path.join('.')});

      try {
        const msgObj = messages[msgName];
        if ('$ref' in msgObj) {
          throw new ReferenceNotSupportedError(path.join('.'));
        }

        // FIXME: Instead of retrieving the name twice (step before/above) we're gonna assume that this step has already run and obtain the value from the message-object
        // const name = getMessageName(asyncApiObject, msgObj, msgName),
        const name = msgObj.name as string;

        // Assign headers for message
        Object.assign(msgObj, {
          headers: {
            properties: {
              type: {
                const: name,
              },
              datacontenttype: {
                const: 'application/json',
              },
            },
          },
        });

        // Update AsyncAPI object
        // T00707: No need to explicity update the messages
        // Object.assign(messages[msgName], msgObj);
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        }
        logger.error(e instanceof Error ? e.message : String(e), e);
        process.exit(1);
      }
    }
    logger.info('Headers for messages set!');

    /**
     * 3. Add inherited traits to `components.messages[schemaName]`. Should look like this
     * ```json
     * "traits": [
     *   {
     *     "$ref": "#/components/messageTraits/CloudEventContext"
     *   }
     * ]
     * ```
     */
    logger.info("Setting 'traits' for messages...");
    for (const msgName of messageKeys) {
      const path = ['components', 'messages', msgName];
      logger.debug('Processing message: %s', msgName, {path: path.join('.')});

      try {
        const msgObj = messages[msgName];
        if ('$ref' in msgObj) {
          throw new ReferenceNotSupportedError(path.join('.'));
        }

        // Assign headers for message
        Object.assign(msgObj, {
          traits: [
            {
              $ref: '#/components/messageTraits/CloudEventContext',
            },
          ],
        });

        // Update AsyncAPI object
        // T00707: No need to explicity update the messages
        // Object.assign(messages[msgName], msgObj);
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        }
        logger.error(e instanceof Error ? e.message : String(e), e);
        process.exit(1);
      }
    }
    logger.info('Traits for messages set!');

    /**
     * 4. Add attribute `messageTraits` to `components`
     */
    logger.info("Setting 'messageTraits' for components...");
    // @ts-expect-error
    Object.assign(asyncApiObject.components, {
      messageTraits: {
        CloudEventContext: {
          headers: {
            type: 'object',
            properties: {
              specversion: {
                description:
                  'The version of the CloudEvents specification which the event uses. This enables the interpretation of the context.',
                type: 'string',
                const: '1.0',
              },
              type: {
                description:
                  'Type of occurrence which has happened. Often this property is used for routing, observability, policy enforcement, etc.',
                type: 'string',
                minLength: 1,
              },
              source: {
                description: 'This describes the event producer.',
                type: 'string',
                format: 'uri-reference',
              },
              subject: {
                description: 'The subject of the event in the context of the event producer (identified by source).',
                type: 'string',
                minLength: 1,
              },
              id: {
                description: 'ID of the event.',
                type: 'string',
                minLength: 1,
                examples: ['6925d08e-bc19-4ad7-902e-bd29721cc69b'],
              },
              time: {
                description: 'Timestamp of when the occurrence happened. Must adhere to RFC 3339.',
                type: 'string',
                format: 'date-time',
                examples: ['2018-04-05T17:31:00Z'],
              },
              datacontenttype: {
                description: 'Describe the data encoding format',
                type: 'string',
                const: 'application/json',
              },
            },
            required: ['id', 'specversion', 'source', 'type', 'data'], // <--- Added "data" to required fields
          },
        },
      },
    });
    logger.info('Message traits for components set!');

    /**
     * 5. Add an description to the `info`-object
     */
    logger.info('Setting description for the Async API document...');
    asyncApiObject = assignDescription(asyncApiObject, options.description);
    logger.info('Description for the Async API document set!');

    /**
     * 6. Remove CloudEvent context around the message payload
     */

    logger.info('Removing CloudEvent context around the message payload...');
    const schemas = asyncApiObject.components?.schemas;
    if (!schemas) {
      return logger.error(new ComponentNotFoundError('schemas', 'components').toString());
    }
    for (const schemaName of Object.keys(schemas)) {
      const path = ['components', 'schemas', schemaName];
      logger.debug('Processing schema: %s', schemaName, {path: path.join('.')});

      try {
        let schema = schemas[schemaName];
        if (typeof schema != 'object' || !schema) {
          throw new Error('Schema ' + schemaName + ' is not an object or is undefined.');
        }
        if (typeof schema == 'object' && '$ref' in schema) {
          throw new ReferenceNotSupportedError(path.join('.'));
        }

        const schemaProperties = schema.properties;
        if (!schemaProperties) {
          logger.warn("Schema doesn't contain any properties!", {
            path: path.join('.'),
            schema: schemaName,
          });
          continue;
        }

        const ceData = schemaProperties.data;
        if (typeof ceData != 'object') {
          throw new Error('Node data of the schema properties are not an object');
        }
        const ceRequiredFields = ceData.required || [];
        const ceDataProperties = ceData?.properties;

        schema.required = ceRequiredFields;
        schema.properties = ceDataProperties;
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError || e instanceof ComponentNotFoundError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        }
        logger.error(e instanceof Error ? e.message : String(e), e);
        process.exit(1);
      }
    }
    logger.info('Removed CloudEvent context around the message payload!');

    /**
     * 7. Splitting of all schemas that have a property that is not a simple type.
     * This means that all arrays (or items) and objects must be split into individual schemas.
     * For the schema definition that is then created, the corresponding references in the existing schema must be updated.
     * The splitting takes place recursively until all properties are simple types.
     */
    logger.info('Splitting up schemas with complex properties...');
    asyncApiObject = splitSchemas(asyncApiObject);
    logger.info('Split up schemas with complex properties...');

    /**
     * 8. Processing attributes recursively and applying custom modifications to schemas.
     * This includes:
     * `"type": "integer"` -> `"type": "integer"`, `"format": "int32"`
     * `"type": "number"` -> `"type": "number"`, `"format": "decimal"`
     */
    logger.info('Processing attributes recursively and adding format to types of integer and number...');
    asyncApiObject = applyCustomModificationToSchemas(asyncApiObject);
    logger.info('Processed attributes recursively and added format to types of integer and number!');

    writeOutput(JSON.stringify(asyncApiObject), options.output);
  },
});

/**
 * Splits schemas with complex properties into individual schemas.
 * @param asyncApiDocument The AsyncAPI document to process.
 * @returns The processed AsyncAPI document with split schemas.
 */
export function splitSchemas(asyncApiDocument: v2.AsyncAPIObject): v2.AsyncAPIObject {
  const schemas = asyncApiDocument.components!.schemas!;

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    schemas[schemaName] = extract(schemaDef, schemaName);
  }

  return asyncApiDocument;

  function extract(schema: v2.SchemaObject, parentSchemaKey: string): v2.SchemaObject {
    if (!schema || typeof schema != 'object') return schema;
    if ('$ref' in schema) {
      // If it's a reference, we don't need to process it
      // Because we will resolve it later (if it is located in the same document under `components.schemas`)
      return schema;
    }

    // For a schema with properties:
    if (schema.type == 'object' && schema.properties) {
      const newProps: v2.SchemaObject = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        // When value is an object
        if (value && typeof value == 'object') {
          if (value.type == 'object' && value.properties) {
            // 1. Object
            const newSchemaName = `${parentSchemaKey}_${key}_${getTimestamp()}`;
            schemas[newSchemaName] = extract(value, newSchemaName);
            newProps[key] = refFor(newSchemaName);
          } else if (
            value.type == 'array' &&
            value.items &&
            // FIXME: Remove cast
            (value.items as v2.AsyncAPISchemaDefinition).type == 'object'
          ) {
            // 2. Array of objects
            const newSchemaName = `${parentSchemaKey}_${key}_${getTimestamp()}`;
            schemas[newSchemaName] = extract(value.items, newSchemaName);
            newProps[key] = {type: 'array', items: refFor(newSchemaName)};
          } else {
            // 3. Nested constructs in arrays TODO: (allOf, anyOf, etc. could be added if needed)
            newProps[key] = extract(value, `${parentSchemaKey}_${key}_${getTimestamp()}`);
          }
        } else {
          newProps[key] = value;
        }
      }

      // Return the new schema with updated properties
      return {...schema, properties: newProps};
    }

    // Process arrays
    // Only process the items if they are objects
    // FIXME: Remove cast
    const schemaItems = schema.items as v2.AsyncAPISchemaDefinition | undefined;
    if (schema.type == 'array' && schemaItems && schemaItems.type == 'object') {
      if (schemaItems.type === 'object' && schemaItems.properties) {
        // Already handled in above
        return schema;
      } else {
        // TODO:
        // For possible further nesting
        return {...schema, items: extract(schemaItems, parentSchemaKey + '_Item')};
      }
    }

    return schema;
  }
}

export type ReferencePath = `#/components/schemas/${string}`;

/**
 * Creates a JSON reference for a schema.
 * This function is used to create a reference to a schema in the AsyncAPI document.
 * @param name - The name of the schema to reference.
 * @returns A JSON reference object for the schema.
 */
export function refFor(name: string): {$ref: ReferencePath} {
  return {$ref: `#/components/schemas/${name}`};
}

function getMessageName(
  asnycApiSpec: v2.AsyncAPIObject,
  message: NonNullable<v2.ComponentsObject['messages']>[string],
  messageName: string,
): string {
  const path = ['components', 'messages', messageName];
  // FIXME: Implement support for references in messages
  if ('$ref' in message) {
    throw new ReferenceNotSupportedError(path.join('.'));
  }

  // We're gonna assume that the payload will look something like this:
  // {"$ref": "#/components/schemas/Osapiens_AssessmentCreated"}
  const msgPayload = message.payload.$ref as string | undefined;
  if (!msgPayload) {
    throw new Error('Message ' + messageName + ' has no reference to an payload defined. ');
  }

  const schemaName = msgPayload.split('/')[3];
  if (!asnycApiSpec.components?.schemas) {
    // If there are no schemas defined, we cannot process any messages
    throw new ComponentNotFoundError('schemas', 'components');
  }

  const schema = asnycApiSpec.components.schemas[schemaName];
  if (!schema) {
    throw new Error('Schema ' + schemaName + ' not found in components.schemas.');
  }
  if (typeof schema == 'object' && '$ref' in schema) {
    throw new ReferenceNotSupportedError(['components', 'schemas', schemaName].join('.'));
  }

  if (
    typeof schema != 'object' ||
    !schema.properties ||
    typeof schema.properties !== 'object' ||
    !schema.properties.type ||
    typeof schema.properties.type !== 'object' ||
    !schema.properties.type.const
  ) {
    throw new Error('Schema ' + schemaName + ' has no type defined.');
  }

  return schema.properties.type.const as string;
}

/**
 *
 * @returns A timestamp in the format YYYYMMDDHHMMSS
 */
function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace(/T/, '');
}

/**
 * Assigns a description to the AsyncAPI document.
 *
 * @param asyncApiObject - The AsyncAPI object to modify.
 * @param description - The description to assign.
 * @returns The modified AsyncAPI object with the description assigned.
 */
export function assignDescription(asyncApiObject: v2.AsyncAPIObject, description: string): v2.AsyncAPIObject {
  if (!asyncApiObject.info) {
    throw new Error('AsyncAPI object does not contain an info object. Cannot assign description.');
  }
  asyncApiObject.info.description = description;
  return asyncApiObject;
}

/**
 * Applies custom modifications to schemas in the AsyncAPI document.
 * @param asyncApiDocument - The AsyncAPI document to process.
 * Applies custom modifications to schemas in the AsyncAPI document.
 * @returns The modified AsyncAPI document with custom modifications applied.
 */
function applyCustomModificationToSchemas(asyncApiDocument: v2.AsyncAPIObject): v2.AsyncAPIObject {
  const schemas = asyncApiDocument.components!.schemas!;

  for (const [schemaName, schemaDef] of Object.entries(schemas)) {
    schemas[schemaName] = applyCustomModificationToSchema(schemaDef);
  }

  return asyncApiDocument;
}

/**
 * Applies custom modifications to a schema.
 * @param schema - The schema to apply custom modifications to.
 * Applies custom modifications to a schema, such as setting formats for integer and number types.
 * @returns The modified schema with custom modifications applied.
 */
function applyCustomModificationToSchema(schema: v2.SchemaObject): v2.SchemaObject {
  if (!schema || typeof schema != 'object') return schema;
  if ('$ref' in schema) {
    // If it's a reference, we don't need to process it
    // Because we will resolve it later (if it is located in the same document under `components.schemas`)
    return schema;
  }

  switch (schema.type) {
    case 'object':
      if (schema.properties) {
        Object.values(schema.properties).forEach(prop => applyCustomModificationToSchema(prop));
      }
      break;

    case 'array':
      if (schema.items) {
        applyCustomModificationToSchema(schema.items);
      }
      break;

    case 'integer':
      schema.format = 'int32';
      break;

    case 'number':
      schema.format = 'decimal';
      break;
  }

  ['allOf', 'oneOf', 'anyOf'].forEach(key => {
    if (Array.isArray(schema[key])) {
      schema[key].forEach((sub: any) => applyCustomModificationToSchema(sub));
    }
  });

  return schema;
}
