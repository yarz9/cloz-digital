// API helper — all requests go through here
const api = {
  token: localStorage.getItem('cloz_token') || null,

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('cloz_token', t);
    else localStorage.removeItem('cloz_token');
  },

  async request(method, url, body = null) {
    const opts = { method, headers: {} };
    if (this.token) {
      opts.headers['x-auth-token'] = this.token;
    }
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || data.needsAuth) {
        if (window.app && window.app.logout) window.app.logout();
        throw new Error('Session expired');
      }
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return data;
  },

  get: (url) => api.request('GET', url),
  post: (url, body) => api.request('POST', url, body),
  put: (url, body) => api.request('PUT', url, body),
  del: (url) => api.request('DELETE', url),
};

window.api = api;
