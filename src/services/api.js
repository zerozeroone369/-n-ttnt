const DEFAULT_RENDER_BACKEND_ORIGIN = 'https://n-ttnt.onrender.com';

export function resolveApiBase(
  rawBase,
  hostname = (typeof window !== 'undefined' ? window.location?.hostname : '')
) {
  const cleaned = String(rawBase || '').trim().replace(/\/+$/, '');
  if (!cleaned) {
    if (hostname && /\.vercel\.app$/i.test(hostname)) {
      return `${DEFAULT_RENDER_BACKEND_ORIGIN}/api`;
    }
    return '/api';
  }
  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned.toLowerCase().endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export function resolveBackendOrigin(apiBase = API_BASE) {
  const match = String(apiBase || '').match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : '';
}

export const API_BASE = resolveApiBase(import.meta.env?.VITE_API_BASE);
export const BACKEND_ORIGIN = resolveBackendOrigin(API_BASE);

export function resolveMediaUrl(url, origin = BACKEND_ORIGIN) {
  if (!url || typeof url !== 'string') return '/placeholder.svg';
  const trimmed = url.trim();
  if (!trimmed) return '/placeholder.svg';
  if (origin && trimmed.startsWith('/products/shopee_live/')) {
    return `${origin}${trimmed}`;
  }
  return trimmed;
}

const TOKEN_KEY = 'boutique_auth_token';
const USER_KEY = 'boutique_auth_user';
const LEGACY_LOCAL_USERS_KEY = 'boutique_local_users';

export const IS_DEMO_MODE_ALLOWED = Boolean(
  import.meta.env?.DEV || import.meta.env?.VITE_ENABLE_DEMO_AUTH === 'true'
);

const DEMO_OFFLINE_PROFILES = {
  admin: {
    id: 'demo_offline_admin',
    email: 'admin@tiemnhanho.vn',
    name: 'Chủ Tiệm (Demo Offline)',
    phone: '0982 123 456',
    address: '48 Ngõ 12 Đặng Thai Mai, Tây Hồ',
    city: 'Hà Nội',
    role: 'admin',
    isOfflineDemo: true
  },
  staff: {
    id: 'demo_offline_staff',
    email: 'staff@tiemnhanho.vn',
    name: 'Nhân Viên (Demo Offline)',
    phone: '0978 889 990',
    address: 'Kho Đóng Gói Bát Tràng',
    city: 'Hà Nội',
    role: 'staff',
    isOfflineDemo: true
  },
  customer: {
    id: 'demo_offline_customer',
    email: 'khachhang@gmail.com',
    name: 'Khách Mua (Demo Offline)',
    phone: '0912 345 678',
    address: 'Số 15 Phố Huế, Hoàn Kiếm',
    city: 'Hà Nội',
    role: 'customer',
    isOfflineDemo: true
  }
};

async function request(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      cache: options.cache || 'no-store',
      ...options,
      headers
    });
  } catch (networkErr) {
    const err = new Error('Không thể kết nối tới máy chủ backend.');
    err.isNetworkError = true;
    err.cause = networkErr;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const errorData = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {};
    const err = new Error(errorData.error || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.isAuthError = response.status === 401 || response.status === 403;
    err.data = errorData;
    throw err;
  }

  if (!contentType.includes('application/json')) {
    const err = new Error('Phản hồi từ máy chủ không phải định dạng JSON hợp lệ (có thể backend chưa chạy).');
    err.isInvalidContentType = true;
    throw err;
  }

  return await response.json();
}

export const ApiClient = {
  // Health check & Server Persistence metadata (tự động thử lại nếu Render Free đang thức dậy)
  async getHealth() {
    return request('/health', { cache: 'no-store' });
  },

  async isServerOnline(retries = 2, delayMs = 3000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/health`, {
          method: 'GET',
          cache: 'no-store',
          ...(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? { signal: AbortSignal.timeout(15000) }
            : {})
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data?.status === 'online') return true;
          }
          return false;
        }
        if (res.status !== 502 && res.status !== 503 && res.status !== 504) {
          return false;
        }
      } catch {
        // retry on cold start/network blip
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return false;
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

    clearLocalSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LEGACY_LOCAL_USERS_KEY);
    },

    async register(userData) {
      if (!(await ApiClient.isServerOnline())) {
        const err = new Error(
          'Máy chủ xác thực hiện không phản hồi hoặc đang chạy web tĩnh. Không thể đăng ký tài khoản thật lên hệ thống.'
        );
        err.isBackendOffline = true;
        throw err;
      }

      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (!data?.token || !data?.user) {
        throw new Error('Máy chủ không cấp được phiên đăng nhập hợp lệ sau khi đăng ký.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    },

    async login(email, password) {
      if (!(await ApiClient.isServerOnline())) {
        const err = new Error(
          'Không kết nối được máy chủ xác thực. Vui lòng bật backend server để đăng nhập tài khoản thật.'
        );
        err.isBackendOffline = true;
        throw err;
      }

      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (!data?.token || !data?.user) {
        throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    },

    enterOfflineDemoSession(role = 'customer') {
      if (!IS_DEMO_MODE_ALLOWED) {
        throw new Error('Chế độ Demo Offline không được bật trong môi trường production.');
      }
      const profile = DEMO_OFFLINE_PROFILES[role] || DEMO_OFFLINE_PROFILES.customer;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
      return { token: null, user: profile, isOfflineDemo: true };
    },

    async me() {
      try {
        const data = await request('/auth/me');
        if (data?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
        return data.user;
      } catch (err) {
        if (err.status === 401) {
          ApiClient.auth.clearLocalSession();
        }
        throw err;
      }
    },

    async logout() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          await request('/auth/logout', { method: 'POST' });
        } catch {
          // Best-effort server logout
        }
      }
      ApiClient.auth.clearLocalSession();
    }
  },

  // Products
  products: {
    getAll: () => request('/products', { cache: 'no-store' }),
    create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publishDrafts: (payload = {}) => request('/products/publish-drafts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
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

  // AI Chat Status & Testing
  chat: {
    getStatus: () => request('/chat/status'),
    testConnection: () => request('/chat/test', { method: 'POST' })
  },

  // Helper for auth headers
  _authHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Shopee Scraper & Sync
  shopee: {
    scrape: (keywords = [], limit = 20, provider = '') => request('/shopee/scrape', {
      method: 'POST',
      body: JSON.stringify({
        keywords,
        limit,
        ...(provider ? { provider } : {})
      })
    }),
    submitBridge: (payload) => request('/shopee/bridge-submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getExtensionDownloadUrl: () => `${API_BASE}/shopee/extension.zip`,
    importProducts: (products, options = {}) => request('/shopee/import', {
      method: 'POST',
      body: JSON.stringify({ products, ...options })
    }),
    getStatus: (sessionId = '') => {
      const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
      return request(`/shopee/status${qs}`);
    },
    getScraperConfig: () => request('/shopee/scraper-config'),
    updateScraperConfig: (payload) => request('/shopee/scraper-config', {
      method: 'PUT',
      body: JSON.stringify(payload || {})
    }),
    getCookieStatus: () => request('/shopee/cookie-status'),
    updateCookie: (cookie) => request('/shopee/cookie', {
      method: 'PUT',
      body: JSON.stringify({ cookie })
    })
  }
};
