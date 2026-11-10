import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { db, hashPassword, verifyPassword } from './db.js';
import { createSession, destroySession, authenticateUser, requireAuth, requireRole } from './auth.js';
import { filterShopeeCatalog } from '../src/utils/shopeeFilter.js';
import { normalizeShopeeCookieHeader } from '../src/utils/shopeeCookie.js';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const SHOPEE_COOKIE_PATH = process.env.SHOPEE_COOKIE_FILE || join(PROJECT_ROOT, 'shopee_cookie.txt');
const SCRAPER_CONFIG_LOCAL_PATH = process.env.SCRAPER_CONFIG_FILE || join(PROJECT_ROOT, 'server', 'data', 'scraper_config.local.json');

// Shared AI & Scraper Configuration (Single Source of Truth)
const GEMINI_API_VERSION = 'v1';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_MAX_OUTPUT_TOKENS = Math.max(1024, Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 4096);
const GEMINI_REQUEST_TIMEOUT_MS = 60 * 1000;
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const SCRAPE_TIMEOUT_MS = 300 * 1000; // 5 phút cho Scraping API render JS đa từ khóa

const SCRAPING_PROVIDERS = ['zenrows', 'scraperapi', 'crawlbase'];

function maskSecretValue(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (s.length <= 10) return '********';
  return `${s.substring(0, 6)}...${s.slice(-4)}`;
}

function loadLocalScraperOverride() {
  if (!existsSync(SCRAPER_CONFIG_LOCAL_PATH)) {
    return { selectedProvider: null, keys: {}, updatedAt: null };
  }
  try {
    const raw = readFileSync(SCRAPER_CONFIG_LOCAL_PATH, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    return {
      selectedProvider: parsed?.selectedProvider || null,
      keys: typeof parsed?.keys === 'object' && parsed.keys ? parsed.keys : {},
      updatedAt: parsed?.updatedAt || null
    };
  } catch {
    return { selectedProvider: null, keys: {}, updatedAt: null };
  }
}

function getEffectiveScraperConfig() {
  const local = loadLocalScraperOverride();
  const envSelected = String(process.env.SCRAPING_PROVIDER || 'auto').trim().toLowerCase();
  const selectedProvider = ['auto', ...SCRAPING_PROVIDERS].includes(local.selectedProvider)
    ? local.selectedProvider
    : (['auto', ...SCRAPING_PROVIDERS].includes(envSelected) ? envSelected : 'auto');

  const resolveKey = (prov, envKey, altEnvKey) => {
    const localVal = String(local.keys?.[prov] || '').trim();
    if (localVal) return { key: localVal, source: 'admin_runtime' };
    const envVal = String(process.env[envKey] || (altEnvKey ? process.env[altEnvKey] : '') || '').trim();
    if (envVal) return { key: envVal, source: 'env' };
    return { key: '', source: null };
  };

  const resolvedMap = {
    zenrows: resolveKey('zenrows', 'ZENROWS_API_KEY'),
    scraperapi: resolveKey('scraperapi', 'SCRAPERAPI_KEY'),
    crawlbase: resolveKey('crawlbase', 'CRAWLBASE_TOKEN', 'CRAWLBASE_API_KEY')
  };

  let activeProvider = null;
  if (selectedProvider !== 'auto') {
    if (resolvedMap[selectedProvider]?.key) {
      activeProvider = selectedProvider;
    }
  } else {
    activeProvider = SCRAPING_PROVIDERS.find(p => Boolean(resolvedMap[p]?.key)) || null;
  }

  return {
    configured: Boolean(activeProvider),
    selectedProvider,
    activeProvider,
    envVars: {
      SCRAPING_PROVIDER: selectedProvider,
      ...(resolvedMap.zenrows.key ? { ZENROWS_API_KEY: resolvedMap.zenrows.key } : {}),
      ...(resolvedMap.scraperapi.key ? { SCRAPERAPI_KEY: resolvedMap.scraperapi.key } : {}),
      ...(resolvedMap.crawlbase.key ? { CRAWLBASE_TOKEN: resolvedMap.crawlbase.key } : {})
    },
    publicMeta: {
      configured: Boolean(activeProvider),
      selectedProvider,
      activeProvider,
      updatedAt: local.updatedAt || null,
      providers: {
        zenrows: {
          configured: Boolean(resolvedMap.zenrows.key),
          keyMasked: maskSecretValue(resolvedMap.zenrows.key),
          source: resolvedMap.zenrows.source
        },
        scraperapi: {
          configured: Boolean(resolvedMap.scraperapi.key),
          keyMasked: maskSecretValue(resolvedMap.scraperapi.key),
          source: resolvedMap.scraperapi.source
        },
        crawlbase: {
          configured: Boolean(resolvedMap.crawlbase.key),
          keyMasked: maskSecretValue(resolvedMap.crawlbase.key),
          source: resolvedMap.crawlbase.source
        }
      }
    }
  };
}

// Kiểm tra Gemini & Scraping API Key khi khởi động
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_CONFIGURED = !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
if (GEMINI_CONFIGURED) {
  console.log(`✨ [Gemini] API Key đã cấu hình (${GEMINI_API_KEY.substring(0, 6)}...) · Model: ${GEMINI_MODEL}`);
} else {
  console.log('⚠️  [Gemini] Chưa cấu hình API Key — chatbot sẽ báo trạng thái chưa cấu hình hoặc dùng chế độ cục bộ khi người dùng chọn');
}

const startupScraperCfg = getEffectiveScraperConfig();
if (startupScraperCfg.configured) {
  const activeMeta = startupScraperCfg.publicMeta.providers[startupScraperCfg.activeProvider];
  console.log(`🛒 [Shopee Option B] Scraping API sẵn sàng: ${startupScraperCfg.activeProvider.toUpperCase()} (${activeMeta?.keyMasked})`);
} else {
  console.log('⚠️  [Shopee Option B] Chưa cấu hình Scraping API Key (ZENROWS_API_KEY / SCRAPERAPI_KEY / CRAWLBASE_TOKEN).');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(authenticateUser);

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT ROUTES
// ============================================================================

// Register new customer account
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, address, city } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ Email, Mật khẩu và Họ tên.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Định dạng email không hợp lệ.' });
  }

  const trimmedName = String(name).trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({ error: 'Họ tên phải có ít nhất 2 ký tự.' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  const existingUser = db.findOne('users', u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: 'Email này đã được đăng ký tài khoản.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser = db.insert('users', {
    id: `usr_${Date.now()}`,
    email: normalizedEmail,
    passwordHash: hash,
    salt,
    name: trimmedName,
    phone: phone?.trim() || '',
    address: address?.trim() || '',
    city: city?.trim() || 'Hà Nội',
    role: 'customer' // Customer role by default
  });

  db.logAudit(newUser.id, newUser.name, 'customer', 'REGISTER', newUser.id, `Khách hàng mới tạo tài khoản: ${newUser.email}`);
  const session = createSession(newUser);
  res.status(201).json(session);
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.findOne('users', u => u.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
  }

  db.logAudit(user.id, user.name, user.role, 'LOGIN', user.id, `Đăng nhập thành công vào hệ thống với vai trò ${user.role}`);
  const session = createSession(user);
  res.json(session);
});

// Get current logged-in user profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  if (req.token) {
    destroySession(req.token);
  }
  res.json({ message: 'Đăng xuất thành công.' });
});

// ============================================================================
// 2. PRODUCT MANAGEMENT ROUTES
// ============================================================================

// Get all products
app.get('/api/products', (req, res) => {
  const products = db.get('products');
  res.json(products);
});

// Create product (Admin only)
app.post('/api/products', requireRole(['admin']), (req, res) => {
  const newProduct = db.insert('products', req.body);
  db.logAudit(req.user.id, req.user.name, req.user.role, 'PRODUCT_CREATE', newProduct.id, `Thêm sản phẩm mới: ${newProduct.name}`);
  res.status(201).json(newProduct);
});

// Update product (Admin only)
app.put('/api/products/:id', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const updated = db.update('products', p => p.id === id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  }
  db.logAudit(req.user.id, req.user.name, req.user.role, 'PRODUCT_UPDATE', id, `Chỉnh sửa sản phẩm: ${updated.name}`);
  res.json(updated);
});

// Delete product (Admin only)
app.delete('/api/products/:id', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const target = db.findOne('products', p => p.id === id);
  const isDeleted = db.delete('products', p => p.id === id);
  if (!isDeleted) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  }
  db.logAudit(req.user.id, req.user.name, req.user.role, 'PRODUCT_DELETE', id, `Xóa sản phẩm: ${target?.name || id}`);
  res.json({ message: 'Đã xóa sản phẩm thành công.' });
});

// Add Review to Product
app.post('/api/products/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { rating, comment, author } = req.body;

  // Xác thực quyền đánh giá: Chỉ gắn nhãn "Đã mua hàng" (verified: true) nếu khách hàng đã đăng nhập
  // và có đơn hàng thành công (status: delivered) chứa sản phẩm này trong lịch sử mua hàng.
  let isVerifiedBuyer = false;
  if (req.user) {
    const deliveredOrder = db.findOne('orders', o => 
      o.customerId === req.user.id &&
      o.orderStatus === 'delivered' &&
      Array.isArray(o.items) &&
      o.items.some(it => (it.productId || it.id) === id)
    );
    if (deliveredOrder) {
      isVerifiedBuyer = true;
    }
  }

  const reviewAuthor = req.user?.name || author || 'Khách ghé thăm';
  const newReview = {
    id: `rev_${Date.now()}`,
    author: reviewAuthor,
    userId: req.user?.id || null,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: (comment || '').trim(),
    date: new Date().toISOString().split('T')[0],
    verified: isVerifiedBuyer
  };

  const updatedProduct = db.update('products', p => p.id === id, (product) => {
    const reviews = product.reviews || [];
    const updatedReviews = [newReview, ...reviews];
    const avgRating = (
      updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length
    ).toFixed(1);

    return {
      ...product,
      reviews: updatedReviews,
      reviewsCount: updatedReviews.length,
      rating: parseFloat(avgRating)
    };
  });

  if (!updatedProduct) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
  }

  res.status(201).json({ review: newReview, product: updatedProduct });
});

// ============================================================================
// 3. ORDER MANAGEMENT ROUTES & AUDIT LOGGING
// ============================================================================

// Get orders: Admin & Staff see all orders; Authenticated Customers ONLY see their own orders
app.get('/api/orders', (req, res) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    return res.json(db.get('orders'));
  }

  if (req.user && req.user.role === 'customer') {
    // Phân quyền bảo mật: Chỉ lấy đúng các đơn gắn customerId của người dùng đã xác thực
    const customerOrders = db.find('orders', o => o.customerId === req.user.id);
    return res.json(customerOrders);
  }

  return res.status(401).json({ error: 'Yêu cầu đăng nhập để xem đơn hàng.' });
});

// Tra cứu đơn hàng an toàn cho khách vãng lai (Guest) - Đòi hỏi cả Order ID và Số điện thoại nhận hàng
app.post('/api/orders/track', (req, res) => {
  const { orderId, phone } = req.body;
  if (!orderId || !phone) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ Mã đơn hàng và Số điện thoại đặt hàng.' });
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  const order = db.findOne('orders', o => 
    o.id.toLowerCase() === String(orderId).trim().toLowerCase() &&
    String(o.customer?.phone || '').replace(/\D/g, '') === cleanPhone
  );

  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng phù hợp với thông tin đã nhập.' });
  }

  res.json(order);
});

// Create new order - SERVER TỰ TÍNH TOÁN TOÀN BỘ GIÁ TIỀN & PHÍ VẬN CHUYỂN
app.post('/api/orders', (req, res) => {
  const orderData = req.body;

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    return res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm.' });
  }

  // 1. Kiểm tra từng sản phẩm và tính toán giá từ DATABASE tin cậy của server (chống can thiệp client)
  let calculatedSubtotal = 0;
  const verifiedItems = [];

  for (const item of orderData.items) {
    const productId = item.productId || item.id;
    const quantity = Number(item.quantity);
    const product = db.findOne('products', p => p.id === productId);

    if (!product) {
      return res.status(400).json({ error: `Sản phẩm ${productId} không tồn tại trong hệ thống.` });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: `Số lượng cho sản phẩm "${product.name}" không hợp lệ.` });
    }

    if (Number(product.stock) < quantity) {
      return res.status(400).json({ 
        error: `Sản phẩm "${product.name}" không đủ hàng trong kho (Còn: ${product.stock}, yêu cầu: ${quantity}).` 
      });
    }

    const itemPrice = Number(product.price) || 0;
    const itemSubtotal = itemPrice * quantity;
    calculatedSubtotal += itemSubtotal;

    verifiedItems.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: itemPrice,
      image: (product.images && product.images[0]) || '/products/sp-001.jpg',
      quantity,
      selectedColor: item.selectedColor || 'Mặc định',
      selectedSize: item.selectedSize || 'Tiêu chuẩn',
      subtotal: itemSubtotal
    });
  }

  // 2. Tính phí vận chuyển ở Server
  // Standard: 30.000đ (miễn phí nếu đơn >= 500.000đ), Express: 45.000đ
  const shippingMethod = orderData.shippingMethod === 'express' ? 'express' : 'standard';
  const isFreeShip = calculatedSubtotal >= 500000;
  const calculatedShippingFee = shippingMethod === 'express' ? 45000 : (isFreeShip ? 0 : 30000);

  // 3. Kiểm tra và áp dụng mã giảm giá (Coupon/Voucher) trên Server
  let calculatedDiscount = 0;
  let verifiedCoupon = null;
  const couponCode = orderData.couponCode || orderData.appliedCoupon?.code;

  if (couponCode) {
    const coupon = db.findOne('coupons', c => c.code.toUpperCase() === String(couponCode).trim().toUpperCase() && c.isActive);
    if (coupon) {
      const minOrder = Number(coupon.minOrder) || 0;
      if (calculatedSubtotal >= minOrder) {
        if (coupon.type === 'percentage') {
          calculatedDiscount = Math.round(calculatedSubtotal * (Number(coupon.discount) / 100));
        } else {
          calculatedDiscount = Math.min(calculatedSubtotal, Number(coupon.discount) || 0);
        }
        verifiedCoupon = {
          code: coupon.code,
          type: coupon.type,
          discount: coupon.discount,
          description: coupon.description || ''
        };
      }
    }
  }

  // 4. Tổng tiền cuối cùng = Subtotal - Discount + ShippingFee
  const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedShippingFee);

  // 5. Sinh mã đơn hàng duy nhất, chống trùng lặp
  const uniqueOrderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    id: uniqueOrderId,
    createdAt: new Date().toISOString(),
    customer: {
      name: orderData.customer?.name || orderData.name || 'Khách vãng lai',
      phone: orderData.customer?.phone || orderData.phone || '',
      email: orderData.customer?.email || orderData.email || (req.user ? req.user.email : ''),
      address: orderData.customer?.address || orderData.address || '',
      city: orderData.customer?.city || orderData.city || 'Hà Nội',
      notes: orderData.customer?.notes || orderData.notes || ''
    },
    items: verifiedItems,
    subtotal: calculatedSubtotal,
    shippingFee: calculatedShippingFee,
    shippingMethod,
    discount: calculatedDiscount,
    appliedCoupon: verifiedCoupon,
    total: calculatedTotal,
    paymentMethod: orderData.paymentMethod || 'cod',
    orderStatus: 'pending',
    paymentStatus: orderData.paymentMethod === 'cod' ? 'unpaid' : 'pending_verification',
    customerId: req.user?.id || null,
    handledBy: 'Chờ phân công',
    timeline: [
      {
        status: 'pending',
        time: new Date().toISOString(),
        note: 'Đơn hàng được khởi tạo thành công và đã được máy chủ tính lại giá an toàn.'
      }
    ]
  };

  const savedOrder = db.insert('orders', newOrder);

  // 6. Trừ tồn kho thực tế trong database
  savedOrder.items.forEach(item => {
    db.update('products', p => p.id === item.productId, p => ({
      ...p,
      stock: Math.max(0, (Number(p.stock) || 0) - item.quantity)
    }));
  });

  db.logAudit(
    req.user?.id || 'guest',
    req.user?.name || savedOrder.customer?.name || 'Khách vãng lai',
    req.user?.role || 'customer',
    'ORDER_CREATE',
    savedOrder.id,
    `Tạo đơn hàng ${savedOrder.id} - Tổng tiền server tính: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(savedOrder.total)}`
  );

  res.status(201).json(savedOrder);
});

// Update Order Status (Staff & Admin only) - Kiểm soát chặt chuyển trạng thái & Hoàn tồn kho khi hủy
app.put('/api/orders/:id/status', requireRole(['admin', 'staff']), (req, res) => {
  const { id } = req.params;
  const { status, trackingCode, trackingCarrier, note } = req.body;

  const statusLabels = {
    pending: 'Chờ xác nhận',
    processing: 'Đang đóng gói',
    shipping: 'Đang giao hàng',
    delivered: 'Đã giao thành công',
    cancelled: 'Đã hủy'
  };

  // Các bước chuyển trạng thái hợp lệ
  const ALLOWED_TRANSITIONS = {
    pending: ['processing', 'cancelled'],
    processing: ['shipping', 'cancelled'],
    shipping: ['delivered', 'cancelled'],
    delivered: [], // Trạng thái kết thúc - không được thay đổi
    cancelled: []  // Trạng thái kết thúc - không thể khôi phục
  };

  const currentOrder = db.findOne('orders', o => o.id === id);
  if (!currentOrder) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  }

  if (currentOrder.orderStatus === status) {
    return res.json(currentOrder); // Giữ nguyên nếu không đổi
  }

  const validNextStates = ALLOWED_TRANSITIONS[currentOrder.orderStatus] || [];
  if (!validNextStates.includes(status)) {
    return res.status(400).json({ 
      error: `Chuyển trạng thái từ "${statusLabels[currentOrder.orderStatus] || currentOrder.orderStatus}" sang "${statusLabels[status] || status}" không hợp lệ.` 
    });
  }

  const staffName = req.user.name;
  const staffRole = req.user.role === 'admin' ? 'Chủ Shop' : 'Nhân Viên Xử Lý Đơn';

  const updatedOrder = db.update('orders', o => o.id === id, (order) => {
    const currentTimeline = order.timeline || [];
    const timelineEntry = {
      status,
      time: new Date().toISOString(),
      handler: `${staffRole}: ${staffName}`,
      note: note || `Chuyển trạng thái sang: ${statusLabels[status] || status}`
    };

    return {
      ...order,
      orderStatus: status,
      handledBy: `${staffRole}: ${staffName}`,
      trackingCode: trackingCode !== undefined ? trackingCode : order.trackingCode,
      trackingCarrier: trackingCarrier !== undefined ? trackingCarrier : order.trackingCarrier,
      timeline: [...currentTimeline, timelineEntry]
    };
  });

  // NẾU ĐƠN BỊ HỦY -> HOÀN TRẢ TỒN KHO CHO SẢN PHẨM
  if (status === 'cancelled' && Array.isArray(currentOrder.items)) {
    currentOrder.items.forEach(item => {
      const pid = item.productId || item.id;
      db.update('products', p => p.id === pid, prod => ({
        ...prod,
        stock: (Number(prod.stock) || 0) + Number(item.quantity)
      }));
    });
  }

  // Record strict Audit Log
  db.logAudit(
    req.user.id,
    staffName,
    req.user.role,
    'ORDER_STATUS_UPDATE',
    id,
    `[${staffRole}] ${staffName} đã cập nhật trạng thái đơn ${id} thành "${statusLabels[status] || status}".`
  );

  res.json(updatedOrder);
});

// ============================================================================
// 4. COUPON / VOUCHER ROUTES
// ============================================================================

app.get('/api/coupons', (req, res) => {
  res.json(db.get('coupons'));
});

app.post('/api/coupons', requireRole(['admin']), (req, res) => {
  const newCoupon = db.insert('coupons', req.body);
  db.logAudit(req.user.id, req.user.name, req.user.role, 'COUPON_CREATE', newCoupon.code, `Tạo mã giảm giá mới: ${newCoupon.code}`);
  res.status(201).json(newCoupon);
});

app.put('/api/coupons/:id/toggle', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const updated = db.update('coupons', c => c.id === id, c => ({ ...c, isActive: !c.isActive }));
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy voucher.' });
  db.logAudit(req.user.id, req.user.name, req.user.role, 'COUPON_TOGGLE', id, `Thay đổi trạng thái mã ${updated.code} thành ${updated.isActive ? 'Bật' : 'Tắt'}`);
  res.json(updated);
});

app.delete('/api/coupons/:id', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const target = db.findOne('coupons', c => c.id === id);
  db.delete('coupons', c => c.id === id);
  db.logAudit(req.user.id, req.user.name, req.user.role, 'COUPON_DELETE', id, `Xóa mã giảm giá: ${target?.code || id}`);
  res.json({ message: 'Đã xóa mã giảm giá.' });
});

// ============================================================================
// 5. AUDIT LOGS & SYSTEM STATS (Admin Only)
// ============================================================================

app.get('/api/audit-logs', requireRole(['admin']), (req, res) => {
  res.json(db.get('audit_logs'));
});

// ============================================================================
// 6. GEMINI AI CHAT ENDPOINT (API Key ẩn hoàn toàn trên server)
// ============================================================================

function extractGeminiCandidateText(candidate) {
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter(part => typeof part?.text === 'string' && !part?.thought)
    .map(part => part.text)
    .join('')
    .trim();
}

function buildNormalizedGeminiContents(history = [], currentMessage = '') {
  const turns = [];
  const boundedHistory = Array.isArray(history) ? history.slice(-10) : [];

  for (const item of boundedHistory) {
    const rawText = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!rawText) continue;
    const role = item?.role === 'model' || item?.sender === 'bot' ? 'model' : 'user';
    const clampedText = rawText.slice(0, 1500);

    // Gemini requires conversations to start with a user turn
    if (turns.length === 0 && role === 'model') continue;

    const lastTurn = turns[turns.length - 1];
    if (lastTurn && lastTurn.role === role) {
      lastTurn.parts[0].text += `\n${clampedText}`;
    } else {
      turns.push({ role, parts: [{ text: clampedText }] });
    }
  }

  const currentText = String(currentMessage).trim();
  const lastTurn = turns[turns.length - 1];
  if (lastTurn && lastTurn.role === 'user') {
    lastTurn.parts[0].text += `\n${currentText}`;
  } else {
    turns.push({ role: 'user', parts: [{ text: currentText }] });
  }

  return turns;
}

async function callGeminiGenerate({ systemInstruction, contents, maxOutputTokens = GEMINI_MAX_OUTPUT_TOKENS, temperature = 0.7 }) {
  const url = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

  try {
    const t0 = Date.now();
    const requestBody = {
      ...(systemInstruction ? { system_instruction: { parts: [{ text: systemInstruction }] } } : {}),
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      const err = new Error(`Gemini API ${response.status}: ${errBody}`);
      err.httpStatus = response.status;
      throw err;
    }

    const data = await response.json();
    return {
      data,
      latencyMs: Date.now() - t0
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/chat/status
 * Kiểm tra Gemini đã được cấu hình chưa (không lộ key ra ngoài)
 */
app.get('/api/chat/status', (req, res) => {
  res.json({
    configured: GEMINI_CONFIGURED,
    model: GEMINI_MODEL,
    apiVersion: GEMINI_API_VERSION,
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    keyMasked: GEMINI_CONFIGURED
      ? `${GEMINI_API_KEY.substring(0, 6)}...${GEMINI_API_KEY.slice(-4)}`
      : null
  });
});

/**
 * POST /api/chat/test
 * Gửi một prompt kiểm tra trực tiếp tới GEMINI_MODEL thực tế để xác nhận hoạt động
 */
app.post('/api/chat/test', async (req, res) => {
  if (!GEMINI_CONFIGURED) {
    return res.status(503).json({
      ok: false,
      configured: false,
      model: GEMINI_MODEL,
      error: 'Server chưa cấu hình GEMINI_API_KEY trong file .env.'
    });
  }

  try {
    const { data, latencyMs } = await callGeminiGenerate({
      systemInstruction: 'Bạn là trợ lý AI của Tiệm Nhà Nhỏ. Hãy trả lời cực kỳ ngắn gọn.',
      contents: [{ role: 'user', parts: [{ text: 'Chào bạn, hãy xác nhận kết nối thành công bằng một câu ngắn tiếng Việt.' }] }],
      maxOutputTokens: 1024,
      temperature: 0.3
    });

    const candidate = data.candidates?.[0];
    const text = extractGeminiCandidateText(candidate);
    if (!candidate || !text) {
      return res.status(502).json({
        ok: false,
        configured: true,
        model: GEMINI_MODEL,
        finishReason: candidate?.finishReason || 'EMPTY',
        error: `Gemini phản hồi trống (finishReason=${candidate?.finishReason || 'UNKNOWN'}).`
      });
    }

    return res.json({
      ok: true,
      configured: true,
      model: GEMINI_MODEL,
      latencyMs,
      finishReason: candidate.finishReason || 'STOP',
      preview: text.substring(0, 120)
    });
  } catch (err) {
    const status = err.httpStatus === 429 ? 429 : (err.httpStatus === 400 || err.httpStatus === 401 ? 401 : 502);
    return res.status(status).json({
      ok: false,
      configured: true,
      model: GEMINI_MODEL,
      error: err.message
    });
  }
});

/**
 * POST /api/chat
 * Body: { message, scope?: 'store' | 'general', history?: [], products[], orders[], storeInfo{} }
 * Gọi GEMINI_MODEL thống nhất với system prompt theo chế độ và lịch sử hội thoại nhiều lượt.
 */
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_CONFIGURED) {
    return res.status(503).json({
      error: 'Gemini AI chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env và khởi động lại server.',
      model: GEMINI_MODEL
    });
  }

  const { message, scope = 'store', history = [], products = [], storeInfo = {} } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Thiếu nội dung tin nhắn.' });
  }

  const normalizedScope = scope === 'general' ? 'general' : 'store';
  const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const inStock = Array.isArray(products) && products.length > 0
    ? products.filter(p => Number(p.stock) > 0)
    : (db.get('products') || []).filter(p => Number(p.stock) > 0);

  const catLabels = {
    fashion: '👕 Thời Trang & Phụ Kiện',
    decor:   '🏡 Decor & Nến Thơm & Gốm Sứ',
    coffee:  '☕ Cà Phê & Thực Phẩm Đặc Sản',
    tech:    '⌨️ Phụ Kiện Công Nghệ Gỗ'
  };

  const byCategory = {};
  inStock.forEach(p => {
    const cat = p.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  const catalogText = Object.entries(byCategory).map(([cat, items]) => {
    const label = catLabels[cat] || cat;
    const maxPerCat = normalizedScope === 'general' ? 4 : 18;
    const rows = items.slice(0, maxPerCat).map(p =>
      normalizedScope === 'general'
        ? `  • [${p.id}] ${p.name} — ${vnd(p.price)} (còn ${p.stock})`
        : `  • [${p.id}] ${p.name} — ${vnd(p.price)}${p.originalPrice > p.price ? ` (gốc ${vnd(p.originalPrice)})` : ''} — Còn ${p.stock} — ${p.shortDesc || ''}`
    ).join('\n');
    return `${label} (${items.length} sp):\n${rows}`;
  }).join('\n\n');

  // Protect PII: only inject server-verified orders belonging to req.user (never unauthenticated client-supplied PII)
  let ordersText = '  (Khách chưa đăng nhập — nếu hỏi đơn hàng cá nhân, nhắc khách đăng nhập hoặc cung cấp Mã đơn + SĐT để tra cứu)';
  if (req.user) {
    const allDbOrders = db.get('orders') || [];
    const scopedOrders = (req.user.role === 'admin' || req.user.role === 'staff')
      ? allDbOrders.slice(0, 5)
      : allDbOrders.filter(o => o.customerId === req.user.id || (req.user.email && o.customer?.email?.toLowerCase() === req.user.email.toLowerCase())).slice(0, 5);

    ordersText = scopedOrders.length > 0
      ? scopedOrders.map(o =>
          `  • ${o.id} | Trạng thái: ${o.orderStatus} | Tổng: ${vnd(o.total)} | ${o.trackingCarrier || 'GHTK'} ${o.trackingCode || ''}`
        ).join('\n')
      : '  (Tài khoản hiện chưa có đơn hàng nào)';
  }

  const store = storeInfo || {};
  let systemInstruction = '';

  if (normalizedScope === 'general') {
    systemInstruction = `Bạn là **Trợ Lý AI Thông Minh Tổng Quát** tích hợp trong nền tảng **${store.name || 'Tiệm Nhà Nhỏ'}**.

🧠 VAI TRÒ & NĂNG LỰC (CHẾ ĐỘ TỔNG QUÁT):
  • Trả lời toàn diện, chính xác và có chiều sâu cho mọi chủ đề: lập trình, toán học, khoa học, công nghệ, phân tích kinh doanh, marketing, viết lách, học tập, đời sống...
  • KHÔNG từ chối các câu hỏi học thuật, kỹ thuật hay phân tích phức tạp chỉ vì chúng nằm ngoài phạm vi bán lẻ.

📐 PHƯƠNG PHÁP GIẢI QUYẾT CÂU HỎI PHỨC TẠP:
  1. Phân tích vấn đề rõ ràng theo từng bước logic.
  2. Nếu câu hỏi có chỗ mơ hồ hoặc thiếu dữ kiện, nêu rõ **giả định đang dùng** trước khi giải.
  3. Nếu thông tin phụ thuộc thời gian thực mà bạn không có truy cập trực tiếp (như giá thị trường hôm nay), hãy **nêu rõ giới hạn dữ liệu** thay vì đoán bừa số liệu.
  4. Tuân thủ an toàn: từ chối hướng dẫn gây hại hoặc vi phạm pháp luật.

🏪 NGỮ CẢNH CỬA HÀNG (chỉ sử dụng khi người dùng nhắc đến mua sắm hoặc Tiệm Nhà Nhỏ):
  • Cửa hàng: ${store.name || 'Tiệm Nhà Nhỏ'} — ${store.address || '48 Ngõ 12 Đặng Thai Mai, Tây Hồ, Hà Nội'}
  • Freeship từ ${vnd(store.freeshipThreshold || 450000)} | Đổi trả 1 đổi 1 trong 7 ngày.
  • Tổng sản phẩm còn hàng: ${inStock.length} sản phẩm.
${inStock.length > 0 ? `\n📦 TÓM TẮT SẢN PHẨM HIỆN CÓ (nếu khách hỏi mua):\n${catalogText}\n📌 Nếu gợi ý cụ thể sản phẩm từ danh mục trên, đặt [RECOMMENDED_IDS: id1, id2] ở cuối câu trả lời.` : ''}

💬 PHONG CÁCH: Tiếng Việt tự nhiên, mạch lạc, có cấu trúc markdown dễ đọc.`;
  } else {
    systemInstruction = `Bạn là **Nhân Viên Tư Vấn Bán Hàng Thông Minh** của **"${store.name || 'Tiệm Nhà Nhỏ'}"** — boutique thủ công & lifestyle tại Hà Nội.

🎯 NHIỆM VỤ (CHẾ ĐỘ TƯ VẤN CỬA HÀNG): Hỗ trợ khách trong phạm vi thương mại của tiệm:
  1. Tư vấn & gợi ý sản phẩm phù hợp ngân sách / nhu cầu / phong cách
  2. Tư vấn chọn size quần áo (chiều cao / cân nặng)
  3. Chính sách bán sỉ, quà tặng doanh nghiệp, xuất hóa đơn VAT
  4. Tra cứu tiến độ đơn hàng (chỉ dựa trên đơn được xác thực bên dưới)
  5. Chính sách đổi trả, vận chuyển, thanh toán
  6. Hướng dẫn sử dụng và bảo quản sản phẩm

🛡️ PHẠM VI: Nếu câu hỏi hoàn toàn không liên quan đến mua sắm/kinh doanh của tiệm (ví dụ code, giải toán, thời tiết...), hãy lịch sự nhắc khách chuyển sang chế độ **"Trợ lý AI tổng quát"** ngay trên khung chat để được hỗ trợ đầy đủ.

💬 PHONG CÁCH: Lịch thiệp, thân thiện, thông thái. Xưng "em" / "bạn". Giải thích rõ ràng, không bịa thông số hay tồn kho không có trong danh mục.

📦 DANH MỤC SẢN PHẨM (${inStock.length} sản phẩm còn hàng):
${catalogText}

📋 ĐƠN HÀNG ĐƯỢC PHÉP TRA CỨU:
${ordersText}

🏪 THÔNG TIN TIỆM:
  • Địa chỉ: ${store.address || '48 Ngõ 12 Đặng Thai Mai, Tây Hồ, Hà Nội'}
  • Hotline/Zalo: ${store.phone || '0982 123 456'}
  • Giờ mở cửa: ${store.operatingHours || '08:30 - 21:30'}
  • Freeship từ: ${vnd(store.freeshipThreshold || 450000)}
  • Ship tiêu chuẩn: ${vnd(store.standardShippingFee || 30000)} (2–3 ngày)
  • Ship hỏa tốc: ${vnd(store.expressShippingFee || 45000)} (2–4h nội thành)
  • Đổi trả: 1 đổi 1 trong 7 ngày

📐 BẢNG SIZE ÁO LINEN:
  • S: <1m62, 45–53kg | M: 1m60–1m70, 54–63kg | L: 1m68–1m76, 64–73kg | XL: 1m74–1m82, 74–83kg

💼 BÁN SỈ: 10–29 món: giảm 12–15% | 30–99 món: giảm 20–25%+freeship | ≥100 món: giảm 30–35%+hợp đồng. Hỗ trợ xuất hóa đơn VAT, khắc logo.

📌 KHI GỢI Ý SẢN PHẨM: Luôn đặt [RECOMMENDED_IDS: sp-xx, sp-yy] ở CUỐI câu trả lời (tối đa 4 ID từ danh mục trên, không bịa ID).`;
  }

  try {
    const contents = buildNormalizedGeminiContents(history, message);
    const { data } = await callGeminiGenerate({
      systemInstruction,
      contents,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
      temperature: 0.7
    });

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason || 'STOP';

    if (!candidate || ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST'].includes(finishReason)) {
      return res.json({
        text: 'Dạ xin lỗi bạn, yêu cầu này không thể được xử lý do giới hạn an toàn nội dung. Bạn vui lòng diễn đạt lại câu hỏi nhé!',
        recommendedIds: [],
        model: GEMINI_MODEL,
        scope: normalizedScope,
        finishReason,
        truncated: false
      });
    }

    let text = extractGeminiCandidateText(candidate);
    if (!text) {
      if (finishReason === 'MAX_TOKENS') {
        return res.status(502).json({
          error: 'Câu trả lời vượt quá giới hạn token xử lý nội bộ trước khi xuất văn bản. Vui lòng thử câu hỏi ngắn gọn hoặc chia nhỏ hơn.',
          model: GEMINI_MODEL,
          finishReason
        });
      }
      return res.status(502).json({
        error: `Gemini trả về phản hồi trống (finishReason=${finishReason}).`,
        model: GEMINI_MODEL,
        finishReason
      });
    }

    // Extract recommended product IDs cleanly
    const idMatch = text.match(/\[RECOMMENDED_IDS:\s*([^\]]+)\]/i);
    const recommendedIds = idMatch
      ? idMatch[1].split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
      : [];

    text = text.replace(/\[RECOMMENDED_IDS:[^\]]+\]/gi, '').trim();

    return res.json({
      text,
      recommendedIds,
      model: GEMINI_MODEL,
      scope: normalizedScope,
      finishReason,
      truncated: finishReason === 'MAX_TOKENS',
      usage: data.usageMetadata || null
    });

  } catch (err) {
    console.error('[/api/chat] Gemini error:', err.message);

    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini phản hồi quá thời gian chờ (timeout). Vui lòng thử lại.', model: GEMINI_MODEL });
    }
    if (err.httpStatus === 400 || err.httpStatus === 401 || err.message?.includes('API_KEY_INVALID')) {
      return res.status(401).json({ error: 'API Key không hợp lệ hoặc yêu cầu bị từ chối. Vui lòng kiểm tra GEMINI_API_KEY trong .env.', model: GEMINI_MODEL });
    }
    if (err.httpStatus === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Đã vượt giới hạn miễn phí Gemini (429). Vui lòng thử lại sau 1 phút.', model: GEMINI_MODEL });
    }
    if (err.httpStatus === 503) {
      return res.status(503).json({ error: 'Máy chủ Google Gemini đang quá tải tạm thời (503). Bạn có thể bấm thử lại ngay.', model: GEMINI_MODEL });
    }

    return res.status(500).json({ error: `Lỗi AI: ${err.message}`, model: GEMINI_MODEL });
  }
});

// ============================================================================
// 10. SHOPEE SCRAPING & IMPORT API (Async Session Jobs + Strict Filtering)
// ============================================================================

let scrapeState = {
  running: false,
  sessionId: null,
  status: 'idle', // idle | running | completed | empty | blocked | failed
  requestedKeywords: [],
  limit: 20,
  startedAt: null,
  finishedAt: null,
  progress: '',
  message: '',
  error: null,
  noNewData: false,
  count: 0,
  results: []
};

const scrapeSessions = new Map();

function saveSessionSnapshot(state) {
  if (!state?.sessionId) return;
  scrapeSessions.set(state.sessionId, { ...state });
  // Keep latest 20 sessions
  if (scrapeSessions.size > 20) {
    const oldestKey = scrapeSessions.keys().next().value;
    if (oldestKey) scrapeSessions.delete(oldestKey);
  }
}

// Trigger the Python scraper asynchronously with session tracking (Option B: Scraping API)
app.post('/api/shopee/scrape', requireRole('admin'), (req, res) => {
  if (scrapeState.running) {
    return res.status(409).json({
      error: 'Tiến trình cào dữ liệu đang chạy. Vui lòng chờ đợt trước hoàn tất.',
      sessionId: scrapeState.sessionId
    });
  }

  const { keywords, limit, provider } = req.body || {};
  const kwList = Array.isArray(keywords)
    ? keywords.map(k => String(k).trim()).filter(Boolean)
    : [];

  if (kwList.length === 0) {
    return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất 1 từ khóa để cào dữ liệu Shopee.' });
  }

  const scraperCfg = getEffectiveScraperConfig();
  const requestedProv = provider && SCRAPING_PROVIDERS.includes(String(provider).toLowerCase())
    ? String(provider).toLowerCase()
    : null;
  const hasRequestedKey = requestedProv
    ? Boolean(scraperCfg.publicMeta.providers[requestedProv]?.configured)
    : scraperCfg.configured;

  if (!hasRequestedKey && process.env.SCRAPING_ALLOW_DIRECT_FALLBACK !== '1') {
    return res.status(400).json({
      code: 'SCRAPER_CONFIG_REQUIRED',
      error: requestedProv
        ? `Chưa cấu hình API Key cho ${requestedProv.toUpperCase()}. Vui lòng nhập key trong bảng Cấu Hình Scraping API hoặc biến môi trường trên máy chủ.`
        : 'Chưa cấu hình Scraping API Key (Phương án B: ZenRows / ScraperAPI / Crawlbase). Vui lòng nhập API Key ngay phía trên hoặc thiết lập ZENROWS_API_KEY / SCRAPERAPI_KEY / CRAWLBASE_TOKEN trên Render/.env.'
    });
  }

  const numLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 5), 60);
  const scraperPath = join(PROJECT_ROOT, 'shopee_scraper.py');
  const outputPath = join(PROJECT_ROOT, 'shopee_scraped.json');

  if (!existsSync(scraperPath)) {
    return res.status(500).json({ error: 'Không tìm thấy script shopee_scraper.py trên máy chủ.' });
  }

  const activeProvLabel = (requestedProv || scraperCfg.activeProvider || 'auto').toUpperCase();
  const sessionId = `scrape_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  scrapeState = {
    running: true,
    sessionId,
    status: 'running',
    provider: requestedProv || scraperCfg.activeProvider || null,
    requestedKeywords: kwList,
    limit: numLimit,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    progress: `Đang kết nối Scraping API (${activeProvLabel} · Phương án B) để lấy dữ liệu Shopee...\n`,
    message: `Đang thu thập sản phẩm qua ${activeProvLabel}...`,
    error: null,
    configRequired: false,
    noNewData: false,
    count: 0,
    results: []
  };
  saveSessionSnapshot(scrapeState);

  const scriptArgs = [
    scraperPath,
    '--session-id', sessionId,
    '--output', outputPath,
    '--limit', String(numLimit),
    ...(requestedProv ? ['--provider', requestedProv] : []),
    '--keywords', ...kwList
  ];

  console.log(`[Shopee Scrape] Bắt đầu phiên ${sessionId} (${activeProvLabel}): keywords=${JSON.stringify(kwList)}, limit=${numLimit}`);

  const pythonProcess = spawn(PYTHON_BIN, scriptArgs, {
    cwd: PROJECT_ROOT,
    timeout: SCRAPE_TIMEOUT_MS,
    env: {
      ...process.env,
      ...scraperCfg.envVars,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      SHOPEE_COOKIE_FILE: SHOPEE_COOKIE_PATH
    }
  });

  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`[Scraper stdout][${sessionId}]: ${text.trim()}`);
    scrapeState.progress += text;
    saveSessionSnapshot(scrapeState);
  });

  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(`[Scraper stderr][${sessionId}]: ${text.trim()}`);
    scrapeState.progress += `[stderr] ${text}`;
    saveSessionSnapshot(scrapeState);
  });

  pythonProcess.on('close', (code, signal) => {
    scrapeState.running = false;
    scrapeState.finishedAt = new Date().toISOString();

    if (code !== 0) {
      const reason = signal === 'SIGTERM'
        ? `Tiến trình cào vượt quá giới hạn ${Math.round(SCRAPE_TIMEOUT_MS / 1000)} giây.`
        : `Tiến trình cào thoát với mã lỗi ${code}.`;
      scrapeState.status = 'failed';
      scrapeState.error = reason;
      scrapeState.message = reason;
      scrapeState.results = [];
      scrapeState.count = 0;
      scrapeState.progress += `\n[ERROR] ${reason}`;
      saveSessionSnapshot(scrapeState);
      return;
    }

    if (!existsSync(outputPath)) {
      scrapeState.status = 'failed';
      scrapeState.error = 'Không tìm thấy file kết quả sau khi cào.';
      scrapeState.message = scrapeState.error;
      scrapeState.results = [];
      scrapeState.count = 0;
      saveSessionSnapshot(scrapeState);
      return;
    }

    try {
      const rawContent = JSON.parse(readFileSync(outputPath, 'utf8'));

      // Xác thực đúng file kết quả thuộc phiên cào hiện tại (ngăn đọc nhầm dữ liệu cũ)
      if (!rawContent || Array.isArray(rawContent) || rawContent.sessionId !== sessionId) {
        scrapeState.status = 'failed';
        scrapeState.noNewData = true;
        scrapeState.error = 'File kết quả không thuộc phiên cào hiện tại — bỏ qua dữ liệu cũ để tránh hiển thị sai.';
        scrapeState.message = scrapeState.error;
        scrapeState.results = [];
        scrapeState.count = 0;
        saveSessionSnapshot(scrapeState);
        return;
      }

      if (rawContent.provider) {
        scrapeState.provider = rawContent.provider;
      }

      if (rawContent.status === 'config_required' || rawContent.status === 'failed') {
        scrapeState.status = rawContent.status;
        scrapeState.configRequired = Boolean(rawContent.configRequired);
        scrapeState.noNewData = true;
        scrapeState.error = rawContent.message || 'Phiên cào Shopee qua Scraping API thất bại.';
        scrapeState.message = scrapeState.error;
        scrapeState.results = [];
        scrapeState.count = 0;
        scrapeState.progress += `\n[ERROR] ${scrapeState.message}`;
        saveSessionSnapshot(scrapeState);
        return;
      }

      const rawProducts = Array.isArray(rawContent.products) ? rawContent.products : [];
      // Áp dụng bộ lọc chuẩn xác trên dữ liệu vừa cào (NGOÀI điều kiện kiểm tra rỗng)
      const filteredResults = rawProducts.length > 0
        ? filterShopeeCatalog(rawProducts, kwList, numLimit)
        : [];

      if (filteredResults.length === 0) {
        scrapeState.status = rawContent.status === 'blocked' ? 'blocked' : 'empty';
        scrapeState.noNewData = true;
        scrapeState.results = [];
        scrapeState.count = 0;
        scrapeState.message = rawContent.message
          || `Không tìm thấy sản phẩm mới nào khớp với từ khóa "${kwList.join(', ')}" trong phiên này.`;
        scrapeState.error = null;
        scrapeState.progress += `\n[DONE] ${scrapeState.message}`;
      } else {
        scrapeState.status = 'completed';
        scrapeState.noNewData = false;
        scrapeState.results = filteredResults;
        scrapeState.count = filteredResults.length;
        scrapeState.error = null;
        scrapeState.message = `Đã cào và lọc thành công ${filteredResults.length} sản phẩm khớp từ khóa từ Shopee.`;
        scrapeState.progress += `\n[DONE] ${scrapeState.message}`;
      }
      saveSessionSnapshot(scrapeState);
    } catch (e) {
      scrapeState.status = 'failed';
      scrapeState.error = `Không thể đọc kết quả JSON của scraper: ${e.message}`;
      scrapeState.message = scrapeState.error;
      scrapeState.results = [];
      scrapeState.count = 0;
      saveSessionSnapshot(scrapeState);
    }
  });

  pythonProcess.on('error', (err) => {
    scrapeState.running = false;
    scrapeState.finishedAt = new Date().toISOString();
    scrapeState.status = 'failed';
    scrapeState.error = `Không thể khởi chạy tiến trình Python (${PYTHON_BIN}): ${err.message}`;
    scrapeState.message = scrapeState.error;
    scrapeState.results = [];
    scrapeState.count = 0;
    saveSessionSnapshot(scrapeState);
  });

  return res.status(202).json({
    started: true,
    sessionId,
    status: 'running',
    requestedKeywords: kwList,
    limit: numLimit
  });
});

// Import scraped products - Chống trùng lặp, không bịa dữ liệu, lưu dạng Bản Nháp (Draft)
app.post('/api/shopee/import', requireRole('admin'), (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Không có danh sách sản phẩm hợp lệ để nhập.' });
  }

  const existingProducts = db.get('products') || [];
  const insertedProducts = [];
  let skippedDuplicates = 0;
  
  products.forEach((product, index) => {
    const rawName = (product.name || '').trim();
    if (!rawName) return;

    // Chống trùng lặp: Kiểm tra theo Mã Shopee hoặc Tên sản phẩm đã có
    const isDuplicate = existingProducts.some(p => 
      (product.shopee_id && p.specs?.['Mã Shopee'] === product.shopee_id) ||
      p.name.toLowerCase() === rawName.toLowerCase()
    );

    if (isDuplicate) {
      skippedDuplicates++;
      return;
    }

    // TUYỆT ĐỐI KHÔNG BỊA DỮ LIỆU:
    // - Tồn kho: Mặc định là 0 (để nhân viên/chủ shop tự kiểm kê nhập số lượng thực)
    // - Giá gốc: Chỉ giữ nếu scraper trích xuất được giá gốc thật, không tự ý x1.3
    // - Trạng thái: Lưu ở dạng Bản Nháp (draft), chưa kích hoạt bán trực tiếp trên storefront
    const mappedProduct = {
      id: `sp-${Date.now()}-${index}`,
      name: rawName,
      category: product.category || 'decor',
      price: Number(product.price) || 0,
      originalPrice: product.orig ? Number(product.orig) : null,
      stock: Number(product.stock) || 0,
      rating: product.rating ? Number(product.rating) : 5.0,
      reviewsCount: Number(product.reviews) || 0,
      soldCount: Number(product.sold) || 0,
      isFeatured: false,
      isNew: true,
      isFlashSale: false,
      isDraft: true,
      status: 'draft',
      images: (Array.isArray(product.images) && product.images.length > 0)
        ? product.images 
        : ['/products/market/ao_khoac_1.jpg'],
      variants: { colors: ['Mặc định'], sizes: ['Tiêu chuẩn'] },
      shortDesc: product.shortDesc || `Sản phẩm tham khảo Shopee - ${rawName.substring(0, 60)}`,
      desc: product.desc || rawName,
      specs: { 
        'Nguồn gốc': 'Shopee', 
        'Mã Shopee': product.shopee_id || '', 
        'URL gốc': product.source_url || '',
        'Từ khóa': product.keyword || '',
        'Trạng thái kiểm duyệt': 'Bản nháp - Cần nhập số lượng kho thực tế trước khi mở bán'
      },
      tags: [product.category || 'decor', 'shopee', ...(product.keyword || '').split(' ').filter(w => w.length > 2)],
      reviews: []
    };
    
    db.insert('products', mappedProduct);
    insertedProducts.push(mappedProduct);
    existingProducts.push(mappedProduct);
  });

  db.logAudit(
    req.user?.id || 'admin', 
    req.user?.name || 'Admin', 
    req.user?.role || 'admin', 
    'SHOPEE_IMPORT', 
    'batch', 
    `Nhập ${insertedProducts.length} sản phẩm từ Shopee (Bỏ qua ${skippedDuplicates} sản phẩm trùng lặp)`
  );

  res.json({ 
    success: true, 
    imported: insertedProducts.length, 
    skippedDuplicates,
    products: insertedProducts 
  });
});

// GET scraping status by sessionId (or latest session state in memory — never stale disk leakage)
app.get('/api/shopee/status', (req, res) => {
  const requestedSessionId = req.query.sessionId ? String(req.query.sessionId).trim() : '';

  if (requestedSessionId) {
    if (scrapeState.sessionId === requestedSessionId) {
      return res.json(scrapeState);
    }
    const found = scrapeSessions.get(requestedSessionId);
    if (found) {
      return res.json(found);
    }
    return res.status(404).json({
      error: 'Không tìm thấy phiên cào này trên máy chủ.',
      sessionId: requestedSessionId
    });
  }

  return res.json(scrapeState);
});

function getShopeeCookieMetadata() {
  if (!existsSync(SHOPEE_COOKIE_PATH)) {
    return {
      hasCookie: false,
      cookieCount: 0,
      hasAuthToken: false,
      updatedAt: null,
      ageHours: null
    };
  }

  try {
    const raw = readFileSync(SHOPEE_COOKIE_PATH, 'utf8');
    const parsed = normalizeShopeeCookieHeader(raw);
    const stats = statSync(SHOPEE_COOKIE_PATH);
    const updatedAt = stats.mtime.toISOString();
    const ageHours = Math.max(0, Math.round(((Date.now() - stats.mtimeMs) / 36e5) * 10) / 10);

    return {
      hasCookie: Boolean(parsed.ok && parsed.cookieCount > 0),
      cookieCount: parsed.cookieCount,
      hasAuthToken: Boolean(parsed.hasAuthToken),
      updatedAt,
      ageHours
    };
  } catch {
    return {
      hasCookie: false,
      cookieCount: 0,
      hasAuthToken: false,
      updatedAt: null,
      ageHours: null
    };
  }
}

// GET cookie metadata ONLY (Admin only — never exposes raw cookie string or tokens)
app.get('/api/shopee/cookie-status', requireRole('admin'), (req, res) => {
  return res.json(getShopeeCookieMetadata());
});

// PUT fresh Shopee cookie obtained by Admin after verifying in their own browser
app.put('/api/shopee/cookie', requireRole('admin'), (req, res) => {
  const { cookie } = req.body || {};
  const parsed = normalizeShopeeCookieHeader(cookie);

  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error || 'Chuỗi cookie không hợp lệ.' });
  }

  try {
    writeFileSync(SHOPEE_COOKIE_PATH, parsed.normalizedHeader, 'utf8');
    const stats = statSync(SHOPEE_COOKIE_PATH);
    const updatedAt = stats.mtime.toISOString();

    db.logAudit(
      req.user?.id || 'admin',
      req.user?.name || 'Admin',
      req.user?.role || 'admin',
      'SHOPEE_COOKIE_UPDATE',
      'shopee_cookie.txt',
      `Cập nhật cookie phiên Shopee (${parsed.cookieCount} cookie · ${parsed.hasAuthToken ? 'có token đăng nhập SPC' : 'chưa thấy SPC_ST'})`
    );

    return res.json({
      ok: true,
      hasCookie: true,
      cookieCount: parsed.cookieCount,
      hasAuthToken: parsed.hasAuthToken,
      updatedAt,
      ageHours: 0
    });
  } catch (err) {
    return res.status(500).json({ error: `Không thể ghi file cookie trên máy chủ: ${err.message}` });
  }
});

// GET Scraping API config metadata ONLY (Admin only — never exposes plaintext API keys)
app.get('/api/shopee/scraper-config', requireRole('admin'), (req, res) => {
  return res.json(getEffectiveScraperConfig().publicMeta);
});

// PUT Scraping API provider / API key runtime config (saved to gitignored local file)
app.put('/api/shopee/scraper-config', requireRole('admin'), (req, res) => {
  const { provider = 'auto', apiKey, clearKey = false } = req.body || {};
  const normalizedProv = String(provider || 'auto').trim().toLowerCase();

  if (!['auto', ...SCRAPING_PROVIDERS].includes(normalizedProv)) {
    return res.status(400).json({ error: 'Nhà cung cấp Scraping API không hợp lệ (hỗ trợ: auto, zenrows, scraperapi, crawlbase).' });
  }

  const currentLocal = loadLocalScraperOverride();
  const nextKeys = { ...(currentLocal.keys || {}) };

  if (clearKey) {
    if (normalizedProv === 'auto') {
      SCRAPING_PROVIDERS.forEach(p => { delete nextKeys[p]; });
    } else {
      delete nextKeys[normalizedProv];
    }
  } else if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    if (normalizedProv === 'auto') {
      return res.status(400).json({ error: 'Vui lòng chọn cụ thể ZenRows, ScraperAPI hoặc Crawlbase trước khi lưu API Key.' });
    }
    const cleanedKey = apiKey.trim();
    if (cleanedKey.length < 8 || /\s/.test(cleanedKey)) {
      return res.status(400).json({ error: 'API Key không hợp lệ (cần tối thiểu 8 ký tự và không chứa khoảng trắng).' });
    }
    nextKeys[normalizedProv] = cleanedKey;
  }

  const nextPayload = {
    selectedProvider: normalizedProv,
    keys: nextKeys,
    updatedAt: new Date().toISOString()
  };

  try {
    mkdirSync(dirname(SCRAPER_CONFIG_LOCAL_PATH), { recursive: true });
    writeFileSync(SCRAPER_CONFIG_LOCAL_PATH, JSON.stringify(nextPayload, null, 2), 'utf8');

    const effective = getEffectiveScraperConfig();
    const provMeta = normalizedProv !== 'auto' ? effective.publicMeta.providers[normalizedProv] : null;
    db.logAudit(
      req.user?.id || 'admin',
      req.user?.name || 'Admin',
      req.user?.role || 'admin',
      'SHOPEE_SCRAPER_CONFIG',
      'scraper_config.local.json',
      `Cập nhật Scraping API (${normalizedProv.toUpperCase()}${provMeta?.keyMasked ? ` · ${provMeta.keyMasked}` : ''})`
    );

    return res.json({
      ok: true,
      ...effective.publicMeta
    });
  } catch (err) {
    return res.status(500).json({ error: `Không thể lưu cấu hình Scraping API: ${err.message}` });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    scrapingOptionB: {
      configured: getEffectiveScraperConfig().configured,
      activeProvider: getEffectiveScraperConfig().activeProvider
    },
    collections: {
      users: db.get('users').length,
      products: db.get('products').length,
      orders: db.get('orders').length,
      coupons: db.get('coupons').length,
      audit_logs: db.get('audit_logs').length
    }
  });
});

// Serve runtime downloaded product images (e.g. /products/shopee_live/*.webp) BEFORE dist catch-all
const PUBLIC_PRODUCTS_PATH = join(PROJECT_ROOT, 'public', 'products');
mkdirSync(PUBLIC_PRODUCTS_PATH, { recursive: true });
app.use('/products', express.static(PUBLIC_PRODUCTS_PATH));

// Serve static frontend build if dist exists (hỗ trợ deploy 24/7 trên Render / Cloud Server)
const DIST_PATH = join(PROJECT_ROOT, 'dist');
if (existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(DIST_PATH, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 [Backend Server] Database REST API running at http://localhost:${PORT}`);
});

