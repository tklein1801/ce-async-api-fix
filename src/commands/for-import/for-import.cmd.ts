import {command, string} from '@drizzle-team/brocli';
import fs from 'fs';
import path from 'path';
import {logger} from '../../cli';
import {v2} from '../../spec-types';
import {ComponentNotFoundError, ReferenceNotSupportedError} from '../../error';
import {writeOutput} from '../../utils/writeOutput.util';
import {
  addMessageTraitRefToMessage,
  addMessageTraits,
  assignDescription,
  getMessageName,
  getTimestamp,
  setMessageHeaders,
} from './functions';

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
        Object.assign(msgObj, {
          name: getMessageName(asyncApiObject, msgObj, msgName),
        });
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError || e instanceof ComponentNotFoundError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        } else logger.error(e instanceof Error ? e.message : String(e), e);
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
    asyncApiObject = setMessageHeaders(asyncApiObject);
    logger.info("'headers' for messages set!");

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
    for (const msgKey of messageKeys) {
      const path = ['components', 'messages', msgKey];
      logger.debug('Processing message: %s', msgKey, {path: path.join('.')});

      try {
        asyncApiObject.components!.messages![msgKey] = addMessageTraitRefToMessage(
          asyncApiObject.components!.messages![msgKey],
        );
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        } else logger.error(e instanceof Error ? e.message : String(e), e);
      }
    }
    logger.info("'traits' for messages set!");

    /**
     * 4. Add attribute `messageTraits` to `components`
     */
    logger.info("Setting 'messageTraits' for components...");
    try {
      asyncApiObject = addMessageTraits(asyncApiObject);
    } catch (e) {
      logger.error(e instanceof Error ? e.message : String(e), e);
      return;
    }
    logger.info("'messageTraits' for components set!");

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
        } else logger.error(e instanceof Error ? e.message : String(e), e);
      }
    }
    logger.info('Removed CloudEvent context around the message payload!');

    /**
     * 7. Extract all objects with `type: "object"` properties and add them to the `components.schemas` object.
     *.   This will split up the previous main schema into multiple schemas. Then a `$ref` will to the according schema attribute.
     */
    // FIXME: Change log message
    logger.info('Extracting all objects with "type: object" properties and adding them to components.schemas...');
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
          logger.warn("Schema doesn't contain any properties!", {path: path.join('.'), schema: schemaName});
          continue;
        }

        // Prüfen ob das Schema ein Attribut hat, welches kein simpler Typ ist.
        // Sollte das Attribut ein Array hat, dessen Inhalt aber ein Objekt ist, dann wird das Attribut in ein neues Schema extrahiert.
        // FIXME: Implement recursive extraction of objects
        // console.dir(schemaProperties, {depth: null});
        for (const [propertyName, property] of Object.entries(schemaProperties)) {
          const propertyPath = [...path, 'properties', propertyName].join('.');
          let logMeta = {
            path: path.join('.'),
            schema: schemaName,
            property: propertyName,
          };
          logger.debug('Processing property: %s', propertyPath, logMeta);
          if (typeof property != 'object' || !property) {
            logger.warn('Property %s is not an object or is undefined. Skipping...', propertyPath, logMeta);
            continue;
          }
          const propertyType = property.type;
          // console.log(propertyName, property);
          if (!propertyType) {
            logger.warn('Property %s has no type defined. Skipping...', propertyPath, logMeta);
            continue;
          }

          if (propertyType === 'array') {
            logger.info('Property %s is an array. Checking if items are objects...', propertyPath, logMeta);
            // console.log(property);
            let items = property.items;
            if (typeof items !== 'object' || !items) {
              logger.warn('Property %s is an array, but items are not an object. Skipping...', propertyPath, logMeta);
              continue;
            }

            if ('$ref' in items) {
              throw new ReferenceNotSupportedError(
                ['components', 'schemas', schemaName, 'properties', propertyName, 'items'].join('.'),
              );
            }

            // Create new schema for the `items` property and add it to the `components.schemas` object
            // Then replace the `items` property with a `$ref` to the new schema
            const newItemsSchemaName = `${schemaName}_${propertyName}_Items_${getTimestamp()}`;
            const reference = `#/components/schemas/${newItemsSchemaName}`;
            // Assign the new schema with the items-object to the components.schemas object
            Object.assign(schemas, {[newItemsSchemaName]: items});

            // Replace the current items-object with the reference to the previously created schema
            (schema.properties![propertyName] as v2.AsyncAPISchemaDefinition).items = {$ref: reference};
            // console.log(newItemsSchemaName, items);
          } else logger.debug('Property %s is not an array. Skipping...', propertyPath, logMeta);
        }
      } catch (e) {
        if (e instanceof ReferenceNotSupportedError) {
          logger.warn(e.message + ' Skipping...');
          continue;
        } else logger.error(e instanceof Error ? e.message : String(e), e);
      }
    }

    logger.info("Split up schemas with 'type: object' properties...");

    writeOutput(JSON.stringify(asyncApiObject), options.output);
  },
});
