// Health page
async function page_health() {
  const health = await api.get('/api/health');

  const checksHTML = health.checks
    .map(c => {
      const iconSVG = c.status === 'ok' ? renderIcon('check') : c.status === 'warning' ? renderIcon('alert') : renderIcon('x');
      const badgeClass = c.status === 'ok' ? 'ok' : c.status === 'warning' ? 'warn' : 'fail';
      return `
        <div class="card">
          <div class="card-title">
            <span class="badge badge-${badgeClass}">${c.status.toUpperCase()}</span>
            ${c.name}
          </div>
          <div style="font-size: 12px; line-height: 1.8;">
            <div><strong>${c.detail}</strong></div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <h1 class="page-title">System Health</h1>
    <p class="page-desc">Detailed system status and environment checks</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Overall Status</div>
        <div class="value badge badge-${health.ready ? 'ok' : 'fail'}">${health.ready ? '✓ Healthy' : '✗ Issues Found'}</div>
      </div>
      <div class="stat-card">
        <div class="label">Checks Passed</div>
        <div class="value">${health.checks.filter(c => c.status === 'ok').length} / ${health.checks.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Warnings</div>
        <div class="value">${health.checks.filter(c => c.status === 'warning').length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Errors</div>
        <div class="value badge badge-fail">${health.checks.filter(c => c.status === 'fail').length}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('zap')} Health Checks</div>
      <button class="btn" id="refresh-health-btn" style="margin-bottom: 12px;">${renderIcon('zap')} Refresh</button>
      ${checksHTML}
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('alert')} What to do if there are issues</div>
      <ul class="check-list" style="border: none;">
        <li style="border: none; padding: 8px 0;">
          <strong>API Key Missing</strong><br/>
          <span style="font-size: 11px; color: var(--t3); margin-top: 4px; display: block;">Set <code class="mono">GEMINI_API_KEY</code> environment variable or configure in provider settings</span>
        </li>
        <li style="border: none; padding: 8px 0;">
          <strong>Database Issues</strong><br/>
          <span style="font-size: 11px; color: var(--t3); margin-top: 4px; display: block;">Check that the <code class="mono">database/</code> directory is writable and migrations have run</span>
        </li>
        <li style="border: none; padding: 8px 0;">
          <strong>Environment Variables</strong><br/>
          <span style="font-size: 11px; color: var(--t3); margin-top: 4px; display: block;">Review <code class="mono">.env</code> file and ensure <code class="mono">ADMIN_PASSWORD</code> is set</span>
        </li>
        <li style="border: none; padding: 8px 0;">
          <strong>Prompts Not Found</strong><br/>
          <span style="font-size: 11px; color: var(--t3); margin-top: 4px; display: block;">Create default prompts in the Prompts section</span>
        </li>
      </ul>
    </div>
  `;
}

function setup_health() {
  document.getElementById('refresh-health-btn').addEventListener('click', () => {
    app.setPage('health');
  });
}
