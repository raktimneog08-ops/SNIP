import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Header chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw pixel scanlines (filter byte 0 per row)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Modern gradient: Vibrant Indigo / Violet to Blue with Scissors / "S" cut motif
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.45;

      if (dist <= radius) {
        // Gradient background: Deep indigo to bright cyan (#4F46E5 -> #06B6D4)
        const t = (x + y) / (width * 2);
        let r = Math.round(79 * (1 - t) + 6 * t);
        let g = Math.round(70 * (1 - t) + 182 * t);
        let b = Math.round(229 * (1 - t) + 212 * t);
        let a = 255;

        // Snip icon mark: stylized white diagonal cut / scissors pin
        // Check if point is inside stylized "S" or scissor blade line
        const normX = x / width;
        const normY = y / height;
        const isBlade = Math.abs(normX - normY) < 0.09 && normX > 0.25 && normX < 0.75;
        const isCross = Math.abs((1 - normX) - normY) < 0.09 && normX > 0.25 && normX < 0.75;
        const isCenterDot = Math.hypot(normX - 0.5, normY - 0.5) < 0.12;

        if (isBlade || isCross || isCenterDot) {
          r = 255;
          g = 255;
          b = 255;
          a = 255;
        }

        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        // Transparent outside circular badge
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const png = Buffer.concat([
    pngSignature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressedData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);

  return png;
}

const iconsDir = path.resolve(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = generatePng(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated icon: ${outPath} (${size}x${size}, ${pngBuffer.length} bytes)`);
});
