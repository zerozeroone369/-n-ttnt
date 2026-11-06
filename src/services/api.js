const API_BASE = '/api';
const TOKEN_KEY = 'boutique_auth_token';
const USER_KEY = 'boutique_auth_user';
const LOCAL_USERS_KEY = 'boutique_local_users';

const DEFAULT_DEMO_USERS = [
  {
    id: 'usr_admin',
    email: 'admin@tiemnhanho.vn',
    password: 'admin123',
    name: 'Chủ Tiệm (Admin)',
    phone: '0982 123 456',
    address: '48 Ngõ 12 Đặng Thai Mai, Tây Hồ',
    city: 'Hà Nội',
    role: 'admin'
  },
  {
    id: 'usr_staff',
    email: 'staff@tiemnhanho.vn',
    password: 'staff123',
    name: 'Lan Nguyễn (Kho & Đóng Gói)',
    phone: '0978 889 990',
    address: 'Kho Đóng Gói Bát Tràng',
    city: 'Hà Nội',
    role: 'staff'
  },
  {
    id: 'usr_customer',
    email: 'khachhang@gmail.com',
    password: 'khach123',
    name: 'Mai Phương (Khách Thân Thiết)',
    phone: '0912 345 678',
    address: 'Số 15 Phố Huế, Hoàn Kiếm',
    city: 'Hà Nội',
    role: 'customer'
  }
];

function getLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
      return DEFAULT_DEMO_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_USERS;
  }
}

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
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;
      const data = await res.json();
      return data?.status === 'online';
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
      if (await ApiClient.isServerOnline()) {
        try {
          const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
          });
          if (data.token && data.user) {
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          }
          return data;
        } catch (err) {
          if (err.message && !err.message.includes('405') && !err.message.includes('404')) {
            throw err;
          }
        }
      }

      // Offline / Vercel fallback
      const users = getLocalUsers();
      const normEmail = (userData.email || '').trim().toLowerCase();
      if (users.some(u => u.email.toLowerCase() === normEmail)) {
        throw new Error('Email này đã được đăng ký tài khoản.');
      }

      const newUser = {
        id: `usr_${Date.now()}`,
        email: normEmail,
        password: userData.password,
        name: userData.name?.trim() || 'Khách hàng',
        phone: userData.phone?.trim() || '',
        address: userData.address?.trim() || '',
        city: userData.city?.trim() || 'Hà Nội',
        role: 'customer'
      };

      users.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));

      const sessionUser = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address,
        city: newUser.city
      };
      const token = `local_token_${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));

      return {
        token,
        user: sessionUser,
        message: 'Đăng ký thành công'
      };
    },

    async login(email, password) {
      if (await ApiClient.isServerOnline()) {
        try {
          const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });
          if (data.token && data.user) {
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          }
          return data;
        } catch (err) {
          if (err.message && !err.message.includes('405') && !err.message.includes('404')) {
            throw err;
          }
        }
      }

      // Chế độ Cloud 24/7 (Vercel) / Offline fallback
      const users = getLocalUsers();
      const normEmail = (email || '').trim().toLowerCase();
      const user = users.find(u => u.email.toLowerCase() === normEmail);

      if (!user || user.password !== password) {
        throw new Error('Email hoặc mật khẩu không chính xác.');
      }

      const sessionUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || ''
      };
      const token = `local_token_${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));

      return {
        token,
        user: sessionUser,
        message: 'Đăng nhập thành công'
      };
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
    scrape: (keywords = [], limit = 20) => request('/shopee/scrape', {
      method: 'POST',
      body: JSON.stringify({ keywords, limit })
    }),
    importProducts: (products) => request('/shopee/import', {
      method: 'POST',
      body: JSON.stringify({ products })
    }),
    getStatus: async () => {
      try {
        const res = await fetch('/api/shopee/status');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return await res.json();
        }
      } catch {}
      // Fallback nạp dữ liệu cào thật đã đóng gói cho Vercel Cloud tĩnh
      try {
        const staticRes = await fetch('/shopee_scraped.json');
        if (staticRes.ok) {
          const results = await staticRes.json();
          return { running: false, progress: 'Nạp dữ liệu Shopee đóng gói', results };
        }
      } catch {}
      return { running: false, results: [] };
    }
  }
};

