// La Malinche alone: malinche_sprite.png (8x, on sky, for viewing) and malinche_stand.png (1x, transparent, for the 3D demo).
const fs=require('fs'), zlib=require('zlib');
const W=96,H=54, buf=Buffer.alloc(W*H*4);
const px=(x,y,c)=>{ if(x<0||y<0||x>=W||y>=H)return; const i=(y*W+x)*4; buf[i]=parseInt(c.slice(1,3),16); buf[i+1]=parseInt(c.slice(3,5),16); buf[i+2]=parseInt(c.slice(5,7),16); buf[i+3]=255; };
require('./malinche').drawMalinche(px,0,0,W,H);
const T=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const v of b)c=T[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
const ch=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
function png(S, bg) {                                  // bg = [r,g,b,a] behind empty pixels, or transparent if omitted
  const OW=W*S,OH=H*S,raw=Buffer.alloc((OW*4+1)*OH);
  for(let y=0;y<OH;y++)for(let x=0;x<OW;x++){const si=((y/S|0)*W+(x/S|0))*4,di=y*(OW*4+1)+1+x*4; if(buf[si+3])buf.copy(raw,di,si,si+4); else if(bg)Buffer.from(bg).copy(raw,di);}
  const h=Buffer.alloc(13);h.writeUInt32BE(OW,0);h.writeUInt32BE(OH,4);h[8]=8;h[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',h),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]);
}
fs.writeFileSync('malinche_sprite.png',png(8,[0x88,0xb8,0xf0,255]));
fs.writeFileSync('malinche_stand.png',png(1));
