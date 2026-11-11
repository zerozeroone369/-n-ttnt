import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_COUPONS } from '../src/data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function resolveDbFilePath() {
  if (process.env.DB_FILE && String(process.env.DB_FILE).trim()) {
    return path.resolve(String(process.env.DB_FILE).trim());
  }
  return path.join(DEFAULT_DATA_DIR, 'ecommerce_db.json');
}

function getProductQualityScore(p) {
  if (!p) return -1;
  const isDraft = p.status === 'draft' || p.isDraft === true;
  const stock = Math.max(0, Number(p.stock) || 0);
  const imgs = Array.isArray(p.images) ? p.images : [];
  const hasCdn = imgs.some((u) => /^https?:\/\//i.test(String(u || '')));
  const hasRealImg = imgs.some((u) => u && u !== '/placeholder.svg');
  const ts = Date.parse(p.publishedAt || p.updatedAt || p.createdAt || '') || 0;
  return (isDraft ? 0 : 1_000_000_000_000) + Math.min(stock, 99999) * 1000 + (hasCdn ? 200 : 0) + (hasRealImg ? 100 : 0) + (ts > 0 ? 50 : 0);
}

export function normalizeProductImagesWithDiskFallback(product, publicRoot = PUBLIC_DIR) {
  if (!product || !Array.isArray(product.images) || product.images.length === 0) {
    return product;
  }

  const cleaned = product.images.map((u) => String(u || '').trim()).filter(Boolean);
  if (cleaned.length <= 1) return product;

  const first = cleaned[0];
  if (publicRoot && /^\/products\/shopee_(?:live|real)\//i.test(first)) {
    const localRel = first.replace(/^\/+/, '');
    const localAbs = path.join(publicRoot, localRel);
    if (!fs.existsSync(localAbs)) {
      const cdnImages = cleaned.filter((u) => /^https?:\/\//i.test(u));
      if (cdnImages.length > 0) {
        const rest = cleaned.filter((u) => !/^https?:\/\//i.test(u) && u !== first);
        return { ...product, images: [...cdnImages, ...rest, first] };
      }
    }
  }
  return product;
}

export function deduplicateProductsList(products = [], publicRoot = PUBLIC_DIR) {
  if (!Array.isArray(products)) return { products: [], removedCount: 0, modified: false };

  const deduped = [];
  const indexById = new Map();
  const indexByShopeeId = new Map();
  let removedCount = 0;
  let modified = false;

  for (const rawItem of products) {
    if (!rawItem || !rawItem.id) continue;
    const item = normalizeProductImagesWithDiskFallback(rawItem, publicRoot);
    if (item !== rawItem) modified = true;

    const idKey = String(item.id).trim();
    const shopeeIdKey = String(item.specs?.['Mã Shopee'] || item.shopee_id || '').trim();

    let existingIdx = indexById.has(idKey) ? indexById.get(idKey) : -1;
    if (existingIdx === -1 && shopeeIdKey) {
      existingIdx = indexByShopeeId.has(shopeeIdKey) ? indexByShopeeId.get(shopeeIdKey) : -1;
    }

    if (existingIdx === -1) {
      const nextIdx = deduped.length;
      deduped.push(item);
      indexById.set(idKey, nextIdx);
      if (shopeeIdKey) indexByShopeeId.set(shopeeIdKey, nextIdx);
    } else {
      removedCount += 1;
      modified = true;
      const existing = deduped[existingIdx];
      if (getProductQualityScore(item) > getProductQualityScore(existing)) {
        deduped[existingIdx] = item;
        indexById.set(idKey, existingIdx);
        if (shopeeIdKey) indexByShopeeId.set(shopeeIdKey, existingIdx);
      }
    }
  }

  return { products: deduped, removedCount, modified };
}

// Password hashing helpers
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

class PersistentDatabase {
  constructor() {
    this.dbFile = resolveDbFilePath();
    this.data = {
      users: [],
      products: [],
      orders: [],
      coupons: [],
      audit_logs: []
    };
    this.init();
  }

  init() {
    this.dbFile = resolveDbFilePath();
    const dataDir = path.dirname(this.dbFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbFile)) {
      try {
        const content = fs.readFileSync(this.dbFile, 'utf-8');
        this.data = JSON.parse(content);
        const { products: cleanProducts, removedCount, modified } = deduplicateProductsList(
          this.data.products || [],
          PUBLIC_DIR
        );
        if (modified) {
          this.data.products = cleanProducts;
          this.save();
          if (removedCount > 0) {
            console.log(`[Database] Deduplicated products on startup: removed ${removedCount} duplicate entries (${cleanProducts.length} remaining)`);
          }
        }
        console.log(`[Database] Loaded successfully from ${this.dbFile}`);
        return;
      } catch (err) {
        console.error('[Database] Read error, re-initializing:', err);
      }
    }

    // Seed default database
    console.log('[Database] Seeding initial data...');
    
    // Seed default accounts (Admin, Staff, Customer)
    const adminAuth = hashPassword('admin123');
    const staffAuth = hashPassword('staff123');
    const customerAuth = hashPassword('khach123');

    this.data = {
      users: [
        {
          id: 'usr_admin',
          email: 'admin@tiemnhanho.vn',
          passwordHash: adminAuth.hash,
          salt: adminAuth.salt,
          name: 'Chủ Tiệm (Admin)',
          phone: '0982 123 456',
          address: '48 Ngõ 12 Đặng Thai Mai, Tây Hồ',
          city: 'Hà Nội',
          role: 'admin',
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr_staff',
          email: 'staff@tiemnhanho.vn',
          passwordHash: staffAuth.hash,
          salt: staffAuth.salt,
          name: 'Lan Nguyễn (Kho & Đóng Gói)',
          phone: '0978 889 990',
          address: 'Kho Đóng Gói Bát Tràng',
          city: 'Hà Nội',
          role: 'staff',
          createdAt: new Date().toISOString()
        },
        {
          id: 'usr_cust_01',
          email: 'khachhang@gmail.com',
          passwordHash: customerAuth.hash,
          salt: customerAuth.salt,
          name: 'Nguyễn Thu Hà',
          phone: '0912 345 678',
          address: 'Tòa S2.05 Vinhomes Ocean Park, Gia Lâm',
          city: 'Hà Nội',
          role: 'customer',
          createdAt: new Date().toISOString()
        }
      ],
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS.map(o => ({
        ...o,
        handledBy: 'Hệ thống tự động',
        timeline: [
          { status: 'pending', time: o.createdAt, note: 'Khách hàng hoàn tất đặt hàng' },
          { status: o.orderStatus, time: o.createdAt, note: 'Cập nhật tiến trình ban đầu' }
        ]
      })),
      coupons: INITIAL_COUPONS,
      audit_logs: [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          userId: 'system',
          userName: 'Hệ Thống',
          userRole: 'admin',
          action: 'SYSTEM_INIT',
          targetId: 'db_setup',
          details: 'Khởi tạo cơ sở dữ liệu Tiệm Nhà Nhỏ với dữ liệu mẫu chuẩn'
        }
      ]
    };

    this.save();
  }

  save() {
    try {
      const targetFile = this.dbFile || resolveDbFilePath();
      const tempFile = `${targetFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, targetFile);
    } catch (err) {
      console.error('[Database] Save failed:', err);
    }
  }

  // Generic DB Operations
  get(collection) {
    return [...(this.data[collection] || [])];
  }

  find(collection, filterFn) {
    const list = this.get(collection);
    return filterFn ? list.filter(filterFn) : list;
  }

  findOne(collection, filterFn) {
    const list = this.get(collection);
    return list.find(filterFn) || null;
  }

  insert(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    const newItem = {
      id: item.id || `${collection.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      ...item
    };
    this.data[collection].unshift(newItem);
    this.save();
    return newItem;
  }

  update(collection, filterFn, updateDataOrFn) {
    const list = this.get(collection);
    let updatedItem = null;

    this.data[collection] = list.map(item => {
      if (filterFn(item)) {
        updatedItem = typeof updateDataOrFn === 'function'
          ? updateDataOrFn(item)
          : { ...item, ...updateDataOrFn, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });

    if (updatedItem) {
      this.save();
    }
    return updatedItem;
  }

  updateMany(collection, filterFn, updateDataOrFn) {
    const list = this.get(collection);
    const updatedItems = [];

    this.data[collection] = list.map(item => {
      if (filterFn(item)) {
        const nextItem = typeof updateDataOrFn === 'function'
          ? updateDataOrFn(item)
          : { ...item, ...updateDataOrFn, updatedAt: new Date().toISOString() };
        updatedItems.push(nextItem);
        return nextItem;
      }
      return item;
    });

    if (updatedItems.length > 0) {
      this.save();
    }
    return { updatedCount: updatedItems.length, updatedItems };
  }

  delete(collection, filterFn) {
    const initialLen = this.data[collection]?.length || 0;
    this.data[collection] = (this.data[collection] || []).filter(item => !filterFn(item));
    const isDeleted = (this.data[collection]?.length || 0) < initialLen;
    if (isDeleted) {
      this.save();
    }
    return isDeleted;
  }

  // Audit Log Entry
  logAudit(userId, userName, userRole, action, targetId, details) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      userName: userName || 'Khách vãng lai',
      userRole: userRole || 'guest',
      action,
      targetId: targetId || '',
      details: details || ''
    };
    this.data.audit_logs.unshift(logEntry);
    // Keep last 500 audit logs to prevent file bloat
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 500);
    }
    this.save();
    return logEntry;
  }
}

export { PersistentDatabase };
export const db = new PersistentDatabase();
