import { clientCrawlShopee } from './clientShopeeCrawler.js';
import { StorageService } from './storage.js';

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
  // Health check (resilient: verifies actual JSON response from Node backend)
  async isServerOnline() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${API_BASE}/health`, { 
        method: 'GET', 
        cache: 'no-cache',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;
      const data = await res.json().catch(() => null);
      return data?.status === 'ok';
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

  // Shopee Scraper & Sync (Server with High-Speed Client Fallback)
  shopee: {
    async scrape(keywords = []) {
      const cleanKeywords = Array.isArray(keywords) && keywords.length > 0 
        ? keywords 
        : ['quần nam', 'áo thun', 'nến thơm'];

      try {
        const isOnline = await ApiClient.isServerOnline();
        if (isOnline) {
          const res = await request('/shopee/scrape', {
            method: 'POST',
            body: JSON.stringify({ keywords: cleanKeywords })
          });
          if (res && res.results && res.results.length > 0) {
            return res;
          }
        }
      } catch (err) {
        console.warn('[Shopee Scraper] Server scrape failed, activating high-speed client fallback:', err.message);
      }

      // Seamless fallback to client crawler engine
      const results = clientCrawlShopee(cleanKeywords, 6);
      return {
        success: true,
        count: results.length,
        results,
        mode: 'client_crawler'
      };
    },

    async importProducts(products) {
      if (!Array.isArray(products) || products.length === 0) {
        return { success: false, error: 'Không có sản phẩm nào được chọn.' };
      }

      try {
        const isOnline = await ApiClient.isServerOnline();
        if (isOnline) {
          return await request('/shopee/import', {
            method: 'POST',
            body: JSON.stringify({ products })
          });
        }
      } catch (err) {
        console.warn('[Shopee Import] Server import failed, saving directly to local storage:', err.message);
      }

      // Offline / Static Vercel client import
      const importedCount = StorageService.importShopeeProducts(products);
      const updateRecord = {
        id: `upd_${Date.now()}`,
        type: 'SHOPEE_IMPORT',
        title: 'Sản phẩm mới từ Shopee',
        message: `Cửa hàng vừa cập nhật thêm ${importedCount} sản phẩm mới từ Shopee!`,
        count: importedCount,
        productsSample: products.slice(0, 6).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.orig || p.originalPrice || Math.round(p.price * 1.3),
          image: p.images?.[0],
          category: p.category
        })),
        shopVersion: Date.now(),
        timestamp: new Date().toISOString()
      };

      StorageService.saveShopUpdate(updateRecord);

      // Trigger local custom event for instant banner & reactivity
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tiem_nha_nho_shop_update', {
          detail: updateRecord
        }));
      }

      return {
        success: true,
        imported: importedCount,
        total: StorageService.getProducts().length,
        mode: 'client_local'
      };
    },

    async getStatus() {
      try {
        if (await ApiClient.isServerOnline()) {
          return await request('/shopee/status');
        }
      } catch {}
      return { 
        status: 'idle', 
        totalInDb: StorageService.getProducts().length, 
        mode: 'client_local' 
      };
    }
  },

  // App Version & In-App OTA
  app: {
    async getVersion() {
      try {
        if (await ApiClient.isServerOnline()) {
          return await request('/app/version');
        }
      } catch {}
      return {
        version: '1.1.0',
        name: 'Tiệm Nhà Nhỏ Mobile PWA',
        channel: 'production',
        releaseDate: new Date().toISOString().split('T')[0],
        features: ['Shopee Live Sync', 'PWA Offline & OTA Updates', 'AI Chatbot 24/7']
      };
    }
  },

  // Shop Updates & History
  shop: {
    async getUpdates() {
      try {
        if (await ApiClient.isServerOnline()) {
          return await request('/shop/updates');
        }
      } catch {}
      return StorageService.getShopUpdates();
    }
  },

  // Real-Time Event Hub (SSE + Local Custom Events)
  events: {
    subscribe(onEvent) {
      if (typeof window === 'undefined') {
        return () => {};
      }

      let eventSource = null;
      let retryTimer = null;
      let isUnmounted = false;

      // Handle custom local dispatch (works without backend or offline)
      const handleCustomLocalUpdate = (e) => {
        if (e && e.detail) {
          onEvent({ type: 'SHOP_UPDATE', data: e.detail });
        }
      };

      // Handle storage event when another tab updates products
      const handleStorageUpdate = (e) => {
        if (e.key === 'boutique_products_v2') {
          onEvent({ type: 'PRODUCT_UPDATE', data: { timestamp: new Date().toISOString() } });
        }
      };

      window.addEventListener('tiem_nha_nho_shop_update', handleCustomLocalUpdate);
      window.addEventListener('storage', handleStorageUpdate);

      const connect = () => {
        if (isUnmounted || !window.EventSource) return;
        try {
          eventSource = new EventSource('/api/events');

          eventSource.addEventListener('connected', (e) => {
            try {
              const data = JSON.parse(e.data);
              onEvent({ type: 'CONNECTED', data });
            } catch (err) {}
          });

          eventSource.addEventListener('shop_update', (e) => {
            try {
              const data = JSON.parse(e.data);
              onEvent({ type: 'SHOP_UPDATE', data });
            } catch (err) {}
          });

          eventSource.addEventListener('product_update', (e) => {
            try {
              const data = JSON.parse(e.data);
              onEvent({ type: 'PRODUCT_UPDATE', data });
            } catch (err) {}
          });

          eventSource.onerror = () => {
            eventSource?.close();
            if (!isUnmounted) {
              retryTimer = setTimeout(connect, 7000);
            }
          };
        } catch (err) {
          if (!isUnmounted) {
            retryTimer = setTimeout(connect, 7000);
          }
        }
      };

      connect();

      return () => {
        isUnmounted = true;
        clearTimeout(retryTimer);
        eventSource?.close();
        window.removeEventListener('tiem_nha_nho_shop_update', handleCustomLocalUpdate);
        window.removeEventListener('storage', handleStorageUpdate);
      };
    }
  }
};

