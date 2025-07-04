import type {v2, v3} from '../spec-types';

export function determineAsyncApiVersion(spec: v2.AsyncAPIObject | v3.AsyncAPIObject): 'v2' | 'v3' {
  const specVersion = spec.asyncapi;
  if (specVersion.startsWith('2')) return 'v2';
  if (specVersion.startsWith('3')) return 'v3';
  throw new Error('Unknown AsyncAPI version: ' + specVersion);
}
