'use strict';
/* The side panel and settings, event listeners, the desktop bridge, what's new, tabs, language.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- side panel ---------- */
function swatch(l){
  const c = document.createElement('canvas'), w = 48, h = 16, r = window.devicePixelRatio || 1;
  c.width = w*r; c.height = h*r; c.style.width = w + 'px'; c.style.height = h + 'px';
  const g = c.getContext('2d'); g.scale(r, r);
  drawStyled(g, [{x:5, y:8}, {x:43, y:8}], l.mode, l.color, 0.85);
  return c;
}
function setVal(el, v){ if (document.activeElement !== el) el.value = v; }
let saveT = 0;
function autosave(){
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { if (S.example){ localStorage.removeItem(KEY); return; } localStorage.setItem(KEY, JSON.stringify(projectObj())); }
    catch { try { localStorage.removeItem(KEY); } catch {} }
  }, 900);
}
const EYE_ON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>';
/* One line of numbers about a line: stops and length, and for a game line its vehicles and seats. */
function lineStatsText(l){
  const parts = [], gl = l.gameId && S.game ? S.game.lines.find(x => x.id === l.gameId) : null;
  const stops = gl ? gl.stops.length : lineStopCount(l);
  parts.push(T(stops === 1 ? '1 stop' : '{n} stops', {n:stops}));
  if (S.game && S.game.xf){ const km = lineLengthPx(l) / pxPerM() / 1000; if (km > 0) parts.push(T('{km} km', {km:km.toLocaleString(LOCALE(), {maximumFractionDigits:1})})); }
  if (gl && S.game.vehicles && Object.keys(S.game.vehicles).length){
    const v = S.game.vehicles[gl.id];
    if (!v || !v.n) parts.push(T('no vehicles'));
    else {
      parts.push(T(v.n === 1 ? '1 vehicle' : '{n} vehicles', {n:v.n}));
      if (l.cargo){ if (v.cargo) parts.push(T('{n} cargo capacity', {n:v.cargo.toLocaleString(LOCALE())})); }
      else if (v.seats) parts.push(T('{n} seats', {n:v.seats.toLocaleString(LOCALE())}));
    }
  }
  return parts.join(' · ');
}
function ui(){
  renderLegend();
  gameUI();
  cargoUI();
  if (typeof tabUI === 'function') try { tabUI(); } catch {}
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === tool));
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === newMode));
  $('#undo').disabled = !hist.u.length; $('#redo').disabled = !hist.r.length;
  $('#banner').hidden = !S.example;

  const list = $('#lineList'); list.textContent = '';
  const inTab = S.lines.filter(lineInTab);
  inTab.forEach(l => {
    const row = document.createElement('div'); row.className = 'line-row' + (l.hidden ? ' off' : '');
    const b = document.createElement('button'); b.className = 'line-main'; b.type = 'button';
    row.setAttribute('aria-current', l.id === sel.line);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = l.name || T('Untitled'); b.title = l.name || '';
    const tg = document.createElement('span'); tg.className = 'tag' + (l.id === activeLine ? ' live' : '');
    tg.textContent = l.id === activeLine ? T('drawing') : T(MODES[l.mode].label) + (l.branches.length > 1 && !l.gameId ? ' · ' + l.branches.length + ' br' : '');
    b.append(swatch(l), nm, tg);
    b.addEventListener('click', () => {
      if (activeLine != null && activeLine !== l.id) finishLine(false);
      sel = {line:l.id, branch:null, node:null}; ui(); draw();
    });
    // the eye: hide a line on the map (in every tab) without deleting it
    const eye = document.createElement('button'); eye.type = 'button'; eye.className = 'eye'; eye.setAttribute('aria-pressed', String(!l.hidden));
    eye.title = T(l.hidden ? 'Show on the map' : 'Hide from the map'); eye.setAttribute('aria-label', eye.title);
    eye.innerHTML = l.hidden ? EYE_OFF : EYE_ON;
    eye.addEventListener('click', e => { e.stopPropagation(); commit(); l.hidden = !l.hidden; ui(); draw(); });
    row.append(b, eye);
    list.append(row);
  });
  $('#linesEmpty').hidden = S.lines.length > 0;
  { // "Show all" in the section title while something is hidden
    const nHid = inTab.filter(l => l.hidden).length, h2 = $('#linesHead');
    let all = $('#linesShowAll');
    if (!all){ all = document.createElement('button'); all.type = 'button'; all.className = 'sc-all'; all.id = 'linesShowAll'; h2.after(all);
      all.addEventListener('click', e => { e.stopPropagation(); commit(); S.lines.forEach(l => { if (lineInTab(l)) l.hidden = false; }); ui(); draw(); }); }
    all.hidden = !nHid; all.textContent = T('Show all ({n} hidden)', {n:nHid});
  }

  const l = sel.line != null ? lineById(sel.line) : null;
  $('#linePanel').hidden = !l;
  if (l){
    setVal($('#lnName'), l.name); setVal($('#lnMode'), l.mode); setVal($('#lnColor'), l.color);
    document.querySelectorAll('#lnModeSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === l.mode)));
    document.querySelectorAll('#lnSwatches button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === String(l.color).toLowerCase())));
    $('#lnCont').textContent = T(l.id === activeLine ? 'Stop drawing' : 'Draw branch');
    $('#lnStats').textContent = lineStatsText(l);
    const r = selRun();
    $('#brBox').hidden = !r;
    if (r){
      const n = r.chain.length - 1, on = runIsOneway(l, r.chain);
      $('#brInfo').textContent = n === 1 ? T('1 segment') : T('{n} segments, up to the nearest junctions', {n});
      $('#brOne').checked = on;
      $('#brRev').hidden = !on;
      $('#brDel').hidden = l.branches.length < 2;
    }
  }
  const n = sel.node != null && S.nodes[sel.node] ? sel.node : null;
  $('#ptPanel').hidden = n == null;
  if (n != null){
    const st = S.stations[n];
    const names = S.lines.filter(x => lineHasNode(x, n)).map(x => x.name);
    $('#ptTitle').textContent = T(st ? 'Station' : 'Point');
    $('#ptInfo').textContent = names.length === 1 ? T('On {name}', {name:names[0]}) : T('Shared by {n} lines: {names}', {n:names.length, names:names.join(', ')});
    $('#stFields').hidden = !st;
    $('#stToggle').textContent = T(st ? 'Remove station' : 'Mark as station');
    if (st){ setVal($('#stName'), st.name); setVal($('#stSide'), st.side || 'auto'); $('#stBadges').checked = st.badges !== false; }
    $('#stBadgesRow').hidden = names.length < 2;
    const planning = !!(st && S.game && S.game.xf);
    $('#stRadiusRow').hidden = !planning || st.game; $('#stReach').hidden = !planning; $('#stPayoff').hidden = !planning || st.game;
    if (planning){
      if (st.game){
        // What the game itself says this stop reaches: the buildings in its catchment, by capacity.
        const ids = new Set(S.game.catch[st.sg] || []), got = [0, 0, 0];
        for (const b of S.game.buildings){ if (!CATS[b[4]]) continue; if (ids.has(b[0]) || (b[6] != null && ids.has(b[6]))) got[b[4]] += b[3]; }
        const kind = st.building ? T('Station building ({t} terminals)', {t:st.terminals || '?'}) : T('Stop on the road');
        $('#stReach').textContent = kind + ' · ' + T('reach {r} m · the game counts {a} residents and {b} jobs in its catchment', {r:st.r || '?', a:got[0].toLocaleString(LOCALE()), b:(got[1] + got[2]).toLocaleString(LOCALE())});
      }
      else {
        setVal($('#stRadius'), st.radius || defaultReach());
        const mine = planCoverage().per[n] || new Set(), cov = gameCovered();
        const add = [0, 0, 0], tot = [0, 0, 0];
        for (const b of S.game.buildings){ if (!mine.has(b[0]) || !CATS[b[4]]) continue; tot[b[4]] += b[3]; if (!isServed(b, cov)) add[b[4]] += b[3]; }
        const gain = add[0] + add[1] + add[2];
        $('#stPayoff').textContent = gain ? T('+{n} people get a stop', {n:gain.toLocaleString(LOCALE())}) : T('No one new is reached here');
        $('#stReach').textContent = T('Reaches {a} residents and {b} jobs. New: {c} residents, {d} jobs that no game stop reaches.', {a:tot[0], b:tot[1] + tot[2], c:add[0], d:add[1] + add[2]});
      }
    }
  }
  setVal($('#setFade'), S.settings.fade); setVal($('#setSize'), S.settings.size);
  $('#terrainOpts').hidden = !(S.game && S.game.terrain);
  $('#setTerrain').checked = S.settings.terrain !== false;
  if (document.activeElement !== $('#setWater')) $('#setWater').value = S.game && S.game.terrain ? waterLevel() : '';
  $('#setGray').checked = !!S.settings.gray; $('#setBadges').checked = S.settings.badges !== false; $('#setLegend').checked = !!S.settings.legend;

  const al = activeLine != null ? lineById(activeLine) : null;
  const sl = sel.line != null ? lineById(sel.line) : null;
  let h;
  if (tool === 'draw'){
    const md = LANG === 'en' ? MODES[newMode].label.toLowerCase() : T(MODES[newMode].label);
    if (al && activeBr) h = T('Drawing {name}: click to add points · click {name} again to rejoin it · Esc ends this branch · Enter finishes', {name:al.name});
    else if (al) h = T('Click a point on {name} to draw a branch from it · click elsewhere to start a new line', {name:al.name});
    else if (sl) h = T('Click on {name} to branch or extend it · click elsewhere for a new {mode} line', {name:sl.name, mode:md});
    else h = T(roadSnapOn(newMode) ? 'Click to start a new {mode} line. Points snap to stops and lines nearby, and follow roads (hold Alt to draw freely).' : 'Click to start a new {mode} line. Points snap to stops and lines nearby.', {mode:md});
  }
  else if (tool === 'station') h = (S.game && S.game.xf) ? 'Click to add a stop. It snaps to the nearest road (hold Alt to place it freely) or onto a line.' : 'Click a point where lines meet to mark a station';
  else if (tool === 'cut') h = 'Click a segment to cut it out of its line. The line splits there; other lines on the same street stay.';
  else h = 'Click a segment to select it (Delete cuts it) · drag points to move them · double-click a line to add a bend';
  if (alignPick && S.game){ const s2 = S.game.groups[$(alignPick === 1 ? '#gA1' : '#gA2').value]; h = s2 ? T('Click where {name} is on the screenshot', {name:s2.name}) : T('Click where the station is on the screenshot'); }
  $('#hint').textContent = T(h);
  autosave();
}

document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  newMode = b.dataset.mode;
  if (activeLine != null){ const l = lineById(activeLine); if (l && nodeCount(l) < 2){ l.mode = newMode; l.name = MODES[newMode].label + ' ' + S.lines.filter(x => x.mode === newMode).length; } }
  if (tool !== 'draw') setTool('draw'); else { ui(); draw(); }
}));
$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
$('#openBtn').addEventListener('click', () => $('#fileIn').click());
$('#bannerOpen').addEventListener('click', () => $('#fileIn').click());
$('#fileIn').addEventListener('change', e => { readFile(e.target.files[0]); e.target.value = ''; });
$('#saveProj').addEventListener('click', () => { finishLine(false); saveFile('transit-project.json', JSON.stringify(projectObj())); });
$('#exportBtn').addEventListener('click', exportPNG);
$('#schemBtn').addEventListener('click', openSchematic);
$('#scDlg').addEventListener('close', () => $('#schemBtn').setAttribute('aria-selected', 'false'));
$('#setLang').value = LANG;
$('#setLang').addEventListener('change', e => setLang(e.target.value));
$('#setTheme').addEventListener('click', e => { const b = e.target.closest('button[data-theme]'); if (!b) return; THEME = b.dataset.theme; try { localStorage.setItem('tfo-theme', THEME); } catch {} applyTheme(); });
applyTheme();
['#scLayout', '#scStyle', '#scNames'].forEach(id => $(id).addEventListener('change', schemPreview));
$('#scPlanned').addEventListener('change', () => { schemPreview(); schemFilterUI(); });
$('#scAll').addEventListener('click', e => { e.preventDefault(); const f = schemFilter(); f.offModes = []; f.offLines = []; autosave(); schemPreview(); schemFilterUI(); });
$('#scTitle').addEventListener('input', () => { clearTimeout(schemPreview.t); schemPreview.t = setTimeout(schemPreview, 250); });
$('#scPng').addEventListener('click', () => schemSave('png'));
$('#scSvg').addEventListener('click', () => schemSave('svg'));
$('#scClose').addEventListener('click', () => $('#scDlg').close());
$('#zIn').addEventListener('click', () => zoomAt(cw/2, ch/2, 1.25));
$('#zOut').addEventListener('click', () => zoomAt(cw/2, ch/2, 0.8));
$('#zFit').addEventListener('click', fit);

const curLine = () => sel.line != null ? lineById(sel.line) : null;
$('#lnName').addEventListener('input', e => { const l = curLine(); if (!l) return; liveEdit(); l.name = e.target.value; ui(); draw(); });
$('#lnName').addEventListener('change', settle);
$('#lnColor').addEventListener('input', e => { const l = curLine(); if (!l) return; liveEdit(); l.color = e.target.value; ui(); draw(); });
$('#lnColor').addEventListener('change', settle);
$('#lnMode').addEventListener('change', e => { const l = curLine(); if (!l) return; commit(); l.mode = e.target.value; ui(); draw(); });
$('#lnModeSeg').addEventListener('click', e => { const b = e.target.closest('button[data-mode]'); if (!b) return; const m = $('#lnMode'); m.value = b.dataset.mode; m.dispatchEvent(new Event('change')); });
$('#lnSwatches').addEventListener('click', e => { const b = e.target.closest('button[data-color]'); if (!b) return; const c = $('#lnColor'); c.value = b.dataset.color; c.dispatchEvent(new Event('input')); c.dispatchEvent(new Event('change')); });
$('#lnCont').addEventListener('click', () => {
  const l = curLine(); if (!l) return;
  if (activeLine === l.id){ finishLine(false); return; }
  finishLine(false); tool = 'draw'; activeLine = l.id; activeBr = null; sel = {line:l.id, branch:null, node:null}; ui(); draw();
  toast(T('Click a point on {name} to branch from it, or its end to extend it', {name:l.name}));
});
$('#lnDel').addEventListener('click', () => { if (sel.line != null){ sel.node = null; sel.branch = null; sel.seg = null; deleteSelection(); } });
$('#segCut').addEventListener('click', () => { if (sel.branch && sel.seg != null) cutSegment(sel.line, sel.branch, sel.seg); });
$('#brOne').addEventListener('change', e => { const r = selRun(); if (!r) return; commit(); setRunOneway(r.l, r.chain, e.target.checked); ui(); draw(); });
$('#brRev').addEventListener('click', () => { const r = selRun(); if (!r) return; commit(); flipRun(r.l, r.chain); ui(); draw(); });
$('#brDel').addEventListener('click', () => { if (sel.branch){ sel.node = null; sel.seg = null; deleteSelection(); } });
$('#stName').addEventListener('input', e => { const st = S.stations[sel.node]; if (!st) return; liveEdit(); st.name = e.target.value; draw(); autosave(); });
$('#stName').addEventListener('change', settle);
$('#stSide').addEventListener('change', e => { const st = S.stations[sel.node]; if (!st) return; commit(); st.side = e.target.value; ui(); draw(); });
$('#stRadius').addEventListener('change', e => { const st = S.stations[sel.node]; if (!st) return; commit(); st.radius = Math.max(50, Math.min(1000, +e.target.value || defaultReach())); ui(); draw(); });
$('#stBadges').addEventListener('change', e => { const st = S.stations[sel.node]; if (!st) return; commit(); st.badges = e.target.checked; ui(); draw(); });
$('#stToggle').addEventListener('click', () => {
  if (sel.node == null) return; commit();
  if (S.stations[sel.node]) delete S.stations[sel.node];
  else { S.stations[sel.node] = {name:'', side:'auto'}; setTimeout(() => $('#stName').focus(), 0); }
  ui(); draw();
});
$('#ptDel').addEventListener('click', () => { if (sel.node == null) return; commit(); removeNode(sel.node); sel.node = null; ui(); draw(); });
$('#setFade').addEventListener('input', e => { S.settings.fade = +e.target.value; draw(); autosave(); });
$('#setSize').addEventListener('input', e => { S.settings.size = +e.target.value; draw(); autosave(); });
$('#setGray').addEventListener('change', e => { S.settings.gray = e.target.checked; draw(); autosave(); });
function repaintGameMap(){ if (bg.kind === 'game' && S.game){ const c = makeGameMap(); bg.img = c; bg.w = c.width; bg.h = c.height; draw(); } }
$('#setTerrain').addEventListener('change', e => { S.settings.terrain = e.target.checked; repaintGameMap(); autosave(); });
$('#setWater').addEventListener('change', e => { const v = e.target.value; S.settings.waterLevel = v === '' ? null : +v; repaintGameMap(); autosave(); });
$('#setBadges').addEventListener('change', e => { S.settings.badges = e.target.checked; draw(); autosave(); });
$('#setLegend').addEventListener('change', e => { S.settings.legend = e.target.checked; autosave(); });
$('#clearAll').addEventListener('click', () => {
  if (!S.lines.length) return; commit();
  S.lines = []; S.stations = {}; S.nodes = {}; activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null};
  ui(); draw(); toast('All lines cleared. Undo brings them back.');
});

$('#gCopy').addEventListener('click', copyExportCmd);
$('#gCopy2').addEventListener('click', copyExportCmd);
$('#gImport').addEventListener('click', () => window.desktop ? deskImport() : $('#gameIn').click());
$('#gReimport').addEventListener('click', () => window.desktop ? deskImport() : $('#gameIn').click());
$('#gameIn').addEventListener('change', e => { const f = e.target.files[0]; if (f) readGameFile(f); e.target.value = ''; });
$('#gMapBtn').addEventListener('click', () => { if (!S.game) return; commit(); useGameMap(); toast('Showing the map generated from your game'); });
$('#gP1').addEventListener('click', () => { alignPick = alignPick === 1 ? null : 1; ui(); });
$('#gP2').addEventListener('click', () => { alignPick = alignPick === 2 ? null : 2; ui(); });
$('#gA1').addEventListener('change', () => { if (S.game && S.game.align) S.game.align.p1 = null; ui(); });
$('#gA2').addEventListener('change', () => { if (S.game && S.game.align) S.game.align.p2 = null; ui(); });
$('#gMirror').addEventListener('change', e => {
  if (!S.game) return; S.game.align = S.game.align || {}; S.game.align.mirror = e.target.checked;
  if (computeAlign()){ commit(); buildGameNetwork(); }
  ui(); draw();
});
function setRotation(deg){
  if (!S.game) return;
  deg = ((Math.round(deg) % 360) + 360) % 360;
  if (deg === (S.game.rot || 0)) return;
  commit(); S.game.rot = deg; useGameMap();
}
$('#vRotL').addEventListener('click', e => setRotation((S.game && S.game.rot || 0) - (e.shiftKey ? 90 : 15)));
$('#vRotR').addEventListener('click', e => setRotation((S.game && S.game.rot || 0) + (e.shiftKey ? 90 : 15)));
$('#vRot').addEventListener('click', () => setRotation(0));
$('#gArea').addEventListener('change', e => { if (!S.game) return; commit(); S.game.focus = e.target.value === '' ? null : +e.target.value; useGameMap(); });
$('#gRoads').addEventListener('change', e => { S.settings.roads = e.target.checked; if (S.game && S.game.xf){ commit(); buildGameNetwork(); } ui(); draw(); });
$('#gDrawn').addEventListener('click', () => { const n = S.lines.filter(l => !l.gameId).length; if (!n) return; commit(); removeDrawnLines(); ui(); draw(); toast(T('Removed hand-drawn lines ({n}). Ctrl+Z brings them back.', {n})); });
let startOverArmed = 0;
$('#startOver').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!startOverArmed){ startOverArmed = setTimeout(() => { startOverArmed = 0; b.textContent = T('Start over'); }, 3000); b.textContent = T('Click again to confirm'); return; }
  clearTimeout(startOverArmed); startOverArmed = 0; b.textContent = T('Start over');
  try { localStorage.removeItem(KEY); } catch {}
  covCache = null; graphCache = null; alignPick = null;
  loadExample(); S.nodes = {}; S.lines = []; S.stations = {}; fit(); ui(); draw(); toast('Started over with a blank map');
});
$('#cView').addEventListener('change', e => { S.settings.cargoView = e.target.value; autosave(); ui(); draw(); });
$('#cInd').addEventListener('change', e => { S.settings.cargoInd = e.target.checked; autosave(); ui(); draw(); });
$('#cBiz').addEventListener('change', e => { S.settings.cargoBiz = e.target.checked; autosave(); ui(); draw(); });
$('#cTind').addEventListener('change', e => { S.settings.cargoTind = e.target.checked; autosave(); ui(); draw(); });
$('#cGood').addEventListener('change', e => { S.settings.cargoGood = e.target.value; autosave(); ui(); draw(); });
$('#indClose').addEventListener('click', () => { sel_ind = null; ui(); draw(); });
$('#gReach').addEventListener('change', e => { S.settings.reach = e.target.value; autosave(); ui(); draw(); });
$('#gRadii').addEventListener('change', e => { S.settings.radii = e.target.value; autosave(); draw(); });
$('#gSnap').addEventListener('change', e => { S.settings.roadSnap = e.target.checked; autosave(); draw(); });
$('#gColors').addEventListener('change', e => { S.settings.gameColors = e.target.checked; if (S.game && S.game.xf){ commit(); buildGameNetwork(); } ui(); draw(); });
$('#gRebuild').addEventListener('click', () => { if (!S.game || !S.game.xf) return; commit(); buildGameNetwork(); fitNetwork(); ui(); draw(); toast(T('Drew {n} lines from the game', {n:S.lines.filter(l => l.gameId).length})); });
$('#gHeat').addEventListener('change', e => { S.settings.gapHeat = e.target.checked; draw(); autosave(); });
$('#cHeat').addEventListener('change', e => { S.settings.cargoHeat = e.target.checked; draw(); autosave(); });
$('#cSpotsOn').addEventListener('change', e => { S.settings.cargoSpots = e.target.checked; ui(); draw(); autosave(); });
$('#gSpotsOn').addEventListener('change', e => { S.settings.gapSpots = e.target.checked; ui(); draw(); autosave(); });
$('#gCov').addEventListener('change', e => { S.settings.coverage = e.target.value; ui(); draw(); });

/* ---------- desktop app bridge (Electron) ---------- */
let deskInfo = null, deskLastAt = null;
async function deskRefresh(){
  if (!window.desktop) return;
  deskInfo = await window.desktop.getLogInfo();
  $('#gDesk').hidden = false;
  $('#gDeskPath').title = deskInfo.path || '';
  $('#gDeskPath').textContent = deskInfo.path ? T('Reading the game log: {path}', {path:'…\\' + deskInfo.path.split(/[\\/]/).slice(-3).join('\\')}) : T('The game log was not found. Choose stdout.txt from Steam\\userdata\\<id>\\3493540\\local\\crash_dump.');
  if (deskLastAt) $('#gDeskPath').textContent += T(' · last update {time}', {time:deskLastAt.toLocaleTimeString('sv-SE')});
  $('#gLive').checked = !!deskInfo.watching;
  $('#gLive').disabled = !deskInfo.path;
  $('#gDeskImport').disabled = !deskInfo.path;
}
async function deskImport(){
  const r = await window.desktop.readLatest();
  if (!r || !r.text){ toast(r && r.error ? r.error : 'No export found in the game log yet. Run the export command in the game first.'); return; }
  importGame(r.text);
}
/* What's new: once per version, from the changelog that ships with the app. */
function versionNewer(a, b){ const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++){ if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
async function whatsNew(){
  if (!window.desktop || !window.desktop.whatsNew) return;
  const {version, notes} = await window.desktop.whatsNew();
  let seen = null; try { seen = localStorage.getItem('tfo-seen-version'); } catch {}
  const remember = () => { try { localStorage.setItem('tfo-seen-version', version); } catch {} };
  // Before this feature existed nothing was remembered: someone with a saved project or a chosen tab is upgrading, a fresh install is not.
  if (!seen){ let prior = false; try { prior = localStorage.getItem(KEY) != null || localStorage.getItem('tfo-tab') != null; } catch {} if (!prior){ remember(); return; } seen = '0.0.0'; }
  if (!versionNewer(version, seen)){ remember(); return; }
  const lines = String(notes || '').split(/\r?\n/); let i = lines.findIndex(l => l.trim() === '## ' + version); if (i < 0){ remember(); return; }
  const items = []; for (i++; i < lines.length && !lines[i].startsWith('## '); i++){ const m = /^\s*[-*]\s+(.*)/.exec(lines[i]); if (m) items.push(m[1].replace(/\*\*/g, '')); }
  if (!items.length){ remember(); return; }
  $('#wnHead').textContent = T("What's new in {v}", {v:version});
  const ul = $('#wnList'); ul.textContent = ''; items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
  $('#wnAll').href = RELEASE_URL;
  const dlg = $('#wnDlg'); dlg.addEventListener('close', remember, {once:true}); dlg.showModal();
}
$('#wnOk').addEventListener('click', () => $('#wnDlg').close());
if (window.desktop){
  document.body.classList.add('is-desktop');
  whatsNew();
  window.desktop.onExport(text => {
    const before = S.game ? S.game.lines.length : 0;
    importGame(text);
    if (!S.game) return;
    deskLastAt = new Date();
    const pax = S.game.lines.filter(isPax).length, shown = S.lines.filter(l => l.gameId).length;
    const diff = S.game.lines.length - before;
    let msg = T('Updated from the game: {n} passenger lines', {n:pax}) + (diff > 0 ? ' ' + T('({n} new)', {n:diff}) : '');
    if (shown < pax) msg += S.game.focus != null ? ' · ' + T('{n} shown in {town}', {n:shown, town:S.game.towns[S.game.focus] || T('this area')}) : ' · ' + T('{n} shown', {n:shown});
    toast(msg);
    deskRefresh();
  });
  $('#gLive').addEventListener('change', async e => { await window.desktop.setWatch(e.target.checked); deskRefresh(); });
  $('#gDeskImport').addEventListener('click', deskImport);
  $('#gDeskPick').addEventListener('click', async () => { await window.desktop.chooseLog(); deskRefresh(); });
  deskRefresh();
  window.desktop.checkUpdate && window.desktop.checkUpdate().then(u => {
    if (!u) return;
    let hidden = null; try { hidden = localStorage.getItem('tfo-upd-hidden'); } catch {}
    if (hidden === u.latest) return;
    updInfo = u; renderUpd();
    $('#updPill').hidden = false;
    $('#updClose').addEventListener('click', () => { $('#updPill').hidden = true; try { localStorage.setItem('tfo-upd-hidden', u.latest); } catch {} });
  }).catch(() => {});
}

/* Workspaces: Lines (plan), Coverage (check), Cargo, and Settings. */
const TAB_TOOLS = {lines:['edit', 'draw', 'station', 'cut'], coverage:['edit', 'station'], cargo:['edit', 'draw', 'station', 'cut'], settings:['edit']};
function setTab(t){
  activeTab = t;
  try { localStorage.setItem('tfo-tab', t); } catch {}
  finishLine(false);
  sel = {line:null, branch:null, node:null}; sel_ind = null;
  if (!TAB_TOOLS[t].includes(tool)) tool = t === 'coverage' ? 'station' : 'edit';
  ui(); draw();
}
function tabUI(){
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === activeTab)));
  $('#gearBtn').setAttribute('aria-pressed', String(activeTab === 'settings'));
  document.querySelectorAll('.rail section[data-tabs]').forEach(sec => sec.classList.toggle('tabhide', !sec.dataset.tabs.split(' ').includes(activeTab)));
  document.querySelectorAll('[data-tool]').forEach(b => { b.hidden = !TAB_TOOLS[activeTab].includes(b.dataset.tool); });
  $('#toolGrp').hidden = TAB_TOOLS[activeTab].length < 2;
  $('#modeGrp').hidden = !(activeTab === 'lines' || activeTab === 'cargo');
  $('#histGrp').hidden = activeTab === 'settings';
  const hasGame = !!S.game;
  $('#noGameSec').hidden = hasGame && !(activeTab === 'cargo' && !(S.game.industries && S.game.industries.length));
  $('#noGameTitle').textContent = T(hasGame ? 'No cargo data yet' : 'Needs game data');
  $('#noGameText').textContent = T(hasGame ? 'Your last export has no industries. Copy the export command again in ⚙ Settings (it now includes cargo), run it in the game, and the map updates.' : 'Coverage and cargo come from your Transport Fever 3 save. Open ⚙ Settings → Game connection to import it.');
  if (activeTab === 'cargo' && !alignPick) $('#hint').textContent = T('Click an industry to see what it needs and makes · squares are industries, triangles are businesses that want goods');
  else if (activeTab === 'settings') $('#hint').textContent = T('Settings · your map stays as it is while you change things here');
  else if (activeTab === 'coverage' && tool === 'edit') $('#hint').textContent = T('Drag your planned stops to try other spots · coverage updates as you move them');
  $('#linesCargoRow').hidden = activeTab !== 'lines' || !S.lines.some(l => l.cargo);
  const lh = document.querySelector('section[data-key="lines"] h2'); if (lh) lh.textContent = T(activeTab === 'coverage' ? 'Passenger lines' : activeTab === 'cargo' ? 'Cargo lines' : 'Lines');
  $('#linesCargo').checked = !!S.settings.linesShowCargo;
  $('#glSec').hidden = !hasGame;
  // live chip
  const chip = $('#liveChip');
  chip.hidden = !hasGame;
  if (hasGame){
    const live = window.desktop && deskInfo && deskInfo.watching;
    const t = deskLastAt || new Date(S.game.at);
    chip.className = 'chip' + (live ? '' : ' off');
    chip.innerHTML = '<span class="dot"></span>';
    chip.append((live ? T('Game connected') + ' · ' : T('Game data') + ' · ') + t.toLocaleTimeString('sv-SE', {hour:'2-digit', minute:'2-digit'}));
  }
}
document.querySelectorAll('.tabs [data-tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('#gearBtn').addEventListener('click', () => setTab(activeTab === 'settings' ? (lastWorkTab || 'lines') : (lastWorkTab = activeTab, 'settings')));
let lastWorkTab = activeTab === 'settings' ? 'lines' : activeTab;
$('#liveChip').addEventListener('click', () => { if (activeTab !== 'settings') lastWorkTab = activeTab; setTab('settings'); });
$('#goSettings').addEventListener('click', () => { lastWorkTab = activeTab; setTab('settings'); });
$('#linesCargo').addEventListener('change', e => { S.settings.linesShowCargo = e.target.checked; autosave(); ui(); draw(); });

/* Collapsible side-panel sections, remembered per viewer. */
(function(){
  let closed;
  try { closed = new Set(JSON.parse(localStorage.getItem('tfo-collapsed') || '["keys"]')); } catch { closed = new Set(['keys']); }
  const save = () => { try { localStorage.setItem('tfo-collapsed', JSON.stringify([...closed])); } catch {} };
  document.querySelectorAll('.rail section[data-key]').forEach(sec => {
    const h = sec.querySelector(':scope > h2'); if (!h) return;
    const key = sec.dataset.key, head = document.createElement('div'); head.className = 'sec-head';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sec-tog';
    h.replaceWith(head); head.append(h, btn);
    const apply = () => { const c = closed.has(key); sec.classList.toggle('collapsed', c); btn.textContent = c ? '+' : '−'; btn.setAttribute('aria-expanded', String(!c)); btn.setAttribute('aria-label', T(c ? 'Expand {name}' : 'Collapse {name}', {name:h.textContent})); };
    head.addEventListener('click', () => { closed.has(key) ? closed.delete(key) : closed.add(key); save(); apply(); });
    apply();
  });
})();

let toastT = 0;
/* Static text in the page is written in English; on load (and when the language changes) each text
   and each title, aria-label and placeholder is looked up in STRINGS. The English is kept so the
   page can switch back. */
const domEN = new Map(); let domScanned = false;
function scanDom(){
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode: n => {
    const p = n.parentElement; if (!p || p.closest('script,style,svg,canvas,#scPreview,#gSpots,#gTowns,#gCats,#cList,#cDemand,#lineList,#indIO,#toast,#hint,#legend,option[data-dyn]')) return NodeFilter.FILTER_REJECT;
    return /[A-Za-z]{2}/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }});
  for (let n; (n = walk.nextNode());) domEN.set(n, n.nodeValue);
  document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => {
    for (const a of ['title', 'aria-label', 'placeholder']) if (el.hasAttribute(a) && !el.dataset['en' + a.replace('-', '')]) el.dataset['en' + a.replace('-', '')] = el.getAttribute(a);
  });
  domScanned = true;
}
function applyLang(){
  if (!domScanned) scanDom();
  document.documentElement.lang = LANG;
  for (const [n, en] of domEN){ if (!n.isConnected) continue; const t = en.trim(); if (!t) continue; const tr = T(t); n.nodeValue = tr === t ? en : en.replace(t, tr); }
  document.querySelectorAll('[data-entitle],[data-enarialabel],[data-enplaceholder]').forEach(el => {
    if (el.dataset.entitle != null) el.title = T(el.dataset.entitle);
    if (el.dataset.enarialabel != null) el.setAttribute('aria-label', T(el.dataset.enarialabel));
    if (el.dataset.enplaceholder != null) el.placeholder = T(el.dataset.enplaceholder);
  });
}
function setLang(l){
  LANG = l === 'de' ? 'de' : 'en';
  try { localStorage.setItem('tfo-lang', LANG); } catch {}
  $('#gArea').dataset.n = ''; $('#cGood').dataset.sig = ''; // rebuild these lists in the new language
  applyLang(); ui(); draw(); renderUpd();
  if (S.game && S.game.source) checkSource(S.game.source);
  if (window.desktop) deskRefresh();
  if ($('#scDlg').open) schemPreview();
}
applyLang();
function toast(msg){ const t = $('#toast'); t.textContent = T(msg); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

