'use strict';
/* Building card: click a home, shop or workplace in Coverage or Cargo and see where its traffic comes from.
   The data is a snapshot the mod takes when you export (mod revision 7+): every person's home, shop and work
   building with the move mode used, everyone on a line right then with the stops they ride between, and every
   cargo item with its source, target and lines. See export.lua ("P", "Q" and "F" rows).
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
let sel_bld = null;
const BLD_ROLES = {1:'Tenants', 2:'Shoppers', 3:'Workers'};
const bldKind = b => b[4] === 0 ? 'Home' : b[4] === 1 ? 'Shop' : 'Town industry';
/* Does the export carry who-travels-from-where data at all? (mod 7+; the console command leaves it out) */
function hasFlowData(){ const G = S.game; return !!(G && (Object.keys(G.people || {}).length || (G.flows || []).length)); }
/* The building under the pointer (image coordinates), among the ones that are shown on the map in this tab. */
function hitBuilding(p){
  if (!S.game || !S.game.xf || (activeTab !== 'coverage' && activeTab !== 'cargo')) return null;
  const k = pxPerM(), u = U(), slack = 7/view.z, types = covTypes();
  let best = null, bd = Infinity;
  for (const b of S.game.buildings){
    if (!inFocus(b)) continue;
    if (activeTab === 'coverage'){ if (!types[b[4]]) continue; } else if (!(S.game.bstock && S.game.bstock[b[0]])) continue;
    const q = W2I(b[1], b[2]), d = Math.hypot(q.x - p.x, q.y - p.y);
    const r = (activeTab === 'coverage' ? Math.max(2.2*u, k * (5 + Math.sqrt(Math.max(1, b[3])) * 2)) * 1.15 : Math.max(2*u, k*9)) + slack;
    if (d < r && d < bd){ bd = d; best = b[0]; }
  }
  return best;
}
const bldById = id => id == null ? null : S.game.buildings.find(b => b[0] === id) || null;
function drawSelBuilding(g, u){
  const b = bldById(sel_bld); if (!b || !S.game.xf) return;
  const p = W2I(b[1], b[2]), k = pxPerM();
  const r = Math.max(2.2*u, k * (5 + Math.sqrt(Math.max(1, b[3])) * 2)) * 1.6 + 3*u;
  g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI*2);
  g.lineWidth = 3*u; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
  g.lineWidth = 1.8*u; g.strokeStyle = COV.accent; g.stroke();
}
/* Stop indices in trips and flows: the engine counts from 0; should an index ever equal a line's stop count, the export is 1-based. */
function stopIdxBase(){
  const G = S.game; if (G.stopBase != null) return G.stopBase;
  const len = {}; G.lines.forEach(l => len[l.id] = l.stops.length);
  let base = 0;
  const chk = (line, s) => { if (s != null && s >= 0 && len[line] != null && s >= len[line]) base = 1; };
  for (const id in (G.trips || {})) G.trips[id].forEach(t => { chk(t.line, t.s0); chk(t.line, t.s1); });
  (G.flows || []).forEach(f => f.lines.forEach(x => { chk(x.line, x.s0); chk(x.line, x.s1); }));
  return G.stopBase = base;
}
function stopNameAt(lineId, idx){
  if (idx == null || idx < 0) return null;
  const gl = S.game.lines.find(l => l.id === lineId); if (!gl) return null;
  const sg = gl.stops[idx - stopIdxBase()], gr = sg != null && S.game.groups[sg];
  return gr ? gr.name : null;
}
/* The line as the user sees it: the drawn line's colour and name, else the game's. */
function lineLook(lineId){
  const l = S.lines.find(x => x.gameId === lineId); if (l) return {name:l.name, color:l.color};
  const gl = S.game.lines.find(x => x.id === lineId); return gl ? {name:gl.name, color:gl.color} : {name:T('Line {n}', {n:lineId}), color:'#888888'};
}
/* What to call a source or target entity of a cargo item: an industry, a town building, a stop, or unknown. */
function entityLabel(id){
  if (id == null || id < 0) return T('somewhere unknown');
  const ind = (S.game.industries || []).find(i => i.id === id); if (ind) return industryLabel(ind, stockStatus(ind));
  const b = bldById(id); if (b) return T(bldKind(b)) + (S.game.towns[b[5]] ? ' · ' + S.game.towns[b[5]] : '');
  const gr = S.game.groups[id]; if (gr) return gr.name;
  return T('somewhere unknown');
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
/* Rows "Goods on their way here" for a town building or an industry: one per cargo type and source, with the
   lines the items ride and where they are right now. Required inputs with nothing on the way get a row too. */
function goodsRows(box, id, st){
  box.textContent = '';
  const flows = (S.game.flows || []).filter(f => f.tgt === id), groups = new Map();
  for (const f of flows){
    const key = f.cargo + ':' + f.src;
    let gr = groups.get(key); if (!gr){ gr = {cargo:f.cargo, src:f.src, n:0, veh:0, stock:0, other:0, term:new Map(), lines:[]}; groups.set(key, gr); }
    gr.n += f.veh + f.term + f.stock + f.other; gr.veh += f.veh; gr.stock += f.stock; gr.other += f.other;
    let at = null;
    for (const x of f.lines){ if (!gr.lines.includes(x.line)) gr.lines.push(x.line); if (x.s0 >= 0) at = stopNameAt(x.line, x.s0); }
    if (f.term){ const k = at || T('a station'); gr.term.set(k, (gr.term.get(k) || 0) + f.term); }
  }
  const list = [...groups.values()].sort((a, b) => b.n - a.n);
  const covered = new Set(list.map(g => g.cargo));
  // required inputs nothing is heading for
  if (st) for (const x of st.req) if (!covered.has(x.cargo)) list.push({cargo:x.cargo, src:null, n:0, cf:x.cf});
  const want = c => st ? st.req.concat(st.opt).find(x => x.cargo === c) : null;
  for (const gr of list){
    const row = el('div', 'bld-good');
    const w = want(gr.cargo), ok = w ? w.cf > 0 : null;
    row.append(el('span', 'g', cargoName(gr.cargo)));
    const n = el('span', 'n' + (ok === true ? ' ok' : ok === false ? ' no' : ''), (ok === true ? '✓ ' : ok === false ? '✗ ' : '') + gr.n.toLocaleString(LOCALE())); n.title = ok === true ? T('Delivered') : ok === false ? T('Not delivered yet') : ''; row.append(n);
    row.append(el('span', 'src', gr.src == null ? T('Nothing on its way here') : T('from {name}', {name:entityLabel(gr.src)})));
    if (gr.lines && gr.lines.length){
      const ln = el('span', 'ln');
      for (const L of gr.lines){ const look = lineLook(L), s = el('span', 'lbadge'); const sw = el('i', 'sw'); sw.style.background = look.color; s.append(sw, el('span', null, look.name)); ln.append(s); }
      row.append(ln);
    }
    if (gr.n){
      const parts = [];
      if (gr.veh) parts.push(T('{n} in vehicles', {n:gr.veh}));
      for (const [k, v] of gr.term) parts.push(T('{n} waiting at {stop}', {n:v, stop:k}));
      if (gr.stock) parts.push(T('{n} at the source', {n:gr.stock}));
      if (gr.other) parts.push(T('{n} on the way to a stop', {n:gr.other}));
      row.append(el('span', 'src', parts.join(' · ')));
    }
    box.append(row);
  }
  return list.length;
}
function buildingUI(){
  const G = S.game, b = bldById(sel_bld), panel = $('#bldPanel');
  panel.hidden = !b || !G || !G.xf || (activeTab !== 'coverage' && activeTab !== 'cargo');
  if (panel.hidden) return;
  const town = G.towns[b[5]];
  $('#bldTitle').textContent = T(bldKind(b)) + (town ? ' · ' + town : '');
  $('#bldCap').textContent = b[3] ? T(b[4] === 0 ? '{n} residents' : '{n} jobs', {n:b[3].toLocaleString(LOCALE())}) : '';
  const kind = $('#bldKind'); kind.textContent = ''; const ki = el('i', 'k' + b[4]); kind.append(ki, T(CATS[b[4]] ? CATS[b[4]].label : ''));
  // people by role, with how they travel
  const people = (G.people || {})[b[0]] || {}, box = $('#bldPeople'); box.textContent = '';
  let total = 0, onLine = 0;
  const roles = Object.keys(people).map(Number).sort((x, y) => (x === 1 ? 0 : x === 3 ? 1 : 2) - (y === 1 ? 0 : y === 3 ? 1 : 2));
  for (const r of roles){
    const c = people[r], n = c[0] + c[1] + c[2] + c[3]; if (!n) continue; total += n;
    const row = el('div', 'bld-role');
    row.append(el('span', 'nm', T(BLD_ROLES[r] || 'People')));
    row.append(el('span', 'cnt', (r === 1 && b[4] === 0) || (r === 3 && b[4] !== 0) ? T('{a} of {b}', {a:n.toLocaleString(LOCALE()), b:b[3].toLocaleString(LOCALE())}) : n.toLocaleString(LOCALE())));
    const bar = el('div', 'mbar'); [['w', c[0]], ['c', c[1]], ['l', c[2]], ['o', c[3]]].forEach(([cls, v]) => { if (!v) return; const i = el('i', cls); i.style.width = (v / n * 100) + '%'; bar.append(i); }); row.append(bar);
    const key = el('div', 'mkey');
    [['w', c[0], '{n} walk'], ['c', c[1], '{n} by car'], ['l', c[2], '{n} by line'], ['o', c[3], '{n} other']].forEach(([cls, v, s]) => { if (!v) return; const sp = el('span'); sp.append(el('i', cls), T(s, {n:v.toLocaleString(LOCALE())})); key.append(sp); });
    row.append(key); box.append(row);
  }
  // lines ridden right now, grouped by line, with the stop pairs
  const trips = (G.trips || {})[b[0]] || [], byLine = new Map();
  for (const t of trips){
    onLine += t.n;
    let L = byLine.get(t.line); if (!L){ L = {n:0, pairs:new Map()}; byLine.set(t.line, L); }
    L.n += t.n; const k = t.s0 + '>' + t.s1; L.pairs.set(k, (L.pairs.get(k) || 0) + t.n);
  }
  const lines = $('#bldLines'); lines.textContent = '';
  for (const [id, L] of [...byLine.entries()].sort((x, y) => y[1].n - x[1].n)){
    const look = lineLook(id), row = el('div', 'bld-line'), sw = el('i', 'sw'); sw.style.background = look.color;
    row.append(sw, el('span', 'nm', look.name), el('span', 'n', L.n.toLocaleString(LOCALE())));
    const pairs = [...L.pairs.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => { const [s0, s1] = k.split('>').map(Number); const a = stopNameAt(id, s0), c = stopNameAt(id, s1); return (a || c) ? (a || '?') + ' → ' + (c || '?') + (L.pairs.size > 1 ? ' (' + n + ')' : '') : null; }).filter(Boolean);
    if (pairs.length) row.append(el('span', 'st', pairs.slice(0, 3).join(' · ') + (pairs.length > 3 ? ' …' : '')));
    lines.append(row);
  }
  $('#bldLinesHead').hidden = !byLine.size; lines.hidden = !byLine.size;
  // goods heading for shops and town industry
  const st = G.bstock && G.bstock[b[0]] ? stockStatus(G.bstock[b[0]]) : null;
  const goods = $('#bldGoods'); const ng = (st || (G.flows || []).some(f => f.tgt === b[0])) ? goodsRows(goods, b[0], st) : (goods.textContent = '', 0);
  $('#bldGoodsHead').hidden = !ng; goods.hidden = !ng;
  // the note
  const note = $('#bldNote');
  if (!hasFlowData()) note.textContent = T('Who travels here and where goods come from needs mod revision 7. Restart the game so mod.io updates the mod, or check that you\'re subscribed, then export again.');
  else if (!total && !ng) note.textContent = T('Nobody is linked to this building yet.');
  else if (total) note.textContent = T(onLine === 1 ? '1 of the {t} was on a line when you exported; the others were at home, at work, walking or driving. Export again for a new snapshot.' : '{n} of the {t} were on a line when you exported; the others were at home, at work, walking or driving. Export again for a new snapshot.', {n:onLine.toLocaleString(LOCALE()), t:total.toLocaleString(LOCALE())});
  else note.textContent = T('A snapshot from your last export. Export again for a new one.');
}
$('#bldClose').addEventListener('click', () => { sel_bld = null; ui(); draw(); });
