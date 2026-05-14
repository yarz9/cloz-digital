// Features page
async function page_features() {
  const features = await api.get('/api/features');

  const featuresHTML = features
    .map(f => `
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="name">${f.key}</div>
          <div class="desc">${{
            'lead_analysis': 'AI-powered client lead analysis',
            'proposal_drafting': 'Automated proposal generation',
            'invoice_ai': 'Invoice explanation and analysis',
            'maintenance_summaries': 'Auto-generate maintenance summaries',
            'outreach_generator': 'Outreach message generation',
            'dashboard_assistant': 'Dashboard AI assistant',
            'structured_output': 'Enforce structured JSON outputs',
            'function_calling': 'Enable tool/function calling',
            'debug_mode': 'Debug logging and verbose output',
          }[f.key] || 'Feature toggle'}</div>
        </div>
        <label class="toggle">
          <input type="checkbox" data-key="${f.key}" ${f.enabled ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    `)
    .join('');

  return `
    <h1 class="page-title">Feature Toggles</h1>
    <p class="page-desc">Enable or disable AI features</p>

    <div class="card">
      <div class="card-title">${renderIcon('check')} Active Features</div>
      ${featuresHTML}
    </div>

    <div class="card">
      <div class="btn-group">
        <button class="btn btn-primary" id="save-features-btn">${renderIcon('check')} Save Changes</button>
        <button class="btn" id="export-features-btn">${renderIcon('download')} Export</button>
        <button class="btn" id="import-features-btn">${renderIcon('upload')} Import</button>
      </div>
    </div>
  `;
}

function setup_features() {
  const toggles = {};

  // Collect initial state
  document.querySelectorAll('[data-key]').forEach(el => {
    toggles[el.dataset.key] = el.checked;
  });

  // Save features
  document.getElementById('save-features-btn').addEventListener('click', async () => {
    const updated = {};
    document.querySelectorAll('[data-key]').forEach(el => {
      updated[el.dataset.key] = el.checked;
    });

    try {
      await api.post('/api/features', updated);
      toast('Features saved', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  // Export features
  document.getElementById('export-features-btn').addEventListener('click', async () => {
    try {
      const features = await api.get('/api/features/export');
      const json = JSON.stringify(features, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `features-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Features exported', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  // Import features
  document.getElementById('import-features-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const features = JSON.parse(text);
        await api.post('/api/features/import', { features });
        toast('Features imported', 'success');
        app.setPage('features');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
    input.click();
  });
}
