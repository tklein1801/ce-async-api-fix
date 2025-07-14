import {describe, test, suite, expect} from 'vitest';
import {
  addMessageTraitRefToMessage,
  addMessageTraits,
  assignDescription,
  getMessageName,
  setMessageHeaders,
} from './functions';
import {v2} from '../../spec-types';
import {ComponentNotFoundError, ReferenceNotSupportedError} from '../../error';

suite('for-import', () => {
  describe('getMessageName', () => {
    test('it returns the correct message name (happy path)', () => {
      const asyncApiSpec = {
        components: {
          schemas: {
            Osapiens_AssessmentCreated: {
              properties: {
                type: {const: 'AssessmentCreated'},
              },
            },
          },
        },
      };
      const message = {
        payload: {
          $ref: '#/components/schemas/Osapiens_AssessmentCreated',
        },
      };
      const result = getMessageName(asyncApiSpec as any, message as any, 'AssessmentCreatedMessage');
      expect(result).toBe('AssessmentCreated');
    });

    test('it throws ReferenceNotSupportedError if $ref is present in message', () => {
      const asyncApiSpec = {};
      const message = {
        $ref: '#/components/messages/SomeMessage',
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'SomeMessage')).toThrow(
        ReferenceNotSupportedError,
      );
    });

    test('it throws error if message payload does not have a $ref', () => {
      const asyncApiSpec = {};
      const message = {payload: {}};
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'MessageWithoutRef')).toThrow(
        /no reference to a payload defined/,
      );
    });

    test('it throws ComponentNotFoundError if components.schemas is missing', () => {
      const asyncApiSpec = {components: {}};
      const message = {
        payload: {$ref: '#/components/schemas/SomeSchema'},
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'AnyMessage')).toThrow(ComponentNotFoundError);
    });

    test('it throws error if schema is not found in components.schemas', () => {
      const asyncApiSpec = {
        components: {
          schemas: {},
        },
      };
      const message = {
        payload: {$ref: '#/components/schemas/NotExistingSchema'},
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'MessageX')).toThrow(
        /Schema NotExistingSchema not found/,
      );
    });

    test('it throws ReferenceNotSupportedError if schema itself is a $ref', () => {
      const asyncApiSpec = {
        components: {
          schemas: {
            SchemaRef: {$ref: '#/components/schemas/Other'},
          },
        },
      };
      const message = {
        payload: {$ref: '#/components/schemas/SchemaRef'},
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'MsgRef')).toThrow(ReferenceNotSupportedError);
    });

    test('it throws error if schema has no type property', () => {
      const asyncApiSpec = {
        components: {
          schemas: {
            BrokenSchema: {
              properties: {},
            },
          },
        },
      };
      const message = {
        payload: {$ref: '#/components/schemas/BrokenSchema'},
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'Msg')).toThrow(/has no type defined/);
    });

    test('it throws error if schema.properties.type.const is missing', () => {
      const asyncApiSpec = {
        components: {
          schemas: {
            NoConstSchema: {
              properties: {
                type: {},
              },
            },
          },
        },
      };
      const message = {
        payload: {$ref: '#/components/schemas/NoConstSchema'},
      };
      expect(() => getMessageName(asyncApiSpec as any, message as any, 'Msg')).toThrow(/has no type defined/);
    });
  });

  describe('assignDescription', () => {
    test('it should throw an error when no info object exists in the document', () => {
      const input = {} as v2.AsyncAPIObject;
      expect(() => assignDescription(input, 'This is a test description')).toThrowError(
        'AsyncAPI object does not contain an info object. Cannot assign description.',
      );
    });

    test('it should assign a description to the command', () => {
      const input = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      } as v2.AsyncAPIObject;

      assignDescription(input, 'This is a test description');
      expect(input.info.description).toBe('This is a test description');
    });
  });

  describe('setMessageHeaders', () => {
    test('it should throw an error when no components object exists in the document', () => {
      const input = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      } as v2.AsyncAPIObject;

      expect(() => setMessageHeaders(input)).toThrowError(/"components" of type "AsyncApiDocument" not found/);
    });

    test('it should throw an error when no messages object exists in the components', () => {
      const input = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        components: {},
      } as v2.AsyncAPIObject;

      expect(() => setMessageHeaders(input)).toThrowError(/"messages" of type "components" not found/);
    });
  });

  describe('addMesasgeTraitRefToMesasge', () => {
    test('it should throw an error when the message is an reference object', () => {
      const input: v2.ReferenceObject = {
        $ref: '#/components/messages/DemoMessage',
      };

      expect(() => addMessageTraitRefToMessage(input)).toThrowError(/use a direct schema object/);
    });

    test('it should add an trait with reference to the CloudEventContext', () => {
      const input: v2.MessageObject = {
        name: 'DemoMessage',
        description: 'This is a simple description',
        payload: {
          $ref: '#/components/schemas/ExternalDemoObnject',
        },
        schemaFormat: 'application/vnd.aai.asyncapi+json;version=2.0.0',
        contentType: 'application/json',
      };

      const expected: v2.MessageObject = {
        name: 'DemoMessage',
        description: 'This is a simple description',
        payload: {
          $ref: '#/components/schemas/ExternalDemoObnject',
        },
        schemaFormat: 'application/vnd.aai.asyncapi+json;version=2.0.0',
        contentType: 'application/json',
        traits: [
          {
            $ref: '#/components/messageTraits/CloudEventContext',
          },
        ],
      };

      expect(addMessageTraitRefToMessage(input)).toEqual(expected);
    });
  });

  describe('addMessageTraits', () => {
    test('it should throw an error when no components object exists in the document', () => {
      const input: v2.AsyncAPIObject = {
        asyncapi: '2.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {},
      };

      expect(() => addMessageTraits(input)).toThrowError(/"components" of type "AsyncApiDocument" not found/);
    });

    test("it should add a the messageTraits object when it doesn't exist", () => {
      const input: v2.AsyncAPIObject = {
        asyncapi: '2.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {},
        components: {},
      };

      addMessageTraits(input);
      expect(input.components!.messageTraits).toBeDefined();
    });

    test('it should add a new messageTrait named CloudEventContext', () => {
      const input: v2.AsyncAPIObject = {
        asyncapi: '2.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {},
        components: {
          messageTraits: {},
        },
      };

      const expected: v2.MessageTraitObject = {
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
          required: ['id', 'specversion', 'source', 'type', 'data'],
        },
      };

      addMessageTraits(input);
      expect(input.components!.messageTraits!.CloudEventContext).toEqual(expected);
    });

    test('it should override an existing mesageTraits named CloudEventContext', () => {
      const input: v2.AsyncAPIObject = {
        asyncapi: '2.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        channels: {},
        components: {
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
                },
              },
            },
          },
        },
      };

      const expected: v2.MessageTraitObject = {
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
          required: ['id', 'specversion', 'source', 'type', 'data'],
        },
      };

      addMessageTraits(input);
      expect(input.components!.messageTraits!.CloudEventContext).toEqual(expected);
    });
  });
});
