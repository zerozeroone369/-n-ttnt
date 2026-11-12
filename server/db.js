import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import zlib from 'zlib';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_COUPONS } from '../src/data/initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_DB_FILE = path.join(DEFAULT_DATA_DIR, 'ecommerce_db.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function resolveDbFilePath(env = process.env) {
  if (env?.DB_FILE && String(env.DB_FILE).trim()) {
    return path.resolve(String(env.DB_FILE).trim());
  }
  return DEFAULT_DB_FILE;
}

function encodeSnapshotGzipBase64(dataObj) {
  const json = JSON.stringify(dataObj);
  const gz = zlib.gzipSync(Buffer.from(json, 'utf8'));
  return `gzb64:${gz.toString('base64')}`;
}

function decodeSnapshotPayload(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('gzb64:')) {
    const buf = Buffer.from(trimmed.slice(6), 'base64');
    return JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
  }
  return JSON.parse(trimmed);
}

function createRemotePersistenceAdapter(env = process.env, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return null;

  const upstashUrl = String(env?.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const upstashToken = String(env?.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (upstashUrl && upstashToken) {
    const redisKey = String(env?.UPSTASH_REDIS_DB_KEY || 'tiemnhanho:db_snapshot_v1').trim() || 'tiemnhanho:db_snapshot_v1';
    return {
      mode: 'upstash_redis',
      label: 'Upstash Redis Cloud',
      async read() {
        const res = await fetchImpl(upstashUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${upstashToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['GET', redisKey]),
          signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) {
          throw new Error(`Upstash GET HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!json?.result) return null;
        return decodeSnapshotPayload(String(json.result));
      },
      async write(dataObj) {
        const encoded = encodeSnapshotGzipBase64(dataObj);
        const res = await fetchImpl(upstashUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${upstashToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(['SET', redisKey, encoded]),
          signal: AbortSignal.timeout(12000)
        });
        if (!res.ok) {
          throw new Error(`Upstash SET HTTP ${res.status}`);
        }
        const json = await res.json().catch(() => ({}));
        if (json?.error) {
          throw new Error(`Upstash SET error: ${json.error}`);
        }
      }
    };
  }

  const supabaseUrl = String(env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (supabaseUrl && supabaseKey) {
    const bucket = String(env?.SUPABASE_DB_BUCKET || 'tiemnhanho-db').trim() || 'tiemnhanho-db';
    const objectPath = String(env?.SUPABASE_DB_OBJECT || 'ecommerce_db.json').trim() || 'ecommerce_db.json';
    const encodedObject = objectPath.split('/').map(encodeURIComponent).join('/');
    const objectEndpoint = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedObject}`;

    const ensureBucket = async () => {
      const res = await fetchImpl(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: bucket, name: bucket, public: false }),
        signal: AbortSignal.timeout(10000)
      });
      // 200/201 created, 409 already exists
      if (!res.ok && res.status !== 409) {
        throw new Error(`Supabase create bucket HTTP ${res.status}`);
      }
    };

    return {
      mode: 'supabase_storage',
      label: 'Supabase Cloud Storage',
      async read() {
        const res = await fetchImpl(objectEndpoint, {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Cache-Control': 'no-cache'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (res.status === 404 || res.status === 400) return null;
        if (!res.ok) {
          throw new Error(`Supabase GET HTTP ${res.status}`);
        }
        const rawText = await res.text();
        return rawText ? JSON.parse(rawText) : null;
      },
      async write(dataObj) {
        const payload = JSON.stringify(dataObj);
        const putHeaders = {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        };
        let res = await fetchImpl(objectEndpoint, {
          method: 'POST',
          headers: putHeaders,
          body: payload,
          signal: AbortSignal.timeout(15000)
        });
        if (res.status === 404 || res.status === 400) {
          await ensureBucket();
          res = await fetchImpl(objectEndpoint, {
            method: 'POST',
            headers: putHeaders,
            body: payload,
            signal: AbortSignal.timeout(15000)
          });
        }
        if (!res.ok) {
          throw new Error(`Supabase PUT HTTP ${res.status}`);
        }
      }
    };
  }

  return null;
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
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.dbFile = options.dbFile || resolveDbFilePath(this.env);
    this.remoteAdapter = createRemotePersistenceAdapter(this.env, options.fetchImpl || globalThis.fetch);
    this._remoteDirty = false;
    this._remoteScheduled = false;
    this._remoteQueue = Promise.resolve();
    this._suppressRemoteSave = false;
    this._lastRemoteSyncAt = null;
    this._lastRemoteError = null;
    this.data = {
      users: [],
      products: [],
      orders: [],
      coupons: [],
      audit_logs: []
    };
    this.init();
  }

  _hasCustomDiskFile() {
    return Boolean(this.env?.DB_FILE && String(this.env.DB_FILE).trim()) &&
      path.resolve(this.dbFile) !== path.resolve(DEFAULT_DB_FILE);
  }

  getPersistenceInfo() {
    if (this.remoteAdapter) {
      return {
        mode: this.remoteAdapter.mode,
        durable: true,
        label: this.remoteAdapter.label,
        lastSyncAt: this._lastRemoteSyncAt,
        lastError: this._lastRemoteError
      };
    }
    if (this._hasCustomDiskFile()) {
      return {
        mode: 'persistent_disk',
        durable: true,
        label: `Persistent Disk (${this.dbFile})`,
        lastSyncAt: null,
        lastError: null
      };
    }
    return {
      mode: 'ephemeral_local',
      durable: false,
      label: 'Đĩa cục bộ Render/Container (reset khi container khởi động lại)',
      lastSyncAt: null,
      lastError: null
    };
  }

  _writeLocalDiskOnly() {
    try {
      const targetFile = this.dbFile || resolveDbFilePath(this.env);
      const dataDir = path.dirname(targetFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const tempFile = `${targetFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, targetFile);
    } catch (err) {
      console.error('[Database] Save failed:', err);
    }
  }

  _normalizeLoadedData(raw) {
    const parsed = raw && typeof raw === 'object' ? raw : {};
    const { products: cleanProducts, removedCount, modified } = deduplicateProductsList(
      parsed.products || [],
      PUBLIC_DIR
    );
    return {
      data: {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        products: cleanProducts,
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
        audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : []
      },
      removedCount,
      modified
    };
  }

  init() {
    if (!this.dbFile) {
      this.dbFile = resolveDbFilePath(this.env);
    }
    const dataDir = path.dirname(this.dbFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // If custom persistent DB_FILE doesn't exist yet on first mount, seed from bundled ecommerce_db.json
    if (!fs.existsSync(this.dbFile) && this._hasCustomDiskFile() && fs.existsSync(DEFAULT_DB_FILE)) {
      try {
        const bundled = JSON.parse(fs.readFileSync(DEFAULT_DB_FILE, 'utf-8'));
        const { data } = this._normalizeLoadedData(bundled);
        this.data = data;
        this._writeLocalDiskOnly();
        console.log(`[Database] Seeded persistent disk ${this.dbFile} from bundled snapshot (${this.data.products.length} products)`);
        return;
      } catch (err) {
        console.error('[Database] Failed seeding from bundled snapshot:', err);
      }
    }

    if (fs.existsSync(this.dbFile)) {
      try {
        const content = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(content);
        const { data, removedCount, modified } = this._normalizeLoadedData(parsed);
        this.data = data;
        if (modified) {
          this._writeLocalDiskOnly();
          if (removedCount > 0) {
            console.log(`[Database] Deduplicated products on startup: removed ${removedCount} duplicate entries (${data.products.length} remaining)`);
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
      products: INITIAL_PRODUCTS.map(p => ({ ...p })),
      orders: INITIAL_ORDERS.map(o => ({
        ...o,
        handledBy: 'Hệ thống tự động',
        timeline: [
          { status: 'pending', time: o.createdAt, note: 'Khách hàng hoàn tất đặt hàng' },
          { status: o.orderStatus, time: o.createdAt, note: 'Cập nhật tiến trình ban đầu' }
        ]
      })),
      coupons: INITIAL_COUPONS.map(c => ({ ...c })),
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

    this._writeLocalDiskOnly();
  }

  async hydrateFromRemote() {
    if (!this.remoteAdapter) return false;
    try {
      const remoteRaw = await this.remoteAdapter.read();
      if (remoteRaw && Array.isArray(remoteRaw.products)) {
        const { data } = this._normalizeLoadedData(remoteRaw);
        this.data = data;
        this._suppressRemoteSave = true;
        try {
          this._writeLocalDiskOnly();
        } finally {
          this._suppressRemoteSave = false;
        }
        this._lastRemoteSyncAt = new Date().toISOString();
        this._lastRemoteError = null;
        console.log(`[Database] Hydrated from ${this.remoteAdapter.label} (${this.data.products.length} products)`);
        return true;
      }

      // First boot with empty remote store -> seed remote with current local snapshot
      this._remoteDirty = true;
      await this.flushRemote();
      console.log(`[Database] Seeded ${this.remoteAdapter.label} with initial snapshot (${this.data.products.length} products)`);
      return true;
    } catch (err) {
      this._lastRemoteError = err.message;
      console.error(`[Database] Remote hydrate failed (${this.remoteAdapter.label}):`, err.message);
      return false;
    }
  }

  _scheduleRemoteSync() {
    if (!this.remoteAdapter || this._suppressRemoteSave || this._remoteScheduled) return;
    this._remoteScheduled = true;
    queueMicrotask(() => {
      this._remoteScheduled = false;
      this.flushRemote().catch(() => {});
    });
  }

  flushRemote() {
    if (!this.remoteAdapter) return Promise.resolve(false);
    this._remoteQueue = this._remoteQueue.then(async () => {
      if (!this._remoteDirty) return true;
      while (this._remoteDirty) {
        this._remoteDirty = false;
        const snapshot = this.data;
        try {
          await this.remoteAdapter.write(snapshot);
          this._lastRemoteSyncAt = new Date().toISOString();
          this._lastRemoteError = null;
        } catch (err) {
          this._lastRemoteError = err.message;
          console.error(`[Database] Remote sync failed (${this.remoteAdapter.label}):`, err.message);
          return false;
        }
      }
      return true;
    });
    return this._remoteQueue;
  }

  save() {
    this._writeLocalDiskOnly();
    if (this.remoteAdapter && !this._suppressRemoteSave) {
      this._remoteDirty = true;
      this._scheduleRemoteSync();
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
