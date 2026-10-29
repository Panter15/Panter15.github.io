// Luis as a Yoshi's Island-style character (32x48): soft round shapes, dark outline, bright colours.
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
rect(10, 38, 15, 44, C.jeans); rect(17, 38, 22, 44, C.jeans);
rect(10, 38, 11, 44, C.jeansS); rect(17, 38, 18, 44, C.jeansS);
rect(21, 39, 21, 43, C.jeansL);
ell(12.5, 46, 3.6, 1.5, C.shoe); ell(19.5, 46, 3.6, 1.5, C.shoe);
rect(11, 45, 14, 45, C.shoeS); rect(18, 45, 21, 45, C.shoeS);   // straps

// ---- arms hang at the sides, hands at the hips
rect(5, 29, 6, 34, C.skinS); rect(26, 29, 27, 34, C.skin); set(27, 30, C.skinL);
ell(5.5, 35.6, 1.7, 1.7, C.skinS); ell(26.5, 35.6, 1.7, 1.7, C.skin);

// ---- guayabera: tapered body, short round sleeves, V collar, pleats, buttons, sarape hem
ell(16, 28.5, 8.6, 4.4, C.shirt);
rect(8, 28, 24, 37, C.shirt);
ell(6.6, 28, 2.6, 2.8, C.shirt); ell(25.4, 28, 2.6, 2.8, C.shirt);
for (let y = 24; y <= 37; y++) for (let x = 3; x <= 9; x++) if (g[y][x] === C.shirt) set(x, y, C.shirtS);          // left side in shade
for (let y = 26; y <= 29; y++) set(26, y, C.shirtL);                                                                  // right sleeve highlight
for (const px of [12, 20]) for (let y = 29; y <= 34; y++) set(px, y, C.shirtS);                                      // vertical pleats
for (const y of [29, 32]) set(16, y, C.button);
for (let y = 25; y <= 27; y++) for (let x = 16 - (27 - y); x <= 16 + (27 - y) - 1; x++) set(x, y, C.skinS);          // V collar
set(13, 25, C.shirtL); set(14, 26, C.shirtL); set(18, 25, C.shirtL); set(17, 26, C.shirtL);
for (let x = 8; x <= 24; x++) { set(x, 36, C.sarape[Math.floor((x - 8) / 2) % 5]); set(x, 37, C.sarape[(Math.floor((x - 8) / 2) + 2) % 5]); }

// ---- neck
rect(14, 22, 18, 24, C.skinS);

// ---- head: round chibi face, ears, soft shade on the left (no speckle: it read as blotchy skin)
ell(16, 13.5, 9.4, 9.6, C.skin);
ell(6.6, 15, 1.6, 2.2, C.skinS); ell(25.4, 15, 1.6, 2.2, C.skin);
for (let y = 4; y <= 23; y++) for (let x = 6; x <= 9; x++) if (g[y][x] === C.skin && x - 6 < 2) set(x, y, C.skinS);
set(22, 19, C.skinL); set(23, 18, C.skinL);                                                                        // cheek light

// ---- hair: tidy short sides, swept-up top, one clean shine band
ell(16, 8, 10, 6, C.hair, (x, y) => y <= 9 + (Math.abs(x - 16) > 7 ? 3 : 0));
ell(17.5, 3.2, 7.5, 3.2, C.hair);
for (const [x, y] of [[9, 10], [12, 10], [13, 10], [19, 10], [20, 10], [23, 10]]) set(x, y, C.hair);                // uneven fringe
for (let x = 15; x <= 22; x++) set(x, x < 19 ? 2 : 3, C.hairM);
for (const [x, y] of [[16, 1], [17, 1], [18, 1], [20, 2], [21, 2], [23, 4], [24, 5]]) set(x, y, C.hairL);
for (let y = 10; y <= 14; y++) { set(7, y, C.hair); set(25, y, C.hairM); }                                           // sideburns

// ---- face: brows, big friendly eyes with a highlight, blush, nose, smile
rect(10, 12, 13, 12, C.hair); rect(19, 12, 22, 12, C.hair);
rect(11, 14, 12, 17, C.eye); rect(20, 14, 21, 17, C.eye);
set(12, 14, '#ffffff'); set(21, 14, '#ffffff');
rect(9, 18, 10, 18, C.blush); rect(22, 18, 23, 18, C.blush);
set(17, 18, C.skinS);
set(13, 19, C.mouth); rect(14, 20, 18, 20, C.mouth); set(19, 19, C.mouth); rect(15, 21, 17, 21, '#b04a3a');

// ---- outline, a bit thicker below and on the left (the shadow side), like the bold outlines in Yoshi's Island
const fig = g.map(r => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fig[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fig[y + dy]?.[x + dx])) g[y][x] = C.out;
const fig2 = g.map(r => r.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!fig2[y][x] && ((fig2[y - 1]?.[x] === C.out && fig[y - 2]?.[x]) || (fig2[y]?.[x + 1] === C.out && fig[y]?.[x + 2]))) g[y][x] = C.out;

// ---- PNGs: 1x transparent (for the game) and an 8x preview on sky blue
const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = T[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(s, bg, grid = g) {
  const W = grid[0].length, H = grid.length, OW = W * s, OH = H * s, raw = Buffer.alloc((OW * 4 + 1) * OH);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const c = grid[y / s | 0][x / s | 0] || bg; if (!c) continue; const i = y * (OW * 4 + 1) + 1 + x * 4; raw[i] = parseInt(c.slice(1, 3), 16); raw[i + 1] = parseInt(c.slice(3, 5), 16); raw[i + 2] = parseInt(c.slice(5, 7), 16); raw[i + 3] = 255; }
  const h = Buffer.alloc(13); h.writeUInt32BE(OW, 0); h.writeUInt32BE(OH, 4); h[8] = 8; h[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', h), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(`${outDir}/luis_avatar.png`, png(1));
fs.writeFileSync(`${outDir}/luis_avatar_preview.png`, png(8, '#a8d8f8'));

// ---- tiny 20x28 overworld version for the island, dressed as a charro: sombrero with a decorated band,
// white shirt, wide corbatín charro (butterfly bow), belt with a silver buckle, leather chaps, boots, reata (rope) coil in hand
const MINI = [
  '........oooo........',
  '.......oKKKKo.......',
  '......oKKKKKKo......',
  '......oKKKKKKo......',
  '......oTKTKTKo......',
  '..oooKKKKKKKKKKooo..',
  'oKKKKKKKKKKKKKKKKKKo',
  '.oLLLLLLLLLLLLLLLLo.',
  '..oooohhhhhhhhoooo..',
  '.....ohssssssho.....',
  '.....oSsessesso.....',
  '.....oSsessesso.....',
  '.....oSbssssbso.....',
  '.....oSssmmssso.....',
  '......oSssssso......',
  '.......ooSSoo.......',
  '....ooWBxBBxBWoo....',
  '...oWWWBxBBxBWWWo...',
  '..oVoWWWWWWWWWWoWo..',
  '..oVoWWWWnWWWWWoWo..',
  '..oVoDDDDGGDDDDoWo..',
  '..osoPPPPPPPPPPoso..',
  '....oQPPPooPPPQo....',
  '....oQPPPooPPPQo....',
  '....oQPPPooPPPQo....',
  '....okkkkookkkko....',
  '...okkkkkookkkkko...',
  '....ooooo..ooooo....',
];
const key = { o: C.out, h: C.hair, s: C.skin, S: C.skinS, e: C.eye, b: C.blush, m: C.mouth,
  K: '#efe6cf', L: '#c8b890', T: '#9a8058', W: '#f8f6f0', V: '#d4d0c4', B: '#6a3450', x: '#c890a8', n: '#b0b0b8',
  D: '#4a2c1c', G: '#d0d0d8', P: '#8a5a38', Q: '#6a4228', k: '#3a2418' };
key.R = '#c8a060';   // reata
// The reata: a rope coil held in his right hand (left of the sprite) with a loose end hanging down.
// Drawn over any frame; a space keeps the pixel underneath.
const REATA = { 19: ' ooo ', 20: 'oRRRo', 21: 'oRoRo', 22: 'oRoRo', 23: 'oRRRo', 24: ' oooo', 25: '  R', 26: ' R' };
// x0 = left column of the coil; mirror = flip it (seen from the back the hand is on the other side).
const withReata = (rows, x0 = 0, mirror = false) => rows.map((row, y) => {
  if (!REATA[y]) return row;
  const pat = mirror ? [...REATA[y].padEnd(5)].reverse().join('') : REATA[y];
  return [...row].map((ch, x) => pat[x - x0] && pat[x - x0] !== ' ' ? pat[x - x0] : ch).join('');
});
MINI.forEach((row, i) => { if (row.length !== MINI[0].length) throw new Error(`MINI row ${i} is ${row.length} wide`); });
const mini = withReata(MINI).map(row => [...row].map(ch => key[ch] || null));
fs.writeFileSync(`${outDir}/luis_mini.png`, png(1, null, mini));
fs.writeFileSync(`${outDir}/luis_mini_preview.png`, png(12, '#a8d8f8', mini));

// ---- walk cycle in three views (down = MINI, up = back, side = facing left; the app mirrors it for right).
// Each view: frame 0 standing, frames 1-2 walking (only the bottom 6 rows change).
// render3.js copies them into public/ as luis-<view>-<n>.png.
const STEPS = [
  ['....oQPPPooPPPQo....',
   '....oQPPPooPPPQo....',
   '....okkkkooPPPQo....',
   '...okkkkkookkkko....',
   '....ooooo.okkkkko...',
   '...........ooooo....'],
  ['....oQPPPooPPPQo....',
   '....oQPPPooPPPQo....',
   '....oQPPPookkkko....',
   '....okkkkookkkkko...',
   '...okkkkko.ooooo....',
   '....ooooo...........'],
];
const HAT = MINI.slice(0, 9);
const BACK = [
  ...HAT,
  '.....ohhhhhhhho.....',
  '.....ohhhhhhhho.....',
  '.....oShhhhhhSo.....',
  '.....ohhhhhhhho.....',
  '.....ohhhhhhhho.....',
  '......oSSSSSSo......',
  '.......ooSSoo.......',
  '....ooWWWWWWWWoo....',
  '...oWWWWWWWWWWWWo...',
  '..oVoWWWWWWWWWWoWo..',
  '..oVoWWWWWWWWWWoWo..',
  '..oVoDDDDDDDDDDoWo..',
  '..osoPPPPPPPPPPoso..',
  ...MINI.slice(-6),
];
const SIDE = [
  ...HAT.slice(0, 8),
  '...oooosshhhhhoooo..',
  '......ossssshhho....',
  '.....osesssshhho....',
  '.....ossssssSho.....',
  '......osbssssSo.....',
  '......omsssssso.....',
  '.......osssssSo.....',
  '........ooSSoo......',
  '.......oBxWWWWo.....',
  '......oWBWWWWWWo....',
  '......oWWWVVWWWo....',
  '......oWWWVVWWWo....',
  '......oDDDVVDDDo....',
  '......oPPPPPPPPo....',
  '.......oQPPPPo......',
  '.......oQPPPPo......',
  '.......oQPPPPo......',
  '......okkkkko.......',
  '.....okkkkkko.......',
  '.....oooooooo.......',
];
const SIDE_STRIDE = [
  '.......oQPPPPo......',
  '......oQPPooPPo.....',
  '.....oQPPo..oPPo....',
  '....okkkko..okkko...',
  '...okkkkko..okkkko..',
  '...ooooooo..oooooo..',
];
const VIEWS = {
  down: { rows: MINI, steps: STEPS, reata: [0, false] },
  up: { rows: BACK, steps: STEPS, reata: [15, true] },
  side: { rows: SIDE, steps: [SIDE_STRIDE, SIDE.slice(-6)], reata: [8, false] },
};
for (const [view, { rows, steps, reata }] of Object.entries(VIEWS)) {
  [rows, ...steps.map(legs => [...rows.slice(0, -6), ...legs])].forEach((frame, n) => {
    frame.forEach((row, i) => { if (row.length !== 20 || frame.length !== 28) throw new Error(`${view} ${n} row ${i} is ${row.length} wide`); });
    fs.writeFileSync(`${outDir}/luis_${view}_${n}.png`, png(1, null, withReata(frame, ...reata).map(row => [...row].map(ch => key[ch] || null))));
  });
}
// one preview strip of all 9 frames to eyeball the views side by side
const strip = Array.from({ length: 28 }, () => []);
for (const view of Object.keys(VIEWS)) for (let n = 0; n < 3; n++) {
  const { rows, steps, reata } = VIEWS[view], frame = withReata(n ? [...rows.slice(0, -6), ...steps[n - 1]] : rows, ...reata);
  frame.forEach((row, y) => strip[y].push(...[...row + '..'].map(ch => key[ch] || null)));
}
fs.writeFileSync(`${outDir}/luis_views_preview.png`, png(8, '#a8d8f8', strip));
console.log('ok');
