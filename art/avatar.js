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


// ---- the overworld charro (24x34) for the island, from reference photos: a straw-felt sombrero with a dented crown,
// an embroidered band and a greca-trimmed brim with turned-up tips; a red corbatín with a long fringe; white shirt;
// piteado belt with a silver buckle; navy charro trousers with a gold embroidered stripe; black leather gloves; a
// twisted reata coil in his hand. Views: down, up, side (= facing left; the app mirrors it for right), each standing
// + 2 walk steps, plus a blink frame and the floreo (the reata spun in a loop around him, back and front halves).
// town.js copies them into public/town/ as luis-<name>.png.
const key = { o: C.out, h: C.hair, s: C.skin, S: C.skinS, e: C.eye, b: C.blush, m: C.mouth, w: '#ffffff',   // w: eye white
  K: '#ecdcb0', L: '#c9b07c', D: '#a88c5c',          // sombrero: straw felt, shade, crown dents
  B: '#7a3a24', E: '#f4e6c4',                        // band and its embroidered filigree
  G: '#3a2c24', J: '#e8d8b0',                        // greca trim on the brim edge
  r: '#c8102e', q: '#8a0a1e', f: '#ec3a52',          // corbatín, knot, fringe
  W: '#f8f6f0', V: '#d4d0c4',                        // shirt
  Y: '#a0582a', Q: '#f0e6cc', N: '#5e2e14',          // embroidered belt: brown leather, cream cross-stitch, buckle frame
  P: '#1e2a4e', p: '#141e3a', y: '#d8a038', Z: '#f6d070',   // navy trousers, gold embroidered stripe (two tones)
  n: '#1a1a22', k: '#a6a49c', l: '#7c7a72', T: '#d8a868',   // black gloves; botines: grey suede, elastic panel, wood sole
  t: '#dcc48e', u: '#9c8050' };                      // reata strands
const HAT_FRONT = [
  '..........oooo..........',
  '.........oKKKKo.........',
  '........oKKDDKKo........',
  '........oKDKKDKo........',
  '.......oKKKKKKKLo.......',
  '.......oBEBEEBEBo.......',
  'oo.....oEBEBBEBEo.....oo',
  'oKo..ooLLLLLLLLLLoo..oKo',
  'oKKooKKKKKKKKKKKKKKooKKo',
  '.oGJGJJGJJGJJGJJGJJGJGo.',
  '..oGGJGGJGGJGGJGGJGGJo..',
];
const LEGS = {
  stand: ['....oyPPPPpooPPPPPyo....', '....oZPPPPpooPPPPPZo....', '....oyPPPPpooPPPPPyo....', '....oZPPPPpooPPPPPZo....', '....okklkkkookkklkko....', '....oTTTTTTooTTTTTTo....', '....oooooooooooooooo....'],
  stepA: ['....oyPPPPpooPPPPPyo....', '....oZPPPPpooPPPPPZo....', '....oyPPPPpooPPPPPyo....', '....okklkkkooPPPPPZo....', '....oTTTTTTookkklkko....', '....oooooooooTTTTTTo....', '............oooooooo....'],
  stepB: ['....oyPPPPpooPPPPPyo....', '....oZPPPPpooPPPPPZo....', '....oyPPPPpooPPPPPyo....', '....oZPPPPpookkklkko....', '....okklkkkooTTTTTTo....', '....oTTTTTTooooooooo....', '....oooooooo............'],
};
const FRONT = [...HAT_FRONT,
  '....ooohhhhhhhhhhooo....',
  '.......ohssssssho.......',
  '.......oSwessewso.......',
  '.......oSsessesso.......',
  '.......oSbssssbso.......',
  '.......oSssmmssso.......',
  '........oSssssso........',
  '......ooWrrqqrrWoo......',
  '....ooWWrrrqqrrrWWoo....',
  '...oWWWWWWfrrfWWWWWWo...',
  '..oVoWWWWWfrfrWWWWWoWo..',
  '..oVoWWWWWrfrfWWWWWoWo..',
  '..oVoWWWWWfWWfWWWWWoWo..',
  '..oVoQYQYQNQQNQYQYQoWo..',
  '..onoYQYQYNYYNYQYQYono..',
  '..onoyPPPPPooPPPPPyono..',
  ...LEGS.stand];
const BACK = [...HAT_FRONT,
  '....ooohhhhhhhhhhooo....',
  '.......ohhhhhhhho.......',
  '.......ohhhhhhhho.......',
  '.......oShhhhhhSo.......',
  '.......ohhhhhhhho.......',
  '.......ohhhhhhhho.......',
  '........oSSSSSSo........',
  '......ooWWWWWWWWoo......',
  '....ooWWWWWWWWWWWWoo....',
  '...oWWWWWWWWWWWWWWWWo...',
  '..oWoWWWWWWWWWWWWWWoVo..',
  '..oWoWWWWWWWWWWWWWWoVo..',
  '..oWoWWWWWWWWWWWWWWoVo..',
  '..oWoQYQYQYQYQYQYQYoVo..',
  '..onoYQYQYQYQYQYQYQono..',
  '..onoyPPPPPooPPPPPyono..',
  ...LEGS.stand];
const SIDE_LEGS = {
  stand: ['.......oPPPyPPPo........', '.......oPPPZPPPo........', '.......oPPPyPPPo........', '.......oPPPZPPPo........', '.......oPPPyPPPo........', '......okkkklkkko........', '.....oTTTTTTTTTo........', '.....ooooooooooo........'],
  stride: ['.......oPPPyPPPo........', '......oPPPPooPPPo.......', '.....oPPZPo..oPZPo......', '....oPPPPo....oPPPo.....', '...okkklko....okklko....', '..oTTTTTTo....oTTTTTo...', '..oooooooo....ooooooo...', '........................'],
};
const SIDE = [
  '..........oooo..........',
  '.........oKKKKo.........',
  '........oKKDKKKo........',
  '........oKDKKKKo........',
  '.......oKKKKKKKLo.......',
  '.......oBEBEBEBEo.......',
  'oo.....oEBEBEBEBo.....oo',
  'oKoooooooLLLLLLLLoooooKo',
  '.oKKKKKKKKKKKKKKKKKKKKo.',
  '..oGJGGJGGJGGJGGJGGJGo..',
  '...oooooooooooooooooo...',
  '......osssshhhhho.......',
  '.....oswesssshhho.......',
  '.....ossssssShho........',
  '......obssssSSho........',
  '......omssssssSo........',
  '.......ossssSSo.........',
  '........ooSSSo..........',
  '.......orrqWWWWo........',
  '......orrrqWWWWWo.......',
  '......ofrfWWWVVWo.......',
  '......ofrfWWWVVWo.......',
  '......oWfWWWWVVWo.......',
  '......oWWWWWWVVWo.......',
  '......oQYQYQYnnQo.......',
  '......oYQYQYQnnYo.......',
  ...SIDE_LEGS.stand];
const withLegs = (rows, legs) => [...rows.slice(0, -legs.length), ...legs];
// closed eyes: the upper eye row turns to skin, the lower one stays as a lash line
const blink = rows => rows.map((r, i) => (i === 13 ? r.replace(/[ew]/g, 's') : r));

// the reata coil: a ring of twisted strands (alternating light / dark) with an outline, a loose end hanging down,
// and the gloved hand holding it at the top
function coil(grid, cx, cy, hand) {
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < grid[0].length && y < grid.length) grid[y][x] = c; };
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 5; x <= cx + 5; x++) {
    const e = ((x - cx) / 3.6) ** 2 + ((y - cy) / 4.6) ** 2;
    if (e <= 1 && e >= .3) set(x, y, Math.floor(Math.atan2(y - cy, x - cx) * 3 + x + y) % 2 ? key.t : key.u);
    else if ((e > 1 && e <= 1.4) || (e < .3 && e >= .15)) set(x, y, key.o);
  }
  for (let j = 1; j <= 3; j++) { set(cx + 1, cy + 4 + j, j % 2 ? key.t : key.u); set(cx + 2, cy + 4 + j, key.o); set(cx, cy + 4 + j, key.o); }
  for (const [x, y] of hand) set(x, y, key.n);
}
const VIEWS = {
  down: { rows: FRONT, steps: [LEGS.stepA, LEGS.stepB], coil: [3, 29, [[3, 25], [3, 26], [2, 26], [4, 26]]] },
  up: { rows: BACK, steps: [LEGS.stepA, LEGS.stepB], coil: [20, 29, [[20, 25], [20, 26], [19, 26], [21, 26]]] },
  side: { rows: SIDE, steps: [SIDE_LEGS.stride, SIDE_LEGS.stand], coil: [14, 29, [[13, 25], [14, 25], [13, 26], [14, 26]]] },
};
const toGrid = (rows, name) => rows.map((row, i) => {
  if (row.length !== 24 || rows.length !== 34) throw new Error(`${name}: row ${i} is ${row.length} wide (${rows.length} rows)`);
  return [...row].map(ch => key[ch] || null);
});
const FRAMES = {};
for (const [view, { rows, steps, coil: c }] of Object.entries(VIEWS)) {
  [rows, ...steps.map(legs => withLegs(rows, legs))].forEach((frame, n) => { const g = toGrid(frame, `${view} ${n}`); coil(g, ...c); FRAMES[`${view}_${n}`] = g; });
}
{ const g = toGrid(blink(FRONT), 'blink'); coil(g, ...VIEWS.down.coil); FRAMES.down_blink = g; }

// more idle moods (front view, 2 frames each): sitting cross-legged with the coil on the ground, and looking at his
// phone with both hands, head down, the screen glowing
key.c = '#8ad0f0'; key.d = '#d4f2ff';   // phone screen, and its brighter flicker
const EMPTY = '.'.repeat(24);
const SIT = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, ...FRONT.slice(0, 25),
  '..onoPPPPPPPPPPPPPPono..',
  '.oPPPPPPPPPPPPPPPPPPPPo.',
  '.okkTPPPPPPPPPPPPPPTkko.',
  '..oooooooooooooooooooo..'];
const lookDown = rows => rows.map((r, i) => (i === 13 ? r.replace(/[ew]/g, 's') : i === 14 ? r.replace(/w/g, 's') : r));
const shift = (rows, by) => rows.map((r, i) => (i >= by && i - by === 13 ? r.replace(/[ew]/g, 's') : r));
[SIT, shift(SIT, 5)].forEach((rows, n) => { const g = toGrid(rows, `sit ${n}`); coil(g, 2, 30, []); FRAMES[`down_sit_${n}`] = g; });
for (let n = 0; n < 2; n++) {
  const g = toGrid(lookDown(FRONT), `phone ${n}`); coil(g, 3, 29, []);
  for (let y = 21; y <= 26; y++) { g[y][2] = g[y][3] = g[y][20] = g[y][21] = null; g[y][4] = g[y][19] = key.o; }   // arms come in
  for (let x = 5; x <= 9; x++) { g[22][x] = key.V; g[23][x] = key.o; } for (let x = 14; x <= 18; x++) { g[22][x] = key.V; g[23][x] = key.o; }
  for (let y = 20; y <= 24; y++) for (let x = 10; x <= 13; x++) g[y][x] = y === 20 || y === 24 || x === 10 || x === 13 ? key.o : n ? key.d : key.c;
  g[22][9] = g[22][14] = key.n;   // gloved thumbs on the phone
  FRAMES[`down_phone_${n}`] = g;
}

// the floreo body: his free arm (right of the sprite) raised to shoulder height, the gloved hand circling as it
// spins the loop; the coil stays in the other hand. HAND = where the glove is on each of the 4 frames.
const HAND = [[21, 14], [22, 15], [21, 16], [20, 15]];
for (let f = 0; f < 4; f++) {
  const g = toGrid(FRONT, 'floreo'); coil(g, ...VIEWS.down.coil);
  for (let y = 21; y <= 26; y++) { g[y][19] = key.o; g[y][20] = null; g[y][21] = null; }   // the hanging arm goes
  const [hx, hy] = HAND[f], arm = [];
  for (let k = 0; k <= 8; k++) { const x = Math.round(19 + (hx - 19) * k / 8), y = Math.round(20 + (hy - 20) * k / 8); arm.push([x, y], [x + 1, y]); }
  for (const [x, y] of arm) g[y][x] = key.W;
  for (const [x, y] of [[hx, hy], [hx + 1, hy], [hx, hy - 1], [hx + 1, hy - 1]]) g[y][x] = key.n;
  for (let y = 11; y <= 22; y++) for (let x = 17; x < 24; x++)   // outline the raised arm
    if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => arm.some(([ax, ay]) => ax === x + dx && ay === y + dy) || (g[y + dy]?.[x + dx] === key.n))) g[y][x] = key.o;
  FRAMES[`down_floreo_${f}`] = g;
}

// the floreo: a big loop of reata spinning flat around him at waist height (48x16, centred on him). The back half
// is drawn behind Luis and the front half in front, so the rope passes round him; a bright stretch travels round it.
const LW = 48, LH = 16;
for (let f = 0; f < 4; f++) {
  const back = Array.from({ length: LH }, () => Array(LW).fill(null)), front = Array.from({ length: LH }, () => Array(LW).fill(null));
  const rx = 21, ry = 6 - (f % 2) * .5, cx = LW / 2, cy = LH / 2;
  for (let a = 0; a < 360; a += 1.5) {
    const r = a * Math.PI / 180, x = Math.round(cx + Math.cos(r) * rx), y = Math.round(cy + Math.sin(r) * ry);
    const bright = ((a - f * 90 + 360) % 360) < 70, g = Math.sin(r) < 0 ? back : front;
    g[y][x] = bright ? key.t : key.u;
    if (g[y + 1] && !g[y + 1][x]) g[y + 1][x] = key.o;
  }
  // the spoke: rope from his circling hand out to the loop, where the bright stretch is (lasso coords = sprite + 12, -14)
  const [hx, hy] = HAND[f], a = (f * 90 + 35) * Math.PI / 180, tx = cx + Math.cos(a) * rx, ty = cy + Math.sin(a) * ry;
  for (let k = 0; k <= 20; k++) { const x = Math.round(hx + 12.5 + (tx - hx - 12.5) * k / 20), y = Math.round(hy - 14 + (ty - hy + 14) * k / 20); if (y >= 0 && y < LH && x >= 0 && x < LW) front[y][x] = k % 3 ? key.t : key.u; }
  FRAMES[`lasso_back_${f}`] = back; FRAMES[`lasso_front_${f}`] = front;
}
// Luis's horse (40x30, facing left): chestnut with a dark mane and white blaze, a charro saddle with its tall cream
// horn, the reata coiled over the horn, red-and-white reins. Built from shapes, then outlined like Luis.
// Two frames: the tail swishes and the head dips a pixel. Written as one sheet, frames side by side.
const HW = 40, HH = 30;
// run = -1: standing (f = 0/1 idle frames); run = 0..3: gallop frames, legs swinging and the body bobbing
const GALLOP = [[-5, -2, 2, 5], [-2, 2, -2, 2], [2, 5, -5, -2], [0, 0, 0, 0]];   // hoof offsets: near/far front, near/far back
function horse(f, run = -1) {
  const g = Array.from({ length: HH }, () => Array(HW).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < HW && y < HH) g[y][x] = c; };
  const blob = (cx, cy, rx, ry, c) => { for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) set(x, y, c); };
  const H = '#b0582a', Hs = '#86421e', Hl = '#cf7a44', M = '#4a2412', Ml = '#6e3a1c', bl = '#f4efe2', v = '#3a2a20';
  const dip = run >= 0 ? run % 2 : f;   // head / neck one pixel lower on frame 1 (and every other gallop frame)
  // legs (far legs darker), hooves
  const swing = run >= 0 ? GALLOP[run] : [0, 0, 0, 0];
  for (const [i, x, c] of [[1, 14, Hs], [3, 30, Hs], [0, 11, H], [2, 27, H]]) {   // each leg slants from the hip to where its hoof lands
    const dx = swing[i];
    for (let y = 19; y < 27; y++) { const lx = x + dx * (y - 19) / 8; set(lx, y, c); set(lx + 1, y, c); }
    set(x + dx, 27, v); set(x + dx + 1, 27, v); set(x + dx + 2, 27, v);
  }
  // tail, swishing
  for (let j = 0; j < 11; j++) { const x = 34 + j * (run >= 0 ? .9 : .35) + (f || run % 2 === 1 ? Math.sin(j / 2) * 1.5 : 0), y = 12 + j * (run >= 0 ? .45 : 1); set(x, y, j % 3 ? M : Ml); set(x + 1, y, M); }   // streams out behind when galloping
  // body, belly shade, rump highlight
  blob(22, 15, 11.5, 5.8, H); blob(22, 18, 9, 2.6, Hs); blob(29, 12, 3, 2, Hl);
  // neck and head (muzzle down-left), mane along the neck, ears, eye, white blaze, nostril
  for (let k = 0; k <= 10; k++) blob(13 - k * .55, 13 - k * .8 + dip * (k / 10), 3.2, 2.6, H);
  blob(5, 6 + dip, 3.6, 3, H); blob(3, 9 + dip, 2.4, 2.4, H);
  for (let k = 0; k <= 10; k++) { set(15 - k * .55, 10 - k * .8 + dip * (k / 10), M); set(14 - k * .55, 10 - k * .8 + dip * (k / 10), k % 2 ? Ml : M); }
  set(6, 1 + dip, H); set(7, 1 + dip, H); set(6, 2 + dip, Hs); set(8, 2 + dip, H);
  set(4, 5 + dip, v); for (let y = 4; y <= 10; y++) set(y < 8 ? 3 : 2, y + dip, bl); set(1, 10 + dip, v);
  // charro saddle: blanket, leather seat with a dip, tall cream horn at the front, the reata coiled over the horn
  for (let x = 16; x <= 28; x++) { set(x, 9, '#c8102e'); set(x, 10, '#e8e0d0'); }
  for (let x = 17; x <= 27; x++) { set(x, 8, '#8a4a22'); set(x, 7, x > 19 && x < 25 ? null : '#5e2e14'); }
  set(17, 6, '#5e2e14'); set(27, 6, '#5e2e14'); set(17, 5, '#e0c08a'); set(17, 4, '#e0c08a'); set(16, 4, '#e0c08a'); set(18, 4, '#b89860'); set(17, 3, '#b89860');
  for (let a = 0; a < 360; a += 20) { const r = a * Math.PI / 180; set(18 + Math.cos(r) * 3.2, 10 + Math.sin(r) * 2.4, a % 40 ? '#dcc48e' : '#9c8050'); }
  for (let y = 11; y <= 15; y++) set(20, y, '#5e2e14');   // stirrup leather
  set(19, 16, '#d8d8e0'); set(20, 16, '#d8d8e0'); set(21, 16, '#d8d8e0');
  // reins from the mouth to the horn, red and white
  for (let k = 0; k <= 12; k++) set(3 + k * 1.1, 10 + dip - k * .45 + (k > 6 ? (k - 6) * .3 : 0), k % 2 ? '#c8102e' : '#f4efe2');
  // outline every shape pixel that touches empty space
  const out = g.map(r => r.slice());
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = C.out;
  return out;
}
const horseSheet = Array.from({ length: HH }, (_, y) => [...horse(0)[y], ...horse(1)[y]]);
// gallop: 4 frames, the whole horse 1px higher on the two airborne frames
const lift = (g, up) => (up ? [...g.slice(1), Array(HW).fill(null)] : g);
const runFrames = [0, 1, 2, 3].map(k => lift(horse(0, k), k === 1 || k === 2));
const runSheet = Array.from({ length: HH }, (_, y) => runFrames.flatMap(g => g[y]));
fs.writeFileSync(`${outDir}/luis_horse.png`, png(1, null, horseSheet));
fs.writeFileSync(`${outDir}/luis_horse_run.png`, png(1, null, runSheet));
fs.writeFileSync(`${outDir}/luis_horse_preview.png`, png(8, '#a8d8f8', Array.from({ length: HH }, (_, y) => [...horseSheet[y], null, null, ...runSheet[y]])));

// Luis riding (40x46, facing left like the horse): his side view from the hat to the belt sits in the saddle, one
// leg in navy trousers and a grey botín hangs down the flank. 2 standing frames (the horse's idle) + 4 galloping.
const RW = HW, RH = HH + 16;
function ride(horseGrid) {
  const g = Array.from({ length: RH }, () => Array(RW).fill(null));
  horseGrid.forEach((row, y) => row.forEach((c, x) => { if (c) g[y + 16][x] = c; }));
  FRAMES.side_0.slice(0, 25).forEach((row, y) => row.forEach((c, x) => { if (c && x + 11 < RW) g[y][x + 11] = c; }));
  for (let y = 25; y <= 33; y++) { g[y][19] = key.o; g[y][20] = y < 31 ? key.P : key.k; g[y][21] = y < 31 ? (y % 2 ? key.y : key.P) : key.k; g[y][22] = key.o; }
  g[34][19] = g[34][20] = g[34][21] = g[34][22] = key.o; g[33][18] = key.o; g[33][19] = key.k;   // boot toe
  return g;
}
[horse(0), horse(1)].forEach((h, n) => fs.writeFileSync(`${outDir}/luis_ride_idle_${n}.png`, png(1, null, ride(h))));
runFrames.forEach((h, n) => fs.writeFileSync(`${outDir}/luis_ride_run_${n}.png`, png(1, null, ride(h))));
fs.writeFileSync(`${outDir}/luis_ride_preview.png`, png(8, '#a8d8f8', Array.from({ length: RH }, (_, y) => [horse(0), ...runFrames].flatMap(h => [...ride(h)[y], null, null]))));

for (const [name, g] of Object.entries(FRAMES)) fs.writeFileSync(`${outDir}/luis_${name}.png`, png(1, null, g));

// one preview strip of the walk frames + blink, to eyeball the views side by side
const order = ['down_0', 'down_sit_0', 'down_sit_1', 'down_phone_0', 'down_phone_1', 'down_floreo_0', 'down_blink', 'up_0', 'up_1', 'up_2', 'side_0', 'side_1', 'side_2'];
const strip = Array.from({ length: 34 }, () => []);
for (const name of order) FRAMES[name].forEach((row, y) => strip[y].push(...row, null, null));
fs.writeFileSync(`${outDir}/luis_views_preview.png`, png(8, '#a8d8f8', strip));
console.log('ok');
