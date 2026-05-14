// Provider settings page
async function page_provider() {
  const data = await api.get('/api/config');

  const providerOptions = data.providers
    .map(p => `<option value="${p.key}" ${p.key === data.config.provider ? 'selected' : ''}>${p.name}</option>`)
    .join('');

  const modelOptions = (data.activeProvider.models || [])
    .map(m => `<option value="${m.id || m}" ${(m.id || m) === data.config.model ? 'selected' : ''}>${m.label || m.name || m.id || m}</option>`)
    .join('');

  const keyStatus = data.activeProvider.hasKey
    ? `<div class="badge badge-ok">${data.activeProvider.keySource} - ${data.activeProvider.maskedKey}</div>`
    : '<div class="badge badge-fail">Not configured</div>';

  return `
    <h1 class="page-title">Provider Settings</h1>
    <p class="page-desc">Configure AI provider and model settings</p>

    <div class="card">
      <div class="card-title">${renderIcon('database')} Active Provider</div>
      <div class="field">
        <label>Provider</label>
        <select id="provider" data-field="provider">
          ${providerOptions}
        </select>
        <div class="hint">Currently: <strong>${data.activeProvider.name}</strong></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} API Key</div>
      <div style="margin-bottom: 12px;">
        <div class="hint" style="margin-bottom: 8px;">Status:</div>
        ${keyStatus}
      </div>
      <div class="hint">
        API key is loaded from <code class="mono">${data.activeProvider.keySource || 'Not configured'}</code>.
        For ${data.activeProvider.name}, set <code class="mono">GEMINI_API_KEY</code> environment variable.
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('settings')} Model Selection</div>
      <div class="field">
        <label>Model</label>
        <select id="model" data-field="model">
          ${modelOptions}
        </select>
        <div class="hint">Select the model to use for AI requests</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('settings')} Generation Parameters</div>
      <div class="field-row">
        <div class="field">
          <label>Temperature</label>
          <input type="number" id="temperature" data-field="temperature" min="0" max="2" step="0.1" value="${data.config.temperature || '0.7'}" />
          <div class="hint">0 = deterministic, 1 = balanced, 2 = creative</div>
        </div>
        <div class="field">
          <label>Max Tokens</label>
          <input type="number" id="maxTokens" data-field="maxTokens" min="100" max="32000" step="100" value="${data.config.maxTokens || '2048'}" />
          <div class="hint">Maximum response length</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('settings')} Network Settings</div>
      <div class="field-row">
        <div class="field">
          <label>Request Timeout (ms)</label>
          <input type="number" id="timeout" data-field="timeout" min="1000" max="120000" step="1000" value="${data.config.timeout || '30000'}" />
          <div class="hint">How long to wait for response</div>
        </div>
        <div class="field">
          <label>Retries</label>
          <input type="number" id="retries" data-field="retries" min="0" max="5" value="${data.config.retries || '2'}" />
          <div class="hint">Number of retry attempts on failure</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="btn-group">
        <button class="btn btn-primary" id="save-config-btn">${renderIcon('check')} Save Changes</button>
        <button class="btn" id="reset-config-btn">${renderIcon('x')} Reset to Defaults</button>
      </div>
    </div>
  `;
}

function setup_provider() {
  document.getElementById('save-config-btn').addEventListener('click', async () => {
    const config = {};
    document.querySelectorAll('[data-field]').forEach(el => {
      config[el.id] = el.type === 'number' ? (el.value ? parseFloat(el.value) : el.value) : el.value;
    });
    try {
      await api.post('/api/config', config);
      toast('Configuration saved', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  document.getElementById('reset-config-btn').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      window.location.reload();
    }
  });
}
