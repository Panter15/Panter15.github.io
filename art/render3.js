// Concept v3: detailed GBA-style island (480x320 art = 2x2 GBA screens), upscaled 3x. No dependencies.
// Light comes from the sun in the top-right: highlights on top/right edges, shadows bottom/left.
const fs = require('fs'), zlib = require('zlib');
const { drawMalinche } = require('./malinche');
const W = 480, H = 320, S = 3;
// Drawing uses "map" coordinates (the 480x320 island view). The canvas is larger (CW x CH) so the 3D version can
// turn the island without showing the edge of the sea; the flat outputs crop the 480x320 window back out.
const CW = 800, CH = 640, OX = 160, OY = 138;
const XS = -OX, XE = CW - OX, YS = -OY, YE = CH - OY;   // map-coordinate range covered by the canvas
// Drawing goes into RGBA layers (Ground, Malinche, Objects, Sky) so the .piskel export stays editable per layer.
const layers = [];
let target = null;                                     // layer to draw into; null = the top-most layer
function layer(name) { layers.push({ name, buf: Buffer.alloc(CW * CH * 4) }); }
const rgb = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function px(x, y, c) { x = (x | 0) + OX; y = (y | 0) + OY; if (x < 0 || y < 0 || x >= CW || y >= CH) return; const [r, g, b] = rgb(c), buf = (target || layers.at(-1)).buf, i = (y * CW + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; }
function get(x, y) {                                   // colour of the top-most painted layer
  x = (x | 0) + OX; y = (y | 0) + OY; if (x < 0 || y < 0 || x >= CW || y >= CH) return '#000000';
  const i = (y * CW + x) * 4;
  for (let l = layers.length - 1; l >= 0; l--) { const b = layers[l].buf; if (b[i + 3]) return '#' + [b[i], b[i + 1], b[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); }
  return '#000000';
}
function onGround(fn) { const prev = target; target = layers[0]; fn(); target = prev; }
// Each object is drawn into its own temporary layer, saved as cropped sprites (for the 3D billboards), and its front
// view is merged into the current layer (for the flat image). Shadows inside a view go to the ground via onGround().
// views: one draw function (looks the same from every side) or four: [front, east, back, west], i.e. the side the
// camera sees as the island turns. anchor: the map point where the object touches the ground (default: bottom-centre
// of the front view); every view is stored as an offset from it, so all four stand on the same spot.
const sprites = [];
function sprite(id, views, anchor) {
  views = [].concat(views);
  const shots = views.map(fn => {
    layer('tmp'); fn(); const { buf } = layers.pop();
    let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (buf[(y * CW + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { buf, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  });
  const into = (target || layers.at(-1)).buf, front = shots[0].buf;
  for (let i = 0; i < front.length; i += 4) if (front[i + 3]) front.copy(into, i, i, i + 4);
  const [ax, ay] = anchor ? [anchor[0] + OX, anchor[1] + OY] : [shots[0].x + shots[0].w / 2, shots[0].y + shots[0].h];
  sprites.push({ id, ax, ay, shots });
}
layer('Ground');
function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
function disc(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) px(cx + x, cy + y, c); }
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const P = {
  deep: '#2858a8', sea: '#3878c8', wave: '#80b8f0', shallow: '#58a8e0', foam: '#f0f8f8',
  sand: '#e8d898', sandS: '#d0bc78', grass: '#68b848', grassS: '#4c9838', grassL: '#88d060',
  path: '#d8b870', pathS: '#b0904c', out: '#202820', wood: '#a06838', woodS: '#6a4220',
  wall: '#f0e8d0', wallS: '#c8bca0', glass: '#88c8f0', glassL: '#e0f4ff', rock: '#a0a0a8', rockS: '#686870',
};

// ---- island shape: wobbly ellipse; d < 1 is land, d > 1 is water (d grows with distance from the shore)
const CX = 240, CY = 182, RX = 214, RY = 122, CLIFF = 4;
const shape = (x, y) => { const dx = (x - CX) / RX, dy = (y - CY) / RY, a = Math.atan2(dy, dx);
  return Math.hypot(dx, dy) / (1 + 0.05 * Math.sin(3 * a) + 0.035 * Math.sin(5 * a + 1) + 0.02 * Math.sin(9 * a + 2)); };

// ---- water coloured by depth, like a real reef island: turquoise lagoon -> teal -> blue -> deep navy
const WATER = ['#86e6d8', '#52d0cc', '#2ea8c0', '#2f7cc4', '#245aa6', '#1c4890'];
const STEPS = [1.04, 1.12, 1.24, 1.42, 1.7];                                   // d where each colour ends
for (let y = YS; y < YE; y++) for (let x = XS; x < XE; x++) {
  const d = Math.min(shape(x, y), shape(x, y - CLIFF)), j = hash(x, y) * 0.03;  // jitter = dithered borders
  let i = STEPS.findIndex(s => d + j < s); if (i < 0) i = WATER.length - 1;
  let c = WATER[i];
  const reef = Math.sin(x * 0.09 + Math.sin(y * 0.05) * 2) * Math.cos(y * 0.11 + x * 0.015);
  if (i >= 1 && i <= 2 && reef > 0.55) c = '#2a8f9c';                           // seagrass / coral patches
  if (i >= 1 && i <= 2 && reef < -0.75) c = '#a8f0e2';                          // pale sand bars
  px(x, y, c);
}
for (let y = YS + 3; y < YE; y += 5) {                                         // wave strokes only in deep water
  const len = 2 + Math.round(Math.max(0, y) / 70);
  // stop before the canvas edge so the strokes don't end in a straight line where the plain sea colour takes over
  for (let x = XS; x < XE; x += 2) if (hash(x >> 2, y) < 0.05 && shape(x, y) > 1.45 && shape(x, y) < 1.8) {
    for (let k = 0; k < len; k++) { px(x + k, y, '#5a9ad8'); px(x + k + 1, y + 1, '#163e80'); }
  }
}

// ---- land: low rocky edge on the south side, thin beach (wider bay in the south), then dense canopy
// Clearings stay open lawn so the houses, lighthouse and tall grass sit on grass, like houses among the trees.
const CLEARINGS = [[112, 206, 32, 22], [186, 234, 36, 22], [398, 206, 22, 32], [112, 172, 24, 17], [372, 174, 28, 13]];
const inClearing = (x, y) => CLEARINGS.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
for (let y = YS; y < YE; y++) for (let x = XS; x < XE; x++) {
  const d = shape(x, y);
  let below = 0;
  if (d >= 1) for (let j = 1; j <= CLIFF; j++) if (shape(x, y - j) < 1) { below = j; break; }
  if (below) px(x, y, below === 1 ? '#a89060' : (x % 3) ? '#7a6a50' : '#5a4c3a');
  if (d >= 1 && d < 1.012 && x % 3) px(x, y, '#f0f8f8');                        // thin foam line at the shore
  if (d < 1.0) px(x, y, d > 0.985 ? '#c8b070' : hash(x, y) < 0.06 ? P.sandS : P.sand);
  const bay = (y - CY) / RY > 0.6 && Math.abs((x - CX) / RX) < 0.3 ? 0.05 : 0;
  if (d < 0.94 - bay) {
    let c = P.grass;                                                            // lawn (only visible in clearings)
    const tx = x % 9, ty = (y + ((x / 9 | 0) % 2) * 4) % 8;
    if ((ty === 0 && (tx === 3 || tx === 5)) || (ty === 1 && tx === 4)) c = P.grassS;
    px(x, y, c);
  }
}
// canopy: overlapping round crowns in several greens, lit from the top-right (back to front)
const CANOPY = { shadow: '#1c4620', dark: '#2a6230', base: '#3a7f38', light: '#5a9f44', high: '#8cc458', olive: '#6a8a3a' };
for (let y = 40; y < H; y += 4) for (let x = 0; x < W; x += 4) {
  const jx = x + ((hash(x, y) * 4) | 0) - 2, jy = y + ((hash(y, x) * 4) | 0) - 2;
  const bay = (jy - CY) / RY > 0.6 && Math.abs((jx - CX) / RX) < 0.3 ? 0.05 : 0;
  if (shape(jx, jy) > 0.9 - bay || inClearing(jx, jy)) continue;
  const r = 3 + ((hash(jx + 7, jy) * 3) | 0);
  const tone = hash(jy + 3, jx);
  const base = tone < 0.15 ? CANOPY.olive : tone < 0.4 ? CANOPY.dark : CANOPY.base;
  disc(jx - 1, jy + 1, r, r - 1, CANOPY.shadow);
  disc(jx, jy, r, r - 1, base);
  disc(jx + 1, jy - 1, r - 2, r - 2, tone > 0.7 ? CANOPY.high : CANOPY.light);
  if (r > 4) px(jx + 2, jy - 2, CANOPY.high);
}

// ---- dirt paths meeting at a plaza in front of the volcano
function path(points, w = 8) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; rect(x - w / 2 - 1, y - w / 2 - 1, w + 2, w + 2, P.pathS); }
  }
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; rect(x - w / 2, y - w / 2, w, w, P.path); }
  }
}

// ---- La Malinche (with a soft shadow on the grass, cast to the bottom-left; the shadow stays on the ground)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - 226) / 110) ** 2 + ((y - 168) / 16) ** 2 <= 1 && (get(x, y) === P.grass || get(x, y) === P.grassL)) px(x, y, P.grassS);
layer('Malinche');
// drawMalinche also has side/mirror profiles (east/west/back views) if the volcano should ever turn
const volcano = (opts, w) => () => {
  const ox = 240 - w / 2;
  drawMalinche(px, ox, 70, w, 104, opts);
  forestCanopy();
};
// one view only: La Malinche keeps its recognisable front profile from every angle (the user's choice)
sprite('malinche', volcano({}, 208), [240, 173]);
// repaint the volcano's forest with the same loose canopy as the island (clipped to the forest pixels)
function forestCanopy() {
  const FOREST = new Set(['#2f6a3a', '#1f4a2a', '#46924e']);
  const inMask = new Set();                              // snapshot first, so new crowns don't change the clip area
  for (let y = 70; y < 175; y++) for (let x = 136; x < 345; x++) if (FOREST.has(get(x, y))) inMask.add(y * W + x);
  const clipDisc = (cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1 && inMask.has((cy + y) * W + cx + x)) px(cx + x, cy + y, c); };
  for (let y = 72; y < 178; y += 3) for (let x = 136; x < 346; x += 3) {
    const jx = x + ((hash(x, y + 9) * 3) | 0) - 1, jy = y + ((hash(y, x + 9) * 3) | 0) - 1;
    if (!inMask.has(jy * W + jx)) continue;
    const r = 2 + ((hash(jx, jy + 5) * 2) | 0), lit = jx > 250;                 // right flank faces the sun
    clipDisc(jx - 1, jy + 1, r, r, '#183c1c');
    clipDisc(jx, jy, r, r - 1, lit ? '#2f6e34' : '#24562a');
    clipDisc(jx + 1, jy - 1, r - 1, r - 1, lit ? '#4c8f42' : '#346e34');
  }
}

// ---- reusable sprites
function shadow(cx, cy, rx, ry) { onGround(() => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) { const c = get(cx + x, cy + y); if (c === P.grass || c === P.grassS || c === P.grassL) px(cx + x, cy + y, '#3e8030'); else if (c === P.sand || c === P.sandS) px(cx + x, cy + y, '#c0aa68'); } }); }
function tree(x, y) {                                   // round Pokémon-style tree, x,y = trunk base
  shadow(x - 2, y, 9, 3);
  rect(x - 2, y - 6, 5, 6, P.out); rect(x - 1, y - 6, 3, 5, P.woodS); px(x + 1, y - 5, P.wood);
  disc(x, y - 13, 9, 8, P.out); disc(x, y - 13, 8, 7, '#2f7a3a');
  disc(x + 1, y - 15, 6, 4, '#3f9a48'); disc(x + 3, y - 17, 3, 2, '#68c060');
  for (const [dx, dy] of [[-5, -10], [-2, -8], [3, -9], [-6, -14]]) px(x + dx, y + dy, '#24602e');
}
function palm(x, y) {
  shadow(x - 3, y, 8, 2);
  for (let j = 0; j < 14; j++) { px(x + (j > 9 ? 1 : 0), y - j, P.woodS); px(x + 1 + (j > 9 ? 1 : 0), y - j, j % 3 ? P.wood : P.woodS); }
  const tx = x + 1, ty = y - 15;
  for (const [dx, dy, len] of [[-1, 0, 8], [1, 0, 8], [-1, -1, 5], [1, -1, 5], [-1, 1, 6], [1, 1, 6]])
    for (let k = 0; k < len; k++) { const lx = tx + dx * k, ly = ty + dy * Math.round(k * 0.5) + (k > len - 3 ? 1 : 0); px(lx, ly, P.out); px(lx, ly + 1, '#2f9a3a'); px(lx, ly + 2, k % 2 ? '#2f9a3a' : P.out); }
  px(tx, ty + 1, '#7a4a20'); px(tx + 1, ty + 2, '#7a4a20');
}
function rock(x, y, r) { disc(x, y, r + 1, r, P.out); disc(x, y, r, r - 1, P.rock); disc(x + 1, y - 1, r - 2, r - 2, '#c8c8d0'); px(x - r + 1, y + 1, P.rockS); px(x - r + 2, y + 1, P.rockS); }
function tallGrass(x0, y0, cols, rows) {               // the classic "wild grass" patch
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * 8, y = y0 + r * 8;
    rect(x, y, 8, 8, '#3e8a30');
    for (const bx of [1, 4, 6]) { px(x + bx, y + 1, '#78c858'); px(x + bx, y + 2, '#58a840'); px(x + bx - 1, y + 3, '#58a840'); px(x + bx + 1, y + 3, '#58a840'); }
    rect(x, y + 6, 8, 2, '#2c6c24');
  }
}
// view: 0 front (door, two windows, sign on the right), 1 east side, 2 back, 3 west side. The sign stands at the
// front-right corner, so it shows on the left in the east and back views and is hidden behind the house from the west.
const HOUSE_DEPTH = 26;
function house(x, y, w, roof, roofS, roofL, sign, view = 0) {   // x,y = top-left of the roof (front view)
  shadow(x + w / 2 - 4, y + 32, w / 2 + 4, 4);
  const side = view % 2 === 1, bw = side ? HOUSE_DEPTH : w, bx = side ? x + w / 2 - HOUSE_DEPTH / 2 : x;
  const signAt = !sign || view === 3 ? null : view === 0 ? bx + bw + 4 : bx - 14;
  if (signAt !== null) { const sx = signAt, sy = y + 22; rect(sx + 4, sy + 6, 2, 6, P.woodS); rect(sx, sy, 10, 7, P.out); rect(sx + 1, sy + 1, 8, 5, P.wood); rect(sx + 2, sy + 2, 6, 1, '#f0d8a8'); rect(sx + 2, sy + 4, 4, 1, '#f0d8a8'); }
  rect(bx + 2, y + 14, bw - 4, 18, P.out); rect(bx + 3, y + 14, bw - 6, 17, P.wall); rect(bx + 3, y + 28, bw - 6, 3, P.wallS);
  rect(bx, y, bw, 15, P.out);
  for (let j = 1; j < 14; j++) rect(bx + 1, y + j, bw - 2, 1, j < 4 ? roofL : j > 10 ? roofS : roof);
  for (let i = bx + 4; i < bx + bw - 2; i += 6) rect(i, y + 1, 1, 12, roofS);                // roof tile lines
  if (view === 0) { rect(bx + bw / 2 - 4, y + 20, 8, 11, P.out); rect(bx + bw / 2 - 3, y + 21, 6, 10, '#7a4a28'); px(bx + bw / 2 + 1, y + 26, '#f8d848'); }
  const windows = view === 0 ? [bx + 6, bx + bw - 14] : side ? [bx + bw / 2 - 4] : [bx + 8, bx + bw / 2 - 4, bx + bw - 16];
  for (const wx of windows) { rect(wx, y + 18, 8, 7, P.out); rect(wx + 1, y + 19, 6, 5, P.glass); px(wx + 5, y + 20, P.glassL); px(wx + 4, y + 21, P.glassL); rect(wx, y + 25, 8, 1, P.wallS); }
}
const houseViews = (...args) => [0, 1, 2, 3].map(v => () => house(...args, v));
function lighthouse(x, y) {                            // x,y = bottom-centre
  rock(x - 8, y + 2, 7); rock(x + 9, y + 3, 6); rock(x, y + 4, 8);
  for (let j = 0; j < 46; j++) {
    const half = 6 - Math.floor(j / 16), band = Math.floor(j / 7) % 2;
    rect(x - half - 1, y - j, half * 2 + 3, 1, P.out);
    rect(x - half, y - j, half * 2 + 1, 1, band ? '#d83838' : '#f8f8f8');
    px(x + half, y - j, band ? '#f87070' : '#ffffff'); px(x - half, y - j, band ? '#982020' : '#c8c8d0');
  }
  rect(x - 7, y - 47, 15, 2, P.out);                                               // gallery
  rect(x - 4, y - 54, 9, 7, P.out); rect(x - 3, y - 53, 7, 5, '#f8e050'); px(x + 2, y - 52, '#ffffff');
  for (let j = 0; j < 4; j++) rect(x - 4 + j, y - 58 + j, 9 - 2 * j, 1, '#d83838');   // red cap
  for (const [dx, dy] of [[9, -51], [11, -51], [13, -51], [-10, -51], [-12, -51]]) px(x + dx, y + dy, '#f8f0a0'); // light rays
}
function stage(x, y) {                                 // dance stage, x,y = top-left of the floor
  shadow(x + 20, y + 14, 26, 4);
  rect(x, y, 44, 12, P.out); rect(x + 1, y + 1, 42, 8, P.wood); rect(x + 1, y + 9, 42, 2, P.woodS);
  for (let i = x + 6; i < x + 44; i += 7) rect(i, y + 1, 1, 8, P.woodS);
  for (const px0 of [x + 1, x + 41]) { rect(px0, y - 18, 2, 19, P.out); px(px0 + 1, y - 18, P.wood); }
  const flags = ['#e83838', '#f8c020', '#38a8e8', '#e858b8', '#40c040'];
  for (let k = 0; k < 13; k++) { const fx = x + 3 + k * 3, fy = y - 17 + Math.round(Math.sin(k / 12 * Math.PI) * 3); px(fx, fy, P.out); px(fx + 1, fy, P.out); px(fx, fy + 1, flags[k % 5]); px(fx + 1, fy + 1, flags[k % 5]); px(fx, fy + 2, flags[k % 5]); }
  function dancer(dx, skirt, skirtL) {                 // folklórico dancer: dark hair, wide colourful skirt
    const bx = x + dx, by = y;
    rect(bx + 1, by - 11, 3, 3, '#c88858'); rect(bx + 1, by - 12, 3, 1, P.out); px(bx, by - 11, P.out);
    rect(bx + 1, by - 8, 3, 3, '#f8f8f8');
    for (let j = 0; j < 5; j++) rect(bx + 2 - j, by - 5 + j, 1 + 2 * j, 1, j % 2 ? skirt : skirtL);
    rect(bx + 1, by, 1, 1, P.out); rect(bx + 3, by, 1, 1, P.out);
  }
  dancer(12, '#d83838', '#f87070'); dancer(28, '#2878d8', '#58a8f8');
}
function pipe(x, y) {                                  // x,y = top-left of the rim
  shadow(x + 6, y + 22, 12, 3);
  rect(x, y, 20, 8, P.out); rect(x + 1, y + 1, 18, 6, '#38b038'); rect(x + 3, y + 1, 3, 6, '#90f090'); rect(x + 15, y + 1, 3, 6, '#207820');
  rect(x + 2, y + 8, 16, 14, P.out); rect(x + 3, y + 8, 14, 13, '#30a030'); rect(x + 5, y + 8, 3, 13, '#80e080'); rect(x + 14, y + 8, 2, 13, '#1a6a1a');
  rect(x + 2, y + 1, 1, 1, '#103810');
}
// view 0/2: broadside (the sail on the other side of the mast from the back); 1/3: seen from bow/stern, narrow
function boat(x, y, view = 0) {
  if (view % 2 === 0) {
    const dir = view === 0 ? 1 : -1;
    rect(x, y, 18, 4, P.out); rect(x + 1, y, 16, 3, '#b07040'); rect(x + 3, y + 3, 12, 1, P.out);
    rect(x + 8, y - 16, 1, 16, P.out);
    for (let j = 0; j < 13; j++) { const sw = Math.floor(j * 0.6) + 1; rect(dir > 0 ? x + 9 : x + 8 - sw, y - 15 + j, sw, 1, '#f8f8f8'); }
    px(x + 8, y - 17, '#d83838'); px(x + 8 + dir, y - 17, '#d83838');
  } else {
    rect(x + 5, y, 8, 4, P.out); rect(x + 6, y, 6, 3, '#b07040');
    rect(x + 8, y - 16, 1, 16, P.out); rect(x + 9, y - 15, 2, 12, '#e0e0e8');
    px(x + 8, y - 17, '#d83838');
  }
  for (let i = -4; i < 24; i += 3) px(x + i, y + 5, P.wave);
}

// ---- place everything (back to front, so lower objects overlap higher ones)
layer('Objects');
onGround(() => { tallGrass(96, 160, 4, 3); tallGrass(352, 166, 5, 2); });   // flat, part of the ground
let n = 0;
for (const [x, y] of [[70, 150], [86, 140], [104, 138], [372, 150], [392, 160], [356, 146], [150, 166], [330, 170]]) sprite(`tree-${n++}`, () => tree(x, y));
sprite('visa', houseViews(92, 186, 40, '#4070d0', '#2850a0', '#78a8f0', true), [112, 218]);      // visa office (Easytravel Visa)
sprite('library', houseViews(162, 214, 46, '#d84040', '#a02828', '#f87878', true), [185, 246]);  // library (GitHub)
for (const [x, y] of [[60, 236], [74, 252], [416, 240], [300, 272], [136, 270], [428, 196]]) sprite(`tree-${n++}`, () => tree(x, y));
sprite('lighthouse', () => lighthouse(400, 226));                                     // lighthouse (LinkedIn)
n = 0;
for (const [x, y] of [[50, 210], [196, 292], [284, 294], [36, 182]]) sprite(`palm-${n++}`, () => palm(x, y));
sprite('boat', [0, 1, 2, 3].map(v => () => boat(150, 44, v)), [159, 48]);

// ---- sun and clouds
layer('Sky');
disc(432, 30, 15, 15, '#f8f088'); disc(432, 30, 12, 12, '#f8d030'); disc(436, 26, 5, 5, '#f8f0a0');
for (let a = 0; a < 8; a++) { const ax = Math.cos(a * Math.PI / 4), ay = Math.sin(a * Math.PI / 4); for (let k = 18; k < 23; k++) px(432 + ax * k, 30 + ay * k, '#f8e870'); }
function cloud(x, y) { for (const [dx, dy, r] of [[0, 0, 8], [10, -4, 9], [20, 0, 8], [10, 2, 9]]) disc(x + dx, y + dy, r + 1, Math.round((r + 1) * 0.6), '#c8d8f0'); for (const [dx, dy, r] of [[0, -1, 8], [10, -5, 9], [20, -1, 8], [10, 1, 9]]) disc(x + dx, y + dy, r, Math.round(r * 0.6), '#f8f8f8'); }
cloud(70, 22); cloud(250, 18); cloud(330, 46);

// ---- output: 3x preview PNG, 1x PNG (for Piskel's "Import image"), and a layered .piskel file
const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const v of b) c = T[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
// crop (x, y, w, h) out of a canvas-sized buffer and encode it, nearest-neighbour upscaled
function png(rgba, scale = 1, x0 = OX, y0 = OY, w = W, h = H) {
  const OW = w * scale, OH = h * scale, raw = Buffer.alloc((OW * 4 + 1) * OH);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const si = ((y0 + (y / scale | 0)) * CW + x0 + (x / scale | 0)) * 4; rgba.copy(raw, y * (OW * 4 + 1) + 1 + x * 4, si, si + 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const flat = Buffer.alloc(CW * CH * 4);                // layers are fully opaque per pixel, so top-most wins
for (const { buf } of layers) for (let i = 0; i < flat.length; i += 4) if (buf[i + 3]) buf.copy(flat, i, i, i + 4);
// flat 2D outputs (the 480x320 view)
fs.writeFileSync(process.argv[2] || 'island_concept_v3.png', png(flat, S));
fs.writeFileSync('island_v3_1x.png', png(flat));
fs.writeFileSync('island_ground_1x.png', png(layers[0].buf));
const piskel = { modelVersion: 2, piskel: { name: 'Luis Island', description: '', fps: 12, width: W, height: H, layers:
  layers.map(({ name, buf }) => JSON.stringify({ name, opacity: 1, frameCount: 1,
    chunks: [{ layout: [[0]], base64PNG: 'data:image/png;base64,' + png(buf).toString('base64') }] })) } };
fs.writeFileSync('luis_island.piskel', JSON.stringify(piskel));
// 3D outputs for the Angular app: the whole ground canvas and one PNG per object view in public/island/,
// plus island-data.ts with each object's ground anchor and its views as offsets from that anchor
// (views: 1 = same from every side, 4 = [front, east, back, west])
const nodePath = require('path'), pub = nodePath.join(__dirname, '..', 'public', 'island');
fs.rmSync(nodePath.join(pub, 'sprites'), { recursive: true, force: true });
fs.mkdirSync(nodePath.join(pub, 'sprites'), { recursive: true });
fs.writeFileSync(nodePath.join(pub, 'ground.png'), png(layers[0].buf, 1, 0, 0, CW, CH));
const data = { ground: { src: 'island/ground.png', w: CW, h: CH, centerX: OX + CX, centerY: OY + CY },
  objects: sprites.map(({ id, ax, ay, shots }) => ({ id, ax, ay, views: shots.map((s, i) => {
    const file = shots.length > 1 ? `${id}-${i}.png` : `${id}.png`;
    fs.writeFileSync(nodePath.join(pub, 'sprites', file), png(s.buf, 1, s.x, s.y, s.w, s.h));
    return { src: `island/sprites/${file}`, dx: s.x - ax, dy: s.y - ay, w: s.w, h: s.h };
  }) })) };
fs.writeFileSync(nodePath.join(__dirname, '..', 'src', 'app', 'island', 'island-data.ts'),
  '// Generated by art/render3.js. Do not edit by hand.\n' +
  `export const ISLAND = ${JSON.stringify(data, null, 2)} as const;\n`);
console.log('ok', layers.map(l => l.name).join(', '), '|', sprites.length, 'sprites');
