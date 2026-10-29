// Tiny PNG read/write for the art scripts (8-bit RGBA, non-interlaced, which is what Piskel and our scripts produce).
const zlib = require('zlib');

/** Decode a PNG buffer to { w, h, d } with d = RGBA bytes. */
function decode(b) {
  let o = 8, w = 0, h = 0; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6 || d[12]) throw new Error('expected an 8-bit RGBA, non-interlaced PNG'); }
    if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[dst + x - 4] : 0, up = y ? out[dst - stride + x] : 0, c = y && x >= 4 ? out[dst - stride + x - 4] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      const pred = f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? up : c) : 0;
      out[dst + x] = (raw[src + x] + pred) & 255;
    }
  }
  return { w, h, d: out };
}

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
/** Encode { w, h, d } (RGBA) to a PNG buffer. */
function encode({ w, h, d }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(d.buffer, d.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Copy a w x h block from one image to another (alpha over). */
function blit(src, sx, sy, w, h, dst, dx, dy, opacity = 1) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((sy + y) * src.w + sx + x) * 4, j = ((dy + y) * dst.w + dx + x) * 4, a = src.d[i + 3] / 255 * opacity;
    if (!a) continue;
    for (let k = 0; k < 3; k++) dst.d[j + k] = Math.round(src.d[i + k] * a + dst.d[j + k] * (1 - a));
    dst.d[j + 3] = Math.max(dst.d[j + 3], Math.round(a * 255));
  }
}

module.exports = { decode, encode, blit };
