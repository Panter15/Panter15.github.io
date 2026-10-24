// Concept mockup: GBA-style (240x160) island with La Malinche, upscaled 4x. No dependencies.
const fs = require('fs'), zlib = require('zlib');
const W = 240, H = 160, S = 4;
const buf = Buffer.alloc(W * H * 3);
const hex = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
function px(x, y, c) { x|=0; y|=0; if (x<0||y<0||x>=W||y>=H) return; const [r,g,b]=hex(c), i=(y*W+x)*3; buf[i]=r; buf[i+1]=g; buf[i+2]=b; }
function rect(x, y, w, h, c) { for (let j=0;j<h;j++) for (let i=0;i<w;i++) px(x+i, y+j, c); }
function ellipse(cx, cy, rx, ry, c, test) { for (let y=cy-ry;y<=cy+ry;y++) for (let x=cx-rx;x<=cx+rx;x++) { const d=((x-cx)/rx)**2+((y-cy)/ry)**2; if (d<=1 && (!test||test(x,y,d))) px(x,y,c); } }

// sky band + sea
rect(0, 0, W, H, '#3878c8');
for (let y=0;y<H;y++) for (let x=0;x<W;x++) if ((x*3+y*7)%23===0 && y%4===0) { px(x,y,'#78b0f0'); px(x+1,y,'#78b0f0'); }
// sun + clouds
ellipse(214, 18, 10, 10, '#f8f088'); ellipse(214, 18, 8, 8, '#f8d030');
for (const [cx,cy] of [[40,16],[150,12],[90,24]]) { ellipse(cx,cy,10,4,'#f8f8f8'); ellipse(cx+7,cy-2,6,4,'#f8f8f8'); }

// island: foam, sand, grass with dither
ellipse(120, 96, 104, 60, '#f0f8f8');
ellipse(120, 96, 101, 57, '#e8d890');
ellipse(120, 94, 92, 49, '#58b048');
ellipse(120, 94, 92, 49, '#489838', (x,y) => (x+y)%5===0 && (x*y)%3===0);

// sand paths
const path = (x0,y0,x1,y1) => { const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for (let k=0;k<=n;k++) rect(x0+(x1-x0)*k/n, y0+(y1-y0)*k/n, 3, 3, '#d8c078'); };
path(120,100,60,112); path(120,100,186,110); path(120,100,120,132); path(120,100,90,118);

// La Malinche sprite (sun top-right)
require('./malinche').drawMalinche(px, 60, 36, 120, 54);

// buildings
function house(x, y, roof) {
  rect(x-1, y+6, 18, 11, '#283028'); rect(x, y+7, 16, 9, '#f0e8d8');           // walls + outline
  for (let j=0;j<8;j++) rect(x-1+j, y+6-j, 18-2*j, 1, roof);                     // roof
  rect(x+6, y+11, 4, 5, '#805030'); rect(x+2, y+9, 3, 3, '#88c8f0'); rect(x+11, y+9, 3, 3, '#88c8f0');
}
house(48, 100, '#4070d0');   // visa office (blue roof)
house(80, 108, '#d84040');   // library / GitHub (red roof)

// lighthouse (LinkedIn)
rect(185, 88, 8, 26, '#283028');
for (let j=0;j<24;j++) rect(186, 89+j, 6, 1, Math.floor(j/4)%2 ? '#d84040' : '#f8f8f8');
rect(185, 84, 8, 5, '#283028'); rect(186, 85, 6, 3, '#f8e050');

// dance stage on the beach (Danza Folclor)
rect(106, 136, 30, 6, '#5a3418'); rect(107, 136, 28, 4, '#a06838');
rect(107, 126, 2, 10, '#5a3418'); rect(133, 126, 2, 10, '#5a3418');
const flags=['#e83838','#f8c020','#38a8e8','#e858b8','#40c040'];
for (let k=0;k<9;k++) rect(109+k*3, 127+(k%2), 2, 2, flags[k%5]);

// warp pipe (easter egg)
rect(165, 124, 14, 5, '#103810'); rect(166, 125, 12, 3, '#40c040');
rect(167, 129, 10, 8, '#103810'); rect(168, 129, 8, 7, '#30a030'); rect(169, 129, 2, 7, '#70e070');

// palm trees
function palm(x, y) { rect(x, y, 2, 9, '#7a4a20'); for (const [dx,dy] of [[-4,0],[-3,-1],[2,-1],[3,0],[-1,-2],[0,-2]]) rect(x+dx, y+dy, 3, 2, '#2f9a3a'); }
palm(34, 116); palm(28, 96); palm(206, 100); palm(150, 136); palm(96, 136);

// encode PNG (upscaled with nearest neighbour, like image-rendering: pixelated)
const OW=W*S, OH=H*S, raw=Buffer.alloc((OW*3+1)*OH);
for (let y=0;y<OH;y++) { raw[y*(OW*3+1)]=0; for (let x=0;x<OW;x++) { const si=((y/S|0)*W+(x/S|0))*3, di=y*(OW*3+1)+1+x*3; buf.copy(raw, di, si, si+3); } }
const crcT = Array.from({length:256}, (_,n) => { let c=n; for (let k=0;k<8;k++) c = c&1 ? 0xedb88320^(c>>>1) : c>>>1; return c>>>0; });
const crc = b => { let c=0xffffffff; for (const v of b) c=crcT[(c^v)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const chunk = (t, d) => { const l=Buffer.alloc(4); l.writeUInt32BE(d.length); const td=Buffer.concat([Buffer.from(t), d]); const c=Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(OW,0); ihdr.writeUInt32BE(OH,4); ihdr[8]=8; ihdr[9]=2;
fs.writeFileSync(process.argv[2]||'island_concept_v2.png', Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]));
console.log('ok');
