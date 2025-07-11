import {describe, test, expect, vi, beforeEach} from 'vitest';
import {convertCmdHandler} from './convert.cmd';
import fs from 'fs';
import * as utils from '../utils/writeOutput.util';
import {logger} from '../cli';
import {INPUT, OUTPUT} from '../test/data';

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

describe('Command: convert', () => {
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

    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported file type'));
    expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Only JSON is supported'));
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
