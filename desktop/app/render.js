'use strict';
/* Drawing the map canvas: lines, stations, labels, legend; paint, resize, zoom.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- rendering ---------- */
function poly(g, pts){ g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); }
function drawStyled(g, pts, mode, color, u){
  const w = MODES[mode].w * u;
  g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
  if (mode === 'ferry'){
    g.strokeStyle = color; g.lineWidth = w*1.15; g.setLineDash([0.01, w*2]); g.lineCap = 'round';
    poly(g, pts); g.stroke(); g.setLineDash([]); return;
  }
  if (mode === 'bus'){
    g.strokeStyle = color; g.lineWidth = w; g.setLineDash([w*2.2, w*1.3]); g.lineCap = 'butt';
    poly(g, pts); g.stroke(); g.setLineDash([]); g.lineCap = 'round'; return;
  }
  g.strokeStyle = color; g.lineWidth = w; poly(g, pts); g.stroke();
  if (mode === 'tram'){ g.strokeStyle = '#fff'; g.lineWidth = w*0.28; poly(g, pts); g.stroke(); }
  if (mode === 'train'){ g.strokeStyle = '#fff'; g.lineWidth = w*0.42; g.setLineDash([w*1.7, w*1.7]); g.lineCap = 'butt'; poly(g, pts); g.stroke(); g.setLineDash([]); g.lineCap = 'round'; }
}
function drawHalo(g, pts, mode, u){
  g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = MODES[mode].w*u + 3.4*u; poly(g, pts); g.stroke();
}
function chevron(g, x, y, dx, dy, s, color, u){
  const nx = -dy, ny = dx;
  g.beginPath();
  g.moveTo(x + dx*s*0.9, y + dy*s*0.9);
  g.lineTo(x - dx*s*0.6 + nx*s*0.75, y - dy*s*0.6 + ny*s*0.75);
  g.lineTo(x - dx*s*0.25, y - dy*s*0.25);
  g.lineTo(x - dx*s*0.6 - nx*s*0.75, y - dy*s*0.6 - ny*s*0.75);
  g.closePath();
  g.setLineDash([]); g.lineJoin = 'round';
  g.lineWidth = 1.8*u; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = color; g.fill();
}
function drawArrows(g, pts, mode, color, u){
  const w = MODES[mode].w*u, s = Math.max(w*1.15, 7*u), step = 70*u;
  let segs = [], total = 0;
  for (let i = 0; i < pts.length - 1; i++){ const L = Math.hypot(pts[i+1].x-pts[i].x, pts[i+1].y-pts[i].y); segs.push(L); total += L; }
  if (!total) return;
  const count = Math.max(1, Math.floor(total / step));
  const gapLen = total / count;
  let target = gapLen / 2, acc = 0;
  for (let i = 0; i < segs.length && target < total; i++){
    const a = pts[i], b = pts[i+1], L = segs[i];
    while (L && target < acc + L){
      const t = (target - acc) / L, dx = (b.x-a.x)/L, dy = (b.y-a.y)/L;
      chevron(g, a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t, dx, dy, s, color, u);
      target += gapLen;
    }
    acc += L;
  }
}
function stationGeom(id, G, u){
  const pts = [], lines = []; let maxW = 0;
  VL().forEach(l => { const vs = G.verts.get(l.id); l.branches.forEach((b, bi) => b.path.forEach((p, i) => {
    if (p === id){ pts.push(vs[bi][i]); maxW = Math.max(maxW, MODES[l.mode].w*u); if (!lines.includes(l)) lines.push(l); }
  })); });
  if (!pts.length){
    const st0 = S.stations[id];
    if (!st0 || !st0.solo || !stopVisible(st0)) return null;
    const n = S.nodes[id]; if (!n) return null;
    pts.push({x:n.x, y:n.y}); maxW = MODES.bus.w*u;
  }
  let A = pts[0], B = pts[0], best = -1;
  for (let i = 0; i < pts.length; i++) for (let j = i; j < pts.length; j++){
    const d = Math.hypot(pts[i].x-pts[j].x, pts[i].y-pts[j].y); if (d > best){ best = d; A = pts[i]; B = pts[j]; }
  }
  // A game stop only lists the lines that actually stop there, not ones that just drive past.
  const st = S.stations[id];
  let served = lines;
  if (st && st.game && st.sg != null && S.game){
    served = lines.filter(l => { if (!l.gameId) return true; const gl = S.game.lines.find(x => x.id === l.gameId); return !gl || gl.stops.some(x => String(x) === String(st.sg)); });
  }
  const inter = served.length > 1;
  return {A, B, lines:served, inter, r: maxW/2 + (inter ? 5.2 : 2.6)*u, ring: (inter ? 3.6 : 1.6)*u};
}
function inkOn(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  return (0.299*r + 0.587*g + 0.114*b) > 165 ? STATION_INK : '#fff';
}
function labelBlock(g, st, sg, u, side, withBadges){
  const {A, B, r} = sg;
  const name = st.name || '';
  const badges = (withBadges && sg.inter && st.badges !== false && S.settings.badges !== false) ? sg.lines : [];
  if (!name && !badges.length) return null;
  const fs = 15*u, pad = 6*u, bfs = 11.5*u, bh = 17*u, bpx = 5*u, bgap = 4*u, vgap = 4*u;
  g.font = `800 ${fs}px ${FONT}`; const nameW = name ? g.measureText(name).width : 0;
  g.font = `800 ${bfs}px ${FONT}`;
  const bws = badges.map(l => g.measureText(l.name).width + bpx*2);
  // Wrap badges into rows no wider than the name (or a sensible minimum).
  const maxRow = Math.max(nameW, 200*u), rows = [];
  bws.forEach((w, i) => { const row = rows[rows.length - 1]; if (row && row.w + bgap + w <= maxRow){ row.items.push(i); row.w += bgap + w; } else rows.push({items:[i], w}); });
  const rowsW = rows.reduce((m, rw) => Math.max(m, rw.w), 0);
  const blockW = Math.max(nameW, rowsW);
  const badgeH = rows.length ? rows.length*bh + (rows.length - 1)*bgap : 0;
  const blockH = (name ? fs : 0) + (name && rows.length ? vgap : 0) + badgeH;
  const minX = Math.min(A.x, B.x) - r, maxX = Math.max(A.x, B.x) + r, minY = Math.min(A.y, B.y) - r, maxY = Math.max(A.y, B.y) + r;
  const cx = (minX + maxX)/2, cy = (minY + maxY)/2;
  let left, top, align;
  if (side === 'w'){ left = minX - pad - blockW; top = cy - blockH/2; align = 'right'; }
  else if (side === 'n'){ left = cx - blockW/2; top = minY - pad - blockH; align = 'center'; }
  else if (side === 's'){ left = cx - blockW/2; top = maxY + pad; align = 'center'; }
  else if (side === 'ne'){ left = maxX + pad*0.5; top = minY - pad*0.5 - blockH; align = 'left'; }
  else if (side === 'sw'){ left = minX - pad*0.5 - blockW; top = maxY + pad*0.5; align = 'right'; }
  else if (side === 'se'){ left = maxX + pad*0.5; top = maxY + pad*0.5; align = 'left'; }
  else if (side === 'nw'){ left = minX - pad*0.5 - blockW; top = minY - pad*0.5 - blockH; align = 'right'; }
  else { left = maxX + pad; top = cy - blockH/2; align = 'left'; }
  const draw = () => {
    const ax = align === 'left' ? left : align === 'right' ? left + blockW : left + blockW/2;
    let y = top;
    if (name){
      g.font = `800 ${fs}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4.5*u; g.strokeText(name, ax, y + fs/2 + 0.5*u);
      g.fillStyle = STATION_INK; g.fillText(name, ax, y + fs/2 + 0.5*u);
      y += fs + vgap;
    }
    g.font = `800 ${bfs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    rows.forEach(rw => {
      let bx = align === 'left' ? left : align === 'right' ? left + blockW - rw.w : left + (blockW - rw.w)/2;
      rw.items.forEach(i => {
        const l = badges[i], w = bws[i];
        g.beginPath(); if (g.roundRect) g.roundRect(bx, y, w, bh, 4*u); else g.rect(bx, y, w, bh);
        g.fillStyle = l.color; g.fill(); g.lineWidth = 1.6*u; g.strokeStyle = '#fff'; g.stroke();
        g.fillStyle = inkOn(l.color); g.fillText(l.name, bx + w/2, y + bh/2 + 0.8*u);
        bx += w + bgap;
      });
      y += bh + bgap;
    });
  };
  return {x0:left, y0:top, x1:left + blockW, y1:top + blockH, draw};
}
/* A station building (bus or tram station, railway station) gets a plate behind its marker: a rounded
   square in the station ink, so it reads as a building where a plain stop reads as a dot on the road. */
function drawBuildingPlate(g, A, B, r, u){
  const pad = 5.5*u, x0 = Math.min(A.x, B.x) - r - pad, y0 = Math.min(A.y, B.y) - r - pad;
  const w = Math.abs(B.x - A.x) + 2*r + 2*pad, h = Math.abs(B.y - A.y) + 2*r + 2*pad, rr = 4.5*u;
  g.beginPath(); g.roundRect(x0, y0, w, h, rr); g.fillStyle = STATION_INK; g.fill();
  g.lineWidth = 2*u; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
  g.beginPath(); g.roundRect(x0 + 3*u, y0 + 3*u, w - 6*u, h - 6*u, rr - 2*u); g.lineWidth = 1.2*u; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
}
function drawStations(g, G, u){
  const items = [];
  for (const [k, st] of Object.entries(S.stations)){
    const sg = stationGeom(+k, G, u); if (!sg) continue;
    const {A, B, r, ring} = sg;
    const B2 = (A.x === B.x && A.y === B.y) ? {x:B.x + 0.01, y:B.y} : B;
    g.setLineDash([]); g.lineCap = 'round';
    if (st.building) drawBuildingPlate(g, A, B2, r, u);
    if (sg.inter){ g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2*r + 3*u; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B2.x, B2.y); g.stroke(); }
    g.strokeStyle = STATION_INK; g.lineWidth = 2*r; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B2.x, B2.y); g.stroke();
    g.strokeStyle = (S.game && S.game.xf && !st.game) ? COV.accent : '#fff'; g.lineWidth = 2*r - 2*ring; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B2.x, B2.y); g.stroke();
    items.push({st, sg});
  }
  // Place labels without overlaps: fixed sides first, then busiest stations; automatic labels try 8 positions.
  const boxes = items.map(({sg}) => ({x0:Math.min(sg.A.x, sg.B.x) - sg.r, y0:Math.min(sg.A.y, sg.B.y) - sg.r, x1:Math.max(sg.A.x, sg.B.x) + sg.r, y1:Math.max(sg.A.y, sg.B.y) + sg.r}));
  const gap = 2*u;
  const hits = bx => boxes.some(o => bx.x0 < o.x1 + gap && bx.x1 > o.x0 - gap && bx.y0 < o.y1 + gap && bx.y1 > o.y0 - gap);
  const auto = st => !st.side || st.side === 'auto';
  items.sort((a, b) => (auto(a.st) - auto(b.st)) || (b.sg.lines.length - a.sg.lines.length));
  for (const {st, sg} of items){
    if (st.side === 'none') continue;
    if (!auto(st)){ const bl = labelBlock(g, st, sg, u, st.side, true); if (bl){ bl.draw(); boxes.push(bl); } continue; }
    let placed = null;
    for (const withBadges of [true, false]){
      for (const side of ['e', 'w', 'n', 's', 'ne', 'se', 'nw', 'sw']){
        const bl = labelBlock(g, st, sg, u, side, withBadges);
        if (!bl){ placed = 'empty'; break; }
        if (!hits(bl)){ placed = bl; break; }
      }
      if (placed) break;
    }
    if (placed && placed !== 'empty'){ placed.draw(); boxes.push(placed); }
  }
}
function eachBranch(G, fn){ VL().forEach(l => (G.verts.get(l.id) || []).forEach((pts, bi) => fn(l, l.branches[bi], pts))); }
function drawNetwork(g, G, u, screen){
  const z = view.z;
  if (screen && sel.line != null){
    const l = lineById(sel.line);
    if (l && G.verts.get(l.id)){
      g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
      G.verts.get(l.id).forEach((pts, bi) => {
        if (pts.length < 2) return;
        const strong = sel.seg == null;
        g.strokeStyle = strong ? 'rgba(242,169,0,0.7)' : 'rgba(242,169,0,0.28)';
        g.lineWidth = MODES[l.mode].w*u + (strong ? 12 : 8)/z; poly(g, pts); g.stroke();
      });
      const r = selRun();
      if (r){
        g.strokeStyle = 'rgba(242,169,0,0.6)'; g.lineWidth = MODES[l.mode].w*u + 12/z;
        poly(g, r.chain.map(n => S.nodes[n])); g.stroke();
      }
    }
  }
  if (screen){
    const segGlow = (h, color) => {
      if (!h || h.seg == null) return;
      const l = lineById(h.line); if (!l) return;
      const bi = l.branches.indexOf(h.branch); if (bi < 0) return;
      const vv = G.verts.get(l.id); if (!vv) return; const pts = vv[bi]; if (!pts || !pts[h.seg + 1]) return;
      g.setLineDash([]); g.lineCap = 'round'; g.strokeStyle = color;
      g.lineWidth = MODES[l.mode].w*u + 16/z; poly(g, [pts[h.seg], pts[h.seg + 1]]); g.stroke();
    };
    if (tool === 'cut') segGlow(hoverSeg, 'rgba(214,40,46,0.55)');
    else if (sel.seg != null) segGlow(sel, 'rgba(242,169,0,0.95)');
  }
  eachBranch(G, (l, b, pts) => { if (pts.length > 1) drawHalo(g, pts, l.mode, u); });
  eachBranch(G, (l, b, pts) => {
    if (pts.length > 1) drawStyled(g, pts, l.mode, l.color, u);
    else if (pts.length === 1){ g.fillStyle = l.color; g.beginPath(); g.arc(pts[0].x, pts[0].y, MODES[l.mode].w*u*0.75, 0, Math.PI*2); g.fill(); }
  });
  eachBranch(G, (l, b, pts) => {
    const p = b.path, ow = l.oneway;
    const dirAt = i => ow[p[i] + '>' + p[i+1]] ? 1 : (ow[p[i+1] + '>' + p[i]] ? -1 : 0);
    let i = 0;
    while (i < p.length - 1){
      const d = dirAt(i); let j = i;
      while (j < p.length - 1 && dirAt(j) === d) j++;
      if (d){ let sub = pts.slice(i, j + 1); if (d < 0) sub = sub.reverse(); drawArrows(g, sub, l.mode, l.color, u); }
      i = j;
    }
  });
  drawStations(g, G, u);
}
function drawLegend(g){
  const u = U();
  const ls = VL().filter(l => l.branches.some(b => b.path.length > 1)).sort((a, b) => ORDER.indexOf(a.mode) - ORDER.indexOf(b.mode));
  if (!ls.length) return;
  const fs = 15*u, fs2 = 12*u, row = 28*u, pad = 14*u, sw = 50*u, gapx = 12*u;
  let tw = 0;
  ls.forEach(l => { g.font = `800 ${fs}px ${FONT}`; const a = g.measureText(l.name).width; g.font = `600 ${fs2}px ${FONT}`; const b = g.measureText(MODES[l.mode].label.toUpperCase()).width; tw = Math.max(tw, a + 8*u + b); });
  const w = pad*2 + sw + gapx + tw, h = pad*2 + row*ls.length - (row - 20*u);
  const x = pad*1.4, y = bg.h - h - pad*1.4;
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = STATION_INK; g.lineWidth = 1.4*u;
  g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 8*u); else g.rect(x, y, w, h); g.fill(); g.stroke();
  ls.forEach((l, i) => {
    const cy = y + pad + 10*u + row*i;
    drawStyled(g, [{x:x+pad, y:cy}, {x:x+pad+sw, y:cy}], l.mode, l.color, u);
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `800 ${fs}px ${FONT}`; g.fillStyle = STATION_INK; g.fillText(l.name, x+pad+sw+gapx, cy + 1*u);
    const nw = g.measureText(l.name).width;
    g.font = `600 ${fs2}px ${FONT}`; g.fillStyle = '#5D646D'; g.fillText(T(MODES[l.mode].label).toLocaleUpperCase(LOCALE()), x+pad+sw+gapx+nw+8*u, cy + 1.5*u);
  });
}
function renderScene(g, screen){
  const u = U();
  if (bg.img){
    g.save(); if (S.settings.gray) g.filter = 'grayscale(1)';
    const live = screen && bg.kind === 'game' && S.game && gameMapCache.game === S.game && gameMapCache.base && S.game.xf && S.settings.vectorMap !== false;
    if (live){ // the game map drawn at this zoom: terrain from the base bitmap, roads and buildings as vectors
      g.drawImage(gameMapCache.base, 0, 0, bg.w, bg.h);
      const z = view.z, clip = sceneClip || {x0:(-view.x)/z, y0:(-view.y)/z, x1:(cw - view.x)/z, y1:(ch - view.y)/z};
      g.save(); g.beginPath(); g.rect(0, 0, bg.w, bg.h); g.clip(); drawMapContent(g, pxPerM(), z, clip); g.restore();
    } else g.drawImage(bg.img, 0, 0, bg.w, bg.h);
    g.restore();
  }
  if (S.settings.fade > 0){ g.fillStyle = `rgba(255,255,255,${S.settings.fade})`; g.fillRect(0, 0, bg.w, bg.h); }
  const showCov = activeTab === 'coverage';
  if (showCov){ drawRadii(g, u); drawCoverage(g, u); }
  if (activeTab === 'cargo'){ drawCargoRadii(g, u); if (S.game && S.game.xf && S.game.industries && S.settings.cargoHeat !== false && (S.settings.cargoView || 'problems') !== 'off') drawCargoGapHeat(g); drawCargo(g, u); }
  if (screen && (showCov || activeTab === 'cargo') && S.game && S.game.xf) drawSelBuilding(g, u);
  const G = computeGeometry();
  drawNetwork(g, G, u, screen);
  if (screen && sel.line != null && S.game && S.settings.vehiclePath !== false){ const l = lineById(sel.line); if (l && l.gameId) drawVehiclePath(g, l, u, view.z); }
  if (showCov && S.game && S.game.xf && S.settings.coverage !== 'off' && S.settings.gapSpots !== false) drawGapSpots(g, u);
  if (activeTab === 'cargo' && S.game && S.game.xf && S.game.industries && (S.settings.cargoView || 'problems') !== 'off' && S.settings.cargoSpots !== false) drawCargoGapSpots(g, u);
  return G;
}

const cvs = $('#map'), ctx = cvs.getContext('2d'), stage = $('#stage');
let dpr = 1, cw = 0, ch = 0, raf = 0;
function draw(){ if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
/* The scene (map, lines, stations, labels, overlays) is drawn once into an offscreen layer a bit larger than the
   view and reused until something it depends on changes: the model (a signature of lines, nodes, stops and
   settings, plus ui() and commit() marking it stale), the zoom, the selection, the tab. Mouse moves and pans
   then only blit the layer; a pan beyond the layer's margin draws it again around the new position. */
let sceneLayer = {c:null, key:null, vx:0, vy:0, mx:0, my:0, bg:null, stale:true}, sceneClip = null; // the image rect the layer covers, for culling
function invalidateScene(){ sceneLayer.stale = true; }
function sceneSig(){
  let nx = 0, ny = 0, nn = 0;
  for (const k in S.nodes){ const n = S.nodes[k]; nx += n.x; ny += n.y; nn++; }
  const ls = S.lines.map(l => [l.id, l.name, l.mode, l.color, l.hidden ? 1 : 0, l.cargo ? 1 : 0, l.branches.map(b => b.path.join(',')).join(';'), Object.keys(l.oneway || {}).join(',')].join('\u0001')).join('\u0002');
  const ss = Object.entries(S.stations).map(([k, st]) => [k, st.name, st.side, st.badges, st.radius, st.solo ? 1 : 0, st.cargo ? 1 : 0].join('\u0001')).join('\u0002');
  const g = S.game ? [S.game.at, S.game.focus, S.game.rot, S.game.xf && S.game.xf.kind, !!(gameMapCache && gameMapCache.base)].join(',') : '';
  return [nn, nx.toFixed(2), ny.toFixed(2), ls, ss, g, JSON.stringify(S.settings), activeTab, tool === 'cut' ? JSON.stringify(hoverSeg) : '', sel.line, sel.seg, sel.branch && sel.line != null ? (lineById(sel.line) || {branches:[]}).branches.indexOf(sel.branch) : -1, activeLine, typeof sel_ind !== 'undefined' ? sel_ind : '', typeof sel_bld !== 'undefined' ? sel_bld : '', LANG, S.example ? 1 : 0, bg.w, bg.h, bg.kind].join('\u0003');
}
function paint(){
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#ccc';
  ctx.fillRect(0, 0, cw, ch);
  const L = sceneLayer, mx = Math.ceil(cw*0.3), my = Math.ceil(ch*0.3); // margin: pans this far reuse the layer
  const key = sceneSig() + '\u0004' + view.z + ',' + cw + 'x' + ch + ',' + dpr;
  if (!L.c || L.stale || L.key !== key || L.bg !== bg.img || Math.abs(view.x - L.vx) > L.mx || Math.abs(view.y - L.vy) > L.my){
    const W = Math.max(1, Math.round((cw + 2*mx)*dpr)), H = Math.max(1, Math.round((ch + 2*my)*dpr));
    if (!L.c){ L.c = document.createElement('canvas'); }
    if (L.c.width !== W || L.c.height !== H){ L.c.width = W; L.c.height = H; }
    const g = L.c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(dpr*view.z, 0, 0, dpr*view.z, dpr*(view.x + mx), dpr*(view.y + my));
    g.save(); g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 18*dpr; g.fillStyle = '#fff'; g.fillRect(0, 0, bg.w, bg.h); g.restore();
    sceneClip = {x0:(-view.x - mx)/view.z, y0:(-view.y - my)/view.z, x1:(cw + mx - view.x)/view.z, y1:(ch + my - view.y)/view.z};
    try { renderScene(g, true); } finally { sceneClip = null; }
    Object.assign(L, {key, vx:view.x, vy:view.y, mx, my, bg:bg.img, stale:false});
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(L.c, Math.round((view.x - L.vx - L.mx)*dpr), Math.round((view.y - L.vy - L.my)*dpr));
  ctx.setTransform(dpr*view.z, 0, 0, dpr*view.z, dpr*view.x, dpr*view.y);
  const z = view.z, u = U();

  if ((tool === 'edit' || tool === 'inspect') && (activeTab === 'lines' || activeTab === 'coverage')){
    const show = new Set();
    const sl = sel.line != null ? lineById(sel.line) : null;
    if (sl) sl.branches.forEach(b => b.path.forEach(x => show.add(x)));
    VL().forEach(l => { if (!l.gameId) l.branches.forEach(b => b.path.forEach(x => show.add(x))); });
    for (const k in S.stations) if (!S.stations[k].game && stopVisible(S.stations[k])) show.add(+k);
    for (const [k, n] of Object.entries(S.nodes)){
      const isSel = +k === sel.node;
      if (!isSel && !show.has(+k)) continue;
      ctx.beginPath(); ctx.arc(n.x, n.y, (isSel ? 7 : 5)/z, 0, Math.PI*2);
      ctx.fillStyle = isSel ? COV.accent : '#fff'; ctx.fill();
      ctx.lineWidth = 2/z; ctx.strokeStyle = STATION_INK; ctx.stroke();
    }
  } else if (sel.node != null && S.nodes[sel.node]){
    const n = S.nodes[sel.node]; ctx.beginPath(); ctx.arc(n.x, n.y, 14/z + MODES.subway.w*u/2, 0, Math.PI*2);
    ctx.lineWidth = 3/z; ctx.strokeStyle = '#F2A900'; ctx.setLineDash([]); ctx.stroke();
  }

  if (hover && tool !== 'edit'){
    const l = activeLine != null ? lineById(activeLine) : null;
    if (tool === 'draw' && l && activeBr && activeBr.path.length){
      const last = brEnd(activeBr);
      let chain = [S.nodes[last]];
      const rp = (!hover.noRoad && roadSnapOn(l.mode)) ? roadPreview(S.nodes[last], hover.pt, l.mode) : null;
      if (rp && rp.length) chain = chain.concat(rp);
      else if (hover.kind === 'node' && hover.id !== last) chain = chain.concat(followPath(last, hover.id, l.id).map(n => S.nodes[n]));
      chain.push(hover.pt);
      ctx.save(); ctx.globalAlpha = 0.75; ctx.strokeStyle = l.color; ctx.lineWidth = Math.max(MODES[l.mode].w*u*0.7, 2/z);
      ctx.setLineDash([8/z, 6/z]); ctx.lineCap = 'round'; poly(ctx, chain); ctx.stroke(); ctx.restore();
    }
    const p = hover.pt; ctx.setLineDash([]);
    if (hover.kind === 'road'){ ctx.beginPath(); ctx.arc(p.x, p.y, 5/z, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5/z; ctx.strokeStyle = '#F2A900'; ctx.stroke(); }
    if (hover.kind === 'node'){ ctx.beginPath(); ctx.arc(p.x, p.y, 7/z, 0, Math.PI*2); ctx.fillStyle = '#F2A900'; ctx.fill(); ctx.lineWidth = 2/z; ctx.strokeStyle = STATION_INK; ctx.stroke(); }
    else if (hover.kind === 'edge'){ ctx.beginPath(); ctx.arc(p.x, p.y, 7/z, 0, Math.PI*2); ctx.lineWidth = 3/z; ctx.strokeStyle = '#F2A900'; ctx.stroke(); ctx.lineWidth = 1.2/z; ctx.strokeStyle = STATION_INK; ctx.stroke(); }
    else if (tool === 'draw'){ ctx.lineWidth = 1.5/z; ctx.strokeStyle = STATION_INK; ctx.beginPath(); ctx.moveTo(p.x-6/z, p.y); ctx.lineTo(p.x+6/z, p.y); ctx.moveTo(p.x, p.y-6/z); ctx.lineTo(p.x, p.y+6/z); ctx.stroke(); }
  }
  $('#zLevel').value = Math.round(view.z*100) + '%';
}
function resize(){
  const r = stage.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; cw = r.width; ch = r.height;
  cvs.width = Math.max(1, Math.round(cw*dpr)); cvs.height = Math.max(1, Math.round(ch*dpr));
  cvs.style.width = cw + 'px'; cvs.style.height = ch + 'px'; paint();
}
function fit(){
  if (!cw || !ch) return;
  const z = Math.min(cw / bg.w, ch / bg.h) * 0.92;
  view.z = z; view.x = (cw - bg.w*z)/2; view.y = (ch - bg.h*z)/2; draw();
}
function zoomAt(sx, sy, f){
  const nz = Math.min(30, Math.max(0.03, view.z * f)); const k = nz / view.z;
  view.x = sx - (sx - view.x)*k; view.y = sy - (sy - view.y)*k; view.z = nz; draw();
}

