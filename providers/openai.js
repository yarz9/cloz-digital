// providers/openai.js

import OpenAI from 'openai';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');

    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-5';

    // IMPORTANT:
    // Do NOT initialize the OpenAI client unless an API key is present.
    // Otherwise the application crashes during startup even if OpenAI
    // is not the active provider.
    this.client = null;

    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: this.baseUrl,
      });
    }
  }

  getModels() {
    return [
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ];
  }

  _key() {
    return process.env.OPENAI_API_KEY || '';
  }

  hasApiKey() {
    return this._key().length > 0;
  }

  getMaskedKey() {
    const key = this._key();
    return key ? '****' + key.slice(-4) : '(not set)';
  }

  getKeySource() {
    if (process.env.OPENAI_API_KEY) {
      return 'env:OPENAI_API_KEY';
    }
    return 'none';
  }

  /**
   * Ensures the provider has been properly configured before making requests.
   */
  ensureClient() {
    if (!this.client) {
      throw new Error(
        'OpenAI API key is not configured. Set OPENAI_API_KEY in your .env file.'
      );
    }
  }

  /**
   * Build a request object for the OpenAI Responses API.
   * GPT-5 models do not support the temperature parameter,
   * so it is intentionally omitted.
   */
  buildRequest(baseRequest, options = {}) {
    const request = { ...baseRequest };

    if (options.systemInstruction) {
      request.instructions = options.systemInstruction;
    }

    return request;
  }

  async testConnection() {
    this.ensureClient();

    const start = Date.now();

    const response = await this.client.responses.create({
      model: this.defaultModel,
      input: 'Respond with exactly: "Connection OK"',
      max_output_tokens: 20,
    });

    return {
      ok: true,
      text: response.output_text?.trim() || '',
      latencyMs: Date.now() - start,
    };
  }

  // Keep the rest of your existing methods (generate, generateStructured,
  // generateWithTools, normalizeSchema) exactly as they are, but add:
  //
  // this.ensureClient();
  //
  // as the first line inside each method.
}