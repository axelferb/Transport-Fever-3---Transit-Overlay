'use strict';
/* The schematic (metro-style) map: data, layout, SVG and the dialog.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- schematic map: a metro-style diagram of the network, to save and share ---------- */
/* The stations and lines come from what is drawn on the map (game lines and your own). The layout
   keeps the rough geography, pulls every stretch towards 0°, 45° or 90°, and shortens long empty
   stretches between towns so the whole network fits. Shared stretches are drawn side by side. */
function schemData(opts){
  const st = new Map(), lines = [];
  const keyOf = n => { const s = S.stations[n]; return s && s.sg != null ? 'g' + s.sg : 'n' + n; };
  const sgNode = new Map();
  for (const n in S.stations){ const s = S.stations[n]; if (s.sg != null && S.nodes[n] && !s.secondary && !sgNode.has(String(s.sg))) sgNode.set(String(s.sg), n); }
  S.lines.forEach((l, li) => {
    if (l.cargo) return;
    if (!opts.planned && !l.gameId) return;
    if (opts.offModes && opts.offModes.includes(l.mode)) return;
    if (opts.offLines && opts.offLines.includes(String(l.id))) return;
    const edges = new Set();
    const addSt = (k, x, y, name) => {
      if (!st.has(k)) st.set(k, {k, name:name || '', xs:0, ys:0, c:0, lines:new Set()});
      const o = st.get(k); o.xs += x; o.ys += y; o.c++; o.lines.add(li); if (!o.name && name) o.name = name;
    };
    const gl = l.gameId != null && S.game ? S.game.lines.find(g => g.id === l.gameId) : null;
    if (gl && S.game.xf){
      // Lines from the game: their stops in the game's order, the way the vehicles run them
      // (after the last stop they return to the first).
      const stops = gl.stops.filter(sg => S.game.groups[sg] && !isNaN(S.game.groups[sg].x));
      for (const sg of new Set(stops)){
        const gr = S.game.groups[sg], node = sgNode.get(String(sg)), q = node ? S.nodes[node] : W2I(gr.x, gr.y);
        addSt('g' + sg, q.x, q.y, gr.name);
      }
      const n = stops.length, legs = n > 1 && stops[0] !== stops[n - 1] ? n : n - 1;
      for (let i = 0; i < legs; i++){ const a = 'g' + stops[i], b = 'g' + stops[(i + 1) % n]; if (a !== b) edges.add(a < b ? a + '|' + b : b + '|' + a); }
    } else {
      // Lines you drew: the stations along each branch, in order
      for (const br of l.branches || []){
        let prev = null;
        for (const n of br.path || []){
          const s = S.stations[n], p = S.nodes[n]; if (!s || !p) continue;
          const k = keyOf(n); addSt(k, p.x, p.y, s.name);
          if (prev && prev !== k) edges.add(prev < k ? prev + '|' + k : k + '|' + prev);
          prev = k;
        }
      }
    }
    if (edges.size) lines.push({li, name:l.name, color:l.color, mode:l.mode, edges:[...edges].map(e => e.split('|')), planned:!l.gameId});
  });
  for (const o of st.values()){ o.x = o.xs / o.c; o.y = o.ys / o.c; }
  for (const k of [...st.keys()]) if (!lines.some(L => L.edges.some(e => e[0] === k || e[1] === k))) st.delete(k);
  return {st, lines};
}
function schemLayout(D, geographic){
  const S0 = [...D.st.values()], E = new Map();
  D.lines.forEach(L => L.edges.forEach(([a, b]) => { const k = a + '|' + b; if (!E.has(k)) E.set(k, [a, b]); }));
  const edges = [...E.values()];
  const P = new Map(S0.map(o => [o.k, {x:o.x, y:o.y}]));
  const lens = edges.map(([a, b]) => Math.hypot(P.get(a).x - P.get(b).x, P.get(a).y - P.get(b).y)).filter(v => v > 0).sort((a, b) => a - b);
  const Lm = lens.length ? lens[Math.floor(lens.length / 2)] : 100;
  // scale so a typical stretch is 70 units long
  const k0 = 70 / Lm;
  for (const p of P.values()){ p.x *= k0; p.y *= k0; }
  const O = new Map([...P].map(([k, p]) => [k, {x:p.x, y:p.y}])); // positions before the layout moved them
  if (!geographic){
    const want = edges.map(([a, b]) => { const d = Math.hypot(P.get(a).x - P.get(b).x, P.get(a).y - P.get(b).y); return Math.max(46, d <= 70 ? d : 70 * Math.pow(d / 70, 0.35)); });
    const keys = [...P.keys()];
    for (let it = 0; it < 600; it++){
      const a0 = 0.5 * (1 - it / 700);
      edges.forEach(([a, b], i) => {
        const pa = P.get(a), pb = P.get(b), dx = pb.x - pa.x, dy = pb.y - pa.y, d = Math.hypot(dx, dy) || 1;
        const th = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const L = it < 150 ? d + (want[i] - d) * 0.5 : want[i];
        const tx = Math.cos(th) * L, ty = Math.sin(th) * L, cx = (tx - dx) * a0 * 0.5, cy = (ty - dy) * a0 * 0.5;
        pa.x -= cx; pa.y -= cy; pb.x += cx; pb.y += cy;
      });
      if (it % 3 === 0) for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++){
        const p = P.get(keys[i]), q = P.get(keys[j]), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
        if (d < 40 && d > 0.01){ const f = (40 - d) / d * 0.25; p.x -= dx*f; p.y -= dy*f; q.x += dx*f; q.y += dy*f; }
        else if (d <= 0.01){ q.x += 3; }
      }
    }
  }
  if (!geographic) schemStraighten(P, edges);
  schemPack(P, edges);
  return {P, edges, O, k0};
}
/* Separate networks (towns far apart with no line between them) are slid towards each other until
   they nearly touch, keeping which one is north, south, east or west of which. */
function schemPack(P, edges){
  // networks: stations joined by lines
  const up = new Map(); const find = k => { while (up.get(k) !== k){ up.set(k, up.get(up.get(k))); k = up.get(k); } return k; };
  for (const k of P.keys()) up.set(k, k);
  for (const [a, b] of edges) up.set(find(a), find(b));
  const comps = new Map();
  for (const k of P.keys()){ const r = find(k); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(k); }
  if (comps.size < 2) return;
  const boxOf = keys => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const k of keys){ const p = P.get(k); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return {x0, y0, x1, y1}; };
  const near = (a, b, m) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.y0 - m < b.y1 && a.y1 + m > b.y0;
  // groups: networks that overlap or nearly touch belong to the same place and move as one
  let G = [...comps.values()].map(keys => ({keys, b:boxOf(keys)}));
  for (let merged = true; merged;){
    merged = false;
    outer: for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) if (near(G[i].b, G[j].b, 40)){
      const keys = G[i].keys.concat(G[j].keys); G[i] = {keys, b:boxOf(keys)}; G.splice(j, 1); merged = true; break outer;
    }
  }
  if (G.length < 2) return;
  G.sort((a, b) => b.keys.length - a.keys.length);
  const M = 90; // room between places, for station names
  const anchor = G[0], ax = (anchor.b.x0 + anchor.b.x1) / 2, ay = (anchor.b.y0 + anchor.b.y1) / 2;
  for (let it = 0; it < 400; it++){
    let moved = false;
    for (const c of G.slice(1)){
      const cx = (c.b.x0 + c.b.x1) / 2, cy = (c.b.y0 + c.b.y1) / 2, d = Math.hypot(ax - cx, ay - cy);
      if (d < 1) continue;
      const st = Math.max(2, d * 0.04), dx = (ax - cx) / d * st, dy = (ay - cy) / d * st;
      const nb = {x0:c.b.x0 + dx, y0:c.b.y0 + dy, x1:c.b.x1 + dx, y1:c.b.y1 + dy};
      if (G.some(o => o !== c && near(nb, o.b, M))) continue;
      c.b = nb; c.dx = (c.dx || 0) + dx; c.dy = (c.dy || 0) + dy; moved = true;
    }
    if (!moved) break;
  }
  for (const c of G) if (c.dx) for (const k of c.keys){ const p = P.get(k); p.x += c.dx; p.y += c.dy; }
}
/* One stretch drawn the metro way: a straight run along one of the eight directions, then one bend. */
/* Stretches that are almost level, upright or at 45° are made exactly so, moving both stops a little,
   so the map has clean straight runs instead of small kinks. */
function schemStraighten(P, edges){
  for (let it = 0; it < 120; it++){
    let moved = 0;
    for (const [a, b] of edges){
      const pa = P.get(a), pb = P.get(b), dx = pb.x - pa.x, dy = pb.y - pa.y, ax = Math.abs(dx), ay = Math.abs(dy), L = Math.hypot(dx, dy);
      if (L < 1) continue;
      let cx = 0, cy = 0;
      if (ay < ax * 0.22) cy = dy;                                   // almost level
      else if (ax < ay * 0.22) cx = dx;                              // almost upright
      else if (Math.abs(ax - ay) < Math.max(ax, ay) * 0.22){ const m = (ax + ay) / 2; cx = dx - Math.sign(dx)*m; cy = dy - Math.sign(dy)*m; } // almost 45°
      else continue;
      if (Math.abs(cx) + Math.abs(cy) < 0.05) continue;
      pa.x += cx / 2 * 0.6; pa.y += cy / 2 * 0.6; pb.x -= cx / 2 * 0.6; pb.y -= cy / 2 * 0.6; moved++;
    }
    if (!moved) break;
  }
}
function schemRoute(a, b){
  const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
  // nearly straight or nearly diagonal: draw it straight, a tiny bend only reads as a wobble
  const tol = Math.max(6, Math.hypot(dx, dy) * 0.12);
  if (ax < tol || ay < tol || Math.abs(ax - ay) < tol) return [a, b];
  const d = Math.min(ax, ay), sx = Math.sign(dx), sy = Math.sign(dy);
  // one bend: the diagonal part, then the straight part
  const m = {x:a.x + sx*d, y:a.y + sy*d};
  return [a, m, b];
}
function offsetPath(pts, off){
  if (!off) return pts;
  const out = [];
  for (let i = 0; i < pts.length; i++){
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const n1 = i > 0 ? norm(pts[i - 1], p) : null, n2 = i < pts.length - 1 ? norm(p, pts[i + 1]) : null;
    let nx, ny;
    if (n1 && n2){ nx = n1[0] + n2[0]; ny = n1[1] + n2[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; const c = nx*n1[0] + ny*n1[1]; const m = off / Math.max(0.4, c); out.push({x:p.x + nx*m, y:p.y + ny*m}); }
    else { const n = n1 || n2; out.push({x:p.x + n[0]*off, y:p.y + n[1]*off}); }
  }
  return out;
  function norm(u, v){ const dx = v.x - u.x, dy = v.y - u.y, l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
}
/* Smooth corners: a polyline with each bend rounded off (radius r, smaller on short stretches). */
function roundedD(pts, r){
  const f = v => v.toFixed(1);
  if (pts.length < 3) return 'M' + pts.map(p => f(p.x) + ' ' + f(p.y)).join(' L');
  let d = 'M' + f(pts[0].x) + ' ' + f(pts[0].y);
  for (let i = 1; i < pts.length - 1; i++){
    const a = pts[i - 1], p = pts[i], b = pts[i + 1];
    const la = Math.hypot(p.x - a.x, p.y - a.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
    const rr = Math.min(r, la / 2, lb / 2);
    if (rr < 0.5){ d += ' L' + f(p.x) + ' ' + f(p.y); continue; }
    const p1 = {x:p.x + (a.x - p.x) / la * rr, y:p.y + (a.y - p.y) / la * rr}, p2 = {x:p.x + (b.x - p.x) / lb * rr, y:p.y + (b.y - p.y) / lb * rr};
    d += ' L' + f(p1.x) + ' ' + f(p1.y) + ' Q' + f(p.x) + ' ' + f(p.y) + ' ' + f(p2.x) + ' ' + f(p2.y);
  }
  const z = pts[pts.length - 1];
  return d + ' L' + f(z.x) + ' ' + f(z.y);
}
const SCHEM_MODE = {train:{code:'R', head:'Rail'}, subway:{code:'M', head:'Metro'}, tram:{code:'T', head:'Tram'}, bus:{code:'B', head:'Bus'}, ferry:{code:'F', head:'Ferry'}};
function schemSVG(opts){
  const D = schemData(opts);
  if (!D.lines.length) return null;
  const {P, O, k0} = schemLayout(D, opts.layout === 'geo');
  const dark = opts.style === 'dark';
  const C = dark
    ? {bg:'#15181C', ink:'#ECEAE5', muted:'#8C939C', st:'#15181C', rule:'#2C3238', box:'rgba(255,255,255,0.045)', boxLine:'rgba(255,255,255,0.13)', water:'#22384A', town:'#7E8791'}
    : {bg:'#F3F2EE', ink:'#1C2026', muted:'#6B727B', st:'#FFFFFF', rule:'#D9D6CE', box:'rgba(40,48,40,0.045)', boxLine:'rgba(60,70,60,0.22)', water:'#CADCE6', town:'#5E6670'};
  const W = 6.5, GAP = 1.5, RAD = 10;
  const font = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const f = v => v.toFixed(1);
  // short codes per kind of line, like R1, T2, B3
  const used = new Set();
  // every line its own, clearly different colour on the diagram
  const rgb = h => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const dist = (a, b) => { const p = rgb(a), q = rgb(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  const usedC = [];
  D.lines.forEach(L => {
    if (usedC.some(c => dist(c, L.color) < 100)){
      const free = PALETTE.concat(['#F2C200','#00A3E0','#9E9D24','#EC5FA0','#1A237E','#6D4C41','#26A69A','#AB47BC','#FF7043','#7CB342']).filter(c => !usedC.includes(c)).sort((a, b) => Math.min(...usedC.map(c => dist(c, b))) - Math.min(...usedC.map(c => dist(c, a))))[0];
      if (free) L.color = free;
    }
    usedC.push(L.color);
  });
  const seen = {};
  D.lines.forEach(L => { const m = SCHEM_MODE[L.mode] || SCHEM_MODE.bus; seen[m.code] = (seen[m.code] || 0) + 1; L.code = m.code + seen[m.code]; L.head = m.head; });
  const onEdge = new Map();
  D.lines.forEach((L, i) => L.edges.forEach(([a, b]) => { const k = a + '|' + b; if (!onEdge.has(k)) onEdge.set(k, []); onEdge.get(k).push(i); }));
  const stations = [...D.st.values()];
  for (const o of stations){
    const n = o.lines.size, bundle = Math.max(1, ...[...onEdge.entries()].filter(([k]) => k.split('|').includes(o.k)).map(([, v]) => v.length));
    o.inter = n > 1;
    o.r = o.inter ? (bundle * (W + GAP)) / 2 + 3.5 : W * 0.62;
  }
  // towns: each stop belongs to the town whose buildings it sits among
  const towns = new Map();
  if (S.game && S.game.xf){
    const tc = {};
    for (const b of S.game.buildings){ const t = tc[b[5]] || (tc[b[5]] = {x:0, y:0, n:0, pts:[]}); t.x += b[1]; t.y += b[2]; t.n++; if (t.pts.length < 400) t.pts.push(b); }
    for (const id in tc){ const t = tc[id]; t.x /= t.n; t.y /= t.n; t.r = Math.max(250, ...t.pts.map(b => Math.hypot(b[1] - t.x, b[2] - t.y))); }
    for (const o of stations){
      const w = I2W({x:o.x, y:o.y}); let best = null, bd = Infinity;
      for (const id in tc){ const t = tc[id], d = Math.hypot(w.x - t.x, w.y - t.y); if (d < t.r * 1.15 && d < bd){ bd = d; best = id; } }
      if (best != null){ o.town = best; if (!towns.has(best)) towns.set(best, {name:S.game.towns[best] || '', st:[]}); towns.get(best).st.push(o); }
    }
  }
  // lines, with rounded bends; side by side where they share a stretch
  const paths = [];
  D.lines.forEach((L, i) => {
    for (const [a, b] of L.edges){
      const list = onEdge.get(a + '|' + b), n = list.length, j = list.indexOf(i);
      const pts = offsetPath(schemRoute(P.get(a), P.get(b)), (j - (n - 1) / 2) * (W + GAP));
      paths.push(`<path d="${roundedD(pts, RAD)}" stroke="${L.color}" stroke-width="${W}" fill="none" stroke-linecap="round" stroke-linejoin="round"${L.planned ? ` stroke-dasharray="${W*1.6} ${W*1.1}"` : ''}/>`);
    }
  });
  const boxes = [], marks = [], labels = [], badges = [], townEls = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, w, h) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); };
  for (const p of P.values()) grow(p.x, p.y, 0, 0);
  // stops: a dot in the line's colour, a white ring where lines meet
  for (const o of stations){
    const p = P.get(o.k), L = D.lines.find(l => o.lines.has(l.li));
    marks.push(o.inter
      ? `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(o.r)}" fill="${C.st}" stroke="${C.ink}" stroke-width="2.6"/>`
      : `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(o.r)}" fill="${C.st}" stroke="${L ? L.color : C.ink}" stroke-width="2.2"/>`);
    boxes.push({x:p.x - o.r, y:p.y - o.r, w:2*o.r, h:2*o.r});
  }
  // town boxes behind their stops (one per group of stops close together), name in small capitals
  const townLabels = [];
  if (opts.towns !== false) for (const t of towns.values()){
    const groups = [];
    for (const o of t.st){
      const p = P.get(o.k), near = groups.filter(g => g.some(q => Math.hypot(P.get(q.k).x - p.x, P.get(q.k).y - p.y) < 130));
      if (!near.length) groups.push([o]);
      else { near[0].push(o); for (const g of near.slice(1)){ near[0].push(...g); groups.splice(groups.indexOf(g), 1); } }
    }
    for (const g of groups){
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const o of g){ const p = P.get(o.k); bx0 = Math.min(bx0, p.x - o.r); by0 = Math.min(by0, p.y - o.r); bx1 = Math.max(bx1, p.x + o.r); by1 = Math.max(by1, p.y + o.r); }
      const pad = 18; bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
      townEls.push(`<rect x="${f(bx0)}" y="${f(by0)}" width="${f(bx1 - bx0)}" height="${f(by1 - by0)}" rx="12" fill="${C.box}" stroke="${C.boxLine}" stroke-width="1.6"/>`);
      grow(bx0, by0, bx1 - bx0, by1 - by0);
      if (t.name) townLabels.push({name:t.name, bx0, by0, bx1, by1});
    }
  }
  // badges at each line's ends, stacked above the stop
  if (opts.badges !== false){
    const ends = new Map();
    D.lines.forEach(L => {
      const deg = new Map(); L.edges.forEach(([a, b]) => { deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); });
      let term = [...deg].filter(([, d]) => d === 1).map(([k]) => k);
      if (!term.length && L.edges.length) term = [L.edges[0][0]];
      for (const k of term){ if (!ends.has(k)) ends.set(k, []); if (!ends.get(k).includes(L)) ends.get(k).push(L); }
    });
    for (const [k, Ls] of ends){
      const p = P.get(k), o = D.st.get(k), bh = 14, gap = 2;
      const cols = Ls.length > 3 ? 2 : 1, cw = Math.max(...Ls.map(L => L.code.length * 6.6 + 10));
      Ls.forEach((L, i) => {
        const w = L.code.length * 6.6 + 10, c = i % cols, row = Math.floor(i / cols);
        const x = p.x - (cols * cw + (cols - 1) * gap) / 2 + c * (cw + gap) + (cw - w) / 2, y = p.y - o.r - 5 - (row + 1) * (bh + gap);
        badges.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${bh}" rx="3.5" fill="${L.color}"/><text x="${f(x + w/2)}" y="${f(y + 10.4)}" text-anchor="middle" font-size="10" font-weight="800" fill="${inkOn(L.color)}">${esc(L.code)}</text>`);
        boxes.push({x, y, w, h:bh}); grow(x, y, w, bh);
      });
    }
  }
  for (const t of townLabels){
    const txt = t.name.toLocaleUpperCase(LOCALE()), w = txt.length * 7.4, cx = (t.bx0 + t.bx1) / 2;
    const top = {x:cx - w/2, y:t.by0 - 19, w, h:14}, bot = {x:cx - w/2, y:t.by1 + 5, w, h:14};
    const hit = bx => boxes.some(o => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y);
    const bx = !hit(top) ? top : !hit(bot) ? bot : top;
    townEls.push(`<text x="${f(cx)}" y="${f(bx.y + 11)}" text-anchor="middle" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="${C.town}">${esc(txt)}</text>`);
    boxes.push(bx); grow(bx.x, bx.y, w, 14);
  }
  // station names, placed where they don't hit lines, stops, badges or town names
  if (opts.names !== false){
    const fs = 11, segs = [];
    for (const [k] of onEdge){ const [a, b] = k.split('|'); const pts = schemRoute(P.get(a), P.get(b)); for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]); }
    const hitSeg = bx => segs.some(([u, v]) => segBox(u, v, bx));
    const hitBox = bx => boxes.some(o => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y);
    for (const o of stations.slice().sort((a, b) => b.lines.size - a.lines.size)){
      if (!o.name) continue;
      const p = P.get(o.k), txt = o.name.length > 28 ? o.name.slice(0, 27) + '…' : o.name;
      const w = txt.length * fs * 0.56, h = fs * 1.2, g = o.r + 5;
      const cands = [[g, -h/2, 'start'], [-g - w, -h/2, 'end'], [-w/2, g, 'middle'], [-w/2, -g - h, 'middle'], [g*0.7, g*0.7, 'start'], [g*0.7, -g*0.7 - h, 'start'], [-g*0.7 - w, g*0.7, 'end'], [-g*0.7 - w, -g*0.7 - h, 'end']];
      let pick = null;
      for (const [dx, dy, an] of cands){ const bx = {x:p.x + dx, y:p.y + dy, w, h}; if (!hitBox(bx) && !hitSeg(bx)){ pick = [bx, an]; break; } }
      if (!pick) for (const [dx, dy, an] of cands){ const bx = {x:p.x + dx, y:p.y + dy, w, h}; if (!hitBox(bx)){ pick = [bx, an]; break; } }
      if (!pick) continue;
      const [bx, an] = pick; boxes.push(bx); grow(bx.x, bx.y, w, h);
      const tx = an === 'start' ? bx.x : an === 'end' ? bx.x + w : bx.x + w/2;
      labels.push(`<text x="${f(tx)}" y="${f(bx.y + h*0.8)}" text-anchor="${an}" font-size="${fs}" font-weight="${o.inter ? 700 : 600}" fill="${C.ink}" paint-order="stroke" stroke="${C.bg}" stroke-width="3" stroke-linejoin="round">${esc(txt)}</text>`);
    }
  }
  // water: the game's lakes and sea, moved along with the stops around them
  let water = '';
  const T = S.game && S.game.terrain;
  if (opts.water === true && T && S.game.xf){ // off for now; kept for a later "Show water" option
    const wl = waterLevel(), keys = [...P.keys()], cell = [];
    const m = 80 / k0; // world metres of margin around the network
    const wpts = keys.map(k => I2W({x:O.get(k).x / k0, y:O.get(k).y / k0}));
    let wx0 = Infinity, wy0 = Infinity, wx1 = -Infinity, wy1 = -Infinity;
    for (const w of wpts){ wx0 = Math.min(wx0, w.x); wy0 = Math.min(wy0, w.y); wx1 = Math.max(wx1, w.x); wy1 = Math.max(wy1, w.y); }
    const span = Math.max(wx1 - wx0, wy1 - wy0) + 2*m, stepN = Math.max(1, Math.round(span / T.step / 90));
    for (let j = 0; j < T.rows; j += stepN) for (let i = 0; i < T.cols; i += stepN){
      const h = T.h[j*T.cols + i]; if (h == null || h >= wl) continue;
      const wx = T.x0 + i*T.step, wy = T.y0 + j*T.step;
      if (wx < wx0 - m || wx > wx1 + m || wy < wy0 - m || wy > wy1 + m) continue;
      const q = W2I(wx, wy); let ox = q.x * k0, oy = q.y * k0, sw = 0, dx = 0, dy = 0;
      // move with the nearby stops (inverse distance weighting)
      for (const k of keys){ const o = O.get(k), pp = P.get(k), d2 = (o.x - ox)**2 + (o.y - oy)**2 + 400, wgt = 1 / (d2 * d2); sw += wgt; dx += (pp.x - o.x) * wgt; dy += (pp.y - o.y) * wgt; }
      cell.push([ox + dx / sw, oy + dy / sw, i, j]);
    }
    // leave out single stray cells (ponds and noise); keep water that has neighbours
    const set = new Set(cell.map(c => c[2] + ',' + c[3]));
    const keep = cell.filter(([, , i, j]) => [[stepN,0],[-stepN,0],[0,stepN],[0,-stepN]].filter(([a, b]) => set.has((i + a) + ',' + (j + b))).length >= 2);
    cell.length = 0; cell.push(...keep);
    if (cell.length){
      const rr = Math.max(4, T.step * stepN * pxPerMSafe() * k0 * 0.85);
      water = `<g filter="url(#tfoWater)" fill="${C.water}">` + cell.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}"/>`).join('') + '</g>';
    }
  }
  // header and legend
  const pad = 40, mapW = x1 - x0, mapH = y1 - y0, nStops = stations.length;
  const title = opts.title || T_('Network map');
  const sub = T_('{l} lines · {s} stops', {l:D.lines.length, s:nStops});
  const head = 92;
  const Wt = Math.max(mapW, 560) + pad*2;
  const groups = []; D.lines.forEach(L => { let g = groups.find(x => x.head === L.head); if (!g) groups.push(g = {head:L.head, lines:[]}); g.lines.push(L); });
  const cols = Math.max(1, Math.floor((Wt - pad*2) / 280)), colW = (Wt - pad*2) / cols;
  let ly = 0; const legend = [];
  for (const g of groups){
    legend.push(`<text x="${pad}" y="${f(ly + 12)}" font-size="10.5" font-weight="800" letter-spacing="1.4" fill="${C.muted}">${esc(T_(g.head).toLocaleUpperCase(LOCALE()))}</text>`);
    ly += 24;
    g.lines.forEach((L, i) => {
      const cx = pad + (i % cols) * colW, cy = ly + Math.floor(i / cols) * 24;
      const fit = Math.max(8, Math.floor((colW - 90) / 6.6)), nm = L.name.length > fit ? L.name.slice(0, fit - 1) + '…' : L.name;
      const bw = L.code.length * 6.6 + 10;
      legend.push(`<line x1="${cx}" y1="${cy}" x2="${cx + 26}" y2="${cy}" stroke="${L.color}" stroke-width="${W}" stroke-linecap="round"${L.planned ? ` stroke-dasharray="${W*1.6} ${W*1.1}"` : ''}/><rect x="${cx + 34}" y="${cy - 7}" width="${f(bw)}" height="14" rx="3.5" fill="${L.color}"/><text x="${f(cx + 34 + bw/2)}" y="${cy + 3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="${inkOn(L.color)}">${esc(L.code)}</text><text x="${f(cx + 42 + bw)}" y="${cy + 4}" font-size="12" font-weight="600" fill="${C.ink}">${esc(nm)}</text>`);
    });
    ly += Math.ceil(g.lines.length / cols) * 24 + 10;
  }
  const legTop = head + mapH + pad, Ht = legTop + 22 + ly + 30;
  const ox = pad - x0 + (Wt - pad*2 - mapW) / 2, oy = head + pad/2 - y0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(Wt)}" height="${Math.round(Ht)}" viewBox="0 0 ${f(Wt)} ${f(Ht)}" font-family="${font}">
<defs><filter id="tfoWater" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/><feComponentTransfer><feFuncA type="linear" slope="8" intercept="-3"/></feComponentTransfer></filter></defs>
<rect width="100%" height="100%" fill="${C.bg}"/>
<text x="${pad}" y="50" font-size="30" font-weight="800" fill="${C.ink}">${esc(title)}</text>
<text x="${pad}" y="74" font-size="13" font-weight="500" fill="${C.muted}">${esc(sub)}</text>
<line x1="${pad}" y1="${head - 2}" x2="${f(Wt - pad)}" y2="${head - 2}" stroke="${C.rule}" stroke-width="1.5"/>
<clipPath id="tfoMapClip"><rect x="${f(x0 - 20)}" y="${f(y0 - 20)}" width="${f(mapW + 40)}" height="${f(mapH + 40)}" rx="6"/></clipPath>
<g transform="translate(${f(ox)} ${f(oy)})"><g clip-path="url(#tfoMapClip)">${water}</g>${townEls.join('')}${paths.join('')}${marks.join('')}${badges.join('')}${labels.join('')}</g>
<line x1="${pad}" y1="${f(legTop)}" x2="${f(Wt - pad)}" y2="${f(legTop)}" stroke="${C.rule}" stroke-width="1.5"/>
<g transform="translate(0 ${f(legTop + 22)})">${legend.join('')}</g>
<text x="${f(Wt - pad)}" y="${f(Ht - 14)}" text-anchor="end" font-size="10.5" fill="${C.muted}">${esc(T_('Made with Transit Overlay for Transport Fever 3'))}</text>
</svg>`;
  return {svg, w:Wt, h:Ht, lines:Object.fromEntries(D.lines.map(L => [L.li, {color:L.color, code:L.code}]))};
  function segBox(u, v, b){
    const mm = W / 2 + 1, bx = {x:b.x - mm, y:b.y - mm, w:b.w + 2*mm, h:b.h + 2*mm};
    for (let t = 0; t <= 1; t += 0.05){ const x = u.x + (v.x - u.x)*t, y = u.y + (v.y - u.y)*t; if (x > bx.x && x < bx.x + bx.w && y > bx.y && y < bx.y + bx.h) return true; }
    return false;
  }
}
function pxPerMSafe(){ try { return pxPerM(); } catch { return 1; } }
const T_ = (en, vars) => T(en, vars);
let schemOut = null;
function schemOpts(){
  const f = schemFilter();
  return {title:$('#scTitle').value.trim(), layout:$('#scLayout').value, style:$('#scStyle').value, names:$('#scNames').checked, planned:$('#scPlanned').checked, offModes:f.offModes, offLines:f.offLines};
}
/* Which lines go on the diagram: whole kinds (bus, tram, …) and single lines can be left out.
   Remembered with the project. */
function schemFilter(){
  const f = S.settings.schemFilter || (S.settings.schemFilter = {offModes:[], offLines:[]});
  f.offModes = f.offModes || []; f.offLines = f.offLines || [];
  return f;
}
function schemFilterUI(){
  const f = schemFilter(), planned = $('#scPlanned').checked;
  const lines = S.lines.filter(l => !l.cargo && (planned || l.gameId));
  const modes = Object.keys(MODES).filter(m => lines.some(l => l.mode === m));
  const mbox = $('#scModes'); mbox.textContent = '';
  for (const m of modes){
    const lab = document.createElement('label'); lab.className = 'sc-chip';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !f.offModes.includes(m);
    cb.addEventListener('change', () => { f.offModes = cb.checked ? f.offModes.filter(x => x !== m) : f.offModes.concat(m); autosave(); schemPreview(); schemFilterUI(); });
    const n = lines.filter(l => l.mode === m).length;
    const cnt = document.createElement('small'); cnt.textContent = n; cnt.style.opacity = '.7';
    lab.append(cb, document.createTextNode(T(MODES[m].label) + ' '), cnt);
    mbox.append(lab);
  }
  const lbox = $('#scLines'); lbox.textContent = '';
  for (const l of lines){
    const lab = document.createElement('label'); lab.className = 'sc-line';
    const offMode = f.offModes.includes(l.mode);
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !offMode && !f.offLines.includes(String(l.id)); cb.disabled = offMode;
    cb.addEventListener('change', () => { const id = String(l.id); f.offLines = cb.checked ? f.offLines.filter(x => x !== id) : f.offLines.concat(id); autosave(); const top = $('#scLines').scrollTop; schemPreview(); schemFilterUI(); $('#scLines').scrollTop = top; });
    const A = schemOut && schemOut.lines && schemOut.lines[S.lines.indexOf(l)];
    const sw = document.createElement('span'); sw.className = 'sc-sw'; sw.style.background = A ? A.color : l.color;
    const code = document.createElement('b'); code.className = 'sc-code'; code.textContent = A ? A.code : ''; code.style.background = A ? A.color : 'transparent'; code.style.color = A ? inkOn(A.color) : 'inherit';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.name || T('Untitled'); nm.title = l.name || '';
    lab.append(cb, sw, code, nm); if (offMode) lab.classList.add('off');
    lbox.append(lab);
  }
  $('#scLinesHead').textContent = T('Lines ({on} of {n})', {on:lines.filter(l => !f.offModes.includes(l.mode) && !f.offLines.includes(String(l.id))).length, n:lines.length});
}
function schemPreview(){
  const box = $('#scPreview');
  schemOut = schemSVG(schemOpts());
  if (!schemOut){ box.innerHTML = ''; const p = document.createElement('p'); p.className = 'info'; p.textContent = T('There are no passenger lines on the map yet. Import game data or draw a line first.'); box.append(p); return; }
  box.innerHTML = schemOut.svg;
  const svg = box.querySelector('svg'); svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width = '100%'; svg.style.height = '100%';
}
function openSchematic(){
  finishLine(false);
  if (!$('#scTitle').value){
    const G = S.game; $('#scTitle').value = G && G.focus != null ? (G.towns[G.focus] || '') : '';
  }
  $('#scDlg').showModal(); $('#schemBtn').setAttribute('aria-selected', 'true'); schemPreview(); schemFilterUI();
}
async function schemSave(kind){
  if (!schemOut) return;
  if (kind === 'svg'){ await saveFile('transit-schematic.svg', schemOut.svg); return; }
  const sc = 2, img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(schemOut.svg);
  try { await img.decode(); } catch { toast('The image was too large to export.'); return; }
  const c = document.createElement('canvas'); c.width = Math.round(schemOut.w*sc); c.height = Math.round(schemOut.h*sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  if (!blob){ toast('The image was too large to export.'); return; }
  await saveFile('transit-schematic.png', blob);
}

document.addEventListener('paste', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const items = [...(e.clipboardData ? e.clipboardData.items : [])];
  const img = items.find(i => i.type.startsWith('image/'));
  if (!img){ if (tag !== 'input' && tag !== 'textarea') toast('No image on the clipboard. Copy a screenshot first.'); return; }
  e.preventDefault(); readFile(img.getAsFile());
});
