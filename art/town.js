// Luis's island: a top-down, Pokémon-style map composed from the Ninja Adventure tilesets (CC0, art/tilesets/),
// recoloured to the first island's palette. The island keeps its wobbly outline (beach all round, turquoise lagoon
// deepening to blue), La Malinche in the north (her own shape, art/malinche.js) with a waterfall into a pond,
// dirt paths, a fenced garden and wheat field, groves of many kinds of trees, palms on the beach, a dock and the chiva.
// The consulate, lighthouse, cat sign and chiva paint job are drawn here in the pack's style.
// Writes public/town/* (ground.png, boat.png, Luis's walk frames, animated decor sprites) and
// src/app/island/town-data.ts (collision grid, places, animated decor). Run: node art/town.js (after node art/avatar.js)
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const { drawMalinche } = require('./malinche');
const T = 16, TW = 60, TH = 46, W = TW * T, H = TH * T;

// ---- PNG in / out (the tilesets are 8-bit RGBA, non-interlaced) -------------------------------------------------
function readPng(file) {
  const b = fs.readFileSync(file); let o = 8, w = 0, h = 0; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6 || d[12]) throw new Error(file + ': expected 8-bit RGBA, not interlaced'); } if (type === 'IDAT') idat.push(d); o += 12 + len; }
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
function png({ w, h, d }, s = 1) {
  const OW = w * s, OH = h * s, raw = Buffer.alloc((OW * 4 + 1) * OH);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const si = ((y / s | 0) * w + (x / s | 0)) * 4, di = y * (OW * 4 + 1) + 1 + x * 4; raw[di] = d[si]; raw[di + 1] = d[si + 1]; raw[di + 2] = d[si + 2]; raw[di + 3] = d[si + 3]; }
  const hd = Buffer.alloc(13); hd.writeUInt32BE(OW, 0); hd.writeUInt32BE(OH, 4); hd[8] = 8; hd[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- canvas + drawing ------------------------------------------------------------------------------------------
const canvas = (w, h) => ({ w, h, d: new Uint8Array(w * h * 4) });
const ground = canvas(W, H);
let cv = ground;
const rgb = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function put(x, y, r, g, b, a = 255) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= cv.w || y >= cv.h || !a) return;
  const i = (y * cv.w + x) * 4, k = a / 255;
  cv.d[i] = Math.round(r * k + cv.d[i] * (1 - k)); cv.d[i + 1] = Math.round(g * k + cv.d[i + 1] * (1 - k)); cv.d[i + 2] = Math.round(b * k + cv.d[i + 2] * (1 - k)); cv.d[i + 3] = Math.max(cv.d[i + 3], a);
}
const px = (x, y, c, a = 255) => { const [r, g, b] = rgb(c); put(x, y, r, g, b, a); };
const rect = (x, y, w, h, c, a) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c, a); };
const ell = (cx, cy, rx, ry, c, a) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) px(x, y, c, a); };
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sprite = (x, y, rows, key) => rows.forEach((r, j) => [...r].forEach((ch, i) => key[ch] && px(x + i, y + j, key[ch])));
const OUTL = '#14141c';   // the pack's dark outline colour

// The island's own palette (grass, sandy paths, light sand, turquoise -> deep blue water, forest greens) replaces the
// pack's olive / terracotta / orange / cyan, so the town keeps the look of the first island.
const RECOLOR = {
  terrain: { '#adbc3a': '#68b848', '#a8a129': '#4c9838', '#74a334': '#4c9838', '#56864c': '#3e8030',
    '#d3865f': '#d8b870', '#bd7959': '#b0904c', '#e6a578': '#e8d0a0', '#ffad5d': '#e8d898', '#ef914f': '#d0bc78',
    '#d78b4a': '#d0bc78', '#ffcb8d': '#f4e8b8', '#965340': '#b89c5c' },
  canopy: { '#adbc3a': '#7cc050', '#74a334': '#4e9a3c', '#4a7f4b': '#357a34', '#345a52': '#24582a', '#7a7a3e': '#3e7a30' },
};
const WATER = ['#86e6d8', '#52d0cc', '#2ea8c0', '#2f7cc4', '#245aa6', '#1c4890'];   // shallow -> deep
const toMap = m => new Map(Object.entries(m).map(([a, b]) => [parseInt(a.slice(1), 16), rgb(b)]));
const MAPS = { Nature: toMap(RECOLOR.canopy) };
function recolor(x0, y0, x1, y1, map) {   // swap exact colours in a px rect of the canvas
  const m = toMap(map);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * cv.w + x) * 4, c = m.get((cv.d[i] << 16) | (cv.d[i + 1] << 8) | cv.d[i + 2]);
    if (c) { cv.d[i] = c[0]; cv.d[i + 1] = c[1]; cv.d[i + 2] = c[2]; }
  }
}

const SHEETS = {};
for (const n of ['Floor', 'Nature', 'House', 'Water', 'Relief', 'Element']) SHEETS[n] = readPng(path.join(__dirname, 'tilesets', 'ninja-adventure', `Tileset${n}.png`));
SHEETS.Boat = readPng(path.join(__dirname, 'tilesets', 'ninja-adventure', 'Boat.png'));
/** Copy a w x h tile block from a sheet (tile coords) to the canvas at tile (dx, dy); px offsets optional. */
function tile(sheet, sx, sy, dx, dy, w = 1, h = 1, ox = 0, oy = 0) {
  const s = SHEETS[sheet], map = MAPS[sheet];
  for (let y = 0; y < h * T; y++) for (let x = 0; x < w * T; x++) {
    const i = ((sy * T + y) * s.w + sx * T + x) * 4, c = map?.get((s.d[i] << 16) | (s.d[i + 1] << 8) | s.d[i + 2]);
    put(dx * T + x + ox, dy * T + y + oy, c ? c[0] : s.d[i], c ? c[1] : s.d[i + 1], c ? c[2] : s.d[i + 2], s.d[i + 3]);
  }
}

// ---- the island outline (the first island's wobbly ellipse): d < 1 land, d > 1 sea -------------------------------
const CX = W / 2, CY = H / 2 - 8, RX = 404, RY = 312;
const shape = (x, y) => { const dx = (x - CX) / RX, dy = (y - CY) / RY, a = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) / (1 + 0.05 * Math.sin(3 * a) + 0.035 * Math.sin(5 * a + 1) + 0.02 * Math.sin(9 * a + 2)); };
const BEACH = .9;   // d from here to 1 is sand

// ---- the plan ----------------------------------------------------------------------------------------------------
// terrain per tile: g grass, p dirt path, w pond, s beach, S sea, m mountain, d dock
const terr = Array.from({ length: TH }, (_, y) => Array.from({ length: TW }, (_, x) => { const d = shape(x * T + 8, y * T + 8); return d < BEACH - .03 ? 'g' : d < .985 ? 's' : 'S'; }));
const blocked = Array.from({ length: TH }, () => Array(TW).fill(false));
const taken = Array.from({ length: TH }, () => Array(TW).fill(false));      // no trees/props on these tiles
const occupied = Array.from({ length: TH }, () => Array(TW).fill(false));   // tiles with a tree/prop (for spacing)
const inMap = (x, y) => x >= 0 && y >= 0 && x < TW && y < TH;
const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) terr[y][x] = ch; };
const block = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) blocked[y][x] = true; };
const reserve = (x0, y0, x1, y1, m = 1) => { for (let y = y0 - m; y <= y1 + m; y++) for (let x = x0 - m; x <= x1 + m; x++) if (inMap(x, y)) taken[y][x] = true; };

// La Malinche in the north: her box (px); tiles under her silhouette become mountain
const MAL = { x: 17 * T, y: 3 * T + 8, w: 26 * T, h: 12 * T + 8 };
const malMask = canvas(W, H); cv = malMask; drawMalinche(px, MAL.x, MAL.y, MAL.w, MAL.h); cv = ground;
const onMalinche = (x, y) => x >= 0 && y >= 0 && x < W && y < H && malMask.d[(y * W + x) * 4 + 3] > 0;
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (onMalinche(x * T + 8, y * T + 12)) terr[y][x] = 'm';
const FALL = { x: 29 * T, top: 13, rows: 3 };   // waterfall at her foot, 2 tiles wide
const POND = [26, 16, 33, 18];
fill(...POND, 'w');
// paths (tile rects): main road, branches to each place, the plaza where Luis starts, the road down to the dock
const PATHS = [[9, 22, 51, 23], [14, 20, 15, 21], [44, 21, 45, 21], [26, 26, 33, 29], [29, 24, 30, 25], [29, 30, 30, 39], [46, 24, 47, 31], [21, 19, 22, 21], [37, 19, 38, 21]];
for (const r of PATHS) for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) if (terr[y][x] === 'g' || terr[y][x] === 's') terr[y][x] = 'p';
// the dock runs from the beach into the sea under the south road
let dockTop = 39; while (terr[dockTop + 1][29] !== 'S') dockTop++;
const DOCK = [29, dockTop + 1, 30, dockTop + 4];
fill(29, 40, 30, dockTop, 'p');   // the road runs over the beach to the dock
fill(...DOCK, 'd');
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
  const t = terr[y][x];
  if ('mwS'.includes(t)) blocked[y][x] = true;
  if (t !== 'g' && t !== 's') reserve(x, y, x, y, t === 'd' ? 1 : 0);
}
// places (tile rects, inclusive)
const LIB = [13, 17, 16, 19], CONS = [41, 16, 47, 20], LIGHT = [48, 25, 49, 30];
const BOAT = [31, DOCK[1] + 1, 35, DOCK[1] + 3];
const GARDEN = [12, 26, 19, 31], FARM = [36, 26, 43, 31];
for (const r of [LIB, CONS, LIGHT]) { block(...r); reserve(...r, 1); }
reserve(...GARDEN, 1); reserve(...FARM, 1);
const HORSE = [31, 30, 33, 31];   // where Luis's horse starts (it roams the whole island; see the app)
block(...BOAT);
const SPOTS = [
  { id: 'library', x: 15 * T, y: 20 * T + 8 },
  { id: 'visa', x: 44 * T + 8, y: 21 * T + 8 },
  { id: 'lighthouse', x: 47 * T + 8, y: 31 * T + 4 },
  { id: 'boat', x: 30 * T, y: DOCK[3] * T + 6 },
];
const START = { x: 30 * T, y: 28 * T + 8 };

// ---- terrain painting --------------------------------------------------------------------------------------------
const same = (x, y, set) => !inMap(x, y) || set.includes(terr[y][x]);
/** Blob autotile for terrain `set` drawn on grass: picks the edge / corner / inner-corner piece from a block. */
function autotile(sheet, bx, by, inner, x, y, set) {
  const n = same(x, y - 1, set), s = same(x, y + 1, set), w = same(x - 1, y, set), e = same(x + 1, y, set);
  let p = [1, 1];
  if (!n && !w) p = [0, 0]; else if (!n && !e) p = [2, 0]; else if (!s && !w) p = [0, 2]; else if (!s && !e) p = [2, 2];
  else if (!n) p = [1, 0]; else if (!s) p = [1, 2]; else if (!w) p = [0, 1]; else if (!e) p = [2, 1];
  else if (!same(x + 1, y + 1, set)) p = inner.se; else if (!same(x - 1, y + 1, set)) p = inner.sw;
  else if (!same(x + 1, y - 1, set)) p = inner.ne; else if (!same(x - 1, y - 1, set)) p = inner.nw;
  tile(sheet, bx + p[0], by + p[1], x, y);
}
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
  tile('Floor', hash(x, y, 1) < .18 ? 1 + Math.floor(hash(x, y, 2) * 4) : 0, 12, x, y);   // grass (with tufts) under everything
  const t = terr[y][x];
  if (t === 'p') autotile('Floor', 0, 7, { se: [5, 1], sw: [6, 1], ne: [5, 2], nw: [6, 2] }, x, y, 'pd');
  else if (t === 'w') autotile('Water', 0, 6, { se: [1, 1], sw: [1, 1], ne: [1, 1], nw: [1, 1] }, x, y, 'w');
}
recolor(0, 0, W, H, RECOLOR.terrain);
recolor(POND[0] * T, POND[1] * T, (POND[2] + 1) * T, (POND[3] + 1) * T, { '#71ddee': WATER[1], '#79b8ce': WATER[2], '#965340': '#b89c5c' });

// beach and sea, per pixel, like the first island: sand ring, wet edge, foam line, water deepening with distance,
// reef patches and sand bars in the lagoon, little wave marks out deep
const SEA_STEPS = [1.012, 1.04, 1.08, 1.13, 1.2];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = shape(x, y), tx = x >> 4, ty = y >> 4;
  if (d >= 1) {
    let i = SEA_STEPS.findIndex(s => d < s); if (i < 0) i = WATER.length - 1;
    let c = WATER[i];
    const reef = Math.sin(x * .045 + Math.sin(y * .08) * 2) * Math.cos(y * .06 + x * .012);
    if (i >= 1 && i <= 2 && reef > .58) c = '#2a8f9c';
    if (i >= 1 && i <= 2 && reef < -.78) c = '#a8f0e2';
    if (d < 1.012 && (x + y) % 3) c = '#f0f8f8';   // foam
    px(x, y, c);
    if (i >= 3 && (x * 7 + y * 13) % 97 === 0) for (let k = 0; k < 4; k++) { px(x + k, y, '#5a9ad8'); px(x + k + 1, y + 1, '#163e80'); }
  } else if (d >= BEACH && terr[ty][tx] !== 'p') {
    px(x, y, d > .985 ? '#c8b070' : hash(x, y, 5) < .06 ? '#d0bc78' : hash(x, y, 6) < .03 ? '#f4e8b8' : '#e8d898');
  } else if (d >= BEACH - .012 && terr[ty][tx] !== 'p') px(x, y, '#3e8030');   // dark grass lip where the lawn meets the sand
}
// La Malinche herself (her own drawing, with a side outline in the pack's style)
drawMalinche(px, MAL.x, MAL.y, MAL.w, MAL.h);
for (let y = MAL.y; y < MAL.y + MAL.h; y++) for (let x = MAL.x; x < MAL.x + MAL.w; x++) if (onMalinche(x, y) && (!onMalinche(x - 1, y) || !onMalinche(x + 1, y))) px(x, y, OUTL);
// dock: wooden planks over the water with posts
for (let y = DOCK[1]; y <= DOCK[3]; y++) for (const x of [DOCK[0], DOCK[2]]) tile('Water', x === DOCK[0] ? 1 : 2, y === DOCK[3] ? 15 : 13, x, y);
for (let y = DOCK[1] + 1; y <= DOCK[3]; y += 2) for (const x of [DOCK[0] * T - 1, (DOCK[2] + 1) * T - 3]) { rect(x, y * T + 10, 4, 7, OUTL); rect(x + 1, y * T + 10, 2, 6, '#7a4a28'); }

// ---- objects: trees, plants, rocks, fences, buildings (sorted top to bottom so lower ones overlap upper ones) ------
const objects = [];
const obj = (tx, ty, w, h, draw, solid = true) => { for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (inMap(x, y)) { if (solid) blocked[y][x] = true; taken[y][x] = occupied[y][x] = true; } objects.push({ y: ty + h, draw }); };
// a spot is free when its own tiles are open ground of kind `kind` and nothing else is within `m` tiles
const free = (tx, ty, w, h, m = 1, kind = 'g') => { for (let y = ty - m; y < ty + h + m; y++) for (let x = tx - m; x < tx + w + m; x++) if (inMap(x, y) && occupied[y][x]) return false; for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (!inMap(x, y) || terr[y][x] !== kind || taken[y][x]) return false; return true; };
const N = (sx, sy, w = 2, h = 2, solid = true) => (tx, ty) => obj(tx, ty, w, h, () => tile('Nature', sx, sy, tx, ty, w, h), solid);
const TREES = { round: N(0, 0), pine: N(2, 0), roots: N(6, 0), light: N(16, 0), light2: N(18, 0), cherry: N(14, 0), big: N(6, 8) };
const ROCKS = { brown: N(13, 8), grey: N(16, 8), small: N(15, 9, 1, 1), smallGrey: N(18, 9, 1, 1), pebble: N(4, 13, 1, 1) };
const PLANTS = { bush: N(1, 10, 1, 1), leafy: N(0, 10, 1, 1, false), fern: N(4, 10, 1, 1, false), fern2: N(5, 10, 1, 1, false), monstera: N(4, 11, 1, 1, false), monstera2: N(5, 11, 1, 1, false), reeds: N(7, 11, 1, 1, false), shrub: N(8, 10, 1, 1), stump: N(4, 8, 1, 1) };   // leafy plants: walk through
const BAMBOO = (tx, ty) => obj(tx, ty, 1, 3, () => tile('Nature', 11, 8, tx, ty, 1, 3));
function palm(tx, ty) {   // the island's palms, drawn in the pack's outline style
  obj(tx, ty + 1, 1, 1, () => {
    const X = tx * T, Y = ty * T;
    ell(X + 9, Y + 30, 6, 2, '#000000', 50);
    for (let j = 0; j < 20; j++) { const x = X + 6 + Math.round(Math.sin(j / 6) * 2); rect(x - 1, Y + 10 + j, 5, 1, OUTL); rect(x, Y + 10 + j, 3, 1, j % 3 ? '#b07a48' : '#7a5028'); }
    for (const [dx, dy] of [[-8, 3], [8, 3], [-6, -3], [6, -3], [0, -6]]) for (let k = 0; k <= 8; k++) {
      const x = X + 7 + dx * k / 8, y = Y + 9 + dy * k / 8 + (k * k) / 16;
      px(x, y - 1, OUTL); px(x, y + 2, OUTL); px(x, y, '#4ab04a'); px(x, y + 1, '#2e8a3a');
    }
    ell(X + 7, Y + 10, 2, 2, '#6a4a28');
  });
}

// forest at La Malinche's foot: pines and round trees along her base, leaving the waterfall clear
for (let tx = MAL.x / T; tx < (MAL.x + MAL.w) / T - 1; tx += 2) {
  if (Math.abs(tx - FALL.x / T) < 3) continue;
  let ty = 6; while (ty < TH && terr[ty][tx] === 'm' || terr[ty]?.[tx + 1] === 'm') ty++;   // first grass row under her
  if (free(tx, ty - 1, 2, 2, 0) || free(tx, ty, 2, 2, 0)) ((tx / 2) % 2 ? TREES.pine : TREES.round)(tx, free(tx, ty - 1, 2, 2, 0) ? ty - 1 : ty);
}
// palms all round the beach, with gaps
for (let ty = 0; ty < TH - 1; ty++) for (let tx = 0; tx < TW; tx++) if (terr[ty + 1]?.[tx] === 's' && terr[ty][tx] !== 'S' && hash(tx, ty, 21) < .3 && free(tx, ty + 1, 1, 1, 1, 's')) palm(tx, ty);
// bamboo and reeds by the pond
for (const [x, y] of [[24, 16], [35, 16]]) if (free(x, y, 1, 3, 0)) BAMBOO(x, y);
for (const [x, y] of [[25, 19], [34, 19], [27, 19]]) if (free(x, y, 1, 1, 0)) PLANTS.reeds(x, y);
// fences, flower garden (the flowers themselves are animated, see DECOR) and wheat field
function fence([x0, y0, x1, y1], gap) {
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (!(y === y1 && gap.includes(x))) obj(x, y, 1, 1, () => tile('House', 11, 7, x, y, 1, 1, 0, -6));
  for (let y = y0 + 1; y < y1; y++) for (const x of [x0, x1]) obj(x, y, 1, 1, () => tile('House', 11, 6, x, y));
}
fence(GARDEN, [15, 16]); fence(FARM, [39, 40]);
reserve(GARDEN[0] + 1, GARDEN[1] + 1, GARDEN[2] - 1, GARDEN[3] - 1, 0);
obj(FARM[0] + 1, FARM[1] + 1, FARM[2] - FARM[0] - 1, FARM[3] - FARM[1] - 1, () => {
  for (let ty = FARM[1] + 1; ty < FARM[3]; ty += 2) for (let tx = FARM[0] + 1; tx < FARM[2]; tx += 3) tile('Element', 13, 4, tx, ty, Math.min(3, FARM[2] - tx), Math.min(2, FARM[3] - ty));
});
// groves: many kinds of trees, tropical plants, rocks; big things first (they need a 4x4 gap), then small ones
const BIG = [TREES.round, TREES.pine, TREES.light, TREES.roots, TREES.big, TREES.light2, TREES.cherry, ROCKS.brown, ROCKS.grey, TREES.round, TREES.pine];
const SMALL = [PLANTS.bush, PLANTS.leafy, PLANTS.fern, PLANTS.fern2, PLANTS.monstera, PLANTS.monstera2, PLANTS.shrub, PLANTS.stump, ROCKS.small, ROCKS.smallGrey, ROCKS.pebble, N(2, 10, 1, 1, false), N(9, 10, 1, 1, false), N(10, 10, 1, 1, false), N(8, 11, 1, 1, false), PLANTS.monstera, PLANTS.fern];
for (const [list, size, chance] of [[BIG, 2, .45], [SMALL, 1, .5]]) for (let ty = 3; ty < TH - 3; ty++) for (let tx = 2; tx < TW - 2; tx++) {
  if (hash(tx, ty, 11 + size) > chance) continue;
  const f = list[Math.floor(hash(tx, ty, 12 + size) * list.length)];
  if (free(tx, ty, size, size)) f(tx, ty);
}

// ---- buildings ---------------------------------------------------------------------------------------------------
const CAT = ['.o.....o.', 'oo.....oo', 'ooooooooo', 'oo.ooo.oo', 'ooooooooo', '.ooooooo.', '..ooooo..'];
objects.push({ y: LIB[3] + 1, draw: () => {   // GitHub: the pack's red-roofed house as a library, with a dark cat sign
  tile('House', 12, 0, LIB[0], LIB[1], 4, 3);
  const x = LIB[0] * T + 22, y = LIB[1] * T + 20;
  rect(x - 1, y - 1, 22, 14, OUTL); rect(x, y, 20, 12, '#2a2a34'); rect(x, y, 20, 1, '#4a4a58');
  sprite(x + 6, y + 3, CAT, { o: '#f4f4f8' });
} });
objects.push({ y: CONS[3] + 1, draw: () => {   // Easytravel Visa: a consulate with columns, steps and a flag
  const X = CONS[0] * T, Y = CONS[1] * T, w = (CONS[2] - CONS[0] + 1) * T, h = (CONS[3] - CONS[1] + 1) * T;
  rect(X + 3, Y + h - 3, w - 2, 4, '#000000', 60);
  for (let y = 0; y < 26; y++) { const inset = Math.round((26 - y) * 1.7); rect(X + inset, Y + 8 + y, w - inset * 2, 1, y < 2 ? OUTL : y % 5 === 0 ? '#3e5090' : '#5468b0'); px(X + inset, Y + 8 + y, OUTL); px(X + w - inset - 1, Y + 8 + y, OUTL); }
  ell(X + w / 2, Y + 24, 6, 6, OUTL); ell(X + w / 2, Y + 24, 5, 5, '#f0c848'); ell(X + w / 2, Y + 24, 3, 3, '#c89a20');
  rect(X + 3, Y + 34, w - 6, 7, OUTL); rect(X + 4, Y + 35, w - 8, 5, '#f3eedf'); rect(X + 4, Y + 39, w - 8, 1, '#c9c2ad');
  rect(X + 7, Y + 41, w - 14, h - 54, OUTL); rect(X + 8, Y + 41, w - 16, h - 54, '#d8d0bc');
  for (let i = 0; i < 6; i++) { const cx = X + 13 + i * 17; rect(cx - 1, Y + 41, 9, h - 54, OUTL); rect(cx, Y + 41, 7, h - 54, '#fbf7ec'); rect(cx + 5, Y + 41, 2, h - 54, '#cfc8b4'); }
  rect(X + w / 2 - 9, Y + h - 32, 18, 19, OUTL); rect(X + w / 2 - 8, Y + h - 31, 16, 18, '#7a4428'); rect(X + w / 2, Y + h - 31, 1, 18, OUTL); px(X + w / 2 - 3, Y + h - 22, '#f0c848'); px(X + w / 2 + 2, Y + h - 22, '#f0c848');
  for (let s = 0; s < 3; s++) { rect(X + 5 - s * 2, Y + h - 13 + s * 4, w - 10 + s * 4, 4, OUTL); rect(X + 6 - s * 2, Y + h - 13 + s * 4, w - 12 + s * 4, 3, s % 2 ? '#d0c9b4' : '#e6e0cd'); }
  // the USA flag on the pole: red and white stripes, blue canton with white stars
  rect(X + w - 16, Y - 10, 2, 26, OUTL); rect(X + w - 14, Y - 9, 18, 11, OUTL);
  for (let r = 0; r < 9; r++) rect(X + w - 13, Y - 8 + r, 16, 1, r % 2 ? '#ffffff' : '#c8102e');
  rect(X + w - 13, Y - 8, 7, 5, '#0a3161');
  for (const [sx, sy] of [[1, 1], [3, 1], [5, 1], [2, 3], [4, 3]]) px(X + w - 13 + sx, Y - 8 + sy, '#ffffff');
} });
objects.push({ y: LIGHT[3] + 1, draw: () => {   // LinkedIn: a lighthouse in blue and white on the east coast
  const X = LIGHT[0] * T, Y = LIGHT[1] * T, w = 32, h = (LIGHT[3] - LIGHT[1] + 1) * T;
  rect(X + 2, Y + h - 3, w, 4, '#000000', 60);
  rect(X + 1, Y + h - 14, 30, 14, OUTL); rect(X + 2, Y + h - 13, 28, 12, '#9a9aa6'); rect(X + 2, Y + h - 13, 28, 2, '#c4c4ce');
  for (let y = 22; y < h - 14; y++) { const inset = 6 + Math.round((h - 14 - y) / 14), band = Math.floor((y - 22) / 9) % 2; rect(X + inset, Y + y, w - inset * 2, 1, band ? '#ffffff' : '#0a66c2'); px(X + w - inset - 2, Y + y, band ? '#d4d8e2' : '#08508f'); px(X + inset - 1, Y + y, OUTL); px(X + w - inset, Y + y, OUTL); }
  rect(X + 4, Y + 17, 24, 5, OUTL); rect(X + 5, Y + 18, 22, 3, '#2a2a34');
  rect(X + 8, Y + 7, 16, 11, OUTL); rect(X + 9, Y + 8, 14, 9, '#ffe066'); rect(X + 9, Y + 8, 14, 2, '#fff4b0'); rect(X + 15, Y + 8, 2, 9, OUTL);
  for (let y = 0; y < 8; y++) { rect(X + 16 - y - 2, Y + y, (y + 2) * 2, 1, '#0a4a8a'); px(X + 16 - y - 3, Y + y, OUTL); px(X + 16 + y + 2, Y + y, OUTL); }
  rect(X + 12, Y + h - 12, 8, 12, OUTL); rect(X + 13, Y + h - 11, 6, 11, '#7a4428');
} });
objects.sort((a, b) => a.y - b.y).forEach(o => o.draw());

// ---- animated decor (the app plays these: flowers and grass sway, animals idle, fish swim, water moves) -----------
const ANIM = path.join(__dirname, 'tilesets', 'ninja-adventure', 'anim');
const DECOR = [];
const decor = (src, x, y, w, h, kind, extra = {}) => {
  const ms = extra.ms ?? 1800 + Math.floor(hash(x, y, 8) * 900);   // sway speed varies a little per plant
  DECOR.push({ src: `town/${src}`, x, y, w, h, kind, frames: 1, ...extra, ms, delay: -Math.floor(hash(x, y, 9) * ms) });
};
// cut one Nature tile out (recoloured) as its own image, so it can sway
const cut = (name, sx, sy) => { const c = canvas(T, T); cv = c; tile('Nature', sx, sy, 0, 0); cv = ground; return [name, c]; };
const shark = canvas(2 * T, T); cv = shark;   // fin facing left (the swim animation turns it round)
for (const f of [0, 1]) {
  const X = f * T;
  for (let y = 0; y < 9; y++) { const w = Math.round((y + 1) * .75); for (let x = 0; x < w; x++) px(X + 6 + x - Math.round(y * .15), 2 + y, x === 0 ? '#c8ccd4' : '#6e7480'); px(X + 6 + w - Math.round(y * .15), 2 + y, '#2a2e36'); px(X + 5 - Math.round(y * .15), 2 + y, '#2a2e36'); }
  for (let x = 2; x < 15; x++) if ((x + f) % 3) px(X + x, 11, '#f0f8f8'); for (let x = 9; x < 15; x++) if ((x + f) % 2) px(X + x, 12, '#c4ecff');
}
cv = ground;
const CUTS = [['shark', shark], cut('sunflower', 0, 11), cut('sunflower2', 1, 11), cut('redflower', 3, 11), cut('whiteflower', 6, 11), cut('grass', 3, 10), cut('grass2', 7, 10)];
// flowers in the garden, swaying (alternating kinds; the pack's animated white flower too)
const GF = ['sunflower', 'redflower', 'flower-sway', 'sunflower2', 'whiteflower', 'redflower'];
for (let ty = GARDEN[1] + 1; ty < GARDEN[3]; ty++) for (let tx = GARDEN[0] + 1; tx < GARDEN[2]; tx++) {
  const k = GF[(tx * 3 + ty) % GF.length];
  if (k === 'flower-sway') decor('flower-sway.png', tx * T, ty * T, T, T, 'frames', { frames: 4, ms: 900 });
  else decor(`${k}.png`, tx * T, ty * T, T, T, 'sway');
}
// wild flowers and tall grass on open lawn
for (let ty = 2; ty < TH - 2; ty++) for (let tx = 1; tx < TW - 1; tx++) if (terr[ty][tx] === 'g' && !occupied[ty][tx] && !taken[ty][tx]) {
  const r = hash(tx, ty, 14);
  if (r < .08) decor(`${['sunflower', 'redflower', 'whiteflower'][Math.floor(hash(tx, ty, 15) * 3)]}.png`, tx * T, ty * T, T, T, 'sway');
  else if (r < .18) decor(`${hash(tx, ty, 16) < .5 ? 'grass' : 'grass2'}.png`, tx * T, ty * T, T, T, 'sway');
}
// the waterfall (top, middle, bottom strips) and lily-pad ripples on the pond
for (let i = 0; i < FALL.rows; i++) for (const dx of [0, T]) {
  const part = i === 0 ? 'top' : i === FALL.rows - 1 ? 'bottom' : 'middle';
  decor(`waterfall-${part}.png`, FALL.x + dx, (FALL.top + i) * T, T, T, 'frames', { frames: part === 'bottom' ? 3 : 5, ms: 500 });
}
for (const [x, y] of [[27, 17], [31, 16], [32, 18]]) decor('ripples.png', x * T, y * T, T, T, 'frames', { frames: 4, ms: 1200 });
// animals where they'd live: parrots in the trees, a monkey at La Malinche's foot, a frog at the pond, chickens and a
// donkey by the farm, a dog in the plaza, a cat at the library; fish in the sea and the pond
// animals start on the nearest open tile to where they're asked to be (not on a tree, rock or fence). In the app they
// roam: `roam` = how far from home they wander (tiles), `speed` = px per second, `right` = the sprite faces right.
const animal = (src, tx, ty, w = 16, frames = 2, roam = 5, speed = 18, right = true, h = 16) => {
  for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tx + dx, y = ty + dy;
    if (inMap(x, y) && 'gps'.includes(terr[y][x]) && !occupied[y][x] && !blocked[y][x]) { occupied[y][x] = true; return decor(src, x * T, y * T, w, h, 'animal', { frames, ms: 700 + Math.floor(hash(x, y) * 600), roam, speed, right }); }
  }
};
animal('parrot-red.png', 20, 17, 16, 2, 4, 22); animal('parrot-blue.png', 39, 18, 16, 2, 4, 22); animal('parrot-red.png', 52, 20, 16, 2, 4, 22);
animal('monkey.png', 24, 14, 16, 2, 6, 30); animal('frog.png', 25, 18, 16, 2, 3, 14); animal('chicken-white.png', 37, 32, 16, 2, 4, 16);
animal('chicken-brown.png', 40, 33, 16, 2, 4, 16); animal('chicken-white.png', 42, 32, 16, 2, 4, 16); animal('donkey.png', 34, 33, 23, 2, 6, 14);
animal('dog.png', 27, 31, 16, 2, 10, 34); animal('cat.png', 17, 20, 16, 2, 6, 24);
animal('luis-horse.png', HORSE[0] + 1, HORSE[1], 40, 2, 99, 62, false, 30);   // the horse gallops all over the island
Object.assign(DECOR.at(-1), { run: 'town/luis-horse-run.png', runFrames: 4 });   // with its own gallop frames
for (const [src, sw, sh, tx, ty] of [['dog-white', 32, 16, 20, 24], ['dog-black', 36, 17, 40, 24], ['dog-orange', 36, 16, 12, 33], ['dog-yellow', 42, 17, 47, 33],
  ['cat-black', 32, 16, 11, 21], ['cat-orange', 44, 17, 36, 21], ['cat-white', 34, 15, 25, 33], ['dog.png', 32, 16, 50, 23]])
  animal(src.endsWith('.png') ? src : `${src}.png`, tx, ty, sw / 2, 2, src.startsWith('cat') ? 6 : 9, src.startsWith('cat') ? 22 : 32, true, sh);
for (const [x, y, dist] of [[3, 30, 110], [55, 18, 90], [12, 44, 120], [47, 2, 100]]) decor('shark.png', x * T, y * T, T, T, 'swim', { dist, ms: 9000 + Math.floor(hash(x, y) * 4000) });
for (const [x, y, c, dist] of [[8, 40, 'yellow', 70], [20, 43, 'red', 90], [42, 42, 'yellow', 80], [50, 39, 'red', 60], [5, 12, 'yellow', 60], [54, 10, 'red', 70], [14, 4, 'yellow', 80], [44, 5, 'red', 70], [28, 17, 'yellow', 40]])
  decor(`fish-${c}.png`, x * T, y * T, T, T, 'swim', { dist, ms: 5000 + Math.floor(hash(x, y) * 4000) });

// ---- the chiva boat: the pack's boat painted in Colombia's colours, with a luggage rack and party lights -----------
const BW = (BOAT[2] - BOAT[0] + 1) * T, BH = (BOAT[3] - BOAT[1] + 1) * T;
const BOAT_FRAMES = 3, boat = canvas(BW * BOAT_FRAMES, BH); cv = boat;
// the chiva boat, drawn by hand: a river boat with a raised bow, wooden rail, hull painted in Colombia's colours with
// a white zigzag, a cabin of wooden posts with passengers at the windows, a luggage rack and a string of lights on
// the roof, and a Colombian flag at the stern. 3 frames: the water laps at the hull, the flag waves, the lights blink.
for (let f = 0; f < BOAT_FRAMES; f++) {
  const X = f * BW, wl = BH - 9;                                       // waterline
  const top = x => 25 - Math.max(0, 16 - x) * .7 - Math.max(0, x - 70) * .4;   // gunwale, rising at the bow (left)
  const bot = x => 43 - Math.max(0, 12 - x) * .9 - Math.max(0, x - 68) * .7;    // keel, rounded at both ends
  // roof rack with luggage and bananas
  for (const [x, w, h, c] of [[22, 8, 6, '#fcd116'], [31, 6, 8, '#003893'], [38, 9, 5, '#ce1126'], [48, 7, 7, '#fcd116'], [56, 6, 6, '#003893']]) {
    rect(X + x - 1, 11 - h, w + 2, h + 1, OUTL); rect(X + x, 12 - h, w, h - 1, c); rect(X + x, 12 - h, w, 1, '#ffffff', 150);
  }
  for (let k = 0; k < 4; k++) { rect(X + 44 + k * 2, 3 + (k % 2), 2, 4, '#f6d84a'); px(X + 44 + k * 2, 3 + (k % 2), '#7a6a20'); }
  // roof with overhang, posts, windows with passengers
  rect(X + 17, 11, 50, 3, OUTL); rect(X + 18, 12, 48, 1, '#9a6234');
  for (let x = 20; x < 64; x++) for (let y = 14; y < 24; y++) px(X + x, y, '#2a2a34');
  for (const [x, hat, shirt] of [[24, 1, '#ce1126'], [36, 0, '#2fa04a'], [47, 1, '#fcd116'], [58, 0, '#3a6ae0']]) {
    ell(X + x, 18, 2.4, 2.4, '#c98b5e'); px(X + x - 1, 18, OUTL); px(X + x + 1, 18, OUTL);
    if (hat) { rect(X + x - 4, 15, 9, 1, '#ecdcb0'); rect(X + x - 2, 13, 5, 2, '#ecdcb0'); } else rect(X + x - 2, 15, 5, 2, '#24202a');
    rect(X + x - 3, 21, 7, 3, shirt);
  }
  for (const x of [19, 30, 41, 52, 63]) { rect(X + x - 1, 13, 4, 12, OUTL); rect(X + x, 13, 2, 12, '#7a4a28'); }
  // lights along the roof edge (they blink from frame to frame)
  for (let x = 19, k = 0; x < 66; x += 4, k++) px(X + x, 14, ['#fcd116', '#ff5050', '#50a0ff'][(k + f) % 3]);
  // the hull
  for (let x = 3; x < 77; x++) {
    const y0 = Math.round(top(x)), y1 = Math.round(bot(x));
    for (let y = y0; y <= y1; y++) {
      const pct = (y - y0) / Math.max(1, y1 - y0);
      let c = pct < .14 ? '#7a4a28' : pct < .48 ? '#fcd116' : pct < .72 ? '#003893' : '#ce1126';
      if (y === y0 + 3 && (x + Math.floor(y / 2)) % 4 < 2) c = '#ffffff';    // zigzag trim under the rail
      if (y === y0 || y === y1 || x === 3 || x === 76) c = OUTL;
      px(X + x, y, c);
    }
    px(X + x, Math.round(top(x)) - 1, OUTL);
  }
  // stern flag on a pole: Colombia, waving
  rect(X + 69, 2, 2, 24, OUTL);
  for (let fx = 0; fx < 8; fx++) { const dy = Math.round(Math.sin(fx * .8 + f * 2) * .8); rect(X + 71 + fx, 3 + dy, 1, 3, '#fcd116'); px(X + 71 + fx, 6 + dy, '#003893'); px(X + 71 + fx, 7 + dy, '#ce1126'); }
  // the hull sits in the water: the part below the waterline is seen through it, foam laps along it, little wake
  for (let x = 0; x < BW; x++) for (let y = wl; y < BH; y++) { const i = (y * boat.w + X + x) * 4; if (boat.d[i + 3]) px(X + x, y, '#2ea8c0', 150); }
  for (let x = 2; x < 78; x++) if ((x + f * 2) % 5 < 3) px(X + x, wl, '#f0f8f8');
  for (let x = 0; x < 6; x++) if ((x + f) % 2) { px(X + x, wl + 2, '#c4ecff'); px(X + BW - 1 - x, wl + 3, '#c4ecff'); }
}
cv = ground;

// ---- write files -------------------------------------------------------------------------------------------------
const root = path.join(__dirname, '..'), pub = path.join(root, 'public', 'town');
fs.rmSync(pub, { recursive: true, force: true }); fs.mkdirSync(pub, { recursive: true });
fs.writeFileSync(path.join(pub, 'ground.png'), png(ground));
fs.writeFileSync(path.join(pub, 'boat.png'), png(boat));
for (const [name, c] of CUTS) fs.writeFileSync(path.join(pub, `${name}.png`), png(c));
for (const f of fs.readdirSync(ANIM)) if (f.endsWith('.png')) fs.copyFileSync(path.join(ANIM, f), path.join(pub, f));
{ // the lily-pad ripples sit on the pond, so their water takes the pond's turquoise
  const r = readPng(path.join(ANIM, 'ripples.png')); cv = r; recolor(0, 0, r.w, r.h, { '#71ddee': WATER[1], '#79b8ce': WATER[2] }); cv = ground;
  fs.writeFileSync(path.join(pub, 'ripples.png'), png(r));
}
fs.writeFileSync(path.join(__dirname, 'town_preview.png'), png(ground, 2));
// Luis's frames (walk, blink, floreo) and his horse, from avatar.js
for (const f of fs.readdirSync(__dirname)) if (/^luis_(down|up|side|lasso|horse|ride)[a-z_0-9]*\.png$/.test(f) && !f.includes('preview'))
  fs.copyFileSync(path.join(__dirname, f), path.join(pub, f.replace(/_/g, '-')));
// if Luis has been redrawn in Piskel (art/luis.piskel, see luis-piskel.js), his frames come from there instead
if (fs.existsSync(path.join(__dirname, 'luis.piskel'))) {
  const { encode } = require('./png');
  for (const [name, img] of Object.entries(require('./luis-piskel').importPiskel())) fs.writeFileSync(path.join(pub, `luis-${name.replace(/_/g, '-')}.png`), encode(img));
  console.log('Luis frames from art/luis.piskel');
}
const data = {
  tile: T, w: W, h: H, start: START, spots: SPOTS,
  boat: { src: 'town/boat.png', x: BOAT[0] * T, y: BOAT[1] * T, w: BW, h: BH, frames: BOAT_FRAMES },
  hits: [   // clickable areas over each place (px)
    { id: 'library', x: LIB[0] * T, y: LIB[1] * T, w: (LIB[2] - LIB[0] + 1) * T, h: (LIB[3] - LIB[1] + 1) * T },
    { id: 'visa', x: CONS[0] * T, y: CONS[1] * T, w: (CONS[2] - CONS[0] + 1) * T, h: (CONS[3] - CONS[1] + 1) * T },
    { id: 'lighthouse', x: LIGHT[0] * T, y: LIGHT[1] * T, w: (LIGHT[2] - LIGHT[0] + 1) * T, h: (LIGHT[3] - LIGHT[1] + 1) * T },
  ],
  decor: DECOR,
  blocked: blocked.map(r => r.map(b => (b ? '#' : '.')).join('')),   // one string per tile row: '#' blocks walking
};
fs.writeFileSync(path.join(root, 'src', 'app', 'island', 'town-data.ts'),
  '// Generated by art/town.js. Do not edit by hand.\nexport const TOWN = ' + JSON.stringify(data, null, 2) + ' as const;\n');
console.log('ok', TW + 'x' + TH, 'tiles,', objects.length, 'objects,', DECOR.length, 'animated decor');
