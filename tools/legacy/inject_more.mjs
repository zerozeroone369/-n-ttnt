/**
 * inject_more.mjs — Thêm shopee(2) + shopee(3) vào web
 * Layout shopee(3): B=img1, C=img2, D=disc, E=name, G=price, I=sold
 * Layout shopee(2): B=img1, C=name,  D=price, E=sold, F=img2, G=disc
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { get as httpsGet } from 'https';
import { inflateRawSync } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR   = path.join(__dirname, 'public', 'products');
const DATA_JS   = path.join(__dirname, 'src', 'data', 'initialData.js');
const DB_JSON   = path.join(__dirname, 'server', 'data', 'ecommerce_db.json');

mkdirSync(IMG_DIR, { recursive: true });

// ── Parse xlsx (zip) ─────────────────────────────────
function readZipEntry(buf, name) {
  let i = 0;
  while (i < buf.length - 30) {
    if (buf[i]===0x50&&buf[i+1]===0x4B&&buf[i+2]===0x03&&buf[i+3]===0x04) {
      const cSize = buf.readUInt32LE(i+18);
      const fnLen = buf.readUInt16LE(i+26);
      const exLen = buf.readUInt16LE(i+28);
      const fn    = buf.slice(i+30, i+30+fnLen).toString('utf8');
      const start = i+30+fnLen+exLen;
      const raw   = buf.slice(start, start+cSize);
      if (fn === name) {
        return buf.readUInt16LE(i+8) === 8
          ? inflateRawSync(raw).toString('utf8')
          : raw.toString('utf8');
      }
      i = start + cSize;
    } else { i++; }
  }
  return null;
}

function parseSS(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m =>
    [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(t => t[1]).join('')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&#(\d+);/g, (_,c) => String.fromCharCode(+c))
  );
}

function parseSheet(xml, ss) {
  return [...xml.matchAll(/<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(rm => {
    const obj = {};
    for (const c of rm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const typ = (c[2].match(/t="([^"]+)"/) || [])[1] || '';
      const v   = (c[3].match(/<v>([^<]*)<\/v>/) || [])[1] || '';
      obj[c[1]] = typ === 's' ? (ss[+v] || '') : v;
    }
    return { r: +rm[1], d: obj };
  });
}

// ── Download ─────────────────────────────────────────
function dlImg(url, dest) {
  return new Promise(res => {
    if (!url || !url.startsWith('http')) return res(false);
    if (existsSync(dest)) return res(true);
    const f = createWriteStream(dest);
    const req = httpsGet(url, {
      headers: { 'Referer':'https://shopee.vn/', 'User-Agent':'Mozilla/5.0' },
      timeout: 12000
    }, r => {
      if (r.statusCode === 200) { r.pipe(f); f.on('finish', () => { f.close(); res(true); }); }
      else { f.close(); res(false); }
    });
    req.on('error', () => { f.close(); res(false); });
    req.on('timeout', () => { req.destroy(); res(false); });
  });
}

const pPrice = s => { const n = parseInt((s||'').replace(/[^\d]/g,'')); return isNaN(n)?0:n; };
const pDisc  = s => { const n = parseInt((s||'').replace(/[^\d]/g,'')); return isNaN(n)?0:n/100; };
const pSold  = s => {
  const m = (s||'').match(/(\d+)\s*([kK]?)/);
  return m ? (m[2].toLowerCase()==='k' ? +m[1]*1000 : +m[1]) : 500;
};

// ── Parse một file xlsx ──────────────────────────────
async function parseFile(filePath, layout, category, startIdx) {
  console.log(`\n📂 ${path.basename(filePath)} [layout:${layout}]`);
  const buf   = readFileSync(filePath);
  const ssXml = readZipEntry(buf, 'xl/sharedStrings.xml');
  const shXml = readZipEntry(buf, 'xl/worksheets/sheet1.xml');
  if (!shXml) { console.log('  ⚠ Không đọc được sheet'); return []; }

  const ss   = ssXml ? parseSS(ssXml) : [];
  const rows = parseSheet(shXml, ss).filter(r => r.r > 1);
  console.log(`  → ${rows.length} dòng`);

  const products = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].d;
    let name, img1, img2, disc, price, sold;

    if (layout === 'A') {
      // shopee(3): B=img1, C=img2, D=disc, E=name, G=price, I=sold
      name  = (row['E'] || '').trim();
      img1  = row['B'] || '';
      img2  = row['C'] || '';
      disc  = pDisc(row['D'] || '');
      price = pPrice(row['G'] || '0');
      sold  = pSold(row['I'] || '0');
    } else {
      // shopee(2): B=img1, C=name, D=price, E=sold, F=img2, G=disc, H=img3, I=label
      name  = (row['C'] || '').trim();
      img1  = row['B'] || '';
      img2  = row['F'] || row['H'] || '';
      disc  = pDisc(row['G'] || '');
      price = pPrice(row['D'] || '0');
      sold  = pSold(row['E'] || '0');
    }

    if (!name || name.length < 3) {
      console.log(`  [${i+1}] ⚠ Bỏ qua (tên rỗng)`);
      continue;
    }

    const pid   = `sp-${String(startIdx + products.length + 1).padStart(3,'0')}`;
    process.stdout.write(`  [${products.length+1}] ${name.substring(0,40)}... `);

    const ok1 = await dlImg(img1, path.join(IMG_DIR, `${pid}.jpg`));
    const ok2 = img2 ? await dlImg(img2, path.join(IMG_DIR, `${pid}_2.jpg`)) : false;

    const images = [];
    if (ok1)       images.push(`/products/${pid}.jpg`);
    else if (img1) images.push(img1);
    if (ok2)       images.push(`/products/${pid}_2.jpg`);
    else if (img2) images.push(img2);
    if (!images.length) images.push('https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80');

    const fp   = Math.max(9000, price);
    const orig = disc > 0 ? Math.round(fp / (1-disc)) : Math.round(fp * 1.3);

    console.log(`${ok1?'✓':'✗'}img | ${fp.toLocaleString()}đ`);

    products.push({
      id:           pid,
      name:         name.substring(0, 120),
      category,
      price:        fp,
      originalPrice: Math.max(fp + 5000, orig),
      rating:       +((4.4 + Math.random() * 0.6).toFixed(1)),
      reviewsCount: Math.min(Math.floor(sold / 3), 9999),
      stock:        Math.floor(Math.random() * 200) + 10,
      isFeatured:   products.length < 5,
      isNew:        products.length < 10,
      isFlashSale:  products.length % 8 === 0,
      images,
      variants:     { colors:['Đen','Trắng','Xanh Navy'], sizes:['S','M','L','XL'] },
      shortDesc:    name.substring(0, 100),
      desc:         `${name}. Sản phẩm chính hãng chất lượng cao. Đã bán ${sold.toLocaleString()}+ sản phẩm.`,
      specs:        { 'Xuất xứ': 'Việt Nam', 'Tình trạng': 'Mới 100%' },
      tags:         [category, 'shopee', 'chính hãng'],
      reviews:      []
    });
  }

  return products;
}

// ── Main ─────────────────────────────────────────────
async function main() {
  const db = JSON.parse(readFileSync(DB_JSON, 'utf8'));
  const base = db.products.length;
  console.log(`✓ Sản phẩm hiện có: ${base}`);

  // shopee(3) — Thiết bị điện tử — layout A
  const tech = await parseFile(
    'c:\\web\\TIEM_NHA_NHO_ECOMMERCE_AI (1)\\shopee (3).xlsx',
    'A', 'tech', base
  );

  // shopee(2) — Thể thao & Du lịch — layout B
  const sport = await parseFile(
    'c:\\web\\TIEM_NHA_NHO_ECOMMERCE_AI (1)\\shopee (2).xlsx',
    'B', 'decor', base + tech.length
  );

  const newProds = [...tech, ...sport];
  console.log(`\n📦 Sản phẩm mới: ${newProds.length} (tech:${tech.length}, sport:${sport.length})`);

  // Gộp và lưu DB
  db.products = [...db.products, ...newProds];
  writeFileSync(DB_JSON, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✓ ecommerce_db.json: ${db.products.length} sản phẩm tổng`);

  // Cập nhật initialData.js
  let js = readFileSync(DATA_JS, 'utf8');
  const si = js.indexOf('export const INITIAL_PRODUCTS');
  const ei = js.indexOf('export const INITIAL_COUPONS');
  if (si === -1 || ei === -1) { console.error('Không tìm thấy markers trong initialData.js'); process.exit(1); }
  writeFileSync(DATA_JS,
    js.substring(0, si) +
    `export const INITIAL_PRODUCTS = ${JSON.stringify(db.products, null, 2)};\n\n` +
    js.substring(ei),
    'utf8'
  );
  console.log(`✓ initialData.js: ${db.products.length} sản phẩm`);

  const imgCount = (await import('fs')).readdirSync(IMG_DIR).filter(f=>f.endsWith('.jpg')).length;
  console.log(`✓ Ảnh local: ${imgCount} files`);
  console.log('\n✅ XONG!');
}

main().catch(e => { console.error(e); process.exit(1); });
