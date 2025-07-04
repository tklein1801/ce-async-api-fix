export class ComponentNotFoundError extends Error {
  constructor(
    componentName: string,
    componentType?: 'schema' | 'message' | 'channel' | 'components' | 'messageTraits',
  ) {
    super(
      componentType
        ? `Component "${componentName}" of type "${componentType}" not found in the specification.`
        : `Component "${componentName}" not found in the specification.`,
    );
    this.name = 'ComponentNotFoundError';
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}
