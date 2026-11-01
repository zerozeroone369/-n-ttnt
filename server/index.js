import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db, hashPassword, verifyPassword } from './db.js';
import { createSession, destroySession, authenticateUser, requireAuth, requireRole } from './auth.js';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { crawlShopeeNode } from './shopeeCrawler.js';

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
// REAL-TIME SSE (SERVER-SENT EVENTS) EVENT HUB
// ============================================================================
const sseClients = new Set();

export function broadcastEvent(eventName, payload) {
  const data = JSON.stringify(payload);
  const deadClients = [];
  for (const client of sseClients) {
    try {
      client.write(`event: ${eventName}\ndata: ${data}\n\n`);
    } catch (e) {
      deadClients.push(client);
    }
  }
  deadClients.forEach(c => sseClients.delete(c));
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  sseClients.add(res);

  // Send initial connection packet with current versions
  const shopVersion = db.getMeta('shop_version') || Date.now();
  const latestUpdate = (db.get('shop_updates') || [])[0] || null;

  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'Kết nối SSE trực tiếp thành công',
    appVersion: '1.1.0',
    shopVersion,
    latestUpdate,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Heartbeat ping every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// App & Shop Version Check (In-App OTA Check)
app.get('/api/app/version', (req, res) => {
  const shopVersion = db.getMeta('shop_version') || Date.now();
  const updates = db.get('shop_updates') || [];
  res.json({
    appVersion: '1.1.0',
    minSupportedVersion: '1.0.0',
    name: 'Tiệm Nhà Nhỏ - E-Commerce AI App',
    shopVersion,
    latestUpdate: updates[0] || null,
    releaseNotes: 'Bản cập nhật v1.1.0: Đồng bộ sản phẩm Shopee thời gian thực, chế độ App PWA Standalone cho điện thoại & Thông báo bản cập nhật tự động.'
  });
});

// Shop Updates History
app.get('/api/shop/updates', (req, res) => {
  const updates = db.get('shop_updates') || [];
  res.json(updates.slice(0, 30));
});

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
  const shopVersion = Date.now();
  db.setMeta('shop_version', shopVersion);
  broadcastEvent('product_update', { action: 'CREATE', product: newProduct, shopVersion });
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
  const shopVersion = Date.now();
  db.setMeta('shop_version', shopVersion);
  broadcastEvent('product_update', { action: 'UPDATE', product: updated, shopVersion });
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
  const shopVersion = Date.now();
  db.setMeta('shop_version', shopVersion);
  broadcastEvent('product_update', { action: 'DELETE', productId: id, shopVersion });
  db.logAudit(req.user.id, req.user.name, req.user.role, 'PRODUCT_DELETE', id, `Xóa sản phẩm: ${target?.name || id}`);
  res.json({ message: 'Đã xóa sản phẩm thành công.' });
});

// Add Review to Product
app.post('/api/products/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { rating, comment, author } = req.body;

  const reviewAuthor = req.user?.name || author || 'Khách vãng lai';
  const newReview = {
    id: `rev_${Date.now()}`,
    author: reviewAuthor,
    rating: Number(rating) || 5,
    comment: comment || '',
    date: new Date().toISOString().split('T')[0],
    verified: true
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

// Get orders: Admin & Staff see all orders; Customers see their own orders
app.get('/api/orders', (req, res) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    return res.json(db.get('orders'));
  }

  if (req.user && req.user.role === 'customer') {
    const customerOrders = db.find('orders', o => 
      o.customerId === req.user.id || 
      o.customer?.email?.toLowerCase() === req.user.email.toLowerCase() ||
      o.customer?.phone === req.user.phone
    );
    return res.json(customerOrders);
  }

  return res.status(401).json({ error: 'Yêu cầu đăng nhập để xem đơn hàng.' });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const orderData = req.body;

  if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
    return res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm.' });
  }

  const validatedItems = orderData.items.map(item => {
    const productId = item.productId || item.id;
    const quantity = Number(item.quantity);
    const product = db.findOne('products', p => p.id === productId);
    return { item, productId, quantity, product };
  });

  const invalidItem = validatedItems.find(({ productId, quantity, product }) =>
    !productId || !product || !Number.isInteger(quantity) || quantity < 1 ||
    Number(product.stock) <= 0 || quantity > Number(product.stock)
  );

  if (invalidItem) {
    return res.status(400).json({
      error: `Sản phẩm ${invalidItem.productId || 'không xác định'} không đủ tồn kho hoặc số lượng không hợp lệ.`
    });
  }

  const newOrder = {
    ...orderData,
    id: orderData.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: req.user?.id || null,
    handledBy: 'Chờ phân công',
    timeline: [
      {
        status: 'pending',
        time: new Date().toISOString(),
        note: 'Đơn hàng được khởi tạo thành công'
      }
    ]
  };

  const savedOrder = db.insert('orders', newOrder);

  // Deduct stock for products
  if (Array.isArray(savedOrder.items)) {
    savedOrder.items.forEach(item => {
      const productId = item.productId || item.id;
      db.update('products', p => p.id === productId, p => ({
        ...p,
        stock: Math.max(0, (p.stock || 0) - item.quantity)
      }));
    });
  }

  db.logAudit(
    req.user?.id || 'guest',
    req.user?.name || savedOrder.customer?.name || 'Khách vãng lai',
    req.user?.role || 'customer',
    'ORDER_CREATE',
    savedOrder.id,
    `Tạo đơn hàng ${savedOrder.id} - Tổng tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(savedOrder.total)}`
  );

  res.status(201).json(savedOrder);
});

// Update Order Status (Staff & Admin only) - Crucial for audit trail!
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

  if (!updatedOrder) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
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

  const systemInstruction = `Bạn là **Trợ Lý AI Toàn Diện & Chuyên Gia Tư Vấn Bán Hàng** của **"${store.name || 'Tiệm Nhà Nhỏ'}"** — boutique phong cách sống & đồ thủ công cao cấp.

🌟 ĐỊNH HƯỚNG & NĂNG LỰC TOÀN DIỆN:
Bạn là một trợ lý thông minh, hiểu biết sâu rộng, cởi mở và ấm áp. Bạn KHÔNG bị gò bó hay từ chối câu hỏi của khách hàng:
1. 💡 **Trò chuyện & Tư vấn Đa Lĩnh Vực:** Bạn sẵn lòng trò chuyện, tư vấn về mọi chủ đề cuộc sống: phong cách sống (lifestyle), nghệ thuật phối đồ (mix & match), cách trang trí không gian sống, kiến thức phong thủy, mẹo vặt gia đình, thưởng thức cà phê, văn hóa, công việc, tâm lý chọn quà, hoặc đơn giản là trò chuyện giao lưu, giải đáp thắc mắc thường thức và chia sẻ như một người bạn tri kỷ.
2. 🛍️ **Cố vấn Sản phẩm & Bán hàng Chuyên sâu:** Luôn am hiểu tường tận toàn bộ kho hàng của Tiệm Nhà Nhỏ: chất liệu, kích thước/bảng size, xuất xứ, tính năng, cách bảo quản và chính sách bán hàng.
3. 🔗 **Khéo léo Kết nối Thực tế:** Khi khách hỏi về một chủ đề đời sống (ví dụ: cách giảm stress sau giờ làm, cách trang trí góc bàn làm việc, gợi ý quà sinh nhật cho bạn thân, trang phục đi du lịch,...), hãy đưa ra lời khuyên hữu ích, sâu sắc và chân thành trước, sau đó KHÉO LÉO gợi ý 1-2 món đồ liên quan đang có tại Tiệm Nhà Nhỏ để hỗ trợ khách tốt nhất.
4. ❌ CHỈ từ chối những nội dung vi phạm pháp luật, độc hại, bạo lực hoặc ngôn từ thù địch. Đối với mọi câu hỏi bình thường khác (khoa học, đời sống, thơ văn, lời chúc, tâm sự,...), hãy trả lời thông minh, dí dỏm, tinh tế và lịch sự.

💬 PHONG CÁCH GIAO TIẾP:
• Thân thiện, chu đáo, tinh tế và đáng tin cậy. Xưng "em" và gọi khách là "bạn" hoặc "anh/chị".
• Dùng emoji sinh động, nhẹ nhàng (🌿, ✨, ☕, 🎁, 🛍️).
• Trình bày rõ ràng, ngắt đoạn mạch lạc, dễ đọc.

📦 DANH MỤC SẢN PHẨM HIỆN CÓ CỦA TIỆM (${inStock.length} sản phẩm):
${catalogText}

📋 ĐƠN HÀNG GẦN ĐÂY CỦA KHÁCH:
${ordersText}

🏪 THÔNG TIN TIỆM:
  • Địa chỉ: ${store.address || '48 Ngõ 12 Đặng Thai Mai, Tây Hồ, Hà Nội'}
  • Hotline/Zalo: ${store.phone || '0982 123 456'}
  • Giờ mở cửa: ${store.operatingHours || '08:30 - 21:30'}
  • Freeship từ: ${vnd(store.freeshipThreshold || 450000)}
  • Ship tiêu chuẩn: ${vnd(store.standardShippingFee || 30000)} (2–3 ngày)
  • Ship hỏa tốc: ${vnd(store.expressShippingFee || 45000)} (2–4h nội thành)
  • Đổi trả: 1 đổi 1 trong 7 ngày nếu lỗi hoặc không vừa ý

📐 BẢNG SIZE ÁO & QUẦN:
  • S: <1m62, 45–53kg | M: 1m60–1m70, 54–63kg | L: 1m68–1m76, 64–73kg | XL: 1m74–1m82, 74–83kg | XXL: >1m80, >83kg

💼 CHÍNH SÁCH BÁN SỈ & DOANH NGHIỆP:
  • 10–29 món: giảm 12–15% | 30–99 món: giảm 20–25%+freeship | ≥100 món: giảm 30–35%+hợp đồng. Hỗ trợ khắc logo theo yêu cầu & xuất hóa đơn VAT điện tử.

📌 QUY TẮC GỢI Ý SẢN PHẨM: Khi có sản phẩm phù hợp trong danh mục của shop, hãy đặt [RECOMMENDED_IDS: sp-xx, sp-yy] ở CUỐI câu trả lời (tối đa 4 ID từ danh mục trên, không bịa ID). Nếu câu hỏi hoàn toàn là kiến thức thuần túy không có sản phẩm liên quan, không cần gắn thẻ này.`;

  try {
    const GEMINI_MODEL = 'gemini-3.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const requestBody = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: message.trim() }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1200,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    clearTimeout(timeoutId);

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
// 10. SHOPEE SCRAPING API WITH REAL-TIME LIVE UPDATE
// ============================================================================

let scrapeState = { running: false, progress: '', error: null };

// Trigger the Shopee scraper (High-Speed Engine by default, Playwright if requested)
app.post('/api/shopee/scrape', requireRole('admin'), async (req, res) => {
  if (scrapeState.running) {
    // Reset if it was stuck for more than 30 seconds
    scrapeState.running = false;
  }

  const keywords = Array.isArray(req.body.keywords) ? req.body.keywords : (req.body.keywords || '').split(',').map(s => s.trim()).filter(Boolean);
  const scraperPath = join(PROJECT_ROOT, 'shopee_scraper.py');
  const outputPath = join(PROJECT_ROOT, 'shopee_scraped.json');
  const useBrowser = req.body.useBrowser === true;

  scrapeState = { running: true, progress: 'Đang thu thập sản phẩm từ Shopee...', error: null };

  const runNodeCrawler = async () => {
    try {
      scrapeState.progress = 'Đang thu thập sản phẩm từ Shopee qua High-Speed Engine...';
      const results = await crawlShopeeNode(keywords.length ? keywords : undefined, 6);
      scrapeState.running = false;
      scrapeState.progress = `Hoàn tất! Thu thập thành công ${results.length} sản phẩm từ Shopee.`;
      return res.json({ success: true, results, source: 'fast_engine' });
    } catch (err) {
      scrapeState.running = false;
      scrapeState.error = err.message;
      return res.status(500).json({ error: `Lỗi cào dữ liệu: ${err.message}` });
    }
  };

  // If browser automation is not explicitly requested, run High-Speed Engine directly (instant 1s response)
  if (!useBrowser) {
    return runNodeCrawler();
  }

  // Otherwise, attempt Python Playwright if requested
  let crawlerExecuted = false;
  try {
    const pythonArgs = [scraperPath];
    if (keywords.length > 0) {
      pythonArgs.push('--keywords', keywords.join(','));
    }

    const pythonProcess = spawn('python', pythonArgs, {
      cwd: PROJECT_ROOT,
      timeout: 2 * 60 * 1000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
      scrapeState.progress += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.warn(`[Shopee Python Scraper] ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      if (crawlerExecuted || res.headersSent) return;
      if (code !== 0) {
        return runNodeCrawler();
      }

      scrapeState.running = false;
      if (!res.headersSent) {
        if (existsSync(outputPath)) {
          try {
            const results = JSON.parse(readFileSync(outputPath, 'utf8'));
            return res.json({ success: true, results, source: 'python_playwright' });
          } catch (e) {
            return runNodeCrawler();
          }
        } else {
          return runNodeCrawler();
        }
      }
    });

    pythonProcess.on('error', () => {
      if (crawlerExecuted || res.headersSent) return;
      return runNodeCrawler();
    });
  } catch (err) {
    return runNodeCrawler();
  }
});

// Import scraped products & Broadcast Real-Time Update to all Apps
app.post('/api/shopee/import', requireRole('admin'), (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Không có sản phẩm nào được chọn để nhập.' });
  }

  const insertedProducts = [];
  
  products.forEach((product, index) => {
    const mappedProduct = {
      id: `sp-${Date.now()}-${index}`,
      name: product.name,
      category: product.category || 'decor',
      price: product.price,
      originalPrice: product.orig || Math.round(product.price * 1.3),
      stock: product.stock || Math.floor(Math.random() * 150) + 10,
      rating: product.rating || 4.8,
      reviewsCount: product.reviews || 0,
      isFeatured: index < 4,
      isNew: true,
      isFlashSale: index % 5 === 0,
      images: product.images && product.images.length > 0 
        ? product.images 
        : ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80'],
      variants: { colors: ['Mặc định'], sizes: ['Tiêu chuẩn'] },
      shortDesc: `Sản phẩm Shopee - ${product.name.substring(0, 50)}`,
      desc: product.name,
      specs: { 'Nguồn gốc': 'Shopee Mall / Shopee Choice', 'Từ khóa': product.keyword || '' },
      tags: [product.category, 'shopee', ...(product.keyword || '').split(' ').filter(w => w.length > 2)],
      reviews: []
    };
    
    db.insert('products', mappedProduct);
    insertedProducts.push(mappedProduct);
  });

  const shopVersion = Date.now();
  const updateRecord = {
    id: `upd_${Date.now()}`,
    type: 'SHOPEE_IMPORT',
    title: 'Sản phẩm mới từ Shopee',
    message: `Cửa hàng vừa cập nhật thêm ${insertedProducts.length} sản phẩm mới từ Shopee!`,
    count: insertedProducts.length,
    productsSample: insertedProducts.slice(0, 6).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.images?.[0],
      category: p.category
    })),
    shopVersion,
    timestamp: new Date().toISOString()
  };

  db.insert('shop_updates', updateRecord);
  db.setMeta('shop_version', shopVersion);

  db.logAudit(
    req.user?.id || 'admin', 
    req.user?.name || 'Admin', 
    req.user?.role || 'admin', 
    'SHOPEE_IMPORT', 
    'batch', 
    `Nhập ${products.length} sản phẩm từ Shopee (Phiên bản shop: ${shopVersion})`
  );

  // Broadcast REAL-TIME UPDATE to all mobile apps & web clients!
  broadcastEvent('shop_update', updateRecord);

  res.json({ 
    success: true, 
    imported: products.length, 
    shopVersion,
    updateRecord,
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
    appVersion: '1.1.0',
    shopVersion: db.getMeta('shop_version') || Date.now(),
    collections: {
      users: db.get('users').length,
      products: db.get('products').length,
      orders: db.get('orders').length,
      coupons: db.get('coupons').length,
      audit_logs: db.get('audit_logs').length,
      shop_updates: (db.get('shop_updates') || []).length
    }
  });
});

// ============================================================================
// 11. STATIC FILE SERVING & APP DISTRIBUTION
// ============================================================================

// Serve public static assets (images, icons, manifest, sw)
app.use(express.static(join(PROJECT_ROOT, 'public')));

// Serve production build if available
const distPath = join(PROJECT_ROOT, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Android APK Download route
app.get('/download/tiem-nha-nho.apk', (req, res) => {
  const apkPath = join(PROJECT_ROOT, 'public', 'tiem-nha-nho.apk');
  if (existsSync(apkPath)) {
    return res.download(apkPath, 'TiemNhaNho_v1.1.apk');
  }
  // If native APK file is not compiled on server, serve download info or redirect to PWA install
  res.redirect('/?install=pwa');
});

// Single Page Application Fallback for SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = existsSync(join(distPath, 'index.html'))
    ? join(distPath, 'index.html')
    : join(PROJECT_ROOT, 'index.html');
  res.sendFile(indexPath);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Backend Server] Database REST API running at http://0.0.0.0:${PORT}`);
  console.log(`📡 [Real-time SSE] Live Event Hub ready at http://0.0.0.0:${PORT}/api/events`);
});

