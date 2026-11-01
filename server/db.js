import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_COUPONS } from '../src/data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'ecommerce_db.json');

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
    this.data = {
      users: [],
      products: [],
      orders: [],
      coupons: [],
      audit_logs: [],
      shop_updates: [],
      meta: {
        app_version: '1.1.0',
        shop_version: Date.now()
      }
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(content);
        if (!this.data.shop_updates) this.data.shop_updates = [];
        if (!this.data.meta) {
          this.data.meta = {
            app_version: '1.1.0',
            shop_version: Date.now()
          };
        }
        console.log(`[Database] Loaded successfully from ${DB_FILE}`);
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
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[Database] Save failed:', err);
    }
  }

  // Generic DB Operations
  get(collection) {
    return this.data[collection] || [];
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

  // Metadata operations (app version, shop version, etc.)
  getMeta(key) {
    if (!this.data.meta) this.data.meta = {};
    return this.data.meta[key];
  }

  setMeta(key, value) {
    if (!this.data.meta) this.data.meta = {};
    this.data.meta[key] = value;
    this.save();
    return value;
  }
}

export const db = new PersistentDatabase();
