import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CHROME_EXTENSION_ALLOWLIST = [
  'manifest.json',
  'background.js',
  'bridge-content.js',
  'popup.html',
  'popup.js',
  'README.md',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

const CRC32_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tbl[i] = c >>> 0;
  }
  return tbl;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  return { dosDate, dosTime };
}

/**
 * Tạo bộ đệm file ZIP chuẩn (STORE mode + UTF-8 flag + CRC-32) không cần thư viện ngoài.
 */
export function buildStoreZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime();

  for (const item of entries) {
    const nameBuf = Buffer.from(String(item.name).replace(/\\/g, '/'), 'utf8');
    const dataBuf = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data);
    const sum = crc32(dataBuf);

    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4); // version needed
    localHdr.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHdr.writeUInt16LE(0, 8); // compression method: STORE
    localHdr.writeUInt16LE(dosTime, 10);
    localHdr.writeUInt16LE(dosDate, 12);
    localHdr.writeUInt32LE(sum, 14);
    localHdr.writeUInt32LE(dataBuf.length, 18);
    localHdr.writeUInt32LE(dataBuf.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);

    localParts.push(localHdr, nameBuf, dataBuf);

    const centralHdr = Buffer.alloc(46);
    centralHdr.writeUInt32LE(0x02014b50, 0);
    centralHdr.writeUInt16LE(20, 4); // version made by
    centralHdr.writeUInt16LE(20, 6); // version needed
    centralHdr.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
    centralHdr.writeUInt16LE(0, 10); // STORE
    centralHdr.writeUInt16LE(dosTime, 12);
    centralHdr.writeUInt16LE(dosDate, 14);
    centralHdr.writeUInt32LE(sum, 16);
    centralHdr.writeUInt32LE(dataBuf.length, 20);
    centralHdr.writeUInt32LE(dataBuf.length, 24);
    centralHdr.writeUInt16LE(nameBuf.length, 28);
    centralHdr.writeUInt16LE(0, 30);
    centralHdr.writeUInt16LE(0, 32);
    centralHdr.writeUInt16LE(0, 34);
    centralHdr.writeUInt16LE(0, 36);
    centralHdr.writeUInt32LE(0, 38);
    centralHdr.writeUInt32LE(offset, 42);

    centralParts.push(centralHdr, nameBuf);
    offset += localHdr.length + nameBuf.length + dataBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

export function getChromeExtensionZipBuffer(extensionDir, folderPrefix = 'tiem-nha-nho-shopee-bridge') {
  const entries = [];
  for (const relPath of CHROME_EXTENSION_ALLOWLIST) {
    const absPath = join(extensionDir, ...relPath.split('/'));
    if (!existsSync(absPath)) {
      throw new Error(`Thiếu tệp thành phần Chrome Extension: ${relPath}`);
    }
    entries.push({
      name: `${folderPrefix}/${relPath}`,
      data: readFileSync(absPath)
    });
  }
  return buildStoreZipBuffer(entries);
}
