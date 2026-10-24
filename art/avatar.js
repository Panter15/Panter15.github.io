// Luis as a Yoshi's Island-style character (32x48): soft round shapes, dark outline, bright colours, crayon speckle.
// Dark hair short on the sides and swept up on top, no glasses, cream guayabera with a sarape-striped hem, jeans,
// huaraches. Light from the top-right.
const fs = require('fs'), zlib = require('zlib');
const W = 32, H = 48, outDir = __dirname;   // writes art/luis_avatar.png and art/luis_avatar_preview.png
const C = {
  out: '#2a1a14', hair: '#24202a', hairM: '#3a3444', hairL: '#5a5068',
  skin: '#c98b5e', skinS: '#a86c44', skinL: '#e0a678', blush: '#e0876c', eye: '#1e1418', mouth: '#6a3020',
  shirt: '#f4eedc', shirtS: '#d6c9a8', shirtL: '#ffffff', button: '#b09a74',
  jeans: '#3c5c9c', jeansS: '#2a4272', jeansL: '#5c7cbc', shoe: '#8a5030', shoeS: '#643820',
  sarape: ['#d83838', '#f8c020', '#40a040', '#e858b8', '#2878d8'],
};
const g = Array.from({ length: H }, () => Array(W).fill(null));
const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
const ell = (cx, cy, rx, ry, c, keep = () => true) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && keep(x, y)) set(x, y, c); };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- legs and huaraches (drawn first so the shirt hem overlaps them)
rect(9, 38, 15, 44, C.jeans); rect(17, 38, 23, 44, C.jeans);
rect(9, 38, 10, 44, C.jeansS); rect(17, 38, 18, 44, C.jeansS); rect(14, 39, 15, 44, C.jeansS);
rect(22, 39, 22, 43, C.jeansL);
ell(12, 46, 4, 1.6, C.shoe); ell(20, 46, 4, 1.6, C.shoe);
set(10, 45, C.shoeS); set(18, 45, C.shoeS); rect(11, 45, 13, 45, C.shoeS); rect(19, 45, 21, 45, C.shoeS);   // straps

// ---- arms (skin) and hands
rect(3, 31, 5, 37, C.skinS); rect(27, 31, 29, 37, C.skin); set(29, 32, C.skinL);
ell(4, 38.5, 2, 2, C.skinS); ell(28, 38.5, 2, 2, C.skin);

// ---- guayabera: rounded body, short sleeves, collar, pleats, pockets, buttons, sarape hem
ell(16, 32, 9.6, 8, C.shirt, (x, y) => y >= 26);
rect(7, 30, 25, 37, C.shirt);
ell(5.5, 29, 3.2, 3.6, C.shirt); ell(26.5, 29, 3.2, 3.6, C.shirt);
for (let y = 26; y <= 37; y++) for (let x = 2; x <= 8; x++) if (g[y][x] === C.shirt) set(x, y, C.shirtS);          // left side in shade
for (let y = 28; y <= 33; y++) set(26 + (y > 30 ? 1 : 0), y, C.shirtL);                                               // right sleeve highlight
for (const px of [11, 21]) for (let y = 29; y <= 35; y++) set(px, y, C.shirtS);                                      // vertical pleats
for (const x0 of [9, 19]) { rect(x0, 31, x0 + 3, 31, C.shirtS); set(x0, 32, C.shirtS); set(x0 + 3, 32, C.shirtS); rect(x0, 33, x0 + 3, 33, C.shirtS); } // pockets
for (const y of [29, 32, 35]) set(16, y, C.button);
// V collar: skin showing, collar flaps
for (let y = 26; y <= 28; y++) for (let x = 16 - (28 - y); x <= 16 + (28 - y) - 1; x++) set(x, y, C.skinS);
set(13, 26, C.shirtL); set(14, 27, C.shirtL); set(19, 26, C.shirtL); set(18, 27, C.shirtL);
// sarape-striped embroidered hem
for (let x = 7; x <= 25; x++) { set(x, 36, C.sarape[Math.floor((x - 7) / 2) % 5]); set(x, 37, C.sarape[(Math.floor((x - 7) / 2) + 2) % 5]); }

// ---- neck
rect(13, 23, 19, 25, C.skinS);

// ---- head: round face, ears
ell(16, 14.5, 9.6, 9.8, C.skin);
ell(6.4, 16, 1.8, 2.4, C.skinS); ell(25.6, 16, 1.8, 2.4, C.skin); set(25, 16, C.skinS);
for (let y = 6; y <= 24; y++) for (let x = 6; x <= 10; x++) if (g[y][x] === C.skin && (x - 6) + Math.abs(y - 16) * 0.15 < 3) set(x, y, C.skinS);  // shade on the left
set(22, 11, C.skinL); set(23, 12, C.skinL); set(23, 13, C.skinL);                                                  // forehead light

// ---- hair: short on the sides, volume swept up and back on top
ell(16, 8, 10.2, 5.6, C.hair, (x, y) => y <= 10 + (Math.abs(x - 16) > 6 ? 2 : 0) - (Math.abs(x - 16) < 3 ? 1 : 0));
ell(18.5, 4, 7.2, 3.6, C.hair);                                                                              // quiff
ell(20, 2.6, 4, 1.8, C.hairM);
for (const [x, y] of [[17, 2], [18, 1], [19, 1], [21, 2], [22, 3], [14, 4], [15, 3]]) set(x, y, C.hairL);   // shine strands
for (let y = 9; y <= 14; y++) { set(6, y, C.hairM); set(7, y, C.hair); set(25, y, C.hairM); if (y < 13) set(24, y, C.hair); } // short sides
set(9, 10, C.hair); set(10, 11, C.hairM); set(23, 10, C.hair);                                               // fringe tips

// ---- face: thick eyebrows, friendly eyes, blush, nose, smile
rect(10, 13, 13, 13, C.hair); set(10, 14, C.hair); rect(19, 13, 22, 13, C.hair); set(22, 14, C.hair);
ell(12, 16.6, 1.3, 1.9, C.eye); ell(20, 16.6, 1.3, 1.9, C.eye);
set(11, 16, '#ffffff'); set(19, 16, '#ffffff');
rect(8, 19, 9, 19, C.blush); rect(22, 19, 23, 19, C.blush);
set(16, 18, C.skinS); set(17, 19, C.skinS);
set(13, 20, C.mouth); rect(14, 21, 18, 21, C.mouth); set(19, 20, C.mouth); set(15, 22, C.skinS); set(16, 22, C.skinS);

// ---- crayon speckle (the hand-drawn look of Yoshi's Island): a few lighter/darker pixels inside the big fills
const speck = { [C.skin]: [C.skinL, C.skinS], [C.shirt]: [C.shirtL, C.shirtS], [C.jeans]: [C.jeansL, C.jeansS], [C.hair]: [C.hairM, C.hairM] };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[y][x], s = speck[c]; if (s && hash(x, y) < 0.06) g[y][x] = s[hash(y, x) < 0.5 ? 0 : 1]; }

// ---- outline, a bit thicker below and on the left (the shadow side), like the bold outlines in Yoshi's Island
const fig = g.map(r => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fig[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fig[y + dy]?.[x + dx])) g[y][x] = C.out;
const fig2 = g.map(r => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fig2[y][x] && ((fig2[y - 1]?.[x] === C.out && fig[y - 2]?.[x]) || (fig2[y]?.[x + 1] === C.out && fig[y]?.[x + 2]))) g[y][x] = C.out;

// ---- PNGs: 1x transparent (for the game) and an 8x preview on sky blue
const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = T[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(s, bg) {
  const OW = W * s, OH = H * s, raw = Buffer.alloc((OW * 4 + 1) * OH);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const c = g[y / s | 0][x / s | 0] || bg; if (!c) continue; const i = y * (OW * 4 + 1) + 1 + x * 4; raw[i] = parseInt(c.slice(1, 3), 16); raw[i + 1] = parseInt(c.slice(3, 5), 16); raw[i + 2] = parseInt(c.slice(5, 7), 16); raw[i + 3] = 255; }
  const h = Buffer.alloc(13); h.writeUInt32BE(OW, 0); h.writeUInt32BE(OH, 4); h[8] = 8; h[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', h), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(`${outDir}/luis_avatar.png`, png(1));
fs.writeFileSync(`${outDir}/luis_avatar_preview.png`, png(8, '#a8d8f8'));
console.log('ok');
