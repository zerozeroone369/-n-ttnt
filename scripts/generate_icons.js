import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xFF];
  return (c ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateIconPNG(size) {
  const width = size;
  const height = size;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Background color #292524 (41, 37, 36)
  // Amber accent #f59e0b (245, 158, 11)
  // Rose accent #f43f5e (244, 63, 94)
  // White #ffffff (255, 255, 255)
  const bgR = 41, bgG = 37, bgB = 36;
  const goldR = 245, goldG = 158, goldB = 11;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;

      // Rounded rectangle test
      let inBounds = true;
      let dx = 0, dy = 0;
      if (x < cornerRadius) dx = cornerRadius - x;
      else if (x > width - cornerRadius) dx = x - (width - cornerRadius);
      if (y < cornerRadius) dy = cornerRadius - y;
      else if (y > height - cornerRadius) dy = y - (height - cornerRadius);
      if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadius * cornerRadius)) {
        inBounds = false;
      }

      if (!inBounds) {
        rawData[px] = 0;
        rawData[px + 1] = 0;
        rawData[px + 2] = 0;
        rawData[px + 3] = 0;
        continue;
      }

      // Default background
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Center coordinates normalized (-1 to 1)
      const cx = (x - width / 2) / (width / 2);
      const cy = (y - height / 2) / (height / 2);

      // Draw Shopping Bag Shape
      // Bag body: cx in [-0.5, 0.5], cy in [-0.15, 0.55]
      const inBagBody = (cx >= -0.45 && cx <= 0.45 && cy >= -0.15 && cy <= 0.52);
      // Bag handle: circle cx^2 + (cy + 0.15)^2 between [0.22^2, 0.30^2] and cy < -0.15
      const handleDist = Math.sqrt(cx * cx + (cy + 0.12) * (cy + 0.12));
      const inHandle = (handleDist >= 0.20 && handleDist <= 0.28 && cy <= -0.12);

      // Star / Sparkle in top right: cx around 0.35, cy around -0.35
      const sdx = Math.abs(cx - 0.35);
      const sdy = Math.abs(cy + 0.35);
      const inSparkle = (sdx + sdy < 0.16 && (sdx < 0.05 || sdy < 0.05));

      if (inHandle) {
        r = goldR; g = goldG; b = goldB;
      } else if (inBagBody) {
        // Gradient from rose to gold
        const blend = (cy + 0.15) / 0.67;
        r = Math.round(244 * (1 - blend) + goldR * blend);
        g = Math.round(63 * (1 - blend) + goldG * blend);
        b = Math.round(94 * (1 - blend) + goldB * blend);

        // Smile curve in center of bag
        const smileDist = Math.sqrt(cx * cx + (cy - 0.15) * (cy - 0.15));
        if (smileDist >= 0.18 && smileDist <= 0.22 && cy >= 0.15) {
          r = 255; g = 255; b = 255;
        }
      } else if (inSparkle) {
        r = 255; g = 255; b = 255;
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const p192 = generateIconPNG(192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);
console.log('✅ Generated public/icons/icon-192.png (' + p192.length + ' bytes)');

const p512 = generateIconPNG(512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);
console.log('✅ Generated public/icons/icon-512.png (' + p512.length + ' bytes)');

