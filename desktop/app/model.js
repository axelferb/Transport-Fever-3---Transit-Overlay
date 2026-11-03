'use strict';
/* Constants, the project state, the line/branch/station model, undo history, geometry and hit testing.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
const FONT = '"Rubik", system-ui, sans-serif';
const MODES = {
  subway:{label:'Subway', w:9},
  train:{label:'Train', w:8},
  tram:{label:'Tram', w:6},
  bus:{label:'Bus', w:4.5},
  ferry:{label:'Ferry', w:4.5},
};
const ORDER = ['subway','train','tram','bus','ferry'];
const PALETTE = ['#D6282E','#1F5FAD','#159447','#F28C00','#7B3FA0','#C2185B','#00838F','#8D6E3F','#455A64','#E65100','#2E7D32','#5B4A9E'];
const STATION_INK = '#2B2419';
/* Map status colours: reached, not reached, reached by a planned stop, and the amber that marks anything planned. */
const COV = {ok:'#2E9E5B', gap:'#D9532B', plan:'#5ED38A', planEdge:'#1C6338', accent:'#F2A900'};
const KEY = 'transit-overlay-v1';
const DEFAULT_SETTINGS = {size:1, fade:0.2, gray:false, legend:true};

// A line is a set of branches; each branch is a polyline of node ids. Branches of one line may share nodes.
let S = {nodes:{}, lines:[], stations:{}, nextId:1, settings:{...DEFAULT_SETTINGS}, example:false, game:null};
let bg = {img:null, src:null, w:1600, h:1000, kind:'example'};
let view = {x:0, y:0, z:1};
let tool = 'draw', newMode = 'subway';
let sel = {line:null, branch:null, node:null};
let activeLine = null, activeBr = null, activeAtStart = false;
let hover = null, hoverSeg = null;
const hist = {u:[], r:[]};
let pendingSnap = null;

/* ---------- model ---------- */
const nid = () => S.nextId++;
const addNode = (x,y) => { const id = nid(); S.nodes[id] = {x,y}; return id; };
const lineById = id => S.lines.find(l => l.id === id);
/* Each tab shows its own lines: Lines = the network (cargo optional), Coverage = passenger lines, Cargo = cargo lines. */
let activeTab = 'lines';
try { activeTab = localStorage.getItem('tfo-tab') || 'lines'; } catch {}
function lineVisible(l){
  if (activeTab === 'coverage') return !l.cargo;
  if (activeTab === 'cargo') return !!l.cargo;
  return !l.cargo || !!S.settings.linesShowCargo;
}
const VL = () => S.lines.filter(lineVisible);
function stopVisible(st){
  if (!st.solo) return true;
  return activeTab === 'cargo' ? !!st.cargo : !st.cargo;
}
const ekey = (a,b) => a < b ? a + '|' + b : b + '|' + a;
const U = () => (bg.kind === 'game' && S.game && S.game.xf) ? Math.hypot(S.game.xf.a[0], S.game.xf.a[1]) * 1.6 * S.settings.size : Math.max(bg.w, bg.h) / 1600 * S.settings.size;
const lineHasNode = (l, n) => l.branches.some(b => b.path.includes(n));
const nodeCount = l => l.branches.reduce((s, b) => s + b.path.length, 0);
function edgeInLine(l, a, b){
  return l.branches.some(br => { for (let i = 0; i < br.path.length - 1; i++){ const x = br.path[i], y = br.path[i+1]; if ((x === a && y === b) || (x === b && y === a)) return true; } return false; });
}
function touchesLine(l, t){
  if (t.kind === 'node') return lineHasNode(l, t.id);
  if (t.kind === 'edge') return edgeInLine(l, t.a, t.b);
  return false;
}
function migrate(l){
  if (!Array.isArray(l.branches)){ l.branches = [{path:l.path || []}]; delete l.path; }
  // One-way is stored per directed segment: "from>to" node ids.
  if (!l.oneway || typeof l.oneway !== 'object') l.oneway = {};
  l.branches.forEach(b => {
    if (b.oneway){ for (let i = 0; i < b.path.length - 1; i++) l.oneway[b.path[i] + '>' + b.path[i+1]] = true; }
    delete b.oneway;
  });
  return l;
}
const brEnd = b => activeAtStart ? b.path[0] : b.path[b.path.length-1];

function snapshot(){ return JSON.stringify({nodes:S.nodes, lines:S.lines, stations:S.stations, nextId:S.nextId}); }
function commit(){ hist.u.push(snapshot()); if (hist.u.length > 200) hist.u.shift(); hist.r = []; pendingSnap = null; }
function liveEdit(){ if (!pendingSnap) pendingSnap = snapshot(); }
function settle(){ if (pendingSnap){ hist.u.push(pendingSnap); hist.r = []; pendingSnap = null; ui(); } }
function restore(s){
  const o = JSON.parse(s);
  S.nodes = o.nodes; S.lines = o.lines.map(migrate); S.stations = o.stations; S.nextId = o.nextId;
  activeLine = null; activeBr = null;
  if (sel.line != null && !lineById(sel.line)) sel.line = null;
  sel.branch = null; sel.seg = null;
  if (sel.node != null && !S.nodes[sel.node]) sel.node = null;
}
// Remove the stretch between path[i] and path[i+1] of one branch; the branch splits in two there.
function cutSegment(lineId, b, i){
  const l = lineById(lineId);
  if (!l || !l.branches.includes(b) || i < 0 || i >= b.path.length - 1) return;
  commit();
  const right = b.path.slice(i + 1);
  b.path = b.path.slice(0, i + 1);
  l.branches.push({path:right});
  if (activeBr === b) activeBr = null;
  sel = {line:l.id, branch:null, seg:null, node:null};
  hoverSeg = null;
  cleanup(); ui(); draw();
  toast(lineById(lineId) ? T('Cut a segment out of {name}. Undo with Ctrl+Z.', {name:l.name}) : T('{name} removed. Undo with Ctrl+Z.', {name:l.name}));
}
function undo(){ if (!hist.u.length) return; hist.r.push(snapshot()); restore(hist.u.pop()); ui(); draw(); }
function redo(){ if (!hist.r.length) return; hist.u.push(snapshot()); restore(hist.r.pop()); ui(); draw(); }

function dedupe(path){ return path.filter((v,i) => i === 0 || v !== path[i-1]); }
const branchAlive = b => b && S.lines.some(l => l.branches.includes(b));
function cleanup(){
  S.lines.forEach(l => {
    l.branches.forEach(b => b.path = dedupe(b.path));
    l.branches = l.branches.filter(b => b.path.length >= 2 || (b === activeBr && b.path.length >= 1));
  });
  S.lines = S.lines.filter(l => l.branches.length);
  S.lines.forEach(l => {
    const es = new Set(); l.branches.forEach(b => { for (let i = 0; i < b.path.length - 1; i++) es.add(ekey(b.path[i], b.path[i+1])); });
    for (const k of Object.keys(l.oneway)){ const [x, y] = k.split('>').map(Number); if (!es.has(ekey(x, y))) delete l.oneway[k]; }
  });
  const used = new Set(); S.lines.forEach(l => l.branches.forEach(b => b.path.forEach(n => used.add(n))));
  for (const k of Object.keys(S.stations)) if (S.stations[k].solo) used.add(+k);
  for (const k of Object.keys(S.nodes)) if (!used.has(+k)) delete S.nodes[k];
  for (const k of Object.keys(S.stations)) if (!used.has(+k)) delete S.stations[k];
  if (sel.line != null && !lineById(sel.line)) sel.line = null;
  if (sel.branch && !branchAlive(sel.branch)) sel.branch = null;
  if (sel.node != null && !S.nodes[sel.node]) sel.node = null;
  if (activeLine != null && !lineById(activeLine)){ activeLine = null; activeBr = null; }
  if (activeBr && !branchAlive(activeBr)) activeBr = null;
}

function splitEdge(a, b, pt){
  const id = addNode(pt.x, pt.y);
  S.lines.forEach(l => {
    for (const [x, y] of [[a, b], [b, a]]) if (l.oneway[x + '>' + y]){ delete l.oneway[x + '>' + y]; l.oneway[x + '>' + id] = true; l.oneway[id + '>' + y] = true; }
    l.branches.forEach(br => {
      const p = br.path;
      for (let i = 0; i < p.length - 1; i++){
        if ((p[i] === a && p[i+1] === b) || (p[i] === b && p[i+1] === a)){ p.splice(i+1, 0, id); i++; }
      }
    });
  });
  return id;
}
/* A stretch is the run of segments around (a,b) up to the line's junctions or ends, ordered a→b. */
function lineAdj(l){
  const m = new Map(), add = (x, y) => { if (!m.has(x)) m.set(x, new Set()); m.get(x).add(y); };
  l.branches.forEach(b => { for (let i = 0; i < b.path.length - 1; i++){ add(b.path[i], b.path[i+1]); add(b.path[i+1], b.path[i]); } });
  return m;
}
function runOf(l, a, b){
  const adj = lineAdj(l), deg = n => adj.has(n) ? adj.get(n).size : 0;
  const fwd = [a, b]; let prev = a, cur = b;
  while (deg(cur) === 2){
    const nx = [...adj.get(cur)].find(x => x !== prev);
    if (nx == null) break;
    if (nx === a){ fwd.push(a); return fwd; }
    if (fwd.includes(nx)) break;
    fwd.push(nx); prev = cur; cur = nx;
  }
  const back = []; prev = b; cur = a;
  while (deg(cur) === 2){
    const nx = [...adj.get(cur)].find(x => x !== prev);
    if (nx == null || back.includes(nx)) break;
    back.push(nx);
    if (fwd.includes(nx)) break;
    prev = cur; cur = nx;
  }
  return [...back.reverse(), ...fwd];
}
function runIsOneway(l, chain){
  for (let i = 0; i < chain.length - 1; i++){ const x = chain[i], y = chain[i+1]; if (!l.oneway[x + '>' + y] && !l.oneway[y + '>' + x]) return false; }
  return true;
}
function setRunOneway(l, chain, on){
  for (let i = 0; i < chain.length - 1; i++){
    const x = chain[i], y = chain[i+1];
    delete l.oneway[x + '>' + y]; delete l.oneway[y + '>' + x];
    if (on) l.oneway[x + '>' + y] = true;
  }
}
function flipRun(l, chain){
  for (let i = 0; i < chain.length - 1; i++){
    const x = chain[i], y = chain[i+1], f = x + '>' + y, r = y + '>' + x;
    const hf = l.oneway[f], hr = l.oneway[r];
    delete l.oneway[f]; delete l.oneway[r];
    if (hf) l.oneway[r] = true;
    if (hr) l.oneway[f] = true;
  }
}
function selRun(){
  const l = sel.line != null ? lineById(sel.line) : null;
  if (!l || !sel.branch || sel.seg == null || !l.branches.includes(sel.branch)) return null;
  const p = sel.branch.path; if (sel.seg >= p.length - 1) return null;
  return {l, chain: runOf(l, p[sel.seg], p[sel.seg + 1])};
}
function resolveTarget(t){
  if (t.kind === 'node') return t.id;
  if (t.kind === 'road') return roadNodeId(t.rn);
  if (t.kind === 'edge') return splitEdge(t.a, t.b, t.pt);
  return addNode(t.pt.x, t.pt.y);
}
// If another line already runs from a to b, follow its stops so the new line rides along it.
function followPath(a, b, selfId){
  let best = null, bestLen = Infinity;
  for (const m of S.lines){
    if (m.id === selfId) continue;
    for (const br of m.branches){
      const ia = br.path.indexOf(a), ib = br.path.indexOf(b);
      if (ia < 0 || ib < 0 || Math.abs(ia - ib) < 2) continue;
      const seg = ia < ib ? br.path.slice(ia+1, ib) : br.path.slice(ib+1, ia).reverse();
      const pts = [a, ...seg, b].map(n => S.nodes[n]);
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
      if (len < bestLen){ bestLen = len; best = seg; }
    }
  }
  return best || [];
}
function addPoint(l, b, id){
  if (!b.path.length){ b.path.push(id); return; }
  const end = brEnd(b);
  if (end === id) return;
  const via = followPath(end, id, l.id);
  if (activeAtStart) b.path.unshift(...[...via, id].reverse());
  else b.path.push(...via, id);
}
// Start drawing on line l at target t: extend a true end of the line, or split off a new branch.
function startBranch(l, t){
  if (t.kind === 'node' && lineHasNode(l, t.id)){
    const id = t.id;
    const holders = l.branches.filter(b => b.path.includes(id));
    if (holders.length === 1){
      const b = holders[0];
      if (b.path[b.path.length-1] === id) return {b, atStart:false};
      if (b.path[0] === id) return {b, atStart:true};
    }
    const nb = {path:[id]}; l.branches.push(nb); return {b:nb, atStart:false};
  }
  const id = resolveTarget(t);
  const nb = {path:[id]}; l.branches.push(nb); return {b:nb, atStart:false};
}
function removeNode(id){
  S.lines.forEach(l => {
    const ins = [], outs = [];
    for (const k of Object.keys(l.oneway)){
      const [x, y] = k.split('>').map(Number);
      if (y === id) ins.push(x); if (x === id) outs.push(y);
      if (x === id || y === id) delete l.oneway[k];
    }
    ins.forEach(x => outs.forEach(y => { if (x !== y) l.oneway[x + '>' + y] = true; }));
    l.branches.forEach(b => b.path = dedupe(b.path.filter(n => n !== id)));
  });
  delete S.stations[id];
  cleanup();
}
function tryMerge(n){
  const P = S.nodes[n]; if (!P) return;
  const tol = 12 / view.z; let other = null, bd = tol;
  for (const [k, q] of Object.entries(S.nodes)){ if (+k === n) continue; const d = Math.hypot(q.x-P.x, q.y-P.y); if (d < bd){ bd = d; other = +k; } }
  if (other == null) return;
  S.lines.forEach(l => {
    for (const k of Object.keys(l.oneway)){
      const [x, y] = k.split('>').map(Number);
      if (x !== n && y !== n) continue;
      delete l.oneway[k];
      const nx = x === n ? other : x, ny = y === n ? other : y;
      if (nx !== ny) l.oneway[nx + '>' + ny] = true;
    }
    l.branches.forEach(b => b.path = dedupe(b.path.map(x => x === n ? other : x)));
  });
  if (S.stations[n] && !S.stations[other]) S.stations[other] = S.stations[n];
  delete S.stations[n];
  if (sel.node === n) sel.node = other;
  cleanup();
}
function newLine(mode){
  const used = new Set(S.lines.map(l => l.color.toUpperCase()));
  const color = PALETTE.find(c => !used.has(c.toUpperCase())) || PALETTE[S.lines.length % PALETTE.length];
  const n = S.lines.filter(l => l.mode === mode).length + 1;
  const l = {id: nid(), name: (activeTab === 'cargo' ? T('Cargo') + ' ' : '') + T(MODES[mode].label) + ' ' + n, mode, color, branches: [], oneway: {}, cargo: activeTab === 'cargo'};
  S.lines.push(l);
  return l;
}

/* ---------- geometry ---------- */
function computeGeometry(){
  const u = U(), gap = 2.2 * u;
  const edges = new Map(), vis = VL();
  vis.forEach(l => l.branches.forEach(br => {
    for (let i = 0; i < br.path.length - 1; i++){
      const a = br.path[i], b = br.path[i+1]; if (a === b) continue;
      const k = ekey(a, b); let e = edges.get(k);
      if (!e){ e = {a:Math.min(a,b), b:Math.max(a,b), lines:[]}; edges.set(k, e); }
      if (!e.lines.includes(l.id)) e.lines.push(l.id);
    }
  }));
  const rank = new Map(S.lines.map((l, i) => [l.id, i]));
  for (const e of edges.values()){
    e.lines.sort((x, y) => rank.get(x) - rank.get(y));
    const p = S.nodes[e.a], q = S.nodes[e.b];
    let dx = q.x - p.x, dy = q.y - p.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    if (dx * 0.924 + dy * 0.383 < 0){ dx = -dx; dy = -dy; }
    e.d = {x:dx, y:dy}; e.n = {x:-dy, y:dx};
    const ws = e.lines.map(id => MODES[lineById(id).mode].w * u);
    const total = ws.reduce((s, w) => s + w, 0) + gap * (ws.length - 1);
    let s = -total / 2; e.off = {};
    e.lines.forEach((id, i) => { e.off[id] = s + ws[i] / 2; s += ws[i] + gap; });
  }
  const verts = new Map();
  vis.forEach(l => {
    verts.set(l.id, l.branches.map(br => br.path.map((n, i) => {
      const e1 = i > 0 ? edges.get(ekey(br.path[i-1], n)) : null;
      const e2 = i < br.path.length - 1 ? edges.get(ekey(n, br.path[i+1])) : null;
      return offsetVertex(S.nodes[n], e1, e2, l.id);
    })));
  });
  return {edges, verts};
}
function offsetVertex(P, e1, e2, id){
  if (!e1 && !e2) return {x:P.x, y:P.y};
  if (!e1 || !e2){ const e = e1 || e2, o = e.off[id]; return {x:P.x + e.n.x*o, y:P.y + e.n.y*o}; }
  const o1 = e1.off[id], o2 = e2.off[id];
  const A1 = {x:P.x + e1.n.x*o1, y:P.y + e1.n.y*o1}, A2 = {x:P.x + e2.n.x*o2, y:P.y + e2.n.y*o2};
  const mid = {x:(A1.x+A2.x)/2, y:(A1.y+A2.y)/2};
  const cr = e1.d.x*e2.d.y - e1.d.y*e2.d.x;
  if (Math.abs(cr) < 0.08) return mid;
  const wx = A2.x - A1.x, wy = A2.y - A1.y;
  const t = (wx*e2.d.y - wy*e2.d.x) / cr;
  const V = {x:A1.x + e1.d.x*t, y:A1.y + e1.d.y*t};
  const lim = Math.max(Math.abs(o1), Math.abs(o2)) * 3 + 0.5;
  return Math.hypot(V.x-P.x, V.y-P.y) > lim ? mid : V;
}
function distSeg(p, a, b){
  const dx = b.x-a.x, dy = b.y-a.y, L = dx*dx + dy*dy;
  let t = L ? ((p.x-a.x)*dx + (p.y-a.y)*dy) / L : 0; t = Math.max(0, Math.min(1, t));
  const q = {x:a.x + dx*t, y:a.y + dy*t};
  return {d:Math.hypot(p.x-q.x, p.y-q.y), q, t};
}

/* ---------- hit testing ---------- */
function nearestNode(p, tol){
  let best = null, bd = tol;
  for (const [k, n] of Object.entries(S.nodes)){ const d = Math.hypot(n.x-p.x, n.y-p.y); if (d < bd){ bd = d; best = +k; } }
  return best;
}
function nearestEdge(p, tol){
  let best = null, bd = tol; const seen = new Set();
  VL().forEach(l => l.branches.forEach(br => {
    for (let i = 0; i < br.path.length - 1; i++){
      const a = br.path[i], b = br.path[i+1], k = ekey(a, b);
      if (seen.has(k)) continue; seen.add(k);
      const r = distSeg(p, S.nodes[a], S.nodes[b]);
      if (r.d < bd && r.t > 0.02 && r.t < 0.98){ bd = r.d; best = {a, b, pt:r.q}; }
    }
  }));
  return best;
}
function hitLine(p){
  const G = computeGeometry(), u = U(); let best = null, bd = Infinity;
  VL().forEach(l => {
    const tol = MODES[l.mode].w*u/2 + 6/view.z;
    G.verts.get(l.id).forEach((pts, bi) => {
      for (let i = 0; i < pts.length - 1; i++){
        const r = distSeg(p, pts[i], pts[i+1]);
        if (r.d < tol && r.d <= bd){ bd = r.d; best = {line:l.id, branch:l.branches[bi], seg:i}; }
      }
    });
  });
  return best;
}
function snapTarget(p){
  const tol = 13 / view.z;
  const n = nearestNode(p, tol);
  if (n != null) return {kind:'node', id:n, pt:{x:S.nodes[n].x, y:S.nodes[n].y}};
  const e = nearestEdge(p, tol * 0.85);
  if (e) return {kind:'edge', a:e.a, b:e.b, pt:e.pt};
  return {kind:'free', pt:p};
}
function drawTarget(p, ev){
  if (ev.shiftKey && activeBr && activeBr.path.length){
    const L = S.nodes[brEnd(activeBr)];
    const dx = p.x - L.x, dy = p.y - L.y;
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI/4)) * (Math.PI/4);
    const len = dx*Math.cos(ang) + dy*Math.sin(ang);
    return {kind:'free', pt:{x:L.x + Math.cos(ang)*len, y:L.y + Math.sin(ang)*len}};
  }
  if (ev.altKey) return {kind:'free', pt:p, noRoad:true};
  const t = snapTarget(p);
  const mode = activeLine != null && lineById(activeLine) ? lineById(activeLine).mode : newMode;
  if (t.kind === 'free' && roadSnapOn(mode)){
    const w = I2W(p), k = mode === 'train' ? 1 : 0;
    const rn = nearestGraphNode(w.x, w.y, k, Math.max(30, 25 / view.z / pxPerM()));
    if (rn != null){ const q = roadGraph().nodes.get(rn); return {kind:'road', rn, pt:W2I(q[0], q[1])}; }
  }
  return t;
}

