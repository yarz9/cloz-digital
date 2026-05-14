import { BaseProvider } from './base.js';

export class GroqProvider extends BaseProvider {
  constructor() {
    super('groq');
    this.baseUrl = 'https://api.groq.com/openai/v1';
  }

  getModels() {
    return [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Fast)' },
      { id: 'llama3-70b-8192', label: 'Llama 3 70B' },
      { id: 'llama3-8b-8192', label: 'Llama 3 8B' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ];
  }

  _key() { return process.env.GROQ_API_KEY || ''; }
  hasApiKey() { return this._key().length > 0; }
  getMaskedKey() { const k = this._key(); return k ? '****' + k.slice(-4) : '(not set)'; }
  getKeySource() {
    if (process.env.GROQ_API_KEY) return 'env:GROQ_API_KEY';
    return 'none';
  }

  async _post(endpoint, body, timeout = 30000) {
    const key = this._key();
    if (!key) throw new Error('GROQ_API_KEY not configured — get one free at console.groq.com');

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
      if (!res.ok) throw Object.assign(new Error(data?.error?.message || `API ${res.status}`), { status: res.status, raw: data });
      return data;
    } finally { clearTimeout(timer); }
  }

  async testConnection() {
    const t = Date.now();
    const r = await this._post('/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Respond with exactly: "Connection OK"' }],
      max_tokens: 20,
    });
    return { ok: true, text: r?.choices?.[0]?.message?.content?.trim() || '', latencyMs: Date.now() - t };
  }

  async generate(prompt, opts = {}) {
    const t = Date.now();
    const model = opts.model || 'llama-3.3-70b-versatile';
    const messages = [];
    if (opts.systemInstruction) messages.push({ role: 'system', content: opts.systemInstruction });
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
    const model = opts.model || 'llama-3.3-70b-versatile';

    // Groq supports JSON mode — instruct model to output JSON matching schema
    const schemaStr = JSON.stringify(schema, null, 2);
    const structuredPrompt = `${prompt}\n\nRespond ONLY with valid JSON matching this schema:\n${schemaStr}\n\nNo extra text, just the JSON object.`;

    const messages = [
      { role: 'system', content: 'You are a helpful assistant that responds ONLY with valid JSON. No markdown, no code blocks, no extra text.' },
      { role: 'user', content: structuredPrompt },
    ];

    const r = await this._post('/chat/completions', {
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens || 4096,
      response_format: { type: 'json_object' },
    }, opts.timeout);

    const text = r?.choices?.[0]?.message?.content || '{}';
    let data = null;
    try {
      // Strip markdown code blocks if model wraps it
      const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      data = JSON.parse(cleaned);
    } catch {}

    return { data, text, usage: r?.usage || {}, latencyMs: Date.now() - t, raw: r };
  }

  async generateWithTools(prompt, tools, opts = {}) {
    const t = Date.now();
    const model = opts.model || 'llama-3.3-70b-versatile';

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
