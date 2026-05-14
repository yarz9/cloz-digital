import { BaseProvider } from './base.js';

/**
 * xAI / Grok Provider
 * Uses OpenAI-compatible API at api.x.ai/v1
 * Supports: text generation, structured JSON output, tool/function calling
 */
export class XAIProvider extends BaseProvider {
  constructor() {
    super('xai');
    this.baseUrl = 'https://api.x.ai/v1';
  }

  getModels() {
    return [
      { id: 'grok-3-beta', label: 'Grok 3 Beta' },
      { id: 'grok-3-mini-beta', label: 'Grok 3 Mini Beta' },
      { id: 'grok-3-fast-beta', label: 'Grok 3 Fast Beta' },
      { id: 'grok-3-mini-fast-beta', label: 'Grok 3 Mini Fast Beta' },
      { id: 'grok-2-1212', label: 'Grok 2' },
    ];
  }

  _key() { return process.env.XAI_API_KEY || ''; }
  hasApiKey() { return this._key().length > 0; }
  getMaskedKey() { const k = this._key(); return k ? '****' + k.slice(-4) : '(not set)'; }
  getKeySource() {
    if (process.env.XAI_API_KEY) return 'env:XAI_API_KEY';
    return 'none';
  }

  async _post(endpoint, body, timeout = 30000) {
    const key = this._key();
    if (!key) throw new Error('XAI_API_KEY not configured — get one at console.x.ai');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        throw Object.assign(
          new Error(data?.error?.message || `xAI API ${res.status}`),
          { status: res.status, raw: data }
        );
      }
      return data;
    } finally { clearTimeout(timer); }
  }

  async testConnection() {
    const t = Date.now();
    const r = await this._post('/chat/completions', {
      model: 'grok-3-mini-fast-beta',
      messages: [{ role: 'user', content: 'Respond with exactly: "Connection OK"' }],
      max_tokens: 20,
    });
    return {
      ok: true,
      text: r?.choices?.[0]?.message?.content?.trim() || '',
      latencyMs: Date.now() - t,
    };
  }

  async generate(prompt, opts = {}) {
    const t = Date.now();
    const model = opts.model || 'grok-3-mini-fast-beta';
    const messages = [];

    if (opts.systemInstruction) {
      messages.push({ role: 'system', content: opts.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const r = await this._post('/chat/completions', {
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens || 2048,
    }, opts.timeout);

    return {
      text: r?.choices?.[0]?.message?.content || '',
      usage: r?.usage || {},
      latencyMs: Date.now() - t,
      raw: r,
    };
  }

  async generateStructured(prompt, schema, opts = {}) {
    const t = Date.now();
    const model = opts.model || 'grok-3-mini-fast-beta';

    const schemaStr = JSON.stringify(schema, null, 2);
    const structuredPrompt = `${prompt}\n\nRespond ONLY with valid JSON matching this exact schema:\n${schemaStr}\n\nNo markdown, no code blocks, no extra text. Just the raw JSON object.`;

    const messages = [
      { role: 'system', content: 'You respond ONLY with valid JSON. No markdown wrapping, no explanation, no code blocks. Just pure JSON.' },
      { role: 'user', content: structuredPrompt },
    ];

    const body = {
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens || 4096,
    };

    // xAI supports response_format for JSON mode
    body.response_format = { type: 'json_object' };

    const r = await this._post('/chat/completions', body, opts.timeout);
    const text = r?.choices?.[0]?.message?.content || '{}';

    let data = null;
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      data = JSON.parse(cleaned);
    } catch {}

    return { data, text, usage: r?.usage || {}, latencyMs: Date.now() - t, raw: r };
  }

  async generateWithTools(prompt, tools, opts = {}) {
    const t = Date.now();
    const model = opts.model || 'grok-3-mini-fast-beta';

    const openaiTools = tools.map(tl => ({
      type: 'function',
      function: {
        name: tl.name,
        description: tl.description,
        parameters: typeof tl.parameters === 'string' ? JSON.parse(tl.parameters) : tl.parameters,
      },
    }));

    const messages = [];
    if (opts.systemInstruction) messages.push({ role: 'system', content: opts.systemInstruction });
    messages.push({ role: 'user', content: prompt });

    const r = await this._post('/chat/completions', {
      model,
      messages,
      tools: openaiTools,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens || 2048,
    }, opts.timeout);

    const msg = r?.choices?.[0]?.message || {};
    return {
      toolCalls: (msg.tool_calls || []).map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      })),
      text: msg.content || '',
      usage: r?.usage || {},
      latencyMs: Date.now() - t,
      raw: r,
    };
  }
}
