'use strict';
/* Cargo: industries, business deliveries, cargo stop reach.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- Cargo: industries, business deliveries, cargo stop reach ---------- */
function parseStock(st, ru, pr){
  const stocks = (st || '').split(';').filter(Boolean).map(x => { const f = x.split(':').map(Number); return {type:f[0], cargo:f[1], cap:f[2], cf:f[3] || 0}; });
  const rules = (ru || '').split('~').filter(Boolean).map(x => {
    const [inp = '', out = '', flag = ''] = x.split('>');
    return {alts:inp ? inp.split('+').map(a => a.split('/').map(Number)) : [], out:out ? out.split('/').filter(Boolean).map(o => o.split(':').map(Number)) : [], boost:flag === 'b'};
  });
  const prod = {}; (pr || '').split(';').filter(Boolean).forEach(x => { const [c, v] = x.split(':').map(Number); prod[c] = v; });
  return {stocks, rules, prod};
}
function cargoName(id){
  const n = S.game && S.game.cargoNames && S.game.cargoNames[id];
  if (!n) return 'cargo ' + id;
  const m = String(n).match(/([^\/\\:]+?)(\.cargo)?$/);
  const t = (m ? m[1] : String(n)).replace(/_/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
// What a stock holder needs, what is missing, and what it makes.
function stockStatus(o){
  const inputs = o.stocks.filter(s => s.type === 0), need = new Set(), boost = new Set();
  o.rules.forEach(r => r.alts.forEach(alt => alt.forEach((a, j) => { if (a > 0) (r.boost ? boost : need).add(j); })));
  const req = [...need].map(j => inputs[j]).filter(Boolean);
  const opt = [...boost].filter(j => !need.has(j)).map(j => inputs[j]).filter(Boolean);
  const outputs = o.stocks.filter(s => s.type === 1).map(s => ({cargo:s.cargo, rate:o.prod[s.cargo] || 0}));
  return {req, opt, missing:req.filter(s => s.cf <= 0), optMissing:opt.filter(s => s.cf <= 0), outputs};
}
let cargoCache = null;
function cargoBase(){
  if (cargoCache) return cargoCache;
  const set = new Set();
  for (const k in (S.game.ccatch || {})) S.game.ccatch[k].forEach(id => set.add(id));
  return cargoCache = set;
}
let cargoPlan = {sig:null, set:null};
function cargoPlanStops(){
  if (!S.game || !S.game.xf) return [];
  const out = [];
  for (const k in S.stations){ const st = S.stations[k]; if (st.game || !S.nodes[k] || !isCargoStop(+k)) continue; const w = I2W(S.nodes[k]); out.push({id:+k, x:w.x, y:w.y, r:+st.radius || 160}); }
  return out;
}
// Industries and businesses reached by a cargo stop in the game or by a cargo stop you planned (circle reach).
function cargoReach(){
  if (cargoPlan.t && performance.now() - cargoPlan.t < 40 && cargoPlan.game === S.game) return cargoPlan.set;
  const base = cargoBase(), ps = cargoPlanStops();
  const sig = ps.map(p => p.id + ':' + p.x.toFixed(0) + ':' + p.y.toFixed(0) + ':' + p.r).join('|') + '#' + S.game.at;
  if (cargoPlan.sig === sig && cargoPlan.game === S.game){ cargoPlan.t = performance.now(); return cargoPlan.set; }
  const set = new Set(base);
  if (ps.length){
    for (const ind of (S.game.industries || [])) if (ps.some(p => Math.hypot(ind.x - p.x, ind.y - p.y) <= p.r + 40 + ind.level*5)) set.add(ind.id);
    for (const b of S.game.buildings) if (S.game.bstock && S.game.bstock[b[0]] && ps.some(p => Math.hypot(b[1] - p.x, b[2] - p.y) <= p.r)) set.add(b[0]);
  }
  cargoPlan = {sig, set, t:performance.now(), game:S.game}; return set;
}
function industryLabel(ind, st){
  if (ind.name) return ind.name;
  const outs = st.outputs.map(o => cargoName(o.cargo));
  if (outs.length) return T(st.req.length ? '{goods} factory' : '{goods} producer', {goods:outs.join(' + ')});
  if (st.req.length) return T('{goods} consumer', {goods:st.req.map(s => cargoName(s.cargo)).join(' + ')});
  return T('Industry');
}
function industryState(ind){
  const st = stockStatus(ind), reached = cargoReach().has(ind.id), c = goodSel();
  if (c != null){
    const w = wantOf(st, c), makes = st.outputs.some(o => o.cargo === c);
    if (!w) return {st, reached, level: makes ? 'source' : 'none', makes};
    return {st, reached, level: !reached ? 'unreached' : w.cf > 0 ? 'ok' : 'missing'};
  }
  const level = !reached ? 'unreached' : st.missing.length ? 'missing' : 'ok';
  return {st, reached, level};
}
const IND_COLORS = {ok:'#2E9E5B', missing:'#F2A900', unreached:'#D9532B', source:'#2F6FD6'};
function industriesInView(){
  const fbx = focusBox();
  return (S.game.industries || []).filter(i => inBox(fbx, i.x, i.y));
}
const bizKind = b => b[4] === 2 ? 'tind' : 'com';
function bizShown(kind){ return kind === 'tind' ? S.settings.cargoTind !== false : S.settings.cargoBiz !== false; }
function bizInView(all){
  const fbx = focusBox(), out = [];
  if (!S.game.bstock) return out;
  for (const b of S.game.buildings){ const s = S.game.bstock[b[0]]; if (s && inBox(fbx, b[1], b[2]) && (all || bizShown(bizKind(b)))) out.push([b, s]); }
  return out;
}
// Selected goods filter: 'all' or a cargo id.
function goodSel(){ const v = S.settings.cargoGood; return v == null || v === 'all' ? null : +v; }
// What the holder wants of the selected goods (or all its required goods).
function wantOf(st, c){ return c == null ? null : st.req.concat(st.opt).find(x => x.cargo === c) || null; }
function bizState(b, s){
  const st = stockStatus(s), reached = cargoReach().has(b[0]), c = goodSel(), w = wantOf(st, c);
  const wants = c == null ? st.req.length > 0 : !!w;
  const supplied = c == null ? (st.req.length ? st.missing.length === 0 : true) : !!(w && w.cf > 0);
  return {st, reached, supplied, wants};
}
function drawCargo(g, u){
  if (!S.game || !S.game.xf || !S.game.industries) return;
  const view = S.settings.cargoView || 'problems'; if (view === 'off') return;
  const k = pxPerM(), all = view === 'all';
  {
    for (const [b, s] of bizInView()){
      const bs = bizState(b, s);
      if (!bs.wants || (bs.supplied && !all)) continue;
      const p = W2I(b[1], b[2]), r = Math.max(2*u, k*9);
      g.beginPath();
      if (bizKind(b) === 'tind'){ g.moveTo(p.x, p.y - r); g.lineTo(p.x + r, p.y); g.lineTo(p.x, p.y + r); g.lineTo(p.x - r, p.y); }
      else { g.moveTo(p.x, p.y - r); g.lineTo(p.x + r, p.y + r*0.8); g.lineTo(p.x - r, p.y + r*0.8); }
      g.closePath();
      g.fillStyle = bs.supplied ? IND_COLORS.ok : bs.reached ? IND_COLORS.missing : IND_COLORS.unreached; g.fill();
      g.lineWidth = Math.max(0.6*u, r*0.22); g.strokeStyle = '#fff'; g.stroke();
    }
  }
  if (S.settings.cargoInd !== false){
    const fs = 12*u;
    for (const ind of industriesInView()){
      const s = industryState(ind);
      if (s.level === 'none' || (s.level === 'ok' && !all)) continue;
      const p = W2I(ind.x, ind.y), r = Math.max(7*u, k*(30 + ind.level*5));
      const sel = sel_ind === ind.id;
      g.beginPath(); if (g.roundRect) g.roundRect(p.x - r, p.y - r, 2*r, 2*r, r*0.3); else g.rect(p.x - r, p.y - r, 2*r, 2*r);
      g.fillStyle = IND_COLORS[s.level]; g.fill();
      g.lineWidth = Math.max(1.2*u, r*0.14); g.strokeStyle = sel ? COV.accent : '#fff'; g.stroke();
      // a chimney mark so industries read differently from businesses
      g.fillStyle = '#fff'; g.fillRect(p.x - r*0.45, p.y - r*0.1, r*0.9, r*0.5); g.fillRect(p.x + r*0.15, p.y - r*0.55, r*0.22, r*0.5);
      const label = industryLabel(ind, s.st);
      g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
      g.lineJoin = 'round'; g.lineWidth = 3.5*u; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.strokeText(label, p.x, p.y + r + 3*u);
      g.fillStyle = STATION_INK; g.fillText(label, p.x, p.y + r + 3*u);
    }
  }
}
let sel_ind = null;
function hitIndustry(p){
  if (!S.game || !S.game.industries || !S.game.xf || (S.settings.cargoView || 'problems') === 'off') return null;
  const k = pxPerM(), u = U(); let best = null, bd = Infinity;
  for (const ind of industriesInView()){
    const q = W2I(ind.x, ind.y), r = Math.max(7*u, k*(30 + ind.level*5)) + 6/view.z, d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < r && d < bd){ bd = d; best = ind.id; }
  }
  return best;
}
function cargoUI(){
  const G = S.game, has = !!(G && G.industries && G.industries.length);
  $('#cargoSec').hidden = !has;
  $('#indPanel').hidden = !(has && sel_ind != null);
  if (!has) return;
  setVal($('#cView'), S.settings.cargoView || 'problems');
  $('#cInd').checked = S.settings.cargoInd !== false; $('#cBiz').checked = S.settings.cargoBiz !== false; $('#cTind').checked = S.settings.cargoTind !== false;
  // Goods list: everything any industry or building in the area wants or makes
  const goods = new Set();
  for (const [, s] of bizInView()){ const st = stockStatus(s); st.req.concat(st.opt).forEach(x => goods.add(x.cargo)); }
  if (S.settings.cargoInd !== false) for (const i of industriesInView()){ const st = stockStatus(i); st.req.concat(st.opt).forEach(x => goods.add(x.cargo)); st.outputs.forEach(o => goods.add(o.cargo)); }
  const gs = $('#cGood'), gopts = ['all', ...[...goods].sort((a, b) => cargoName(a).localeCompare(cargoName(b)))];
  if (gs.dataset.sig !== gopts.join(',')){
    gs.textContent = ''; gs.dataset.sig = gopts.join(',');
    gopts.forEach(v => { const o = document.createElement('option'); o.value = String(v); o.textContent = v === 'all' ? T('All goods') : cargoName(v); gs.append(o); });
  }
  const c = goodSel();
  if (c != null && !goods.has(c)){ S.settings.cargoGood = 'all'; }
  setVal(gs, String(goodSel() ?? 'all'));
  $('#cSrcKey').hidden = $('#cSrcTxt').hidden = goodSel() == null;
  const inds = industriesInView().map(i => ({i, s:industryState(i)})).filter(x => x.s.level !== 'none' && x.s.level !== 'source');
  const srcN = goodSel() == null ? 0 : industriesInView().filter(i => industryState(i).level === 'source').length;
  const unreached = inds.filter(x => x.s.level === 'unreached').length, missing = inds.filter(x => x.s.level === 'missing').length;
  const biz = bizInView().map(([b, s]) => bizState(b, s)).filter(x => x.wants);
  const bizNone = biz.filter(x => !x.supplied).length, bizNoStop = biz.filter(x => !x.supplied && !x.reached).length;
  const gname = goodSel() == null ? null : cargoName(goodSel());
  const indTxt = S.settings.cargoInd === false ? '' : (gname == null ? T('{n} industries need inputs: {a} without a cargo stop, {b} not supplied.', {n:inds.length, a:unreached, b:missing}) : T('{n} industries need {good}: {a} without a cargo stop, {b} not supplied.', {n:inds.length, good:gname, a:unreached, b:missing}) + ' ' + T('{n} make it.', {n:srcN})) + ' ';
  $('#cSummary').textContent = indTxt + T(gname == null ? '{n} buildings want goods: {a} not supplied ({b} out of reach of any cargo stop).' : '{n} buildings want {good}: {a} not supplied ({b} out of reach of any cargo stop).', {n:biz.length.toLocaleString(LOCALE()), good:gname, a:bizNone.toLocaleString(LOCALE()), b:bizNoStop.toLocaleString(LOCALE())});
  renderCargoSpots();
  const list = $('#cList'); list.textContent = '';
  (S.settings.cargoInd === false ? [] : inds).filter(x => x.s.level !== 'ok').sort((a, b) => (a.s.level === 'unreached') - (b.s.level === 'unreached') || b.i.level - a.i.level).slice(0, 12).forEach(({i, s}) => {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'ind-row';
    const sw = document.createElement('span'); sw.className = 'ind-sw'; sw.style.background = IND_COLORS[s.level];
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = industryLabel(i, s.st);
    const why = document.createElement('span'); why.className = 'why';
    const parts = [];
    if (s.st.missing.length) parts.push(T('needs {goods}', {goods:s.st.missing.map(x => cargoName(x.cargo)).join(', ')}));
    if (!s.reached) parts.push(T('no cargo stop'));
    why.textContent = parts.join(' · ');
    row.append(sw, nm, why);
    row.addEventListener('click', () => { sel_ind = i.id; const q = W2I(i.x, i.y); fitWorldBox([{x:q.x - 200*pxPerM(), y:q.y - 200*pxPerM()}, {x:q.x + 200*pxPerM(), y:q.y + 200*pxPerM()}]); ui(); draw(); });
    list.append(row);
  });
  $('#cListHead').hidden = !list.children.length;
  // Town goods demand for the selected area (or the biggest towns)
  const dem = $('#cDemand'); dem.textContent = '';
  const towns = G.focus != null ? [G.focus] : Object.keys(G.demand || {}).map(Number).slice(0, 4);
  let any = false;
  for (const t of towns){
    const d = G.demand && G.demand[t]; if (!d) continue;
    const rows = [];
    for (const lu of [1, 2]){ if (!bizShown(lu === 2 ? 'tind' : 'com')) continue; (d[lu] || []).forEach(x => { if (goodSel() == null || x.cargo === goodSel()) rows.push({...x, lu}); }); }
    if (!rows.length) continue;
    any = true;
    const h = document.createElement('div'); h.className = 'dem-town'; h.textContent = G.towns[t] || T('Town {n}', {n:t}); dem.append(h);
    rows.sort((a, b) => b.limit - a.limit).forEach(x => {
      const r = document.createElement('div'); r.className = 'dem-row';
      const pct = x.limit > 0 ? Math.min(100, Math.round(x.supply / x.limit * 100)) : 0;
      r.innerHTML = '<span class="nm"></span><span class="bar"><i></i></span><span class="num"></span>';
      r.querySelector('.nm').textContent = cargoName(x.cargo) + ' ' + T(x.lu === 2 ? '(industrial)' : '(commercial)');
      r.querySelector('i').style.width = pct + '%';
      r.querySelector('.num').textContent = `${Math.round(x.supply)} / ${Math.round(x.limit)}`;
      dem.append(r);
    });
  }
  $('#cDemandHead').hidden = !any;
  // Selected industry
  const ind = sel_ind != null ? (G.industries || []).find(i => i.id === sel_ind) : null;
  if (!ind){ $('#indPanel').hidden = true; return; }
  const s = industryState(ind);
  $('#indTitle').textContent = industryLabel(ind, s.st);
  $('#indMeta').textContent = T('Level {n}', {n:ind.level}) + ' · ' + T(s.reached ? 'reached by a cargo stop' : 'no cargo stop reaches it');
  const io = $('#indIO'); io.textContent = '';
  const line = (txt, ok, note) => { const r = document.createElement('div'); r.className = 'io-row ' + (ok ? 'ok' : 'no'); const m = document.createElement('span'); m.className = 'mk'; m.textContent = ok ? '✓' : '✗'; const t = document.createElement('span'); t.textContent = txt; r.append(m, t); if (note){ const n = document.createElement('span'); n.className = 'note'; n.textContent = note; r.append(n); } io.append(r); };
  if (!s.st.req.length) line(T('Needs no inputs'), true);
  s.st.req.forEach(x => line(T('Needs {good}', {good:cargoName(x.cargo)}), x.cf > 0, x.cf > 0 ? T('rate {n}', {n:x.cf.toFixed(0)}) : T('not delivered')));
  s.st.opt.forEach(x => line(T('{good} (boosts output)', {good:cargoName(x.cargo)}), x.cf > 0, T(x.cf > 0 ? 'delivered' : 'optional')));
  s.st.outputs.forEach(o => line(T('Makes {good}', {good:cargoName(o.cargo)}), o.rate > 0, o.rate > 0 ? T('rate {n}', {n:o.rate.toFixed(0)}) : T('not producing')));
}
