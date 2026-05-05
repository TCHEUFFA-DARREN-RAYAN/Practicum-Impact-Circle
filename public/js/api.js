const API = (() => {
  const BASE = '/api';

  const getToken = () => localStorage.getItem('ic_token');
  const getUser = () => { try { return JSON.parse(localStorage.getItem('ic_user')); } catch { return null; } };
  const setSession = (token, user) => { localStorage.setItem('ic_token', token); localStorage.setItem('ic_user', JSON.stringify(user)); };
  const clearSession = () => { localStorage.removeItem('ic_token'); localStorage.removeItem('ic_user'); };

  const request = async (method, path, body = null, isFormData = false) => {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({ success: false, message: 'Server error' }));
    if (!res.ok) throw { status: res.status, message: data.message || 'Request failed', errors: data.errors || [] };
    return data;
  };

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, formData, true),
    getToken, getUser, setSession, clearSession,
    isLoggedIn: () => !!getToken(),
    requireAuth: (role) => {
      const token = getToken();
      const user = getUser();
      if (!token || !user) { window.location.href = '/login'; return false; }
      if (role && user.role !== role) { window.location.href = '/login'; return false; }
      return true;
    },
    redirectByRole: (user) => {
      const map = { volunteer: '/volunteer-dashboard', org: '/org-dashboard', admin: '/admin', csr: '/csr-dashboard' };
      window.location.href = map[user.role] || '/';
    },
  };
})();

// Toast notifications
const Toast = {
  show(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error: (msg) => Toast.show(msg, 'error'),
  info: (msg) => Toast.show(msg, 'info'),
};

// Format date
const fmt = {
  date: (d) => d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
  datetime: (d) => d ? new Date(d).toLocaleString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
  fromNow: (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  },
  hours: (h) => h === 1 ? '1 hour' : `${h} hours`,
  points: (p) => `${p.toLocaleString()} pts`,
};

// Form validation helper
const Validator = {
  required: (val) => val && val.trim().length > 0,
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  minLen: (val, n) => val && val.trim().length >= n,
  password: (val) => val && val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val),
  showError: (inputEl, msg) => {
    inputEl.classList.add('error');
    const errEl = inputEl.parentElement.querySelector('.field-error');
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
  },
  clearError: (inputEl) => {
    inputEl.classList.remove('error');
    const errEl = inputEl.parentElement.querySelector('.field-error');
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
  },
  clearAll: (form) => form.querySelectorAll('input,select,textarea').forEach(el => Validator.clearError(el)),
};
