export class ReferenceNotSupportedError extends Error {
  constructor(path: string) {
    super(`Reference at "${path}" is not supported. Please use a direct schema object instead.`);
    this.name = 'ReferenceNotSupportedError';
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}
