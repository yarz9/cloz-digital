// Tests page
async function page_tests() {
  return `
    <h1 class="page-title">Test Console</h1>
    <p class="page-desc">Run AI tests and demos against the active provider</p>

    <div class="tab-bar" id="test-tabs">
      <button class="active" data-t="connection">Connection</button>
      <button data-t="basic">Basic Prompt</button>
      <button data-t="structured">Structured</button>
      <button data-t="lead">Lead Analysis</button>
      <button data-t="proposal">Proposal Draft</button>
      <button data-t="client">Client Summary</button>
    </div>

    <div id="test-panel"></div>
    <div id="test-result" style="margin-top: 16px;"></div>
  `;
}

function setup_tests() {
  let activeTest = 'connection';
  const panel = document.getElementById('test-panel');
  const result = document.getElementById('test-result');

  const panels = {
    connection: `
      <div class="card">
        <div class="card-title">${renderIcon('play')} Connection Test</div>
        <p class="text-sm text-muted" style="margin-bottom:12px">Test basic connectivity to the AI provider</p>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Test Connection</button>
      </div>`,
    basic: `
      <div class="card">
        <div class="card-title">${renderIcon('prompts')} Basic Prompt Test</div>
        <div class="field">
          <label>Prompt</label>
          <textarea id="tp-prompt" rows="4" placeholder="Enter a test prompt…">Explain what Cloz Digital does in one sentence.</textarea>
        </div>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Run Test</button>
      </div>`,
    structured: `
      <div class="card">
        <div class="card-title">${renderIcon('schemas')} Structured Output Test</div>
        <div class="field">
          <label>Prompt</label>
          <textarea id="tp-prompt" rows="3">Analyze "Coffee House" coffee shop in Sarajevo as a web design lead.</textarea>
        </div>
        <div class="field">
          <label>Response Schema (JSON)</label>
          <textarea id="tp-schema" rows="5">{"type":"object","properties":{"score":{"type":"number"},"fit":{"type":"string"},"summary":{"type":"string"}},"required":["score","summary"]}</textarea>
        </div>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Run Structured Test</button>
      </div>`,
    lead: `
      <div class="card">
        <div class="card-title">${renderIcon('search')} Lead Analysis Demo</div>
        <p class="text-sm text-muted" style="margin-bottom:12px">Uses the lead-analysis prompt template and schema</p>
        <div class="field-row">
          <div class="field"><label>Business Name</label><input id="td-biz" value="Artisan Bakery"></div>
          <div class="field"><label>Location</label><input id="td-loc" value="Sarajevo, BA"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Niche</label><input id="td-niche" value="Bakery"></div>
          <div class="field"><label>Website</label><input id="td-web" value="none"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Rating</label><input id="td-rating" value="4.5"></div>
          <div class="field"><label>Reviews</label><input id="td-reviews" value="89"></div>
        </div>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Analyze Lead</button>
      </div>`,
    proposal: `
      <div class="card">
        <div class="card-title">${renderIcon('prompts')} Proposal Draft Demo</div>
        <p class="text-sm text-muted" style="margin-bottom:12px">Uses the proposal-draft prompt template</p>
        <div class="field-row">
          <div class="field"><label>Client Name</label><input id="td-client" value="Coffee House"></div>
          <div class="field"><label>Business Type</label><input id="td-biztype" value="Coffee Shop"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Package</label><input id="td-pkg" value="Growth Care"></div>
          <div class="field"><label>Budget</label><input id="td-budget" value="500-800 BAM/mo"></div>
        </div>
        <div class="field">
          <label>Scope</label>
          <input id="td-scope" value="Website redesign, SEO, monthly content updates">
        </div>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Draft Proposal</button>
      </div>`,
    client: `
      <div class="card">
        <div class="card-title">${renderIcon('features')} Client Summary Demo</div>
        <p class="text-sm text-muted" style="margin-bottom:12px">Uses the client-summary prompt template</p>
        <div class="field-row">
          <div class="field"><label>Client Name</label><input id="td-client" value="Tech Solutions doo"></div>
          <div class="field"><label>Package</label><input id="td-pkg" value="Presence Care"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>MRR (BAM)</label><input id="td-mrr" value="350"></div>
          <div class="field"><label>Since</label><input id="td-since" value="2024-06"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Health Score</label><input id="td-health" value="78"></div>
          <div class="field"><label>Notes</label><input id="td-notes" value="Slow to reply, happy with last redesign"></div>
        </div>
        <button class="btn btn-primary" id="test-run">${renderIcon('play')} Generate Summary</button>
      </div>`,
  };

  function showPanel(t) {
    activeTest = t;
    document.querySelectorAll('#test-tabs button').forEach(b => b.classList.toggle('active', b.dataset.t === t));
    panel.innerHTML = panels[t] || '';
    result.innerHTML = '';
    document.getElementById('test-run').addEventListener('click', runTest);
  }

  async function runTest() {
    const btn = document.getElementById('test-run');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Running…';
    result.innerHTML = '<div class="loading-overlay"><span class="spinner"></span> Waiting for AI response…</div>';

    try {
      let data;
      switch (activeTest) {
        case 'connection':
          data = await api.post('/api/test/connection', {});
          break;
        case 'basic':
          data = await api.post('/api/test/basic', { prompt: document.getElementById('tp-prompt').value });
          break;
        case 'structured':
          data = await api.post('/api/test/structured', {
            prompt: document.getElementById('tp-prompt').value,
            schema: JSON.parse(document.getElementById('tp-schema').value),
          });
          break;
        case 'lead':
          data = await api.post('/api/test/demo/lead-analysis', {
            businessName: document.getElementById('td-biz').value,
            location: document.getElementById('td-loc').value,
            niche: document.getElementById('td-niche').value,
            website: document.getElementById('td-web').value,
            rating: document.getElementById('td-rating').value,
            reviewCount: document.getElementById('td-reviews').value,
          });
          break;
        case 'proposal':
          data = await api.post('/api/test/demo/proposal', {
            clientName: document.getElementById('td-client').value,
            businessType: document.getElementById('td-biztype').value,
            package: document.getElementById('td-pkg').value,
            scope: document.getElementById('td-scope').value,
            budget: document.getElementById('td-budget').value,
          });
          break;
        case 'client':
          data = await api.post('/api/test/demo/client-summary', {
            clientName: document.getElementById('td-client').value,
            package: document.getElementById('td-pkg').value,
            mrr: document.getElementById('td-mrr').value,
            since: document.getElementById('td-since').value,
            healthScore: document.getElementById('td-health').value,
            notes: document.getElementById('td-notes').value,
          });
          break;
      }

      // Format result
      let resultHTML = '<div class="card">';
      resultHTML += `<div class="card-title">${renderIcon('check')} Result`;
      if (data.latencyMs) resultHTML += `<span class="text-muted text-sm" style="margin-left:auto">${data.latencyMs}ms</span>`;
      resultHTML += '</div>';

      if (data.ok !== undefined) {
        resultHTML += `<div style="margin-bottom:8px"><span class="badge badge-${data.ok ? 'ok' : 'fail'}">${data.ok ? 'Connection OK' : 'Failed'}</span></div>`;
        if (data.provider) resultHTML += `<div class="text-sm text-muted">Provider: ${data.provider}</div>`;
        if (data.model) resultHTML += `<div class="text-sm text-muted">Model: ${data.model}</div>`;
      }
      if (data.text || data.response) {
        resultHTML += `<div style="margin-bottom:8px"><strong>Response:</strong></div>`;
        resultHTML += `<div class="code-block"><code>${(data.text || data.response || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></div>`;
      }
      if (data.data) {
        resultHTML += `<div style="margin:8px 0"><strong>Structured Data:</strong></div>`;
        resultHTML += `<div class="code-block"><code>${JSON.stringify(data.data, null, 2).replace(/</g, '&lt;')}</code></div>`;
      }
      if (data.toolCalls) {
        resultHTML += `<div style="margin:8px 0"><strong>Tool Calls:</strong></div>`;
        resultHTML += `<div class="code-block"><code>${JSON.stringify(data.toolCalls, null, 2).replace(/</g, '&lt;')}</code></div>`;
      }
      if (data.usage) {
        resultHTML += `<div class="text-sm text-muted" style="margin-top:8px">Tokens: ${JSON.stringify(data.usage)}</div>`;
      }
      resultHTML += '</div>';
      result.innerHTML = resultHTML;
      toast('Test completed', 'success');
    } catch (e) {
      result.innerHTML = `<div class="card" style="border-color:var(--error)">
        <div class="card-title" style="color:var(--error)">${renderIcon('alert')} Error</div>
        <p>${e.message}</p>
      </div>`;
      toast(e.message, 'error');
    }

    // Re-render panel to reset button
    showPanel(activeTest);
  }

  // Attach tab click handlers
  document.querySelectorAll('#test-tabs button').forEach(b => {
    b.addEventListener('click', () => showPanel(b.dataset.t));
  });

  // Show initial panel
  showPanel('connection');
}
