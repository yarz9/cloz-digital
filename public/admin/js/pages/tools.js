// Tools page (for function calling)
async function page_tools() {
  const tools = await api.get('/api/tools');

  const toolsHTML = tools
    .map(t => `
      <tr data-id="${t.id}">
        <td><strong>${t.name}</strong></td>
        <td>${t.description}</td>
        <td><span class="badge ${t.enabled ? 'badge-ok' : 'badge-muted'}">${t.enabled ? 'Enabled' : 'Disabled'}</span></td>
        <td>
          <button class="btn btn-sm edit-tool" data-id="${t.id}">${renderIcon('edit')}</button>
          <button class="btn btn-sm btn-danger delete-tool" data-id="${t.id}">${renderIcon('trash')}</button>
        </td>
      </tr>
    `)
    .join('');

  return `
    <h1 class="page-title">Tools / Function Calling</h1>
    <p class="page-desc">Define tools and functions for AI to call</p>

    <div class="card">
      <div class="card-title">${renderIcon('settings')} About Function Calling</div>
      <p style="font-size: 12px; color: var(--t3); line-height: 1.8;">
        Function calling allows AI models to request specific actions by calling predefined functions.
        For example, the AI could call <code class="mono">saveLeadAnalysis()</code> to save analysis results,
        or <code class="mono">createProposalDraft()</code> to generate a proposal.
        This section lets you define which functions the AI can access.
      </p>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} Add New Tool</div>
      <div class="field-row">
        <div class="field" style="flex: 1;">
          <label>Tool Name</label>
          <input type="text" id="tool-name" placeholder="e.g., saveLeadAnalysis" />
        </div>
        <div class="field" style="flex: 1;">
          <label>Category</label>
          <select id="tool-category">
            <option value="data">Data Operations</option>
            <option value="document">Document Generation</option>
            <option value="notification">Notifications</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" id="tool-description" placeholder="What does this tool do?" />
      </div>
      <div class="field">
        <label>Parameters (JSON)</label>
        <textarea id="tool-parameters" placeholder='{"type": "object", "properties": {...}, "required": [...]}' style="font-family: var(--font-m); font-size: 12px; min-height: 120px;"></textarea>
        <div class="hint">Define the JSON schema for this tool\'s parameters</div>
      </div>
      <label class="toggle-row" style="border: none; background: none; padding: 0; margin-top: 12px;">
        <div class="toggle-info">
          <div class="name">Enabled</div>
          <div class="desc">Tool is available for AI to call</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="tool-enabled" checked />
          <span class="slider"></span>
        </label>
      </label>
      <button class="btn btn-primary" id="add-tool-btn" style="margin-top: 12px;">${renderIcon('check')} Add Tool</button>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('database')} Configured Tools</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${toolsHTML || '<tr><td colspan="4" class="empty">No tools configured yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} Quick Add: Common Tools</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
        <button class="btn" id="add-tool-saveLeadAnalysis">${renderIcon('check')} Save Lead Analysis</button>
        <button class="btn" id="add-tool-createProposalDraft">${renderIcon('check')} Create Proposal Draft</button>
        <button class="btn" id="add-tool-generateInvoiceReminder">${renderIcon('check')} Generate Invoice Reminder</button>
        <button class="btn" id="add-tool-summarizeClientNotes">${renderIcon('check')} Summarize Client Notes</button>
      </div>
    </div>
  `;
}

function setup_tools() {
  const commonTools = {
    'saveLeadAnalysis': {
      name: 'saveLeadAnalysis',
      category: 'data',
      description: 'Save analyzed lead data to the database',
      parameters: JSON.stringify({
        type: 'object',
        properties: {
          leadId: { type: 'string', description: 'Unique lead identifier' },
          analysis: { type: 'object', description: 'Analysis result object' },
        },
        required: ['leadId', 'analysis'],
      }),
    },
    'createProposalDraft': {
      name: 'createProposalDraft',
      category: 'document',
      description: 'Create a proposal draft document',
      parameters: JSON.stringify({
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['clientId', 'title', 'content'],
      }),
    },
    'generateInvoiceReminder': {
      name: 'generateInvoiceReminder',
      category: 'notification',
      description: 'Generate an invoice payment reminder',
      parameters: JSON.stringify({
        type: 'object',
        properties: {
          invoiceId: { type: 'string' },
          daysOverdue: { type: 'number' },
        },
        required: ['invoiceId'],
      }),
    },
    'summarizeClientNotes': {
      name: 'summarizeClientNotes',
      category: 'document',
      description: 'Summarize client interaction notes',
      parameters: JSON.stringify({
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['clientId', 'notes'],
      }),
    },
  };

  const addTool = async (toolDef) => {
    try {
      await api.post('/api/tools', toolDef);
      toast(`${toolDef.name} added`, 'success');
      app.setPage('tools');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  };

  document.getElementById('add-tool-btn').addEventListener('click', async () => {
    const name = document.getElementById('tool-name').value.trim();
    const category = document.getElementById('tool-category').value;
    const description = document.getElementById('tool-description').value.trim();
    const parameters = document.getElementById('tool-parameters').value.trim();
    const enabled = document.getElementById('tool-enabled').checked;

    if (!name || !description || !parameters) {
      toast('Name, description, and parameters required', 'error');
      return;
    }

    try {
      JSON.parse(parameters);
      await addTool({
        name,
        category,
        description,
        parameters,
        enabled,
      });
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  Object.keys(commonTools).forEach(key => {
    const btn = document.getElementById(`add-tool-${key}`);
    if (btn) {
      btn.addEventListener('click', () => {
        addTool(commonTools[key]);
      });
    }
  });

  document.querySelectorAll('.delete-tool').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this tool?')) return;
      try {
        await api.del(`/api/tools/${btn.dataset.id}`);
        toast('Tool deleted', 'success');
        app.setPage('tools');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
  });

  document.querySelectorAll('.edit-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      toast('Edit coming soon', 'info');
    });
  });
}
