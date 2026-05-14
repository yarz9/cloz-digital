// Logs page
async function page_logs() {
  const data = await api.get('/api/logs?limit=200');
  const logs = data.logs || data;
  const stats = data.stats || { total: logs.length, errors: 0, warnings: 0 };

  const logsHTML = logs.slice(0, 100)
    .map(log => {
      const type = log.type || log.level || 'info';
      const badgeClass = type === 'error' ? 'fail' : type === 'warning' ? 'warn' : type === 'success' ? 'ok' : 'info';
      const date = log.created_at ? new Date(log.created_at.includes('T') ? log.created_at : log.created_at + 'T00:00:00').toLocaleString() : '—';
      return `
        <tr>
          <td><span class="badge badge-${badgeClass}">${type.toUpperCase()}</span></td>
          <td class="text-muted text-sm" style="white-space:nowrap">${date}</td>
          <td>${log.message}</td>
          <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="text-muted text-sm mono">
            ${log.details ? `<button class="btn btn-sm view-log-details" data-details="${btoa(unescape(encodeURIComponent(log.details)))}">${renderIcon('eye')}</button>` : '—'}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <h1 class="page-title">System Logs</h1>
    <p class="page-desc">${stats.total} total · ${stats.errors} errors · ${stats.warnings} warnings</p>

    <div class="card" style="margin-bottom:12px">
      <div class="btn-group">
        <button class="btn btn-primary" data-filter="">${renderIcon('check')} All</button>
        <button class="btn" data-filter="info">Info</button>
        <button class="btn" data-filter="warning">${renderIcon('alert')} Warnings</button>
        <button class="btn" data-filter="error">Errors</button>
        <button class="btn btn-danger" id="clear-logs-btn">${renderIcon('trash')} Clear All</button>
        <button class="btn" id="refresh-logs-btn">${renderIcon('play')} Refresh</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${renderIcon('alert')} Recent Activity</div>
      ${logs.length > 0 ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Time</th>
                <th>Message</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${logsHTML}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty">No logs yet. Run some tests to generate logs.</div>'}
    </div>
  `;
}

function setup_logs() {
  document.getElementById('clear-logs-btn').addEventListener('click', async () => {
    if (!confirm('Clear all logs? This cannot be undone.')) return;
    try {
      await api.post('/api/logs/clear', {});
      toast('Logs cleared', 'success');
      app.setPage('logs');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  });

  document.getElementById('refresh-logs-btn').addEventListener('click', () => {
    app.setPage('logs');
  });

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const filter = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      // Reload with filter
      try {
        const url = filter ? `/api/logs?limit=200&type=${filter}` : '/api/logs?limit=200';
        const data = await api.get(url);
        const logs = data.logs || data;
        const tbody = document.querySelector('.table-wrap tbody');
        if (!tbody) return;
        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="empty">No logs match this filter</td></tr>';
          return;
        }
        tbody.innerHTML = logs.map(log => {
          const type = log.type || 'info';
          const badgeClass = type === 'error' ? 'fail' : type === 'warning' ? 'warn' : type === 'success' ? 'ok' : 'info';
          const date = log.created_at ? new Date(log.created_at.includes('T') ? log.created_at : log.created_at + 'T00:00:00').toLocaleString() : '—';
          return `<tr>
            <td><span class="badge badge-${badgeClass}">${type.toUpperCase()}</span></td>
            <td class="text-muted text-sm" style="white-space:nowrap">${date}</td>
            <td>${log.message}</td>
            <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="text-muted text-sm mono">
              ${log.details ? `<button class="btn btn-sm view-log-details" data-details="${btoa(unescape(encodeURIComponent(log.details)))}">${renderIcon('eye')}</button>` : '—'}
            </td>
          </tr>`;
        }).join('');
        // Re-attach detail buttons
        attachDetailListeners();
      } catch (e) {
        toast(`Error: ${e.message}`, 'error');
      }
    });
  });

  attachDetailListeners();
}

function attachDetailListeners() {
  document.querySelectorAll('.view-log-details').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        const details = decodeURIComponent(escape(atob(btn.dataset.details)));
        try {
          const obj = JSON.parse(details);
          alert('Details:\n\n' + JSON.stringify(obj, null, 2));
        } catch {
          alert('Details:\n\n' + details);
        }
      } catch {
        alert('Could not decode details');
      }
    });
  });
}
