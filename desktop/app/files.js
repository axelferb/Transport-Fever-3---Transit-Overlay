'use strict';
/* Background images, project files, drag-and-drop and paste.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- images, projects, files ---------- */
function setBackground(src){
  const im = new Image();
  im.onload = () => {
    const wasExample = S.example;
    bg = {img:im, src, w:im.naturalWidth, h:im.naturalHeight, kind:'image'};
    if (S.game){ S.game.xf = null; S.game.align = null; alignPick = null; removeGameNetwork(); }
    if (wasExample){
      S.nodes = {}; S.lines = []; S.stations = {}; S.example = false;
      activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null}; hist.u = []; hist.r = [];
      tool = 'draw';
      toast('Screenshot loaded. Pick a mode and click to start a line.');
    } else if (S.game) toast('Screenshot loaded. Align the game data to it in the Game data panel.');
    else toast(S.lines.length ? 'Background replaced. Your lines were kept.' : 'Screenshot loaded');
    fit(); ui();
  };
  im.onerror = () => toast('That image could not be read. Try a PNG or JPG.');
  im.src = src;
}
function readFile(file){
  if (!file) return;
  const r = new FileReader();
  if (/\.(txt|log)$/i.test(file.name) || file.type === 'text/plain'){ readGameFile(file); return; }
  if (file.type.startsWith('image/')){ r.onload = () => setBackground(r.result); r.readAsDataURL(file); }
  else if (file.name.endsWith('.json') || file.type === 'application/json'){
    r.onload = () => { try { loadProject(JSON.parse(r.result), true); } catch { toast('That file is not a Transit Overlay project.'); } };
    r.readAsText(file);
  } else toast('Open a PNG/JPG screenshot, a saved .json project, or the game’s stdout.txt.');
}
function projectObj(){
  const gameMap = bg.kind === 'game';
  let src = gameMap ? null : bg.src;
  if (!gameMap && !src && bg.img instanceof HTMLCanvasElement) src = bg.img.toDataURL('image/png');
  return {app:'transit-overlay', v:3, image:src, gameMap, w:bg.w, h:bg.h, nodes:S.nodes, lines:S.lines, stations:S.stations, nextId:S.nextId, settings:S.settings, game:S.game || null};
}
function loadProject(o, announce){
  if (!o || o.app !== 'transit-overlay' || !(o.image || (o.gameMap && o.game))) throw new Error('bad');
  const finish = (img, src, w, h, kind) => {
    const game = S.game;
    bg = {img, src, w, h, kind};
    S = {nodes:o.nodes || {}, lines:(o.lines || []).map(migrate), stations:o.stations || {}, nextId:o.nextId || 1, settings:{...DEFAULT_SETTINGS, ...(o.settings || {})}, example:false, game};
    activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null}; hist.u = []; hist.r = []; alignPick = null;
    cleanup(); fit(); ui();
    if (announce) toast('Project opened');
  };
  S.game = o.game || null; covCache = null; graphCache = null; bnCache = null; cargoCache = null; sel_ind = null;
  if (o.gameMap){ const c = makeGameMap(); finish(c, null, c.width, c.height, 'game'); return; }
  const im = new Image();
  im.onload = () => finish(im, o.image, o.w || im.naturalWidth, o.h || im.naturalHeight, o.kind || 'image');
  im.onerror = () => toast('The screenshot inside that project could not be read.');
  im.src = o.image;
}
const dlReady = (!window.desktop && window.claude && window.claude.use) ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
async function saveFile(filename, data){
  if (window.desktop){
    try {
      const payload = data instanceof Blob ? await data.arrayBuffer() : data;
      const where = await window.desktop.saveFile(filename, payload);
      toast(where ? T('Saved to {path}', {path:where}) : 'Save cancelled');
    } catch (err){ toast(T('Could not save: {err}', {err:(err && err.message || err)})); }
    return;
  }
  const dl = await dlReady;
  if (dl){
    try { await dl.save({filename, data}); toast(T('Saved {file}', {file:filename})); }
    catch (err){
      const c = err && err.code;
      if (c === 'declined') toast('Save cancelled');
      else if (c === 'rate_limited') toast('A save prompt is already open');
      else toast('Saving isn’t available in this view');
    }
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function exportPNG(){
  finishLine(false);
  await document.fonts.ready;
  const c = document.createElement('canvas'); c.width = bg.w; c.height = bg.h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  renderScene(g, false);
  if (S.settings.legend) drawLegend(g);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  if (!blob){ toast('The image was too large to export.'); return; }
  await saveFile('transit-map.png', blob);
}

let dragDepth = 0;
window.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')){ dragDepth++; $('#drop').hidden = false; } });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth-1); if (!dragDepth) $('#drop').hidden = true; });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; $('#drop').hidden = true; readFile(e.dataTransfer.files[0]); });

