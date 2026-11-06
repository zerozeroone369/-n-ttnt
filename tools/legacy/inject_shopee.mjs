/**
 * inject_shopee.mjs — Node.js thuần
 * Dùng dữ liệu đã parse sẵn từ XML shopee.xlsx
 * Tải ảnh về public/products/ rồi inject vào web
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { get as httpsGet } from 'https';
import { inflateRawSync } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IMG_DIR  = path.join(__dirname, 'public', 'products');
const DATA_JS  = path.join(__dirname, 'src', 'data', 'initialData.js');
const DB_JSON  = path.join(__dirname, 'server', 'data', 'ecommerce_db.json');
const XLSX     = path.resolve('c:\\web\\TIEM_NHA_NHO_ECOMMERCE_AI (1)\\shopee.xlsx');

mkdirSync(IMG_DIR, { recursive: true });

// ── Parse xlsx (zip) ──────────────────────────────────
function readZipEntry(buf, name) {
  let i = 0;
  while (i < buf.length - 30) {
    if (buf[i]===0x50 && buf[i+1]===0x4B && buf[i+2]===0x03 && buf[i+3]===0x04) {
      const comp    = buf.readUInt16LE(i+8);
      const cSize   = buf.readUInt32LE(i+18);
      const fnLen   = buf.readUInt16LE(i+26);
      const exLen   = buf.readUInt16LE(i+28);
      const fn      = buf.slice(i+30, i+30+fnLen).toString('utf8');
      const start   = i+30+fnLen+exLen;
      const rawData = buf.slice(start, start+cSize);
      if (fn === name) {
        return comp === 8 ? inflateRawSync(rawData).toString('utf8') : rawData.toString('utf8');
      }
      i = start + cSize;
    } else { i++; }
  }
  return null;
}

function parseSharedStrings(xml) {
  const strings = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const texts = [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(t=>t[1]).join('');
    strings.push(texts.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,c)=>String.fromCharCode(c)));
  }
  return strings;
}

function parseSheet(xml, ss) {
  const rows = [];
  for (const rowM of xml.matchAll(/<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rn = +rowM[1];
    const obj = {};
    for (const c of rowM[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const col = c[1];
      const typ = (c[2].match(/t="([^"]+)"/) || [])[1] || '';
      const vM  = c[3].match(/<v>([^<]*)<\/v>/);
      const v   = vM ? vM[1] : '';
      obj[col]  = typ === 's' ? (ss[+v] || '') : v;
    }
    rows.push({ r: rn, d: obj });
  }
  return rows;
}

// ── Download ảnh ─────────────────────────────────────
function dlImage(url, dest) {
  return new Promise(res => {
    if (!url) return res(false);
    if (existsSync(dest)) return res(true);
    const f = createWriteStream(dest);
    const req = httpsGet(url, {
      headers: { 'Referer':'https://shopee.vn/', 'User-Agent':'Mozilla/5.0' },
      timeout: 12000
    }, r => {
      if (r.statusCode === 200) {
        r.pipe(f);
        f.on('finish', () => { f.close(); res(true); });
      } else { f.close(); res(false); }
    });
    req.on('error', () => { f.close(); res(false); });
    req.on('timeout', () => { req.destroy(); res(false); });
  });
}

function pPrice(s) { const n=parseInt((s||'').replace(/[^\d]/g,'')); return isNaN(n)?0:n; }
function pDisc(s)  { const n=parseInt((s||'').replace(/[^\d]/g,'')); return isNaN(n)?0:n/100; }
function pSold(s)  {
  const m=(s||'').match(/(\d+)\s*([kK]?)/);
  return m ? (m[2].toLowerCase()==='k' ? +m[1]*1000 : +m[1]) : 500;
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('📂 Đọc shopee.xlsx...');
  const buf  = readFileSync(XLSX);
  const ssXml = readZipEntry(buf, 'xl/sharedStrings.xml');
  const shXml = readZipEntry(buf, 'xl/worksheets/sheet1.xml');

  if (!shXml) { console.error('Không đọc được sheet1.xml'); process.exit(1); }

  const ss   = ssXml ? parseSharedStrings(ssXml) : [];
  const rows = parseSheet(shXml, ss);
  const data = rows.filter(r => r.r > 1); // bỏ header

  console.log(`✓ ${data.length} sản phẩm tìm thấy`);
  if (data[0]) console.log('  Mẫu dòng 1:', data[0].d);

  const products = [];
  let imgOk = 0;

  for (let i = 0; i < data.length; i++) {
    const row  = data[i].d;
    const name = (row['E'] || '').trim();
    if (!name || name.length < 3) continue;

    const pid   = `sp-${String(i+1).padStart(3,'0')}`;
    const img1  = row['B'] || '';
    const img2  = row['C'] || '';
    const disc  = pDisc(row['D']);
    const price = pPrice(row['H']);
    const sold  = pSold(row['J']);

    process.stdout.write(`[${i+1}/${data.length}] ${name.substring(0,45)}... `);

    const dest1 = path.join(IMG_DIR, `${pid}.jpg`);
    const dest2 = path.join(IMG_DIR, `${pid}_2.jpg`);
    const ok1   = img1 ? await dlImage(img1, dest1) : false;
    const ok2   = img2 ? await dlImage(img2, dest2) : false;
    if (ok1) imgOk++;

    const images = [];
    if (ok1)       images.push(`/products/${pid}.jpg`);
    else if (img1) images.push(img1);  // URL gốc Shopee làm fallback
    if (ok2)       images.push(`/products/${pid}_2.jpg`);
    else if (img2) images.push(img2);
    if (!images.length) images.push(
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80'
    );

    console.log(`${ok1?'✓':'✗'}img | ${price}đ`);

    const fp   = Math.max(9000, price);
    const orig = disc>0 ? Math.round(fp/(1-disc)) : Math.round(fp*1.3);

    products.push({
      id:           pid,
      name:         name.substring(0, 120),
      category:     'fashion',
      price:        fp,
      originalPrice: Math.max(fp+5000, orig),
      rating:       +((4.4+Math.random()*0.6).toFixed(1)),
      reviewsCount: Math.min(Math.floor(sold/3), 9999),
      stock:        Math.floor(Math.random()*280)+20,
      isFeatured:   i < 8,
      isNew:        i < 15,
      isFlashSale:  i % 7 === 0,
      images,
      variants:     { colors:['Đen','Trắng','Xanh Navy'], sizes:['S','M','L','XL'] },
      shortDesc:    name.substring(0, 100),
      desc:         `${name}. Sản phẩm chính hãng chất lượng cao. Đã bán ${sold.toLocaleString()} sản phẩm.`,
      specs:        { 'Chất liệu':'Cotton cao cấp', 'Xuất xứ':'Việt Nam' },
      tags:         ['thời trang nam','shopee','chính hãng'],
      reviews:      []
    });
  }

  console.log(`\n📦 ${products.length} sản phẩm | 📷 ${imgOk} ảnh tải được`);

  // ── Cập nhật initialData.js ──────────────────────────
  let js = readFileSync(DATA_JS, 'utf8');

  // Xóa import productsData nếu còn
  js = js.replace(/^import \{[^}]+\} from '\.\/productsData\.js';\n?/m, '');

  // Thay INITIAL_PRODUCTS bằng regex multi-line
  const marker = 'export const INITIAL_PRODUCTS';
  const nextMarker = 'export const INITIAL_COUPONS';
  const startIdx = js.indexOf(marker);
  const endIdx   = js.indexOf(nextMarker);
  if (startIdx === -1 || endIdx === -1) {
    console.error('Không tìm thấy INITIAL_PRODUCTS trong initialData.js');
    process.exit(1);
  }
  const before = js.substring(0, startIdx);
  const after  = js.substring(endIdx);
  const newJs  = `${before}export const INITIAL_PRODUCTS = ${JSON.stringify(products, null, 2)};\n\n${after}`;
  writeFileSync(DATA_JS, newJs, 'utf8');
  console.log('✓ initialData.js cập nhật xong');

  // ── Cập nhật ecommerce_db.json ───────────────────────
  const db = JSON.parse(readFileSync(DB_JSON, 'utf8'));
  db.products = products;
  writeFileSync(DB_JSON, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✓ ecommerce_db.json: ${products.length} sản phẩm`);

  console.log('\n✅ HOÀN THÀNH! Chạy npm run build để áp dụng.');
}

main().catch(e => { console.error(e); process.exit(1); });
