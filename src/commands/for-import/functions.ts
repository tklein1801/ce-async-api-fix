import path from 'path';
import {ComponentNotFoundError, ReferenceNotSupportedError} from '../../error';
import {v2} from '../../spec-types';
import {logger} from '../../cli';

export function getMessageName(
  asyncApiSpec: v2.AsyncAPIObject,
  message: NonNullable<v2.ComponentsObject['messages']>[string],
  messageKey: string,
): string {
  const path = ['components', 'messages', messageKey];
  // FIXME: Implement support for references in messages
  if ('$ref' in message) {
    throw new ReferenceNotSupportedError(path.join('.'));
  }

  // We're gonna assume that the payload will look something like this:
  // {"$ref": "#/components/schemas/Osapiens_AssessmentCreated"}
  const msgPayload = message.payload.$ref as string | undefined;
  if (!msgPayload) {
    throw new Error('Message ' + messageKey + ' has no reference to a payload defined.');
  }

  const schemaName = msgPayload.split('/')[3];
  if (!asyncApiSpec.components?.schemas) {
    // If there are no schemas defined, we cannot process any messages
    throw new ComponentNotFoundError('schemas', 'components');
  }

  const schema = asyncApiSpec.components.schemas[schemaName];
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
export function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace(/T/, '');
}

export function addMessageTraitRefToMessage(message: v2.ReferenceObject | v2.MessageObject): v2.MessageObject {
  if ('$ref' in message) {
    // TODO: Implement reference resolution
    throw new ReferenceNotSupportedError(path.join('.'));
  }

  Object.assign(message, {
    traits: [
      {
        $ref: '#/components/messageTraits/CloudEventContext',
      },
    ],
  });

  return message;
}

/**
 * Sets the headers for each message in the AsyncAPI document.
 * @param asyncApiObject - The AsyncAPI object to modify.
 * @throws {ComponentNotFoundError} If the components or messages are not found in the
 * @returns The modified AsyncAPI object with message headers set.
 */
export function setMessageHeaders(asyncApiObject: v2.AsyncAPIObject): v2.AsyncAPIObject {
  if (!asyncApiObject.components) {
    throw new ComponentNotFoundError('components', 'AsyncApiDocument');
  }

  if (!asyncApiObject.components.messages) {
    throw new ComponentNotFoundError('messages', 'components');
  }

  for (const msgName of Object.keys(asyncApiObject.components.messages)) {
    try {
      const path = ['components', 'messages', msgName];
      logger.debug('Processing message: %s', msgName, {path: path.join('.')});

      if ('$ref' in asyncApiObject.components.messages[msgName]) {
        // FIXME: Handle ReferenceObjects
        throw new ReferenceNotSupportedError(path.join('.'));
      }

      const name = getMessageName(asyncApiObject, asyncApiObject.components.messages[msgName], msgName);
      asyncApiObject.components.messages[msgName].headers = {
        properties: {
          type: {
            const: name,
          },
          datacontenttype: {
            const: 'application/json',
          },
        },
      };
    } catch (e) {
      if (e instanceof ReferenceNotSupportedError || e instanceof ComponentNotFoundError) {
        logger.warn(e.message + ' Skipping...');
        continue;
      } else logger.error(e instanceof Error ? e.message : String(e), e);
    }
  }

  return asyncApiObject;
}

/**
 * Adds `CloudEventContext` message traits to the AsyncAPI document.
 * @param asyncApiObject - The AsyncAPI object to modify.
 * @throws {ComponentNotFoundError} - When component is not defined in the AsyncAPI document.
 * @returns The modified AsyncAPI object with message traits added.
 */
export function addMessageTraits(asyncApiObject: v2.AsyncAPIObject): v2.AsyncAPIObject {
  if (!asyncApiObject.components) {
    throw new ComponentNotFoundError('components', 'AsyncApiDocument');
  }

  if (!asyncApiObject.components.messageTraits) {
    asyncApiObject.components.messageTraits = {};
  }

  const CloudEventContext: v2.MessageTraitObject = {
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
  };

  asyncApiObject.components.messageTraits['CloudEventContext'] = CloudEventContext;

  return asyncApiObject;
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
