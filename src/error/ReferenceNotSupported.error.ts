export class ReferenceNotSupportedError extends Error {
  private readonly path: string;
  constructor(path: string | string[]) {
    const _path: string = Array.isArray(path) ? path.join('.') : path;
    super(`Reference at "${_path}" is not supported. Please use a direct schema object instead.`);
    this.path = _path;
    this.name = 'ReferenceNotSupportedError';
  }

  getPath() {
    return this.path;
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}
