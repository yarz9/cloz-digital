// Prompts management page
async function page_prompts() {
  const prompts = await api.get('/api/prompts');
  const categories = [...new Set(prompts.map(p => p.category))].sort();

  const promptsHTML = prompts
    .map(p => `
      <tr data-id="${p.id}">
        <td>${p.title}</td>
        <td><span class="text-muted">${p.category}</span></td>
        <td><span class="mono text-muted">${p.slug}</span></td>
        <td><span class="badge ${p.active ? 'badge-ok' : 'badge-muted'}">${p.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn btn-sm edit-prompt" data-id="${p.id}">${renderIcon('edit')}</button>
          <button class="btn btn-sm duplicate-prompt" data-id="${p.id}">${renderIcon('copy')}</button>
          <button class="btn btn-sm btn-danger delete-prompt" data-id="${p.id}">${renderIcon('trash')}</button>
        </td>
      </tr>
    `)
    .join('');

  const categoryOptions = categories
    .map(c => `<option value="${c}">${c}</option>`)
    .join('');

  return `
    <h1 class="page-title">Prompt Templates</h1>
    <p class="page-desc">Manage AI prompt templates for different features</p>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} Create New Prompt</div>
      <div class="field-row">
        <div class="field" style="flex: 1;">
          <label>Title</label>
          <input type="text" id="prompt-title" placeholder="e.g., Lead Analysis" />
        </div>
        <div class="field" style="flex: 1;">
          <label>Slug</label>
          <input type="text" id="prompt-slug" placeholder="e.g., lead-analysis" />
        </div>
      </div>
      <div class="field-row">
        <div class="field" style="flex: 1;">
          <label>Category</label>
          <select id="prompt-category">
            <option value="general">General</option>
            ${categoryOptions}
            <option value="new">+ New Category</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Prompt Body</label>
        <textarea id="prompt-body" placeholder="Enter the prompt template..."></textarea>
      </div>
      <div class="field">
        <label>Description (optional)</label>
        <input type="text" id="prompt-description" placeholder="Internal notes..." />
      </div>
      <button class="btn btn-primary" id="add-prompt-btn">${renderIcon('check')} Add Prompt</button>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('database')} Templates</div>
      <div class="btn-group" style="margin-bottom: 12px;">
        <button class="btn" id="export-prompts-btn">${renderIcon('download')} Export</button>
        <button class="btn" id="import-prompts-btn">${renderIcon('upload')} Import</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${promptsHTML || '<tr><td colspan="5" class="empty">No prompts created yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div id="prompt-modal" class="hidden"></div>
  `;
}

function setup_prompts() {
  const addBtn = document.getElementById('add-prompt-btn');
  const titleInput = document.getElementById('prompt-title');
  const slugInput = document.getElementById('prompt-slug');
  const categoryInput = document.getElementById('prompt-category');
  const bodyInput = document.getElementById('prompt-body');
  const descInput = document.getElementById('prompt-description');

  // Auto-generate slug
  titleInput.addEventListener('input', () => {
    if (!slugInput.value) {
      slugInput.value = titleInput.value.toLowerCase().replace(/\s+/g, '-');
    }
  });

  // Add prompt
  addBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const slug = slugInput.value.trim();
    const category = categoryInput.value;
    const body = bodyInput.value.trim();
    const description = descInput.value.trim();

    if (!title || !slug || !body) {
      toast('Title, slug, and body are required', 'error');
      return;
    }

    try {
      const newCategory = category === 'new' ? prompt('New category name:') : category;
      if (!newCategory) return;

      await api.post('/api/prompts', {
        title,
        slug,
        category: newCategory || 'general',
        body,
        description,
      });

      toast('Prompt created', 'success');
      titleInput.value = '';
      slugInput.value = '';
      bodyInput.value = '';
      descInput.value = '';
      categoryInput.value = 'general';
      app.setPage('prompts');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  // Delete prompt
  document.querySelectorAll('.delete-prompt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Delete this prompt?')) return;
      try {
        await api.del(`/api/prompts/${id}`);
        toast('Prompt deleted', 'success');
        app.setPage('prompts');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
  });

  // Duplicate prompt
  document.querySelectorAll('.duplicate-prompt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await api.post(`/api/prompts/${id}/duplicate`, {});
        toast('Prompt duplicated', 'success');
        app.setPage('prompts');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
  });

  // Edit prompt
  document.querySelectorAll('.edit-prompt').forEach(btn => {
    btn.addEventListener('click', async () => {
      // TODO: Implement inline edit modal
      toast('Edit coming soon', 'info');
    });
  });

  // Export prompts
  document.getElementById('export-prompts-btn').addEventListener('click', async () => {
    try {
      const prompts = await api.get('/api/prompts/export');
      const json = JSON.stringify(prompts, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Prompts exported', 'success');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  // Import prompts
  document.getElementById('import-prompts-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const prompts = JSON.parse(text);
        await api.post('/api/prompts/import', { prompts });
        toast('Prompts imported', 'success');
        app.setPage('prompts');
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
    input.click();
  });
}
