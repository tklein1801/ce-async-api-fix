import {beforeEach, describe, expect, suite, test, vi} from 'vitest';
import {assignDescription, convertCmdHandler, refFor} from '../commands';
import {v2} from '../spec-types';
import {INPUT, OUTPUT} from './data';
import fs from 'fs';
import * as utils from '../utils';
import {logger} from '../cli';

suite('convert', () => {
  const validInputJson = INPUT;
  const expectedOutputJson = OUTPUT;

  const inputJsonString = JSON.stringify(validInputJson, null, 2);

  vi.mock('fs');
  vi.mock('../utils');
  vi.mock('../cli', async () => {
    // Provide the logger with mocked methods
    return {
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        setLogLevel: vi.fn(),
        getLogLevel: vi.fn(() => 'info'),
      },
    };
  });

  const mockedFs = fs as any;
  const mockedUtils = utils as any;
  const mockedLogger = logger as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('it only supports .json files', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('{}');

    await convertCmdHandler({
      input: 'spec.yml',
      output: 'out.json',
      ignoreSchema: undefined,
      namespace: undefined,
    });

    expect(mockedLogger.error).toHaveBeenCalledWith('Unsupported file type: %s! Only JSON is supported.', '.yml');
  });

  test('it should transform the input JSON correctly', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(inputJsonString);
    mockedUtils.writeOutput.mockImplementation((data: string, file: string) => {
      // Assertion: Output should match the expected output
      expect(JSON.parse(data)).toEqual(expectedOutputJson);
      expect(file).toBe('out.json');
    });

    await convertCmdHandler({
      input: 'spec.json',
      output: 'out.json',
      ignoreSchema: undefined,
      namespace: undefined,
    });
  });

  test('ignoriert Schemata mit --ignoreSchema', async () => {
    const inputWithTwoSchemas = {
      ...validInputJson,
      components: {
        ...validInputJson.components,
        schemas: {
          fooSchema: {type: 'object', properties: {foo: {type: 'string'}}},
          barSchema: {type: 'object', properties: {bar: {type: 'number'}}},
        },
      },
    };
    const inputStr = JSON.stringify(inputWithTwoSchemas, null, 2);

    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(inputStr);
    mockedUtils.writeOutput.mockImplementation((data: string, _file: string) => {
      const result = JSON.parse(data);
      // Expect: barSchema to be unchanged
      expect(result.components.schemas.barSchema).toEqual({type: 'object', properties: {bar: {type: 'number'}}});
      // Expect: fooSchema to be transformed
      expect(result.components.schemas.fooSchema.properties).toHaveProperty('data');
    });

    await convertCmdHandler({
      input: 'spec.json',
      output: 'out.json',
      ignoreSchema: 'bar*',
      namespace: undefined,
    });
  });

  test('it prefixes the namespace correctly when --namespace is set', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(inputJsonString);
    mockedUtils.writeOutput.mockImplementation((data: string, _file: string) => {
      const result = JSON.parse(data);
      // Expect: Channel keys to be prefixed
      expect(Object.keys(result.channels).every(key => key.startsWith('tchibo/s4hana/dev/'))).toBe(true);
    });

    await convertCmdHandler({
      input: 'spec.json',
      output: 'out.json',
      ignoreSchema: undefined,
      namespace: 'tchibo/s4hana/dev',
    });
  });
});

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
