// La Malinche pixel sprite, drawn from reference photos: wide forested base, rugged rocky summit,
// small pinnacle on the left, long ridge to the right ending in a second pinnacle. Sun top-right.
const C = { out:'#182818', snow:'#f8f8f8', snowS:'#c0c8d8', rock:'#c0ac90', rockS:'#76665a', forest:'#2f6a3a', forestS:'#1f4a2a', forestL:'#46924e' };
// silhouette (x, y) in 0..1 of the sprite box
const TOP = [[0,1],[.08,.82],[.15,.42],[.18,.34],[.21,.42],[.27,.38],[.40,.16],[.46,.08],[.50,.13],[.54,.10],[.60,.20],[.72,.28],[.76,.22],[.79,.29],[.88,.60],[1,1]];
const TREE = [[0,.86],[.15,.62],[.30,.55],[.45,.52],[.60,.50],[.75,.46],[.85,.62],[1,.86]];
// seen from the east/west: the long ridge is end-on, so the summit looks like a steeper, more compact cone
const SIDE_TOP = [[0,1],[.12,.72],[.25,.45],[.36,.22],[.44,.12],[.5,.06],[.55,.11],[.6,.09],[.68,.24],[.8,.5],[.9,.74],[1,1]];
const SIDE_TREE = [[0,.86],[.2,.62],[.4,.52],[.6,.5],[.8,.6],[1,.86]];
const lerp = (pts, t) => { for (let i=1;i<pts.length;i++) if (t<=pts[i][0]) { const [x0,y0]=pts[i-1],[x1,y1]=pts[i]; return y0+(y1-y0)*(t-x0)/(x1-x0); } return pts.at(-1)[1]; };
// side: false = front/back profile, true = east/west profile; mirror flips the profile left-right (the far side)
function drawMalinche(px, ox, oy, w, h, { side = false, mirror = false } = {}) {
  const top0 = side ? SIDE_TOP : TOP, tree0 = side ? SIDE_TREE : TREE;
  const TOPp = mirror ? top0.map(([x, y]) => [1 - x, y]).reverse() : top0;
  const TREEp = mirror ? tree0.map(([x, y]) => [1 - x, y]).reverse() : tree0;
  for (let x=0;x<w;x++) {
    const t=x/(w-1), top=Math.round(lerp(TOPp,t)*(h-1)), tree=Math.round(lerp(TREEp,t)*(h-1));
    const lit = lerp(TOPp, Math.min(1,t+1/w)) > lerp(TOPp, t);         // slope faces right = faces the sun
    for (let y=top;y<h;y++) {
      let c;
      const n = (x*13 + y*7) % 11;                                         // cheap noise for gullies
      if (y === top) c = C.out;
      else if (y < tree - (n%3)) {
        const depth = y - top;
        const gully = (x % 6 === 0 || x % 6 === 1) && depth > 2;
        if (depth < 3 + (n%3) || (!gully && n < 2)) c = lit ? C.snow : C.snowS;
        else c = gully ? C.rockS : (lit ? C.rock : C.rockS);
      } else {
        // rows of round tree crowns, highlighted on the sun side
        const cx = x % 5, cy = (y + (Math.floor(x / 5) % 2) * 2) % 4;
        if (cx === 0 || cy === 3) c = C.forestS;
        else if (cy === 0 && cx >= 2) c = lit ? C.forestL : C.forest;
        else c = lit ? C.forest : (cx === 1 ? C.forestS : C.forest);
      }
      px(ox + x, oy + y, c);
    }
  }
}
module.exports = { drawMalinche };
