// Main app controller
const app = {
  currentPage: 'dashboard',

  async init() {
    if (api.token) {
      api.token = api.token; // already loaded from localStorage
      this.render();
    } else {
      this.showAuth();
    }
  },

  showAuth() {
    const root = document.getElementById('root');
    root.innerHTML = `
      <div class="auth-screen">
        <div class="auth-box">
          <h1>Cloz AI Admin</h1>
          <p>Internal AI configuration panel</p>
          <input type="password" id="password" placeholder="Admin password" autocomplete="current-password" />
          <button class="btn btn-primary" id="login-btn">Sign In</button>
          <p id="auth-err" style="color:var(--error);margin-top:10px;font-size:11px;display:none"></p>
        </div>
      </div>`;
    const pw = document.getElementById('password');
    document.getElementById('login-btn').addEventListener('click', () => this.login());
    pw.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.login(); });
    pw.focus();
  },

  async login() {
    const pw = document.getElementById('password');
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('auth-err');
    if (!pw.value) { toast('Password required', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Signing in…'; err.style.display = 'none';
    try {
      const data = await api.request('POST', '/api/auth/login', { password: pw.value });
      api.setToken(data.token);
      this.render();
    } catch (e) {
      err.textContent = e.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  },

  logout() {
    api.post('/api/auth/logout').catch(() => {});
    api.setToken(null);
    this.currentPage = 'dashboard';
    this.showAuth();
  },

  setPage(name) {
    this.currentPage = name || 'dashboard';
    document.querySelectorAll('.sidebar-nav button').forEach(b => {
      b.classList.toggle('active', b.dataset.page === this.currentPage);
    });
    this.renderCurrentPage();
  },

  render() {
    const root = document.getElementById('root');
    const pages = [
      { name: 'dashboard', label: 'Dashboard', ic: 'dashboard' },
      { name: 'provider', label: 'Provider', ic: 'provider' },
      { name: 'prompts', label: 'Prompts', ic: 'prompts' },
      { name: 'features', label: 'Features', ic: 'features' },
      { name: 'tests', label: 'Tests', ic: 'tests' },
      { name: 'schemas', label: 'Schemas', ic: 'schemas' },
      { name: 'tools', label: 'Tools', ic: 'tools' },
      { name: 'logs', label: 'Logs', ic: 'logs' },
      { name: 'health', label: 'Health', ic: 'health' },
      { name: 'settings', label: 'Settings', ic: 'settings' },
    ];

    root.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <h2>Cloz AI</h2>
            <span class="tag">Admin</span>
          </div>
          <nav class="sidebar-nav">
            ${pages.map(p => `
              <button data-page="${p.name}" class="${this.currentPage === p.name ? 'active' : ''}">
                ${icon(p.ic)} ${p.label}
              </button>`).join('')}
          </nav>
          <div class="sidebar-footer">
            <button id="logout-btn">${icon('logout')} Sign Out</button>
          </div>
        </aside>
        <main class="main" id="main"></main>
      </div>`;

    document.querySelectorAll('.sidebar-nav button').forEach(btn => {
      btn.addEventListener('click', () => this.setPage(btn.dataset.page));
    });
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    this.renderCurrentPage();
  },

  async renderCurrentPage() {
    const main = document.getElementById('main');
    main.innerHTML = '<div class="loading-overlay"><span class="spinner"></span> Loading…</div>';
    try {
      // Load page script if not loaded
      if (!window[`page_${this.currentPage}`]) {
        const script = document.createElement('script');
        script.src = `/admin/js/pages/${this.currentPage}.js`;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Failed to load ${this.currentPage}`));
          document.head.appendChild(script);
        });
      }
      const pageFn = window[`page_${this.currentPage}`];
      if (pageFn) {
        const html = await pageFn();
        main.innerHTML = html;
        if (window[`setup_${this.currentPage}`]) window[`setup_${this.currentPage}`]();
      } else {
        main.innerHTML = '<div class="empty">Page not found</div>';
      }
    } catch (e) {
      console.error('Page error:', e);
      main.innerHTML = `<div class="empty" style="color:var(--error)">Error: ${e.message}</div>`;
    }
  },
};

// Helpers
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function badge(status) {
  const m = { ok:'badge-ok', warning:'badge-warn', fail:'badge-fail', error:'badge-fail', info:'badge-info' };
  return `<span class="badge ${m[status]||'badge-muted'}">${status}</span>`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function codeBlock(content) {
  const s = typeof content === 'object' ? JSON.stringify(content,null,2) : String(content);
  return `<div class="code-block"><button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent);toast('Copied!','success')">Copy</button><code>${esc(s)}</code></div>`;
}

window.app = app;
window.esc = esc;
window.badge = badge;
window.fmtDate = fmtDate;
window.codeBlock = codeBlock;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
