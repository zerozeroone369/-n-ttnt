import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db, hashPassword, verifyPassword } from './db.js';
import { createSession, destroySession, authenticateUser, requireAuth, requireRole } from './auth.js';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Kiểm tra Gemini API Key khi khởi động
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_CONFIGURED = !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
if (GEMINI_CONFIGURED) {
  console.log(`✨ [Gemini] API Key đã cấu hình (${GEMINI_API_KEY.substring(0, 8)}...)`);
} else {
  console.log('⚠️  [Gemini] Chưa cấu hình API Key — chatbot dùng bộ máy cục bộ làm fallback');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(authenticateUser);

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT ROUTES
// ============================================================================

// Register new customer account
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, address, city } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ Email, Mật khẩu và Họ tên.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
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
    name: name.trim(),
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

/**
 * GET /api/chat/status
 * Kiểm tra Gemini đã được cấu hình chưa (không lộ key ra ngoài)
 */
app.get('/api/chat/status', (req, res) => {
  res.json({
    configured: GEMINI_CONFIGURED,
    model: 'gemini-3.5-flash',
    keyMasked: process.env.GEMINI_API_KEY
      ? `${process.env.GEMINI_API_KEY.substring(0, 6)}...${process.env.GEMINI_API_KEY.slice(-4)}`
      : null
  });
});

/**
 * POST /api/chat
 * Body: { message, products[], orders[], storeInfo{}, userRole? }
 * Gọi Gemini 2.5 Flash với system prompt đầy đủ, trả về { text, recommendedIds[] }
 */
app.post('/api/chat', async (req, res) => {
  if (!GEMINI_CONFIGURED) {
    return res.status(503).json({
      error: 'Gemini AI chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào file .env và khởi động lại server.'
    });
  }

  const { message, products = [], orders = [], storeInfo = {} } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Thiếu nội dung tin nhắn.' });
  }

  // ── Build catalog theo nhóm danh mục ──
  const inStock = products.filter(p => Number(p.stock) > 0);

  const catLabels = {
    fashion: '👕 Thời Trang & Phụ Kiện',
    decor:   '🏡 Decor & Nến Thơm & Gốm Sứ',
    coffee:  '☕ Cà Phê & Thực Phẩm Đặc Sản',
    tech:    '⌨️ Phụ Kiện Công Nghệ Gỗ'
  };

  const byCategory = {};
  inStock.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });

  const vnd = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const catalogText = Object.entries(byCategory).map(([cat, items]) => {
    const label = catLabels[cat] || cat;
    const rows = items.map(p =>
      `  • [${p.id}] ${p.name} — ${vnd(p.price)}${p.originalPrice > p.price ? ` (gốc ${vnd(p.originalPrice)})` : ''} — Còn ${p.stock} — ${p.shortDesc || ''}`
    ).join('\n');
    return `${label} (${items.length} sp):\n${rows}`;
  }).join('\n\n');

  // ── 5 đơn hàng gần nhất ──
  const recentOrders = orders.slice(0, 5);
  const ordersText = recentOrders.length > 0
    ? recentOrders.map(o =>
        `  • ${o.id} | ${o.customer?.name} (${o.customer?.phone}) | ${o.orderStatus} | ${vnd(o.total)} | ${o.trackingCarrier || 'GHTK'} ${o.trackingCode || ''}`
      ).join('\n')
    : '  (Chưa có đơn hàng)';

  const store = storeInfo;

  const systemInstruction = `Bạn là **Nhân Viên Tư Vấn Bán Hàng Thông Minh** của **"${store.name || 'Tiệm Nhà Nhỏ'}"** — boutique thủ công tại Hà Nội.

🎯 NHIỆM VỤ: Hỗ trợ khách trong phạm vi thương mại của tiệm:
  1. Tư vấn & gợi ý sản phẩm phù hợp ngân sách / nhu cầu / phong cách
  2. Tư vấn chọn size quần áo (chiều cao / cân nặng)
  3. Chính sách bán sỉ, quà tặng doanh nghiệp, xuất hóa đơn VAT
  4. Tra cứu tiến độ đơn hàng
  5. Chính sách đổi trả, vận chuyển, thanh toán
  6. Hướng dẫn sử dụng và bảo quản sản phẩm

❌ TỪ CHỐI lịch sự mọi câu hỏi ngoài phạm vi thương mại (lập trình, toán học, thời tiết, tin tức, chính trị, y tế, crypto...).

💬 PHONG CÁCH: Lịch thiệp, thân thiện, thông thái. Xưng "em" / "bạn". Ngắn gọn súc tích, dùng emoji nhẹ nhàng.

📦 DANH MỤC SẢN PHẨM (${inStock.length} sản phẩm còn hàng):
${catalogText}

📋 ĐƠN HÀNG GẦN ĐÂY:
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

  try {
    const GEMINI_MODEL = 'gemini-1.5-flash';
    // Dùng header x-goog-api-key + /v1 (hỗ trợ key dạng AQ. lẫn AIzaSy...)
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini API ${response.status}: ${errBody}`);
    }

    const data = await response.json();

    // Handle blocked / empty response
    const candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY') {
      return res.json({
        text: 'Dạ em xin lỗi, em không thể xử lý yêu cầu này. Bạn vui lòng thử lại nhé! 🌿',
        recommendedIds: []
      });
    }

    let text = candidate.content?.parts?.[0]?.text || '';

    // Extract recommended product IDs
    const idMatch = text.match(/\[RECOMMENDED_IDS:\s*([^\]]+)\]/i);
    const recommendedIds = idMatch
      ? idMatch[1].split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
      : [];

    // Remove the tag from displayed text
    text = text.replace(/\[RECOMMENDED_IDS:[^\]]+\]/gi, '').trim();

    return res.json({ text, recommendedIds });

  } catch (err) {
    console.error('[/api/chat] Gemini error:', err.message);

    // Phân biệt lỗi quota / key không hợp lệ
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('400')) {
      return res.status(401).json({ error: 'API Key không hợp lệ. Vui lòng kiểm tra lại GEMINI_API_KEY trong file .env.' });
    }
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Đã vượt giới hạn miễn phí Gemini. Vui lòng thử lại sau 1 phút.' });
    }

    return res.status(500).json({ error: `Lỗi AI: ${err.message}` });
  }
});

// ============================================================================
// 10. SHOPEE SCRAPING & IMPORT API
// ============================================================================

let scrapeState = { running: false, progress: '', error: null };

// Trigger the Python scraper with keywords from request
app.post('/api/shopee/scrape', requireRole('admin'), (req, res) => {
  if (scrapeState.running) {
    return res.status(400).json({ error: 'Tiến trình cào dữ liệu đang chạy. Vui lòng chờ đợt trước hoàn tất.' });
  }

  const { keywords, limit } = req.body;
  const kwList = Array.isArray(keywords) && keywords.length > 0 
    ? keywords.map(k => String(k).trim()).filter(Boolean)
    : [];
  const numLimit = Math.min(Math.max(parseInt(limit) || 20, 5), 60);

  scrapeState = { running: true, progress: 'Đang khởi động cào dữ liệu thật từ Shopee...', error: null };
  const scraperPath = join(PROJECT_ROOT, 'shopee_scraper.py');
  const outputPath = join(PROJECT_ROOT, 'shopee_scraped.json');

  if (!existsSync(scraperPath)) {
    scrapeState = { running: false, progress: 'Thất bại', error: 'Không tìm thấy script shopee_scraper.py' };
    return res.status(500).json({ error: 'Không tìm thấy script cào dữ liệu' });
  }

  // Chuẩn bị tham số dòng lệnh truyền từ khóa động và số lượng sản phẩm
  const scriptArgs = [scraperPath, '--limit', String(numLimit)];
  if (kwList.length > 0) {
    scriptArgs.push('--keywords', ...kwList);
  }

  const pythonProcess = spawn('python', scriptArgs, {
    cwd: PROJECT_ROOT,
    timeout: 90 * 1000, // 90 giây timeout tối đa, tránh treo vô hạn
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  pythonProcess.stdout.on('data', (data) => {
    scrapeState.progress += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Scraper Log]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    scrapeState.running = false;
    
    if (code !== 0) {
      scrapeState.error = `Tiến trình cào thoát với mã lỗi ${code}`;
      scrapeState.progress += `\nThất bại.`;
      if (!res.headersSent) {
        return res.status(500).json({ error: scrapeState.error, progress: scrapeState.progress });
      }
    } else {
      scrapeState.progress += `\nHoàn thành cào dữ liệu thành công.`;
      if (!res.headersSent) {
        if (existsSync(outputPath)) {
          try {
            const results = JSON.parse(readFileSync(outputPath, 'utf8'));
            // Trả về cả products và results để tương thích tuyệt đối mọi giao diện
            return res.json({ 
              success: true, 
              count: Array.isArray(results) ? results.length : 0,
              products: results,
              results: results 
            });
          } catch (e) {
            return res.status(500).json({ error: 'Không thể đọc file kết quả JSON của scraper' });
          }
        } else {
          return res.status(500).json({ error: 'Không tìm thấy file kết quả sau khi cào' });
        }
      }
    }
  });

  pythonProcess.on('error', (err) => {
    scrapeState.running = false;
    scrapeState.error = `Không thể khởi chạy tiến trình Python: ${err.message}`;
    if (!res.headersSent) {
      return res.status(500).json({ error: scrapeState.error });
    }
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

// GET scraping status
app.get('/api/shopee/status', (req, res) => {
  let results = null;
  const outputPath = join(PROJECT_ROOT, 'shopee_scraped.json');
  
  if (!scrapeState.running && existsSync(outputPath)) {
    try {
      results = JSON.parse(readFileSync(outputPath, 'utf8'));
    } catch (e) {
      // Ignored
    }
  }

  res.json({ ...scrapeState, results });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    collections: {
      users: db.get('users').length,
      products: db.get('products').length,
      orders: db.get('orders').length,
      coupons: db.get('coupons').length,
      audit_logs: db.get('audit_logs').length
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 [Backend Server] Database REST API running at http://localhost:${PORT}`);
});

