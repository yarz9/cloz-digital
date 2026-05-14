// providers/cerebras.js — Sole AI provider for Cloz Digital
// Supports task-based model routing via providers/models.js

import { BaseProvider } from './base.js';
import { resolveModel, getModelGroup } from './models.js';

export class CerebrasProvider extends BaseProvider {
  constructor() {
    super('cerebras');
    this.baseUrl = 'https://api.cerebras.ai/v1';
  }

  // ── Key management ──

  _key() {
    return process.env.CEREBRAS_API_KEY || '';
  }

  hasApiKey() {
    return this._key().length > 0;
  }

  getMaskedKey() {
    const key = this._key();
    return key ? '****' + key.slice(-4) : '(not set)';
  }

  getKeySource() {
    return process.env.CEREBRAS_API_KEY ? 'env:CEREBRAS_API_KEY' : 'none';
  }

  getDefaultModel() {
    return process.env.CEREBRAS_MODEL || 'qwen-3-235b-a22b-instruct-2507';
  }

  getModels() {
    return [
      { id: 'qwen-3-235b-a22b-instruct-2507', label: 'Qwen 3 235B Instruct' },
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B (Fast)' },
      { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: 'zai-glm-4.7', label: 'ZAI GLM 4.7' },
    ];
  }

  // ── HTTP (with retry on 429) ──

  async request(path, body, timeout = 60000) {
    const key = this._key();
    if (!key) {
      throw new Error('CEREBRAS_API_KEY is not configured. Set it in your .env file.');
    }

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);

      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });

        if (res.status === 429 && attempt < maxRetries) {
          clearTimeout(timer);
          const wait = (attempt + 1) * 2000;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Cerebras API ${res.status}: ${text}`);
        }

        return res.json();
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // ── testConnection ──

  async testConnection() {
    const start = Date.now();
    const r = await this.request('/chat/completions', {
      model: this.getDefaultModel(),
      messages: [{ role: 'user', content: 'Respond with exactly: Connection OK' }],
      max_tokens: 20,
    });

    return {
      ok: true,
      text: r.choices?.[0]?.message?.content?.trim() || '',
      latencyMs: Date.now() - start,
    };
  }

  // ── generate ──
  // options.task: logical task ID for model routing (e.g. 'dashboard-briefing')
  // options.model: explicit model override (takes priority over task routing)

  async generate(prompt, options = {}) {
    const start = Date.now();
    const model = resolveModel(options.task || 'generate', options);
    const messages = [];

    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const r = await this.request(
      '/chat/completions',
      {
        model,
        messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.7,
      },
      options.timeout,
    );

    return {
      text: r.choices?.[0]?.message?.content || '',
      model,
      modelGroup: getModelGroup(options.task || 'generate'),
      usage: r.usage || {},
      latencyMs: Date.now() - start,
      raw: r,
    };
  }

  // ── generateStructured ──

  async generateStructured(prompt, schema, options = {}) {
    const start = Date.now();
    const model = resolveModel(options.task || 'generate', options);

    const messages = [
      {
        role: 'system',
        content:
          options.systemInstruction ||
          'Return only valid JSON that strictly matches the requested schema. No markdown, no code blocks, no extra text.',
      },
      {
        role: 'user',
        content: `${prompt}\n\nJSON Schema:\n${JSON.stringify(schema, null, 2)}\n\nReturn only valid JSON and no additional text.`,
      },
    ];

    const r = await this.request(
      '/chat/completions',
      {
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      },
      options.timeout,
    );

    const text = r.choices?.[0]?.message?.content || '{}';
    let data = null;
    try {
      const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      // Return null data — callers handle gracefully
    }

    return {
      data,
      text,
      model,
      modelGroup: getModelGroup(options.task || 'generate'),
      usage: r.usage || {},
      latencyMs: Date.now() - start,
      raw: r,
    };
  }

  // ── generateWithTools ──
  // Prompt-based fallback: encode tool definitions in the prompt,
  // ask the model to respond with JSON containing toolCalls.

  async generateWithTools(prompt, tools, options = {}) {
    const start = Date.now();
    const model = resolveModel(options.task || 'generate', options);

    const toolDefs = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: typeof t.parameters === 'string' ? JSON.parse(t.parameters) : t.parameters,
    }));

    const messages = [
      {
        role: 'system',
        content: `You are an assistant with access to tools. Based on the user's request, decide which tools to call and with what arguments.

Available tools:
${JSON.stringify(toolDefs, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "toolCalls": [
    { "name": "tool_name", "args": { ... } }
  ],
  "text": "optional assistant message"
}

If no tools are needed, return an empty toolCalls array and put your response in "text".
No markdown, no code blocks, no extra text — just the JSON object.`,
      },
      { role: 'user', content: prompt },
    ];

    const r = await this.request(
      '/chat/completions',
      {
        model,
        messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      },
      options.timeout,
    );

    const raw = r.choices?.[0]?.message?.content || '{}';
    let parsed = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { toolCalls: [], text: raw };
    }

    return {
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
      text: parsed.text || '',
      model,
      modelGroup: getModelGroup(options.task || 'generate'),
      usage: r.usage || {},
      latencyMs: Date.now() - start,
      raw: r,
    };
  }
}
