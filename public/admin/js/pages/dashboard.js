// Dashboard page
async function page_dashboard() {
  const health = await api.get('/api/health');
  const config = await api.get('/api/config');
  const provider = config.activeProvider;

  const readyClass = health.ready ? 'ok' : 'fail';
  const readyText = health.ready ? '✓ Ready' : '⚠ Not Ready';

  const checksHTML = health.checks
    .map(c => {
      const dotClass = c.status === 'ok' ? 'ok' : c.status === 'warning' ? 'warn' : 'fail';
      return `
        <li>
          <div class="dot ${dotClass}"></div>
          <span>${c.name}</span>
          <span class="detail">${c.detail}</span>
        </li>
      `;
    })
    .join('');

  return `
    <h1 class="page-title">Dashboard</h1>
    <p class="page-desc">AI setup and system health overview</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">System Status</div>
        <div class="value badge badge-${readyClass}">${readyText}</div>
      </div>
      <div class="stat-card">
        <div class="label">Active Provider</div>
        <div class="value">${provider.name}</div>
      </div>
      <div class="stat-card">
        <div class="label">Model</div>
        <div class="value">${config.config.model || 'Not configured'}</div>
      </div>
      <div class="stat-card">
        <div class="label">API Key</div>
        <div class="value badge badge-${provider.hasKey ? 'ok' : 'fail'}">${provider.hasKey ? provider.maskedKey : 'Missing'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('alert')} System Health</div>
      <ul class="check-list">
        ${checksHTML}
      </ul>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">${renderIcon('zap')} Quick Actions</div>
        <button class="btn btn-primary" style="width: 100%; margin-bottom: 8px;" onclick="app.setPage('tests')">
          ${renderIcon('play')} Test Connection
        </button>
        <button class="btn" style="width: 100%; margin-bottom: 8px;" onclick="app.setPage('provider')">
          ${renderIcon('settings')} Configure Provider
        </button>
        <button class="btn" style="width: 100%;" onclick="app.setPage('health')">
          ${renderIcon('zap')} View Details
        </button>
      </div>
      <div class="card">
        <div class="card-title">${renderIcon('database')} Configuration</div>
        <div style="font-size: 12px; line-height: 1.8;">
          <div><span class="text-muted">Provider:</span> <strong>${provider.name}</strong></div>
          <div><span class="text-muted">Key Source:</span> <strong>${provider.keySource || 'Not set'}</strong></div>
          <div><span class="text-muted">Models:</span> <strong>${provider.models?.length || 0}</strong></div>
          <div style="margin-top: 10px;">
            <span class="text-muted">Temperature:</span> <strong>${config.config.temperature || '0.7'}</strong>
          </div>
          <div><span class="text-muted">Max Tokens:</span> <strong>${config.config.maxTokens || '2048'}</strong></div>
          <div><span class="text-muted">Timeout:</span> <strong>${config.config.timeout || '30000'}ms</strong></div>
        </div>
      </div>
    </div>
  `;
}
