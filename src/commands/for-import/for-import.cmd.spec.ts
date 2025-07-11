import {describe, test, suite, expect} from 'vitest';
import {assignDescription, refFor, splitSchemas} from './for-import.cmd';
import {v2} from '../../spec-types';

suite('for-import', () => {
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

  describe('refFor', () => {
    test('it should create a valid JSON reference for a schema', () => {
      const schemaName = 'TestSchema';
      const expectedRef = {$ref: `#/components/schemas/${schemaName}`};
      expect(refFor(schemaName)).toEqual(expectedRef);
    });
  });
});
