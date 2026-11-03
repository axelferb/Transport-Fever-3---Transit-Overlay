'use strict';
/* Pointer, keyboard and tool handling on the canvas.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- interaction ---------- */
function toImg(ev){ const r = cvs.getBoundingClientRect(); return {x:(ev.clientX - r.left - view.x)/view.z, y:(ev.clientY - r.top - view.y)/view.z}; }
let ptr = null, spaceDown = false;
const pointers = new Map();

cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('pointerdown', e => {
  cvs.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pointers.size === 2){
    const [a, b] = [...pointers.values()];
    ptr = {mode:'pinch', d0:Math.hypot(a.x-b.x, a.y-b.y), z0:view.z, mx:(a.x+b.x)/2, my:(a.y+b.y)/2, vx:view.x, vy:view.y};
    return;
  }
  if (e.button === 2){ if (tool === 'draw') endBranch(); return; }
  if (e.button === 1 || spaceDown){ ptr = {mode:'pan', sx:e.clientX, sy:e.clientY, vx:view.x, vy:view.y}; cvs.style.cursor = 'grabbing'; return; }
  const p = toImg(e);
  if (tool === 'edit'){
    const n = nearestNode(p, 11/view.z);
    if (n != null){ ptr = {mode:'drag', node:n, moved:false}; sel = {line:null, branch:null, node:n}; ui(); draw(); return; }
  }
  ptr = {mode:'pending', sx:e.clientX, sy:e.clientY, vx:view.x, vy:view.y};
});
cvs.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (ptr && ptr.mode === 'pinch'){
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x-b.x, a.y-b.y), r = cvs.getBoundingClientRect();
    const nz = Math.min(30, Math.max(0.03, ptr.z0 * d / ptr.d0)), k = nz / ptr.z0;
    const mx = (a.x+b.x)/2 - r.left, my = (a.y+b.y)/2 - r.top, m0x = ptr.mx - r.left, m0y = ptr.my - r.top;
    view.z = nz; view.x = mx - (m0x - ptr.vx)*k; view.y = my - (m0y - ptr.vy)*k; draw(); return;
  }
  const p = toImg(e);
  if (ptr && ptr.mode === 'pending' && Math.hypot(e.clientX-ptr.sx, e.clientY-ptr.sy) > 5){ ptr.mode = 'pan'; cvs.style.cursor = 'grabbing'; }
  if (ptr && ptr.mode === 'pan'){ view.x = ptr.vx + e.clientX - ptr.sx; view.y = ptr.vy + e.clientY - ptr.sy; draw(); return; }
  if (ptr && ptr.mode === 'drag'){
    if (!ptr.moved){ commit(); ptr.moved = true; }
    S.nodes[ptr.node].x = p.x; S.nodes[ptr.node].y = p.y; draw(); return;
  }
  if (tool === 'draw') hover = drawTarget(p, e);
  else if (tool === 'station'){
    const t = snapTarget(p); hover = t.kind === 'free' ? null : t;
    if (!hover && !e.altKey && S.game && S.game.xf && S.settings.roadSnap !== false && S.game.edges && S.game.edges.length){
      const w = I2W(p), rn = nearStreet(w.x, w.y, Math.max(30, 25 / view.z / pxPerM()));
      if (rn){ const q = roadGraph().nodes.get(rn.n); hover = {kind:'road', pt:W2I(q[0], q[1])}; }
    }
  }
  else hover = null;
  hoverSeg = tool === 'cut' ? hitLine(p) : null;
  setCursor(p);
  stopCard(ptr ? null : p, e);
  draw();
});
/* A card about the stop or station under the pointer, in every tool: name, kind, lines and reach.
   Clicking still does what the tool does; the card is read-only. */
let cardFor = null;
function stopCard(p, e){
  const el = $('#stopCard');
  const id = p ? nearestNode(p, 12/view.z) : null, st = id != null ? S.stations[id] : null;
  if (!st || !stopVisible(st) || st.secondary){ if (cardFor != null){ cardFor = null; el.hidden = true; } return; }
  if (cardFor !== id){
    cardFor = id; el.textContent = '';
    const h = document.createElement('b'); h.textContent = st.name || T('Unnamed stop'); el.append(h);
    const add = t => { const d = document.createElement('div'); d.textContent = t; el.append(d); };
    const lines = S.lines.filter(l => lineHasNode(l, id) && (!l.gameId || !S.game || (() => { const gl = S.game.lines.find(x => x.id === l.gameId); return !gl || st.sg == null || gl.stops.some(x => String(x) === String(st.sg)); })()));
    if (st.game) add(st.building ? T('Station building ({t} terminals)', {t:st.terminals || '?'}) : T('Stop on the road'));
    else add(T('Planned stop'));
    if (lines.length) add((lines.length === 1 ? T('1 line: ') : T('{n} lines: ', {n:lines.length})) + lines.slice(0, 4).map(l => l.name).join(', ') + (lines.length > 4 ? ' …' : ''));
    if (S.game && S.game.xf){
      if (st.game){
        const ids = new Set(S.game.catch[st.sg] || []), got = [0, 0, 0];
        for (const b of S.game.buildings){ if (!CATS[b[4]]) continue; if (ids.has(b[0]) || (b[6] != null && ids.has(b[6]))) got[b[4]] += b[3]; }
        add(T('Reach {r} m · {a} residents, {b} jobs', {r:st.r || '?', a:got[0].toLocaleString(LOCALE()), b:(got[1] + got[2]).toLocaleString(LOCALE())}));
      } else if (!isCargoStop(id)){
        const mine = planCoverage().per[id] || new Set(), cov = gameCovered(); let tot = 0, gain = 0;
        for (const b of S.game.buildings){ if (!mine.has(b[0]) || !CATS[b[4]]) continue; tot += b[3]; if (!isServed(b, cov)) gain += b[3]; }
        add(T('Reach {r} m · {a} people, {b} new', {r:st.radius || defaultReach(), a:tot.toLocaleString(LOCALE()), b:gain.toLocaleString(LOCALE())}));
      }
    }
    el.hidden = false;
  }
  const r = stage.getBoundingClientRect(); let x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
  if (x + el.offsetWidth > r.width - 8) x = e.clientX - r.left - el.offsetWidth - 12;
  if (y + el.offsetHeight > r.height - 8) y = e.clientY - r.top - el.offsetHeight - 12;
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
cvs.addEventListener('pointerleave', () => { cardFor = null; $('#stopCard').hidden = true; });
function endPointer(e){
  pointers.delete(e.pointerId);
  if (!ptr) return;
  if (ptr.mode === 'pinch'){ if (pointers.size === 0) ptr = null; return; }
  const p = toImg(e);
  if (ptr.mode === 'pending' && e.type === 'pointerup') click(p, e);
  if (ptr.mode === 'drag' && ptr.moved){ tryMerge(ptr.node); ui(); }
  ptr = null; setCursor(p); draw();
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', () => { if (!ptr){ hover = null; draw(); } });
cvs.addEventListener('wheel', e => {
  e.preventDefault(); const r = cvs.getBoundingClientRect();
  zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}, {passive:false});
cvs.addEventListener('dblclick', e => {
  const p = toImg(e);
  if (tool === 'draw'){ endBranch(); return; }
  if (tool === 'edit'){
    if (nearestNode(p, 11/view.z) != null) return;
    const ed = nearestEdge(p, 12/view.z);
    if (ed){ commit(); const id = splitEdge(ed.a, ed.b, ed.pt); sel = {line:null, branch:null, node:id}; ui(); draw(); }
  }
});
function setCursor(p){
  if (spaceDown){ cvs.style.cursor = 'grab'; return; }
  if (tool === 'draw') cvs.style.cursor = 'crosshair';
  else if (tool === 'station') cvs.style.cursor = hover ? 'pointer' : 'default';
  else if (tool === 'cut') cvs.style.cursor = hoverSeg ? 'pointer' : 'crosshair';
  else cvs.style.cursor = nearestNode(p, 11/view.z) != null ? 'move' : (hitLine(p) ? 'pointer' : 'default');
}

function click(p, e){
  if (alignPick && S.game){ alignClick(p); return; }
  if (tool === 'draw') drawClick(p, e);
  else if (tool === 'station'){
    const t = snapTarget(p);
    if (t.kind === 'free'){
      if (S.game && S.game.xf){
        let at = t.pt;
        if (!e.altKey && S.settings.roadSnap !== false && S.game.edges && S.game.edges.length){
          const w = I2W(p), rn = nearStreet(w.x, w.y, Math.max(30, 25 / view.z / pxPerM()));
          if (rn){ const q = roadGraph().nodes.get(rn.n); at = W2I(q[0], q[1]); }
        }
        commit(); const id = addNode(at.x, at.y);
        S.stations[id] = {name:'', side:'auto', solo:true, cargo: activeTab === 'cargo'};
        sel = {line:null, branch:null, node:id}; ui(); draw();
        const r = planCoverage().per[id], cov = gameCovered();
        let add = 0; if (r) for (const b of S.game.buildings) if (b[4] === 0 && r.has(b[0]) && !isServed(b, cov)) add += b[3];
        toast(add ? T('This stop would reach {n} residents no game stop reaches', {n:add.toLocaleString(LOCALE())}) : 'Stop added. It reaches no new residents here.');
        return;
      }
      sel = {line:null, branch:null, node:null}; ui(); draw(); toast('Click on a line to place a station'); return;
    }
    commit();
    const id = resolveTarget(t);
    const isNew = !S.stations[id];
    if (isNew) S.stations[id] = {name:'', side:'auto'};
    sel = {line:null, branch:null, node:id}; ui(); draw();
    if (isNew) setTimeout(() => $('#stName').focus(), 0);
  } else if (tool === 'cut'){
    const h = hitLine(p);
    if (h) cutSegment(h.line, h.branch, h.seg); else toast('Click on a line to cut that segment');
  } else {
    const h = hitLine(p);
    sel = h ? {line:h.line, branch:h.branch, seg:h.seg, node:null} : {line:null, branch:null, seg:null, node:null};
    sel_ind = (h || activeTab !== 'cargo') ? null : hitIndustry(p);
    ui(); draw();
  }
}
function drawClick(p, e){
  const t = drawTarget(p, e);
  let l = activeLine != null ? lineById(activeLine) : null;
  // Line active but between branches: a click away from it means "start a new line".
  if (l && !activeBr && !touchesLine(l, t)){ finishLine(false); l = null; }
  // A selected line you click on gets a branch instead of a new line.
  if (!l && sel.line != null){ const s = lineById(sel.line); if (s && touchesLine(s, t)){ l = s; activeLine = s.id; activeBr = null; } }
  commit();
  if (!l){ l = newLine(newMode); activeLine = l.id; activeBr = null; }
  if (!activeBr){
    const r = startBranch(l, t);
    activeBr = r.b; activeAtStart = r.atStart;
    sel = {line:l.id, branch:activeBr, node:null};
    hover = null; ui(); draw(); return;
  }
  const rejoin = t.kind === 'node' && lineHasNode(l, t.id) && t.id !== brEnd(activeBr);
  const id = resolveTarget(t);
  const end = brEnd(activeBr);
  const via = (!t.noRoad && end !== id && roadSnapOn(l.mode)) ? roadRoute(end, id, l.mode) : null;
  if (via && via.length){
    const seq = [...via, id];
    if (activeAtStart) activeBr.path.unshift(...seq.reverse()); else activeBr.path.push(...seq);
    activeBr.path = dedupe(activeBr.path);
  } else addPoint(l, activeBr, id);
  sel = {line:l.id, branch:activeBr, node:null};
  if (rejoin && activeBr.path.length >= 2){
    activeBr = null;
    toast(T('Branch joined {name}. Click the line to add another, or press Enter.', {name:l.name}));
  }
  hover = null; ui(); draw();
}
function endBranch(){
  if (activeLine == null) return;
  if (activeBr){ activeBr = null; cleanup(); ui(); draw(); }
  else finishLine(true);
}
function finishLine(deselect){
  if (activeLine == null) return;
  activeLine = null; activeBr = null;
  if (deselect) sel = {line:null, branch:null, node:null};
  cleanup(); hover = null; ui(); draw();
}
function setTool(t){
  if (typeof TAB_TOOLS !== 'undefined' && !TAB_TOOLS[activeTab].includes(t)) return;
  if (t !== 'draw') finishLine(false);
  tool = t; hover = null; ui(); draw();
}
function deleteSelection(){
  if (sel.node != null){
    commit();
    if (S.stations[sel.node]) delete S.stations[sel.node];
    else { removeNode(sel.node); sel.node = null; }
  } else if (sel.line != null && sel.branch && sel.seg != null){
    cutSegment(sel.line, sel.branch, sel.seg); return;
  } else if (sel.line != null){
    const l = lineById(sel.line); if (!l) return;
    commit();
    if (sel.branch && l.branches.length > 1){
      l.branches = l.branches.filter(b => b !== sel.branch);
      if (activeBr === sel.branch) activeBr = null;
      sel.branch = null;
    } else {
      S.lines = S.lines.filter(x => x !== l);
      if (activeLine === l.id){ activeLine = null; activeBr = null; }
      sel = {line:null, branch:null, node:null};
    }
  } else return;
  cleanup(); ui(); draw();
}

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'select' || tag === 'textarea';
  if (typing){ if (e.key === 'Escape' || (e.key === 'Enter' && tag === 'input' && e.target.type === 'text')) e.target.blur(); return; }
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y'){ e.preventDefault(); redo(); return; }
  if (mod) return;
  if (e.key === ' '){ e.preventDefault(); if (!spaceDown){ spaceDown = true; cvs.style.cursor = 'grab'; } return; }
  if (e.key === 'Enter'){ if (activeLine != null) finishLine(true); return; }
  if (e.key === 'Escape'){
    if (activeLine != null) endBranch(); else { sel = {line:null, branch:null, node:null}; ui(); draw(); }
    return;
  }
  if (e.key === 'Backspace' && activeBr){
    e.preventDefault();
    commit();
    if (activeAtStart) activeBr.path.shift(); else activeBr.path.pop();
    if (!activeBr.path.length){ const l = lineById(activeLine); if (l) l.branches = l.branches.filter(b => b !== activeBr); activeBr = null; }
    cleanup(); ui(); draw();
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); deleteSelection(); return; }
  const k = e.key.toLowerCase();
  if (k === 'v') setTool('edit'); else if (k === 'd') setTool('draw'); else if (k === 's') setTool('station'); else if (k === 'x') setTool('cut');
  else if (k === 'f') fit();
  else if (['1','2','3','4','5'].includes(k)){ newMode = ORDER[+k - 1]; ui(); }
});
document.addEventListener('keyup', e => { if (e.key === ' '){ spaceDown = false; cvs.style.cursor = tool === 'draw' ? 'crosshair' : 'default'; } });

