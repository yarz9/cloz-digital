export class BaseProvider {
  constructor(name) {
    this.name = name;
  }
  getModels() { throw new Error('Not implemented'); }
  hasApiKey() { throw new Error('Not implemented'); }
  getMaskedKey() { throw new Error('Not implemented'); }
  getKeySource() { throw new Error('Not implemented'); }
  async testConnection() { throw new Error('Not implemented'); }
  async generate(prompt, options) { throw new Error('Not implemented'); }
  async generateStructured(prompt, schema, options) { throw new Error('Not implemented'); }
  async generateWithTools(prompt, tools, options) { throw new Error('Not implemented'); }
}
