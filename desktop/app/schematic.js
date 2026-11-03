'use strict';
/* The schematic (metro-style) map: data, layout, SVG and the dialog.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- schematic map: a metro-style diagram of the network, to save and share ---------- */
/* The stations and lines come from what is drawn on the map (game lines and your own). The diagram is
   built the way the LOOM project (Bast, Brosi, Storandt, Uni Freiburg) draws transit maps:
     1. stretches that several lines share become corridors that carry the set of lines (schemCorridors),
     2. the lines' order on each corridor is chosen so they cross as little as possible where they part,
     3. every station is a shape with one port per line and edge, so lines leave it in their order and a
        terminal with many lines becomes one wide shape rather than a ring with lines piled on it (schemPorts),
     4. only then the layout pulls every stretch towards 0°, 45° or 90° and packs separate towns (schemLayout). */
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
    let start = null;
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
      if (stops.length) start = 'g' + stops[0];
    } else {
      // Lines you drew: the stations along each branch, in order
      for (const br of l.branches || []){
        let prev = null;
        for (const n of br.path || []){
          const s = S.stations[n], p = S.nodes[n]; if (!s || !p) continue;
          const k = keyOf(n); addSt(k, p.x, p.y, s.name);
          if (!start) start = k;
          if (prev && prev !== k) edges.add(prev < k ? prev + '|' + k : k + '|' + prev);
          prev = k;
        }
      }
    }
    if (edges.size) lines.push({li, name:l.name, color:l.color, mode:l.mode, edges:[...edges].map(e => e.split('|')), planned:!l.gameId, start});
  });
  for (const o of st.values()){ o.x = o.xs / o.c; o.y = o.ys / o.c; }
  for (const k of [...st.keys()]) if (!lines.some(L => L.edges.some(e => e[0] === k || e[1] === k))) st.delete(k);
  // where each line ends: its stops with only one of its stretches, or, on a loop, its first stop
  for (const L of lines){
    const deg = new Map(); L.edges.forEach(([a, b]) => { deg.set(a, (deg.get(a) || 0) + 1); deg.set(b, (deg.get(b) || 0) + 1); });
    L.ends = [...deg].filter(([, d]) => d === 1).map(([k]) => k);
    if (!L.ends.length) L.ends = [L.start && deg.has(L.start) ? L.start : L.edges[0][0]];
  }
  return {st, lines};
}
/* Steps 1 and 2: corridors and the order of the lines on them.
   A corridor is a run of stretches that carry the same lines, joined at stops where nothing else happens;
   its lines get one order for the whole run. At every stop where corridors meet, a line should leave
   on the side its next corridor lies on, and two lines heading the same way should stay in the same
   relative order, so they need not cross. The order on each corridor is picked by trying every order
   (there are rarely more than six lines on a stretch) and keeping the one with the fewest crossings and
   splits at its two ends, sweeping over all corridors until nothing improves. */
function schemCorridors(D, P){
  const E = new Map();
  D.lines.forEach((L, i) => L.edges.forEach(([a, b]) => { const k = a + '|' + b; if (!E.has(k)) E.set(k, {k, a, b, lines:[]}); const e = E.get(k); if (!e.lines.includes(i)) e.lines.push(i); }));
  const adj = new Map();
  for (const e of E.values()) for (const v of [e.a, e.b]){ if (!adj.has(v)) adj.set(v, []); adj.get(v).push(e); }
  const same = (p, q) => p.lines.length === q.lines.length && p.lines.every(x => q.lines.includes(x));
  const corr = [];
  for (const e0 of E.values()){
    if (e0.c) continue;
    const c = {edges:[e0], lines:e0.lines.slice()}; e0.c = c;
    for (const dir of [0, 1]){
      let e = e0, v = dir ? e0.b : e0.a;
      for (;;){
        const es = adj.get(v); if (es.length !== 2) break;
        const f = es[0] === e ? es[1] : es[0];
        if (f.c || !same(e, f)) break;
        f.c = c; if (dir) c.edges.push(f); else c.edges.unshift(f);
        e = f; v = f.a === v ? f.b : f.a;
      }
    }
    // the corridor runs from its first stop; each stretch notes whether it is walked a→b or b→a
    let v = c.edges.length > 1 ? (c.edges[1].a === c.edges[0].a || c.edges[1].b === c.edges[0].a ? c.edges[0].b : c.edges[0].a) : c.edges[0].a;
    c.from = v;
    for (const e of c.edges){ e.flip = e.a !== v; v = e.flip ? e.a : e.b; }
    c.to = v;
    corr.push(c);
  }
  // the lines on a stretch, left to right when walking it from a to b
  const orderAB = e => e.flip ? e.c.lines.slice().reverse() : e.c.lines;
  const outward = (e, v) => v === e.a ? orderAB(e) : orderAB(e).slice().reverse();
  const ang = (v, e) => { const o = v === e.a ? e.b : e.a, p = P.get(v), q = P.get(o); return Math.atan2(q.y - p.y, q.x - p.x); };
  const cost = v => {
    const es = adj.get(v); if (es.length < 2) return 0;
    let bad = 0;
    for (const e of es){
      const oe = outward(e, v), th = ang(v, e);
      // where each line goes on from here (undefined if it ends or returns through this stop twice)
      const dest = new Map();
      for (const l of oe){ const fs = es.filter(f => f !== e && f.lines.includes(l)); if (fs.length === 1) dest.set(l, fs[0]); }
      const del = new Map(); for (const f of es) if (f !== e){ let d = ang(v, f) - th; d = ((d % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI); del.set(f, d); }
      const before = (l, m) => { const fl = dest.get(l), fm = dest.get(m); if (fl !== fm) return del.get(fl) > del.get(fm); const o = outward(fl, v); return o.indexOf(l) > o.indexOf(m); };
      for (let i = 0; i < oe.length; i++) for (let j = i + 1; j < oe.length; j++){
        const l = oe[i], m = oe[j];
        if (!dest.has(l) || !dest.has(m)) continue;
        if (before(m, l)) bad += 2;                       // the two would cross here
        if (dest.get(l) === dest.get(m) && oe.slice(i + 1, j).some(x => dest.get(x) !== dest.get(l))) bad += 1; // split apart by another line
      }
    }
    return bad;
  };
  const perms = arr => { if (arr.length <= 1) return [arr]; const out = []; arr.forEach((x, i) => { for (const p of perms(arr.filter((_, j) => j !== i))) out.push([x, ...p]); }); return out; };
  for (let sweep = 0; sweep < 8; sweep++){
    let changed = false;
    for (const c of corr){
      if (c.lines.length < 2) continue;
      const tries = c.lines.length <= 6 ? perms(c.lines) : [c.lines].concat(c.lines.flatMap((_, i) => c.lines.slice(i + 1).map((_, j) => { const o = c.lines.slice(); [o[i], o[i + 1 + j]] = [o[i + 1 + j], o[i]]; return o; })));
      let best = c.lines, bc = cost(c.from) + cost(c.to);
      for (const o of tries){ c.lines = o; const x = cost(c.from) + cost(c.to); if (x < bc){ bc = x; best = o; } }
      if (best !== c.lines || best.some((l, i) => l !== c.lines[i])) changed = true;
      c.lines = best;
    }
    if (!changed) break;
  }
  for (const e of E.values()) e.order = orderAB(e);
  return {E, adj, corr, outward};
}
/* Step 3: the ports. For every stop, which edge and line leaves it where.
   Plain stops (one line) are a dot the line runs through. Interchanges are the rounded hull of their
   ports: each stretch arrives with its lines side by side, so a stop where two corridors meet becomes a
   pill across them and a busy station a wider shape. Where three or more lines end (a bus terminal) the
   station is a strip of bays, one per line in the order they leave, with the line's badge in its bay. */
function schemPorts(D, P, G, widths, GAP, lock){
  const N = new Map();
  for (const o of D.st.values()){
    const es = G.adj.get(o.k) || [], p = P.get(o.k);
    const dir = e => { const q = P.get(e.a === o.k ? e.b : e.a), d = Math.hypot(q.x - p.x, q.y - p.y) || 1; return {x:(q.x - p.x) / d, y:(q.y - p.y) / d}; };
    // items: one per line that ends here (both stretches of a loop share it), one per edge for lines running through
    const items = [];
    for (const li of o.lines){
      const L = D.lines.find(l => l.li === li), i = D.lines.indexOf(L), mine = es.filter(e => e.lines.includes(i));
      if (L.ends.includes(o.k)) items.push({i, L, edges:mine, badge:true});
      else for (const e of mine) items.push({i, L, edges:[e], badge:false});
    }
    // where each item heads: for a loop, the mean of its two legs
    const n = new Map(items.map(it => { const ds = it.edges.map(dir), x = ds.reduce((a, d) => a + d.x, 0) / ds.length, y = ds.reduce((a, d) => a + d.y, 0) / ds.length, l = Math.hypot(x, y) || 1; return [it, {x:x / l, y:y / l}]; }));
    const strip = items.filter(it => it.badge).length >= 3;
    const node = {k:o.k, kind:strip ? 'strip' : o.lines.size > 1 ? 'hull' : 'dot', items, anchor:new Map(), hx:0, hy:0, deg:es.length};
    if (strip){
      const ew = items.filter(it => Math.abs(n.get(it).x) > Math.abs(n.get(it).y)).length;
      // lines mostly leave up and down: a level strip. Decided once, on the geography, and kept through the layout.
      node.horiz = lock && lock.has(o.k) ? lock.get(o.k) : ew * 2 <= items.length;
      if (lock) lock.set(o.k, node.horiz);
      const key = it => node.horiz ? n.get(it).x : n.get(it).y;
      items.sort((a, b) => key(a) - key(b) || Math.atan2(n.get(a).y, n.get(a).x) - Math.atan2(n.get(b).y, n.get(b).x));
      const bw = it => it.badge ? it.L.code.length * 6.6 + 10 : 10, slot = items.map(it => bw(it) + 8);
      // the hub box carries the station's name, with the bays in a row under it
      const name = o.name.length > 28 ? o.name.slice(0, 27) + '…' : o.name;
      const total = Math.max(slot.reduce((a, b) => a + b, 0) + 6, name.length * 11 * 0.6 + 20);
      const h = 44, row = 9;
      node.name = name;
      let x = -total / 2 + 3 + (total - slot.reduce((a, b) => a + b, 0) - 6) / 2;
      items.forEach((it, j) => {
        const c = x + slot[j] / 2, d = n.get(it), side = node.horiz ? (d.y < -0.01 ? -1 : d.y > 0.01 ? 1 : 0) : (d.x < -0.01 ? -1 : d.x > 0.01 ? 1 : 0);
        it.slot = {c, w:slot[j] - 8, side, row};
        // both legs of a loop leave from the same bay, as one stroke
        const a = node.horiz ? {x:c, y:side * h / 2} : {x:side * h / 2, y:c};
        for (const e of it.edges) node.anchor.set(e.k + '#' + it.i, a);
        x += slot[j];
      });
      node.hx = node.horiz ? total / 2 : h / 2; node.hy = node.horiz ? h / 2 : total / 2; node.h = h; node.len = total;
    } else {
      // an interchange grows with the lines that end at it, so their stems have room to fan out
      const ending = items.filter(it => it.badge).length;
      node.r = o.lines.size > 1 ? widths(items[0].i) * 0.5 + Math.max(0, ending - 2) : widths(items[0].i) * 0.62;
      node.pad = Math.max(0, ending - 2) * 1.6;
      const wide = Math.max(0, ...es.map(e => e.lines.reduce((a, i) => a + widths(i), 0) + (e.lines.length - 1) * GAP));
      node.hx = node.hy = o.lines.size > 1 ? node.r + node.pad + widths(items[0].i) / 2 + 3 + wide / 2 : 0;
    }
    N.set(o.k, node);
  }
  return N;
}
/* Where a line's stretch starts at a station: the station's centre, or its port on a strip of bays. */
function schemAnchor(N, P, e, i, v){
  const p = P.get(v), a = N.get(v) && N.get(v).anchor.get(e.k + '#' + i);
  return a ? {x:p.x + a.x, y:p.y + a.y} : {x:p.x, y:p.y};
}
const SCHEM_U = 110; // a typical stretch, in diagram units
/* The nearest of the eight directions for an angle given in eighths of a turn, leaning towards level and
   upright: a diagonal is only taken when the stretch really runs that way. */
function octo(a){ const e = Math.round(a / 2) * 2; return Math.abs(a - e) <= 0.85 ? e : Math.round(a); }
/* Loops. A line that runs round a ring of stops and back the way it came (a bus loop) is drawn as one
   stroke out from where it starts, which forks into a box with the ring's stops along its three far sides,
   the way street bus maps draw a line that doubles back on itself. A loop is such a ring that belongs to
   one line only and touches the rest of the network at one stop (where the line starts, or where its
   stem joins the ring). Three stops make a triangle instead of a box. */
function schemCycles(D, G){
  const out = [];
  D.lines.forEach((L, i) => {
    // the line's own graph; a cycle exists when it has as many stretches as stops
    const adj = new Map();
    for (const [a, b] of L.edges){ if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); }
    if (L.edges.length !== adj.size) return; // a plain path (fewer stretches), or something more tangled (more)
    // peel off the stem: stops with one stretch, repeatedly
    const left = new Map([...adj].map(([k, v]) => [k, v.slice()]));
    for (let again = true; again;){
      again = false;
      for (const [k, v] of left) if (v.length === 1){ const o = v[0]; left.delete(k); left.set(o, left.get(o).filter(x => x !== k)); again = true; break; }
    }
    if (left.size < 3 || [...left.values()].some(v => v.length !== 2)) return;
    // the ring belongs to this line alone and meets the rest of the network at one stop only
    const ring = [...left.keys()], ringEdge = (a, b) => G.E.get(a < b ? a + '|' + b : b + '|' + a);
    if (ring.some(k => left.get(k).some(o => ringEdge(k, o).lines.length !== 1))) return;
    const joins = ring.filter(k => G.adj.get(k).length > 2 || L.ends.includes(k));
    if (joins.length > 1) return;
    const c0 = joins[0] || (ring.includes(L.start) ? L.start : ring[0]);
    const nodes = [c0]; let prev = null, cur = c0;
    while (nodes.length < ring.length){ const nxt = left.get(cur).find(o => o !== prev) ; prev = cur; cur = nxt; nodes.push(cur); }
    const stem = G.adj.get(c0).filter(e => e.lines.includes(i) && !ring.includes(e.a === c0 ? e.b : e.a));
    out.push({li:i, nodes, c0, stem});
  });
  return out;
}
/* Step 4: the layout. Keeps the rough geography, pulls every stretch towards 0°, 45° or 90° (at a station,
   each stretch gets its own of the eight directions, so lines fan out instead of piling up), lays loops
   out as rigid boxes, keeps stops off stretches they are not on, and shortens long empty stretches between
   towns so the whole network fits. */
function schemLayout(D, G, geographic, portsOf){
  const S0 = [...D.st.values()], edges = [...G.E.values()];
  const P = new Map(S0.map(o => [o.k, {x:o.x, y:o.y}]));
  const lens = edges.map(({a, b}) => Math.hypot(P.get(a).x - P.get(b).x, P.get(a).y - P.get(b).y)).filter(v => v > 0).sort((a, b) => a - b);
  const Lm = lens.length ? lens[Math.floor(lens.length / 2)] : 100;
  // scale so a typical stretch is SCHEM_U units long
  const k0 = SCHEM_U / Lm;
  for (const p of P.values()){ p.x *= k0; p.y *= k0; }
  const O = new Map([...P].map(([k, p]) => [k, {x:p.x, y:p.y}])); // positions before the layout moved them
  let N = portsOf(P);
  const ext = k => { const n = N.get(k); return n ? Math.max(n.hx, n.hy) : 0; };
  const anc = (e, v) => { const n = N.get(v); if (!n || n.kind !== 'strip') return P.get(v); const a = n.anchor.get(e.k + '#' + e.lines[0]), p = P.get(v); return a ? {x:p.x + a.x, y:p.y + a.y} : p; };
  // separate networks (lines that never meet) are laid out on their own and packed together afterwards
  const comp = new Map(); { const up = new Map(); const find = k => { while (up.get(k) !== k){ up.set(k, up.get(up.get(k))); k = up.get(k); } return k; };
    for (const k of P.keys()) up.set(k, k); for (const e of edges) up.set(find(e.a), find(e.b)); for (const k of P.keys()) comp.set(k, find(k)); }
  const same = (a, b) => comp.get(a) === comp.get(b);
  const rig = new Map(); // stretch key -> the points it is drawn through (a→b), for stretches of a loop
  const boxes = [];      // the loops' boxes, which other stops keep out of
  const U = SCHEM_U;
  const cycles = geographic ? [] : schemCycles(D, G);
  const rigid = new Set(cycles.flatMap(c => c.nodes.slice(1)));
  let slot = new Map();
  /* Lay every loop out as a box hanging off its first stop, in the direction d its line leaves there. */
  const placeCycles = () => {
    rig.clear(); boxes.length = 0;
    for (const c of cycles){
      const e0 = G.E.get(c.c0 < c.nodes[1] ? c.c0 + '|' + c.nodes[1] : c.nodes[1] + '|' + c.c0);
      // which way the loop goes: the way its line leaves the start (its slot), or away from its stem, or towards the ring
      let th;
      const sl = slot.get(e0), st = c.stem[0] && slot.get(c.stem[0]);
      if (c.stem.length && st) th = st.th + (c.c0 === c.stem[0].a ? Math.PI : 0); // the stem comes in: continue the same way
      else if (sl) th = sl.th + (c.c0 === e0.a ? 0 : Math.PI);
      else { const o = O.get(c.c0); let x = 0, y = 0; for (const k of c.nodes.slice(1)){ x += O.get(k).x - o.x; y += O.get(k).y - o.y; } th = octo(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4); }
      const d = {x:Math.cos(th), y:Math.sin(th)}, r = {x:-d.y, y:d.x};
      // mirror so the ring's second stop lies on the side it really is
      const o0 = O.get(c.c0), o1 = O.get(c.nodes[1]), s = Math.sign((o1.x - o0.x) * r.x + (o1.y - o0.y) * r.y) || 1;
      const R = {x:r.x * s, y:r.y * s};
      const A = anc(e0, c.c0), at = (ax, ay) => ({x:A.x + d.x * ay + R.x * ax, y:A.y + d.y * ay + R.y * ax}); // ax: sideways, ay: outwards
      const k = c.nodes.length, pts = new Map(); // node -> local (ax, ay)
      const seg = [];                             // the points each ring stretch runs through, in ring order
      if (k === 3){
        // a triangle: straight out, across, and back on the diagonal
        pts.set(c.nodes[1], [0, U]); pts.set(c.nodes[2], [U, U]);
        seg.push([[0, 0], [0, U]], [[0, U], [U, U]], [[U, U], [0, 0]]);
      } else {
        // a box: integer sides in units of U with w + 2h = k - 2, as square as can be, the ring's stops
        // one U apart along the right side, the top and the left side; the stroke forks to its two bottom corners
        let w = 1, h = (k - 3) / 2;
        for (let ww = 1; ww <= k - 2; ww++){ const hh = (k - 2 - ww) / 2; if (hh >= 0.5 && Math.abs(ww - hh) < Math.abs(w - h)){ w = ww; h = hh; } }
        const Ls = U * 0.5, fork = [0, Ls], BR = [w * U / 2, Ls + w * U / 2], TR = [BR[0], BR[1] + h * U], TL = [-BR[0], TR[1]], BL = [-BR[0], BR[1]];
        const arc = (w + 2 * h) * U / (k - 2);
        const along = t => t <= h * U ? [BR[0], BR[1] + t] : t <= (h + w) * U ? [BR[0] - (t - h * U), TR[1]] : [TL[0], TL[1] - (t - (h + w) * U)];
        for (let i = 1; i < k; i++) pts.set(c.nodes[i], along((i - 1) * arc));
        seg.push([[0, 0], fork, BR]);
        for (let i = 1; i < k - 1; i++){
          const t0 = (i - 1) * arc, t1 = i * arc, p = [pts.get(c.nodes[i])];
          if (t0 < h * U && t1 > h * U) p.push(TR);
          if (t0 < (h + w) * U && t1 > (h + w) * U) p.push(TL);
          p.push(pts.get(c.nodes[i + 1])); seg.push(p);
        }
        seg.push([BL, fork, [0, 0]]);
        boxes.push({k:c.c0, A, d, R, x0:-BR[0], x1:BR[0], y0:Ls, y1:TR[1]});
      }
      if (k === 3) boxes.push({k:c.c0, A, d, R, x0:0, x1:U, y0:0, y1:U});
      for (let i = 1; i < k; i++){ const q = at(...pts.get(c.nodes[i])), p = P.get(c.nodes[i]); p.x = q.x; p.y = q.y; }
      for (let i = 0; i < k; i++){
        const a = c.nodes[i], b = c.nodes[(i + 1) % k], e = G.E.get(a < b ? a + '|' + b : b + '|' + a);
        const world = seg[i].map(q => at(...q));
        rig.set(e.k, e.a === a ? world : world.slice().reverse());
      }
    }
  };
  if (!geographic){
    const want = edges.map(({a, b}) => { const d = Math.hypot(P.get(a).x - P.get(b).x, P.get(a).y - P.get(b).y), hub = [a, b].some(k => N.get(k) && N.get(k).kind === 'strip'); return Math.max(U * (hub ? 1.2 : 1), d <= U ? d : U * Math.pow(d / U, 0.35)); });
    const keys = [...P.keys()].filter(k => !rigid.has(k));
    let wedge = [];
    const reslot = () => {
      // at every stop, give each stretch its own direction out of the eight, keeping their order round the stop
      slot = new Map(); wedge = [];
      for (const [v, es] of G.adj){
        if (es.length < 2) continue;
        const items = es.map(e => { const q = anc(e, e.a === v ? e.b : e.a), pv = anc(e, v); return {e, a:Math.atan2(q.y - pv.y, q.x - pv.x) / (Math.PI / 4)}; }).sort((x, y) => x.a - y.a);
        // both legs of a loop that starts here leave as one stroke, so they share a direction
        const node = N.get(v), groups = [];
        for (const it of items){
          const own = cycles.find(c => c.c0 === v && c.nodes.includes(it.e.a === v ? it.e.b : it.e.a));
          const g = own && groups.find(g => g.own === own);
          if (g){ g.items.push(it); g.a = (g.a + it.a) / 2; } else groups.push({own, items:[it], a:it.a});
        }
        groups.sort((x, y) => x.a - y.a);
        // go round the stop starting after its widest empty angle, so nothing straddles the ±180° seam
        if (groups.length > 1){
          let gi = 0, gw = -1;
          for (let i = 0; i < groups.length; i++){ const w = (i + 1 < groups.length ? groups[i + 1].a : groups[0].a + 8) - groups[i].a; if (w > gw){ gw = w; gi = i; } }
          const head = groups.splice(0, gi + 1); for (const g of head) g.a += 8; groups.push(...head);
        }
        // each group its own direction, in their order round the stop, moved as little as possible from where
        // they point now; level and upright are preferred, a diagonal costs a little extra
        let s = null, best = Infinity;
        for (let s0 = Math.round(groups[0].a) - 3; s0 <= Math.round(groups[0].a) + 3; s0++){
          const t = [s0]; for (let i = 1; i < groups.length; i++) t.push(Math.max(Math.round(groups[i].a), t[i - 1] + 1));
          if (t[t.length - 1] - t[0] >= 8) continue;
          const cost = t.reduce((c, v, i) => c + Math.abs(v - groups[i].a) + (v % 2 ? 0.6 : 0), 0);
          if (cost < best){ best = cost; s = t; }
        }
        if (!s){ s = groups.map(g => Math.round(g.a)); for (let i = 1; i < s.length; i++) if (s[i] <= s[i - 1]) s[i] = s[i - 1] + 1; }
        groups.forEach((g, i) => g.items.forEach(it => {
          const prev = slot.get(it.e); if (prev && prev.deg >= es.length) return;
          slot.set(it.e, {deg:es.length, th:s[i] * Math.PI / 4 + (v === it.e.a ? 0 : Math.PI)});
        }));
        // at a terminal, every line that leaves it owns a wedge of the compass: the stops it reaches stay inside
        if (node && node.kind === 'strip') groups.forEach((g, i) => {
          const mid = s[i] * Math.PI / 4, half = Math.PI / 8 + Math.PI / 18;
          const own = new Set(), q = []; // the stops reached from here along these stretches, without passing the terminal again
          for (const it of g.items) q.push(it.e.a === v ? it.e.b : it.e.a);
          while (q.length){ const k = q.pop(); if (k === v || own.has(k)) continue; own.add(k); for (const e of G.adj.get(k)) q.push(e.a === k ? e.b : e.a); }
          for (const k of own) if (!rigid.has(k)) wedge.push({k, v, mid, half});
        });
      }
    };
    const inRing = new Set(cycles.flatMap(c => c.nodes.map((a, i) => { const b = c.nodes[(i + 1) % c.nodes.length]; return a < b ? a + '|' + b : b + '|' + a; })));
    for (let it = 0; it < 600; it++){
      const a0 = Math.max(0.15, 0.5 * (1 - it / 700));
      if (it >= 60 && it % 20 === 0){ N = portsOf(P); reslot(); }
      edges.forEach((e, i) => {
        if (inRing.has(e.k)) return; // a loop's own stretches are laid out rigidly
        const pa = P.get(e.a), pb = P.get(e.b), qa = anc(e, e.a), qb = anc(e, e.b), dx = qb.x - qa.x, dy = qb.y - qa.y, d = Math.hypot(dx, dy) || 1;
        const sl = slot.get(e), th = sl ? sl.th : octo(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const L = it < 150 ? d + (want[i] - d) * 0.5 : want[i];
        const tx = Math.cos(th) * L, ty = Math.sin(th) * L, cx = (tx - dx) * a0 * 0.5, cy = (ty - dy) * a0 * 0.5;
        pa.x -= cx; pa.y -= cy; pb.x += cx; pb.y += cy;
      });
      // stops outside their line's wedge are turned round the terminal, back into it
      for (const w of wedge){
        const c = P.get(w.v), p = P.get(w.k), dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy); if (d < 1) continue;
        let off = Math.atan2(dy, dx) - w.mid; off = Math.atan2(Math.sin(off), Math.cos(off));
        if (Math.abs(off) <= w.half) continue;
        const rot = -(off - Math.sign(off) * w.half) * 0.15, cs = Math.cos(rot), sn = Math.sin(rot);
        p.x = c.x + dx * cs - dy * sn; p.y = c.y + dx * sn + dy * cs;
      }
      placeCycles();
      if (it % 3 === 0){
        const all = [...P.keys()];
        for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++){
          if (!same(all[i], all[j])) continue;
          const p = P.get(all[i]), q = P.get(all[j]), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy), m = U * 0.8 + ext(all[i]) + ext(all[j]);
          const fp = rigid.has(all[i]) ? 0 : 1, fq = rigid.has(all[j]) ? 0 : 1; // a loop's stops stay put; the other stop gives way
          if (d < m && d > 0.01){ const f = (m - d) / d * 0.25; p.x -= dx*f*fp; p.y -= dy*f*fp; q.x += dx*f*fq; q.y += dy*f*fq; }
          else if (d <= 0.01){ q.x += 3; }
        }
        // stretches that cross without meeting are pulled apart: the stop nearest the crossing slides over to the other side
        for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++){
          const e1 = edges[i], e2 = edges[j];
          if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b || !same(e1.a, e2.a)) continue;
          const a = anc(e1, e1.a), b = anc(e1, e1.b), c = anc(e2, e2.a), d = anc(e2, e2.b);
          const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x); if (Math.abs(den) < 1e-6) continue;
          const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den, u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
          if (t <= 0 || t >= 1 || u <= 0 || u >= 1) continue;
          const step = 3;
          const shove = (e, tt, o1, o2) => { // move the nearer stop of e across the other stretch, towards its far stop's side
            const near = tt < 0.5 ? P.get(e.a) : P.get(e.b), far = tt < 0.5 ? P.get(e.b) : P.get(e.a);
            if (rigid.has(tt < 0.5 ? e.a : e.b)) return;
            const vx = o2.x - o1.x, vy = o2.y - o1.y, l = Math.hypot(vx, vy) || 1, nx = -vy / l, ny = vx / l;
            const side = Math.sign((far.x - o1.x) * nx + (far.y - o1.y) * ny) || 1;
            near.x += nx * side * step; near.y += ny * side * step;
          };
          shove(e1, t, c, d); shove(e2, u, a, b);
        }
        // other stops, and other stretches, keep out of a loop's box: whatever is inside is moved out through the nearest side
        const exit = (b, p, m) => {
          const vx = p.x - b.A.x, vy = p.y - b.A.y, ax = vx * b.R.x + vy * b.R.y, ay = vx * b.d.x + vy * b.d.y;
          if (ax <= b.x0 - m || ax >= b.x1 + m || ay <= b.y0 - m || ay >= b.y1 + m) return null;
          const o = [[b.x0 - m - ax, 0], [b.x1 + m - ax, 0], [0, b.y0 - m - ay], [0, b.y1 + m - ay]].sort((u, v) => Math.hypot(...u) - Math.hypot(...v))[0];
          return {x:o[0] * b.R.x + o[1] * b.d.x, y:o[0] * b.R.y + o[1] * b.d.y};
        };
        for (const b of boxes){
          for (const k of keys){ if (k === b.k || !same(k, b.k)) continue; const p = P.get(k), o = exit(b, p, U * 0.45 + ext(k)); if (o){ p.x += o.x * 0.3; p.y += o.y * 0.3; } }
          for (const e of edges){
            if (inRing.has(e.k) || rigid.has(e.a) || rigid.has(e.b) || e.a === b.k || e.b === b.k || !same(e.a, b.k)) continue;
            const u = anc(e, e.a), v = anc(e, e.b); let ox = 0, oy = 0, n = 0;
            for (let t = 0.1; t < 0.95; t += 0.2){ const o = exit(b, {x:u.x + (v.x - u.x) * t, y:u.y + (v.y - u.y) * t}, U * 0.3); if (o){ ox += o.x; oy += o.y; n++; } }
            if (n){ const pa = P.get(e.a), pb = P.get(e.b); pa.x += ox / n * 0.3; pa.y += oy / n * 0.3; pb.x += ox / n * 0.3; pb.y += oy / n * 0.3; }
          }
        }
        // a stop should not sit on a stretch it is not part of
        for (const k of keys){ const p = P.get(k), m = U * 0.4 + ext(k);
          for (const e of edges){ if (e.a === k || e.b === k || !same(k, e.a)) continue;
            const u = anc(e, e.a), v = anc(e, e.b), vx = v.x - u.x, vy = v.y - u.y, l2 = vx*vx + vy*vy || 1, t = Math.max(0, Math.min(1, ((p.x - u.x)*vx + (p.y - u.y)*vy) / l2));
            const cx = u.x + vx*t, cy = u.y + vy*t, dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
            if (d < m){ const f = d > 0.01 ? (m - d) / d * 0.2 : 0.2, ox = d > 0.01 ? dx*f : -vy / Math.sqrt(l2) * m * 0.2, oy = d > 0.01 ? dy*f : vx / Math.sqrt(l2) * m * 0.2, pa = P.get(e.a), pb = P.get(e.b); p.x += ox; p.y += oy; if (!rigid.has(e.a)){ pa.x -= ox*0.3; pa.y -= oy*0.3; } if (!rigid.has(e.b)){ pb.x -= ox*0.3; pb.y -= oy*0.3; } }
          }
        }
        placeCycles();
      }
    }
  }
  N = portsOf(P);
  if (!geographic){ schemStraighten(P, edges.filter(e => !rigid.has(e.a) && !rigid.has(e.b)), e => [anc(e, e.a), anc(e, e.b)]); placeCycles(); }
  const before = new Map([...P].map(([k, p]) => [k, {x:p.x, y:p.y}]));
  schemPack(P, edges.map(e => [e.a, e.b]), ext);
  // the loops' drawn points move with their stops
  for (const [k, pts] of rig){ const e = G.E.get(k), b = before.get(e.a), p = P.get(e.a); if (b.x !== p.x || b.y !== p.y) for (const q of pts){ q.x += p.x - b.x; q.y += p.y - b.y; } }
  N = portsOf(P);
  return {P, O, k0, N, rig};
}
/* Separate networks (towns far apart with no line between them) are slid towards each other until
   they nearly touch, keeping which one is north, south, east or west of which. */
function schemPack(P, edges, ext){
  // networks: stations joined by lines
  const up = new Map(); const find = k => { while (up.get(k) !== k){ up.set(k, up.get(up.get(k))); k = up.get(k); } return k; };
  for (const k of P.keys()) up.set(k, k);
  for (const [a, b] of edges) up.set(find(a), find(b));
  const comps = new Map();
  for (const k of P.keys()){ const r = find(k); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(k); }
  if (comps.size < 2) return;
  const boxOf = keys => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const k of keys){ const p = P.get(k), r = ext ? ext(k) : 0; x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r); x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r); } return {x0, y0, x1, y1}; };
  const near = (a, b, m) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.y0 - m < b.y1 && a.y1 + m > b.y0;
  let G = [...comps.values()].map(keys => ({keys, b:boxOf(keys)}));
  G.sort((a, b) => b.keys.length - a.keys.length);
  const M = SCHEM_U * 1.3; // room between places, for station names
  const anchor = G[0], ax = (anchor.b.x0 + anchor.b.x1) / 2, ay = (anchor.b.y0 + anchor.b.y1) / 2;
  // first, anything that sits on top of a bigger network is pushed straight out of it, the way it already leans
  for (let i = 1; i < G.length; i++){
    const c = G[i];
    for (let it = 0; it < 400 && G.slice(0, i).some(o => near(c.b, o.b, M)); it++){
      const cx = (c.b.x0 + c.b.x1) / 2, cy = (c.b.y0 + c.b.y1) / 2, d = Math.hypot(cx - ax, cy - ay);
      const dx = d < 1 ? 0 : (cx - ax) / d * 4, dy = d < 1 ? -4 : (cy - ay) / d * 4;
      c.b = {x0:c.b.x0 + dx, y0:c.b.y0 + dy, x1:c.b.x1 + dx, y1:c.b.y1 + dy}; c.dx = (c.dx || 0) + dx; c.dy = (c.dy || 0) + dy;
    }
  }
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
/* Stretches that are almost level, upright or at 45° are made exactly so, moving both stops a little,
   so the map has clean straight runs instead of small kinks. */
function schemStraighten(P, edges, ends){
  for (let it = 0; it < 120; it++){
    let moved = 0;
    for (const e of edges){
      const [qa, qb] = ends(e), pa = P.get(e.a), pb = P.get(e.b), dx = qb.x - qa.x, dy = qb.y - qa.y, ax = Math.abs(dx), ay = Math.abs(dy), L = Math.hypot(dx, dy);
      if (L < 1) continue;
      let cx = 0, cy = 0;
      if (ay < ax * 0.3) cy = dy;                                    // almost level
      else if (ax < ay * 0.3) cx = dx;                               // almost upright
      else if (Math.abs(ax - ay) < Math.max(ax, ay) * 0.22){ const m = (ax + ay) / 2; cx = dx - Math.sign(dx)*m; cy = dy - Math.sign(dy)*m; } // almost 45°
      else continue;
      if (Math.abs(cx) + Math.abs(cy) < 0.05) continue;
      pa.x += cx / 2 * 0.6; pa.y += cy / 2 * 0.6; pb.x -= cx / 2 * 0.6; pb.y -= cy / 2 * 0.6; moved++;
    }
    if (!moved) break;
  }
}
/* One stretch drawn the metro way: a straight run along one of the eight directions, then one bend. */
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
    const p = pts[i];
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
/* The convex hull of a few points (Andrew's monotone chain). */
function hullOf(pts){
  const P = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (P.length < 3) return P;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], hi = [];
  for (const p of P){ while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()){ while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const SCHEM_MODE = {train:{code:'R', head:'Rail'}, subway:{code:'M', head:'Metro'}, tram:{code:'T', head:'Tram'}, bus:{code:'B', head:'Bus'}, ferry:{code:'F', head:'Ferry'}};
function schemSVG(opts){
  const D = schemData(opts);
  if (!D.lines.length) return null;
  const dark = opts.style === 'dark';
  const C = dark
    ? {bg:'#15181C', ink:'#ECEAE5', muted:'#8C939C', st:'#15181C', rule:'#2C3238', box:'rgba(255,255,255,0.045)', boxLine:'rgba(255,255,255,0.13)', water:'#22384A', town:'#7E8791'}
    : {bg:'#F3F2EE', ink:'#1C2026', muted:'#6B727B', st:'#FFFFFF', rule:'#D9D6CE', box:'rgba(40,48,40,0.045)', boxLine:'rgba(60,70,60,0.22)', water:'#CADCE6', town:'#5E6670'};
  const W = 7, GAP = 2, RAD = 14;
  const font = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const f = v => v.toFixed(1);
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
  // short codes per kind of line, like R1, T2, B3
  const seen = {};
  D.lines.forEach(L => { const m = SCHEM_MODE[L.mode] || SCHEM_MODE.bus; seen[m.code] = (seen[m.code] || 0) + 1; L.code = m.code + seen[m.code]; L.head = m.head; });
  D.lines.forEach(L => { L.w = W; });
  const widths = () => W;
  // steps 1–4: corridors and line order on the rough geography, then ports and the layout
  const geo = new Map([...D.st.values()].map(o => [o.k, {x:o.x, y:o.y}]));
  const G = schemCorridors(D, geo);
  const lock = new Map();
  const {P, O, k0, N, rig} = schemLayout(D, G, opts.layout === 'geo', P => schemPorts(D, P, G, widths, GAP, lock));
  // the sideways offset of every line on every stretch, walking it from a to b
  const tracks = new Map();
  for (const e of G.E.values()){
    const ws = e.order.map(widths), total = ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * GAP;
    let x = -total / 2; const off = new Map();
    e.order.forEach((i, j) => { off.set(i, x + ws[j] / 2); x += ws[j] + GAP; });
    tracks.set(e.k, {off, total});
  }
  const stations = [...D.st.values()];
  for (const o of stations){ const n = N.get(o.k); o.inter = o.lines.size > 1; o.hx = n.kind === 'strip' ? n.hx : n.r + 2.5; o.hy = n.kind === 'strip' ? n.hy : n.r + 2.5; }
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
  // the lines, with rounded bends, side by side in their order where they share a stretch;
  // each stretch runs from port to port
  const paths = [], segs = [], routeOf = new Map();
  for (const e of G.E.values()){
    const tr = tracks.get(e.k);
    for (const i of e.order){
      const L = D.lines[i];
      // a loop's stretches run through the points of its box; any other stretch is a straight run with one bend
      const pts = offsetPath(rig.get(e.k) || schemRoute(schemAnchor(N, P, e, i, e.a), schemAnchor(N, P, e, i, e.b)), tr.off.get(i));
      routeOf.set(e.k + '#' + i, pts);
      for (let j = 1; j < pts.length; j++) segs.push([pts[j - 1], pts[j]]);
      paths.push(`<path d="${roundedD(pts, RAD)}" stroke="${L.color}" stroke-width="${f(L.w)}" fill="none" stroke-linecap="round" stroke-linejoin="round"${L.planned ? ` stroke-dasharray="${f(L.w*1.6)} ${f(L.w*1.1)}"` : ''}/>`);
    }
  }
  const boxes = [], marks = [], labels = [], badges = [], townEls = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, w, h) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); };
  for (const p of P.values()) grow(p.x, p.y, 0, 0);
  const badge = (L, x, y) => { const w = L.code.length * 6.6 + 10, bh = 14; badges.push(`<rect x="${f(x - w/2)}" y="${f(y - bh/2)}" width="${f(w)}" height="${bh}" rx="3.5" fill="${L.color}"/><text x="${f(x)}" y="${f(y + 3.4)}" text-anchor="middle" font-size="10" font-weight="800" fill="${inkOn(L.color)}">${esc(L.code)}</text>`); boxes.push({x:x - w/2, y:y - bh/2, w, h:bh}); grow(x - w/2, y - bh/2, w, bh); };
  // the stations: a dot or tick on plain stops, the rounded hull of its ports at an interchange, a strip of bays at a terminal
  for (const o of stations){
    const p = P.get(o.k), n = N.get(o.k), L = D.lines.find(l => o.lines.has(l.li));
    if (n.kind === 'strip'){
      const w = n.horiz ? n.len : n.h, h = n.horiz ? n.h : n.len;
      marks.push(`<rect x="${f(p.x - w/2)}" y="${f(p.y - h/2)}" width="${f(w)}" height="${f(h)}" rx="8" fill="${C.st}" stroke="${C.ink}" stroke-width="2.6"/>`);
      if (n.name){ o.named = true; marks.push(n.horiz
        ? `<text x="${f(p.x)}" y="${f(p.y - 6)}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.ink}">${esc(n.name)}</text>`
        : `<text x="${f(p.x - 6)}" y="${f(p.y)}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.ink}" transform="rotate(-90 ${f(p.x - 6)} ${f(p.y)})">${esc(n.name)}</text>`); }
      for (const it of n.items){
        const bx = n.horiz ? p.x + it.slot.c : p.x + it.slot.row, by = n.horiz ? p.y + it.slot.row : p.y + it.slot.c;
        if (it.badge) badge(it.L, bx, by);
        else marks.push(`<circle cx="${f(bx)}" cy="${f(by)}" r="4" fill="${it.L.color}"/>`);
      }
      boxes.push({x:p.x - w/2 - 2, y:p.y - h/2 - 2, w:w + 4, h:h + 4});
    } else if (n.kind === 'hull'){
      // ports: where each line's track meets the station, on every stretch
      const pts = [];
      for (const e of G.adj.get(o.k)){
        const tr = tracks.get(e.k);
        for (const i of e.order){
          const r = routeOf.get(e.k + '#' + i), s = e.a === o.k ? [r[0], r[1]] : [r[r.length - 1], r[r.length - 2]];
          const dx = s[1].x - s[0].x, dy = s[1].y - s[0].y, d = Math.hypot(dx, dy) || 1;
          pts.push({x:s[0].x + dx / d * n.r, y:s[0].y + dy / d * n.r});
        }
      }
      const H = hullOf(pts), d = H.length ? 'M' + H.map(q => f(q.x) + ' ' + f(q.y)).join(' L') + (H.length > 2 ? ' Z' : '') : `M${f(p.x)} ${f(p.y)}`;
      const pad = W / 2 + 3 + n.pad;
      marks.push(`<path d="${d}" fill="${C.st}" stroke="${C.ink}" stroke-width="${f(2*pad + 5.2)}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="${C.st}" stroke="${C.st}" stroke-width="${f(2*pad)}" stroke-linejoin="round" stroke-linecap="round"/>`);
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const q of H.length ? H : [p]){ bx0 = Math.min(bx0, q.x); by0 = Math.min(by0, q.y); bx1 = Math.max(bx1, q.x); by1 = Math.max(by1, q.y); }
      o.hx = (bx1 - bx0) / 2 + pad + 2.6; o.hy = (by1 - by0) / 2 + pad + 2.6; o.cx = (bx0 + bx1) / 2; o.cy = (by0 + by1) / 2;
      boxes.push({x:o.cx - o.hx, y:o.cy - o.hy, w:2*o.hx, h:2*o.hy});
    } else {
      marks.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(n.r)}" fill="${C.st}" stroke="${L ? L.color : C.ink}" stroke-width="2.2"/>`);
      boxes.push({x:p.x - o.hx, y:p.y - o.hy, w:2*o.hx, h:2*o.hy});
    }
  }
  // town boxes behind their stops (one per group of stops close together), name in small capitals
  const townLabels = [];
  if (opts.towns !== false) for (const t of towns.values()){
    const groups = [];
    for (const o of t.st){
      const p = P.get(o.k), near = groups.filter(g => g.some(q => Math.hypot(P.get(q.k).x - p.x, P.get(q.k).y - p.y) < SCHEM_U * 3.2));
      if (!near.length) groups.push([o]);
      else { near[0].push(o); for (const g of near.slice(1)){ near[0].push(...g); groups.splice(groups.indexOf(g), 1); } }
    }
    for (const g of groups){
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const o of g){ const p = P.get(o.k); bx0 = Math.min(bx0, p.x - o.hx); by0 = Math.min(by0, p.y - o.hy); bx1 = Math.max(bx1, p.x + o.hx); by1 = Math.max(by1, p.y + o.hy); }
      const pad = 18; bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
      townEls.push(`<rect x="${f(bx0)}" y="${f(by0)}" width="${f(bx1 - bx0)}" height="${f(by1 - by0)}" rx="12" fill="${C.box}" stroke="${C.boxLine}" stroke-width="1.6"/>`);
      grow(bx0, by0, bx1 - bx0, by1 - by0);
      if (t.name) townLabels.push({name:t.name, bx0, by0, bx1, by1});
    }
  }
  // badges where lines end: in a hub box they sit in the bays (done above); elsewhere a tidy stack above the stop
  if (opts.badges !== false) for (const o of stations){
    const n = N.get(o.k); if (n.kind === 'strip') continue;
    const p = P.get(o.k), Ls = n.items.filter(it => it.badge).map(it => it.L);
    if (!Ls.length) continue;
    const bh = 14, gap = 2, cols = Ls.length > 3 ? 2 : 1, cw = Math.max(...Ls.map(L => L.code.length * 6.6 + 10));
    Ls.forEach((L, i) => {
      const w = L.code.length * 6.6 + 10, c = i % cols, row = Math.floor(i / cols);
      const x = p.x - (cols * cw + (cols - 1) * gap) / 2 + c * (cw + gap) + cw / 2, y = p.y - o.hy - 5 - (row + 1) * (bh + gap) + bh / 2;
      badge(L, x, y);
    });
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
    const fs = 12;
    const hitSeg = bx => segs.some(([u, v]) => segBox(u, v, bx));
    const hitBox = bx => boxes.some(o => bx.x < o.x + o.w + 2 && bx.x + bx.w + 2 > o.x && bx.y < o.y + o.h + 2 && bx.y + bx.h + 2 > o.y);
    for (const o of stations.slice().sort((a, b) => b.lines.size - a.lines.size)){
      if (!o.name || o.named) continue;
      const n = N.get(o.k);
      const p = o.cx != null ? {x:o.cx, y:o.cy} : P.get(o.k), txt = o.name.length > 28 ? o.name.slice(0, 27) + '…' : o.name;
      const w = txt.length * fs * 0.56, h = fs * 1.2, gx = o.hx + 5, gy = o.hy + 5;
      const ring = (gx, gy) => [[gx, -h/2, 'start'], [-gx - w, -h/2, 'end'], [-w/2, gy, 'middle'], [-w/2, -gy - h, 'middle'], [gx*0.7, gy*0.7, 'start'], [gx*0.7, -gy*0.7 - h, 'start'], [-gx*0.7 - w, gy*0.7, 'end'], [-gx*0.7 - w, -gy*0.7 - h, 'end']];
      const cands = ring(gx, gy).concat(ring(gx + 16, gy + 16)); // close by first, a little further out if it is cramped
      let pick = null;
      for (const [dx, dy, an] of cands){ const bx = {x:p.x + dx, y:p.y + dy, w, h}; if (!hitBox(bx) && !hitSeg(bx)){ pick = [bx, an]; break; } }
      if (!pick) for (const [dx, dy, an] of cands){ const bx = {x:p.x + dx, y:p.y + dy, w, h}; if (!hitBox(bx)){ pick = [bx, an]; break; } }
      // every stop is named: when it is cramped, take the spot with the least in the way
      if (!pick){
        const bad = bx => boxes.filter(o => bx.x < o.x + o.w && bx.x + bx.w > o.x && bx.y < o.y + o.h && bx.y + bx.h > o.y).length * 3 + segs.filter(([u, v]) => segBox(u, v, bx)).length;
        let bb = Infinity; for (const [dx, dy, an] of cands){ const bx = {x:p.x + dx, y:p.y + dy, w, h}, b = bad(bx); if (b < bb){ bb = b; pick = [bx, an]; } }
      }
      if (!pick) continue;
      const [bx, an] = pick; boxes.push(bx); grow(bx.x, bx.y, w, h);
      const tx = an === 'start' ? bx.x : an === 'end' ? bx.x + w : bx.x + w/2;
      labels.push(`<text x="${f(tx)}" y="${f(bx.y + h*0.8)}" text-anchor="${an}" font-size="${fs}" font-weight="${o.inter || n.kind === 'strip' ? 700 : 600}" fill="${C.ink}" paint-order="stroke" stroke="${C.bg}" stroke-width="3" stroke-linejoin="round">${esc(txt)}</text>`);
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
      legend.push(`<line x1="${cx}" y1="${cy}" x2="${cx + 26}" y2="${cy}" stroke="${L.color}" stroke-width="${f(L.w)}" stroke-linecap="round"${L.planned ? ` stroke-dasharray="${f(L.w*1.6)} ${f(L.w*1.1)}"` : ''}/><rect x="${cx + 34}" y="${cy - 7}" width="${f(bw)}" height="14" rx="3.5" fill="${L.color}"/><text x="${f(cx + 34 + bw/2)}" y="${cy + 3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="${inkOn(L.color)}">${esc(L.code)}</text><text x="${f(cx + 42 + bw)}" y="${cy + 4}" font-size="12" font-weight="600" fill="${C.ink}">${esc(nm)}</text>`);
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
