import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_COUPONS, STORE_INFO, INITIAL_CHAT_MESSAGES } from '../data/initialData.js';

const KEYS = {
  PRODUCTS: 'boutique_products_v2',
  ORDERS: 'boutique_orders_v2',
  COUPONS: 'boutique_coupons_v2',
  CART: 'boutique_cart_v2',
  WISHLIST: 'boutique_wishlist_v2',
  CHAT: 'boutique_chat_v2',
  SETTINGS: 'boutique_settings_v2'
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
    const defaults = {
      aiProvider: 'local',
      aiProviderExplicit: false,
      assistantScope: 'store'
    };
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) return defaults;
      const parsed = JSON.parse(data);
      return {
        aiProvider: parsed.aiProvider === 'gemini' ? 'gemini' : 'local',
        aiProviderExplicit: Boolean(parsed.aiProviderExplicit),
        assistantScope: parsed.assistantScope === 'general' ? 'general' : 'store'
      };
    } catch {
      return defaults;
    }
  },

  saveSettings(settings) {
    try {
      const clean = {
        aiProvider: settings?.aiProvider === 'gemini' ? 'gemini' : 'local',
        aiProviderExplicit: Boolean(settings?.aiProviderExplicit),
        assistantScope: settings?.assistantScope === 'general' ? 'general' : 'store'
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(clean));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  resetAllData() {
    localStorage.removeItem(KEYS.PRODUCTS);
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.COUPONS);
    localStorage.removeItem(KEYS.CART);
    localStorage.removeItem(KEYS.WISHLIST);
    localStorage.removeItem(KEYS.CHAT);
    return {
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      coupons: INITIAL_COUPONS,
      chat: INITIAL_CHAT_MESSAGES,
      wishlist: [],
      cart: []
    };
  }
};
