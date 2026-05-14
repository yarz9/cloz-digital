// Schemas page
async function page_schemas() {
  const schemas = await api.get('/api/schemas');

  const schemasHTML = schemas
    .map(s => `
      <div class="card">
        <div class="card-title">${s.name}</div>
        <div style="margin-bottom: 8px;">
          <div class="hint" style="margin-bottom: 4px;">Type: <code class="mono">${s.type || 'json'}</code></div>
          ${s.description ? `<div class="hint">Description: ${s.description}</div>` : ''}
        </div>
        <div class="code-block"><pre>${JSON.stringify(typeof s.schema === 'string' ? JSON.parse(s.schema) : s.schema, null, 2)}</pre></div>
        <div style="margin-top: 8px;">
          <button class="btn btn-sm delete-schema" data-id="${s.id}">${renderIcon('trash')} Delete</button>
        </div>
      </div>
    `)
    .join('');

  return `
    <h1 class="page-title">Structured Output Schemas</h1>
    <p class="page-desc">Define JSON schemas for structured AI outputs</p>

    <div class="card">
      <div class="card-title">${renderIcon('database')} Add New Schema</div>
      <div class="field-row">
        <div class="field" style="flex: 1;">
          <label>Schema Name</label>
          <input type="text" id="schema-name" placeholder="e.g., LeadAnalysisOutput" />
        </div>
        <div class="field" style="flex: 1;">
          <label>Type</label>
          <select id="schema-type">
            <option value="json">JSON</option>
            <option value="json-schema">JSON Schema</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Description (optional)</label>
        <input type="text" id="schema-description" placeholder="What this schema is for..." />
      </div>
      <div class="field">
        <label>JSON Schema</label>
        <textarea id="schema-json" placeholder='{"type": "object", "properties": {...}}' style="font-family: var(--font-m); font-size: 12px; min-height: 150px;"></textarea>
      </div>
      <button class="btn btn-primary" id="add-schema-btn">${renderIcon('check')} Add Schema</button>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('database')} Existing Schemas</div>
      ${schemasHTML || '<div class="empty">No schemas created yet</div>'}
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} Default Schemas</div>
      <p style="font-size: 12px; color: var(--t3); margin-bottom: 12px;">Pre-built schemas for common use cases:</p>
      <button class="btn btn-sm" id="add-default-lead">${renderIcon('check')} Add Lead Analysis</button>
      <button class="btn btn-sm" id="add-default-proposal">${renderIcon('check')} Add Proposal Output</button>
      <button class="btn btn-sm" id="add-default-invoice">${renderIcon('check')} Add Invoice Analysis</button>
    </div>
  `;
}

function setup_schemas() {
  document.getElementById('add-schema-btn').addEventListener('click', async () => {
    const name = document.getElementById('schema-name').value.trim();
    const type = document.getElementById('schema-type').value;
    const description = document.getElementById('schema-description').value.trim();
    const json = document.getElementById('schema-json').value.trim();

    if (!name || !json) {
      toast('Name and JSON schema required', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(json);
      await api.post('/api/schemas', {
        name,
        category: type || 'general',
        description,
        schema: parsed,
      });
      toast('Schema added', 'success');
      app.setPage('schemas');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  document.querySelectorAll('.delete-schema').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this schema?')) return;
      try {
        await api.del(`/api/schemas/${btn.dataset.id}`);
        toast('Schema deleted', 'success');
        app.setPage('schemas');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
  });

  // Default schemas
  const defaults = {
    'lead-analysis': {
      name: 'Lead Analysis Output',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          quality_score: { type: 'number', minimum: 1, maximum: 10 },
          fit_assessment: { type: 'string' },
          opportunities: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string', enum: ['hot', 'warm', 'cold'] },
        },
        required: ['quality_score', 'fit_assessment', 'recommendation'],
      }),
    },
    'proposal-output': {
      name: 'Proposal Output',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          scope: { type: 'string' },
          deliverables: { type: 'array', items: { type: 'string' } },
          timeline: { type: 'string' },
          price_estimate: { type: 'object', properties: { min: { type: 'number' }, max: { type: 'number' } } },
        },
        required: ['executive_summary', 'scope'],
      }),
    },
    'invoice-analysis': {
      name: 'Invoice Analysis Output',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          total_amount: { type: 'number' },
          due_date: { type: 'string' },
          status: { type: 'string' },
          key_items: { type: 'array', items: { type: 'string' } },
          payment_terms: { type: 'string' },
          notes: { type: 'string' },
        },
      }),
    },
  };

  const addDefault = async (key, info) => {
    try {
      await api.post('/api/schemas', {
        name: info.name,
        category: 'general',
        description: `Default schema for ${key}`,
        schema: JSON.parse(info.schema),
      });
      toast(`${info.name} schema added`, 'success');
      app.setPage('schemas');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        toast(`Error: ${e.message}`, 'error');
      } else {
        toast(`${info.name} already exists`, 'info');
      }
    }
  };

  document.getElementById('add-default-lead').addEventListener('click', () => {
    addDefault('lead-analysis', defaults['lead-analysis']);
  });
  document.getElementById('add-default-proposal').addEventListener('click', () => {
    addDefault('proposal-output', defaults['proposal-output']);
  });
  document.getElementById('add-default-invoice').addEventListener('click', () => {
    addDefault('invoice-analysis', defaults['invoice-analysis']);
  });
}
