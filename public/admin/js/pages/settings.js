// Settings page
async function page_settings() {
  const health = await api.get('/api/health');
  const config = await api.get('/api/config');
  const nodeCheck = health.checks.find(c => c.name === 'Node.js');
  const apiKeyCheck = health.checks.find(c => c.name === 'API Key');
  const envCheck = health.checks.find(c => c.name === 'Environment');

  return `
    <h1 class="page-title">Settings & Security</h1>
    <p class="page-desc">Admin configuration, security, and deployment info</p>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">${renderIcon('key')} Admin Access</div>
        <div style="font-size: 12px; line-height: 1.8; margin-bottom: 12px;">
          <div><span class="text-muted">Access Type:</span> <strong>Password Protected</strong></div>
          <div><span class="text-muted">Session Token:</span> <code class="mono" style="font-size: 10px;">***${api.token ? api.token.slice(-8) : '—'}</code></div>
        </div>
        <button class="btn btn-danger" id="logout-btn">${renderIcon('logout')} Sign Out</button>
      </div>

      <div class="card">
        <div class="card-title">${renderIcon('health')} Application Info</div>
        <div style="font-size: 12px; line-height: 1.8;">
          <div><span class="text-muted">App:</span> <strong>Cloz AI Admin v1.0</strong></div>
          <div><span class="text-muted">Provider:</span> <strong>${config.activeProvider?.name || '—'}</strong></div>
          <div><span class="text-muted">Model:</span> <strong>${config.config?.model || '—'}</strong></div>
          <div><span class="text-muted">Node.js:</span> <strong>${nodeCheck?.detail || '—'}</strong></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('schemas')} Environment Variables</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Variable</th><th>Status</th><th>Detail</th></tr></thead>
          <tbody>
            <tr>
              <td><code class="mono">ADMIN_PASSWORD</code></td>
              <td><span class="badge badge-${envCheck?.status === 'ok' ? 'ok' : 'warn'}">${envCheck?.status === 'ok' ? 'Set' : 'Check'}</span></td>
              <td class="text-muted text-sm">Auth is working (you're logged in)</td>
            </tr>
            <tr>
              <td><code class="mono">GEMINI_API_KEY</code></td>
              <td><span class="badge badge-${config.activeProvider?.hasKey ? 'ok' : 'fail'}">${config.activeProvider?.hasKey ? 'Set' : 'Missing'}</span></td>
              <td class="text-muted text-sm">${config.activeProvider?.hasKey ? config.activeProvider.maskedKey + ' (' + config.activeProvider.keySource + ')' : 'Not configured — set in .env file'}</td>
            </tr>
            <tr>
              <td><code class="mono">PORT</code></td>
              <td><span class="badge badge-ok">Set</span></td>
              <td class="text-muted text-sm">Default: 3000</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('download')} Data Management</div>
      <p class="text-sm text-muted" style="margin-bottom:12px">Export prompts and features for backup or migration.</p>
      <div class="btn-group">
        <button class="btn" id="s-export-prompts">${renderIcon('download')} Export Prompts</button>
        <button class="btn" id="s-export-features">${renderIcon('download')} Export Features</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('provider')} Deployment</div>
      <p style="font-size: 12px; color: var(--t3); margin-bottom: 12px;">Configured for <strong>Railway</strong> deployment:</p>
      <div class="code-block" style="font-size: 11px;">
# 1. Push to GitHub
# 2. Connect repo in Railway
# 3. Set environment variables:
#    ADMIN_PASSWORD=your_secure_password
#    GEMINI_API_KEY=your_gemini_api_key
# 4. Deploy — Railway runs "npm start" automatically</div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('tests')} Local Development</div>
      <div class="code-block" style="font-size: 11px;">
# Clone and install
npm install

# Create .env file
cp .env.example .env
# Edit .env with your keys

# Start dev server
npm run dev

# Open http://localhost:3000</div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('info')} Security Notes</div>
      <ul style="font-size: 12px; line-height: 1.8; list-style: none;">
        <li>✓ All API keys stored server-side only</li>
        <li>✓ Frontend never has access to secrets</li>
        <li>✓ Session tokens expire on logout</li>
        <li>✓ Rate limiting on all API endpoints</li>
        <li>✓ Helmet security headers enabled</li>
        <li>✓ API key values redacted in logs</li>
      </ul>
    </div>
  `;
}

function setup_settings() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Sign out?')) app.logout();
  });

  document.getElementById('s-export-prompts').addEventListener('click', async () => {
    try {
      const data = await api.get('/api/prompts/export');
      const blob = new Blob([JSON.stringify({ prompts: data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prompts-export.json'; a.click();
      toast('Prompts exported', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });

  document.getElementById('s-export-features').addEventListener('click', async () => {
    try {
      const data = await api.get('/api/features/export');
      const blob = new Blob([JSON.stringify({ features: data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'features-export.json'; a.click();
      toast('Features exported', 'success');
    } catch (e) { toast(e.message, 'error'); }
  });
}
