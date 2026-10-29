// Round trip between Luis's frames and Piskel (piskelapp.com), so he can be redrawn by hand in more detail.
//
//   node art/luis-piskel.js export   writes art/luis.piskel: every frame of Luis, doubled to 48x68 (crisp), in the
//                                    order below. Open it in Piskel, draw, and save it back to art/luis.piskel.
//   node art/town.js                 builds the island; if art/luis.piskel exists, Luis's frames come from it.
//
// The frame order matters: the app finds each animation by its position. Keep the 18 frames in this order (you can
// add layers; they are merged top-down). In the game Luis is shown 24x34 map pixels big, so a 48x68 drawing gives
// twice the detail at the same size.
const fs = require('fs'), path = require('path');
const { decode, encode, blit } = require('./png');

const FRAMES = ['down_0', 'down_1', 'down_2', 'down_blink', 'down_floreo_0', 'down_floreo_1', 'down_floreo_2', 'down_floreo_3',
  'down_sit_0', 'down_sit_1', 'down_phone_0', 'down_phone_1', 'up_0', 'up_1', 'up_2', 'side_0', 'side_1', 'side_2'];
const W = 48, H = 68, FILE = path.join(__dirname, 'luis.piskel');
const DESCRIPTION = 'Frames, in order: ' + FRAMES.join(', ') + '. side = facing left (mirrored in the game for right).';

function exportPiskel() {
  const strip = { w: W * FRAMES.length, h: H, d: new Uint8Array(W * FRAMES.length * H * 4) };
  FRAMES.forEach((name, n) => {   // each 24x34 frame from avatar.js, doubled
    const f = decode(fs.readFileSync(path.join(__dirname, `luis_${name}.png`)));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = ((y >> 1) * f.w + (x >> 1)) * 4, j = (y * strip.w + n * W + x) * 4;
      for (let k = 0; k < 4; k++) strip.d[j + k] = f.d[i + k];
    }
  });
  const layer = { name: 'Luis', opacity: 1, frameCount: FRAMES.length,
    chunks: [{ layout: FRAMES.map((_, n) => [n]), base64PNG: 'data:image/png;base64,' + encode(strip).toString('base64') }] };
  fs.writeFileSync(FILE, JSON.stringify({ modelVersion: 2, piskel: { name: 'Luis', description: DESCRIPTION, fps: 6, width: W, height: H, layers: [JSON.stringify(layer)] } }));
  console.log('wrote', path.relative(process.cwd(), FILE), `(${FRAMES.length} frames, ${W}x${H})`);
}

/** Read art/luis.piskel back into one image per frame name (layers merged, bottom layer first). */
function importPiskel(file = FILE) {
  const { piskel } = JSON.parse(fs.readFileSync(file, 'utf8')), w = piskel.width, h = piskel.height;
  const layers = piskel.layers.map(l => (typeof l === 'string' ? JSON.parse(l) : l));
  if (layers[0].frameCount < FRAMES.length) throw new Error(`luis.piskel has ${layers[0].frameCount} frames; it needs ${FRAMES.length} (${FRAMES.join(', ')})`);
  const out = FRAMES.map(() => ({ w, h, d: new Uint8Array(w * h * 4) }));
  for (const layer of layers) for (const c of layer.chunks) {
    const img = decode(Buffer.from(c.base64PNG.split(',')[1], 'base64'));
    c.layout.forEach((col, cx) => col.forEach((frame, cy) => { if (frame < FRAMES.length) blit(img, cx * w, cy * h, w, h, out[frame], 0, 0, layer.opacity ?? 1); }));
  }
  return Object.fromEntries(FRAMES.map((name, n) => [name, out[n]]));
}

if (require.main === module) {
  if (process.argv[2] === 'export') exportPiskel();
  else console.log('usage: node art/luis-piskel.js export');
}
module.exports = { importPiskel, FRAMES };
