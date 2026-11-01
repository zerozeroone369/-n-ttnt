import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_COUPONS, STORE_INFO, INITIAL_CHAT_MESSAGES } from '../data/initialData.js';

const KEYS = {
  PRODUCTS: 'boutique_products_v2',
  ORDERS: 'boutique_orders_v2',
  COUPONS: 'boutique_coupons_v2',
  CART: 'boutique_cart_v2',
  WISHLIST: 'boutique_wishlist_v2',
  CHAT: 'boutique_chat_v2',
  SETTINGS: 'boutique_settings_v2',
  UPDATES: 'boutique_updates_v2'
};

export const StorageService = {
  getProducts() {
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products) {
    try {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error("Failed to save products", e);
    }
  },

  updateProduct(updatedProduct) {
    const products = this.getProducts();
    const updated = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
    this.saveProducts(updated);
    return updated;
  },

  addProductReview(productId, review) {
    const products = this.getProducts();
    const updated = products.map(p => {
      if (p.id === productId) {
        const existingReviews = p.reviews || [];
        const newReviews = [review, ...existingReviews];
        const totalRating = newReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = (totalRating / newReviews.length).toFixed(1);

        return {
          ...p,
          reviews: newReviews,
          reviewsCount: newReviews.length,
          rating: parseFloat(avgRating)
        };
      }
      return p;
    });

    this.saveProducts(updated);
    return updated;
  },

  getOrders() {
    try {
      const data = localStorage.getItem(KEYS.ORDERS);
      if (!data) {
        localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
        return INITIAL_ORDERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ORDERS;
    }
  },

  saveOrders(orders) {
    try {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error("Failed to save orders", e);
    }
  },

  addOrder(order) {
    const orders = this.getOrders();
    const updated = [order, ...orders];
    this.saveOrders(updated);
    return updated;
  },

  getCoupons() {
    try {
      const data = localStorage.getItem(KEYS.COUPONS);
      if (!data) {
        localStorage.setItem(KEYS.COUPONS, JSON.stringify(INITIAL_COUPONS));
        return INITIAL_COUPONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_COUPONS;
    }
  },

  saveCoupons(coupons) {
    try {
      localStorage.setItem(KEYS.COUPONS, JSON.stringify(coupons));
    } catch (e) {
      console.error("Failed to save coupons", e);
    }
  },

  addCoupon(coupon) {
    const coupons = this.getCoupons();
    const updated = [coupon, ...coupons];
    this.saveCoupons(updated);
    return updated;
  },

  deleteCoupon(couponId) {
    const coupons = this.getCoupons();
    const updated = coupons.filter(c => c.id !== couponId && c.code !== couponId);
    this.saveCoupons(updated);
    return updated;
  },

  toggleCouponActive(couponId) {
    const coupons = this.getCoupons();
    const updated = coupons.map(c => {
      if (c.id === couponId || c.code === couponId) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });
    this.saveCoupons(updated);
    return updated;
  },

  getCart() {
    try {
      const data = localStorage.getItem(KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCart(cart) {
    try {
      localStorage.setItem(KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  },

  getWishlist() {
    try {
      const data = localStorage.getItem(KEYS.WISHLIST);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveWishlist(wishlist) {
    try {
      localStorage.setItem(KEYS.WISHLIST, JSON.stringify(wishlist));
    } catch (e) {
      console.error("Failed to save wishlist", e);
    }
  },

  toggleWishlist(productId) {
    const current = this.getWishlist();
    let updated;
    if (current.includes(productId)) {
      updated = current.filter(id => id !== productId);
    } else {
      updated = [...current, productId];
    }
    this.saveWishlist(updated);
    return updated;
  },

  getChatHistory() {
    try {
      const data = localStorage.getItem(KEYS.CHAT);
      if (!data) {
        localStorage.setItem(KEYS.CHAT, JSON.stringify(INITIAL_CHAT_MESSAGES));
        return INITIAL_CHAT_MESSAGES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CHAT_MESSAGES;
    }
  },

  saveChatHistory(history) {
    try {
      localStorage.setItem(KEYS.CHAT, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  },

  getSettings() {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : { apiKey: "", aiProvider: "gemini" };
    } catch {
      return { apiKey: "", aiProvider: "gemini" };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  getShopUpdates() {
    try {
      const data = localStorage.getItem(KEYS.UPDATES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveShopUpdates(updates) {
    try {
      localStorage.setItem(KEYS.UPDATES, JSON.stringify(updates));
    } catch (e) {
      console.error("Failed to save shop updates", e);
    }
  },

  saveShopUpdate(update) {
    const updates = this.getShopUpdates();
    const updated = [update, ...updates.filter(u => u.id !== update.id)].slice(0, 50);
    this.saveShopUpdates(updated);
    return updated;
  },

  importShopeeProducts(newProducts) {
    if (!Array.isArray(newProducts) || newProducts.length === 0) return 0;
    const existing = this.getProducts();
    const existingNames = new Set(existing.map(p => (p.name || '').trim().toLowerCase()));

    const formatted = [];
    newProducts.forEach((item, index) => {
      const cleanName = (item.name || '').trim();
      if (!cleanName || existingNames.has(cleanName.toLowerCase())) return;

      const mapped = {
        id: item.id || `sp-shp-${Date.now()}-${index}`,
        name: cleanName,
        category: item.category || 'fashion',
        price: Number(item.price) || 99000,
        originalPrice: Number(item.orig || item.originalPrice) || Math.round((Number(item.price) || 99000) * 1.3),
        rating: Number(item.rating) || 4.8,
        reviewsCount: Number(item.reviews || item.reviewsCount) || 120,
        stock: Number(item.stock) || 50,
        isFeatured: index < 3,
        isNew: true,
        isFlashSale: index % 4 === 0,
        images: Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80'],
        variants: item.variants || { colors: ['Mặc định'], sizes: ['Tiêu chuẩn'] },
        shortDesc: item.shortDesc || `Sản phẩm Shopee - ${cleanName.substring(0, 60)}`,
        desc: item.desc || cleanName,
        specs: item.specs || { 'Nguồn gốc': 'Shopee Mall / Shopee Choice', 'Từ khóa': item.keyword || '' },
        tags: Array.isArray(item.tags) ? item.tags : [item.category || 'shopee', 'shopee', ...(item.keyword || '').split(' ').filter(w => w.length > 2)],
        reviews: []
      };

      formatted.push(mapped);
      existingNames.add(cleanName.toLowerCase());
    });

    if (formatted.length > 0) {
      const merged = [...formatted, ...existing];
      this.saveProducts(merged);
    }

    return formatted.length;
  },

  resetAllData() {
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.COUPONS);
    localStorage.removeItem(KEYS.CART);
    localStorage.removeItem(KEYS.WISHLIST);
    localStorage.removeItem(KEYS.CHAT);
    localStorage.removeItem(KEYS.UPDATES);
    return {
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      coupons: INITIAL_COUPONS,
      chat: INITIAL_CHAT_MESSAGES,
      wishlist: [],
      cart: []
    };
  },

  // Client-side authentication fallback (ideal for static deployments like Vercel)
  getRegisteredUsers() {
    try {
      const data = localStorage.getItem('boutique_users_v2');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveRegisteredUsers(users) {
    try {
      localStorage.setItem('boutique_users_v2', JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save registered users', e);
    }
  },

  authenticateUser(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Default built-in system accounts
    const defaultAccounts = [
      {
        id: 'usr_admin',
        email: 'admin@tiemnhanho.vn',
        password: 'admin123',
        name: 'Chủ Tiệm (Admin)',
        phone: '0982 123 456',
        address: '48 Ngõ 12 Đặng Thai Mai, Tây Hồ',
        city: 'Hà Nội',
        role: 'admin',
        createdAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'usr_staff',
        email: 'staff@tiemnhanho.vn',
        password: 'staff123',
        name: 'Lan Nguyễn (Kho & Đóng Gói)',
        phone: '0978 889 990',
        address: 'Kho Đóng Gói Bát Tràng',
        city: 'Hà Nội',
        role: 'staff',
        createdAt: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 'usr_cust_01',
        email: 'khachhang@gmail.com',
        password: 'khach123',
        name: 'Nguyễn Thu Hà',
        phone: '0912 345 678',
        address: 'Tòa S2.05 Vinhomes Ocean Park, Gia Lâm',
        city: 'Hà Nội',
        role: 'customer',
        createdAt: '2025-01-01T00:00:00.000Z'
      }
    ];

    const registeredUsers = this.getRegisteredUsers();
    const allUsers = [...defaultAccounts, ...registeredUsers];

    const user = allUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error('Email không tồn tại trong hệ thống.');
    }

    if (user.password !== cleanPass) {
      throw new Error('Mật khẩu không chính xác.');
    }

    const { password: _, ...safeUser } = user;
    const token = `token_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    localStorage.setItem('boutique_auth_token', token);
    localStorage.setItem('boutique_auth_user', JSON.stringify(safeUser));

    return { token, user: safeUser };
  },

  registerUser(userData) {
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanPass = (userData.password || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Vui lòng nhập email và mật khẩu.');
    }

    const defaultAccounts = [
      { email: 'admin@tiemnhanho.vn' },
      { email: 'staff@tiemnhanho.vn' },
      { email: 'khachhang@gmail.com' }
    ];

    const registeredUsers = this.getRegisteredUsers();
    if (defaultAccounts.some(u => u.email === cleanEmail) || registeredUsers.some(u => (u.email || '').toLowerCase() === cleanEmail)) {
      throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập.');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      email: cleanEmail,
      password: cleanPass,
      name: userData.name || cleanEmail.split('@')[0],
      phone: userData.phone || '',
      address: userData.address || '',
      city: userData.city || 'Hà Nội',
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    registeredUsers.push(newUser);
    this.saveRegisteredUsers(registeredUsers);

    const { password: _, ...safeUser } = newUser;
    const token = `token_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    localStorage.setItem('boutique_auth_token', token);
    localStorage.setItem('boutique_auth_user', JSON.stringify(safeUser));

    return { token, user: safeUser };
  }
};
