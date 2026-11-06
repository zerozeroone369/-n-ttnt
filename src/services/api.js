const API_BASE = '/api';
const TOKEN_KEY = 'boutique_auth_token';
const USER_KEY = 'boutique_auth_user';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API Client] ${endpoint} error:`, error.message);
    throw error;
  }
}

export const ApiClient = {
  // Health check
  async isServerOnline() {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET', cache: 'no-cache' });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Authentication
  auth: {
    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    getCurrentUser() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },

    async register(userData) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (data.token && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },

    async login(email, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data;
    },

    async me() {
      const data = await request('/auth/me');
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
      return data.user;
    },

    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {}
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  // Products
  products: {
    getAll: () => request('/products'),
    create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    addReview: (id, review) => request(`/products/${id}/reviews`, { method: 'POST', body: JSON.stringify(review) })
  },

  // Orders
  orders: {
    getAll: () => request('/orders'),
    create: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    updateStatus: (id, statusPayload) => request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusPayload)
    })
  },

  // Coupons
  coupons: {
    getAll: () => request('/coupons'),
    create: (data) => request('/coupons', { method: 'POST', body: JSON.stringify(data) }),
    toggle: (id) => request(`/coupons/${id}/toggle`, { method: 'PUT' }),
    delete: (id) => request(`/coupons/${id}`, { method: 'DELETE' })
  },

  // Audit Logs (Admin only)
  auditLogs: {
    getAll: () => request('/audit-logs')
  },

  // Helper for auth headers
  _authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Shopee Scraper & Sync
  shopee: {
    scrape: (keywords = []) => request('/shopee/scrape', {
      method: 'POST',
      body: JSON.stringify({ keywords })
    }),
    importProducts: (products) => request('/shopee/import', {
      method: 'POST',
      body: JSON.stringify({ products })
    }),
    getStatus: () => request('/shopee/status')
  }
};

