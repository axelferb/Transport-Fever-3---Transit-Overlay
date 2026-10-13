'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { lastExportBlock, findGameLogs, cleanBlock } = require('./logtools');

const GAME_APP_ID = '3493540'; // Transport Fever 3 on Steam
const CONFIG_FILE = () => path.join(app.getPath('userData'), 'config.json');

let win = null;
let config = { logPath: null, watching: true };
let watchTimer = null;
let lastSeen = { at:null, count:0 };

function loadConfig(){
  try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE(), 'utf8')) }; } catch {}
}
function saveConfig(){
  try { fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true }); fs.writeFileSync(CONFIG_FILE(), JSON.stringify(config, null, 2)); } catch {}
}
function resolveLogPath(){
  if (config.logPath && fs.existsSync(config.logPath)) return config.logPath;
  const found = findGameLogs(GAME_APP_ID);
  return found.length ? found[0] : null;
}
function readLatest(){
  const p = resolveLogPath();
  if (!p) return { error: 'The game log was not found. Use “Choose log file…”.' };
  try {
    const text = fs.readFileSync(p, 'utf8');
    const block = lastExportBlock(text);
    if (!block) return { error: 'No export found in the game log yet. Run the export command in the game console first.' };
    return { text: block.text, path: p };
  } catch (err){ return { error: 'Could not read the game log: ' + err.message }; }
}
// Poll the log. Windows often reports stale size/time for a file another program keeps open,
// so open it each time and read whatever was appended since the last check.
const BEGIN = Buffer.from('TFO|BEGIN'), END = Buffer.from('TFO|END');
let tail = { path:null, offset:0, buf:Buffer.alloc(0) };
function readNew(p){
  let fd;
  try {
    fd = fs.openSync(p, 'r');
    const size = fs.fstatSync(fd).size;
    if (tail.path !== p || size < tail.offset){ tail = { path:p, offset: tail.path === p ? 0 : size, buf:Buffer.alloc(0) }; }
    if (size <= tail.offset) return null;
    const chunk = Buffer.alloc(size - tail.offset);
    fs.readSync(fd, chunk, 0, chunk.length, tail.offset);
    tail.offset = size;
    return chunk;
  } catch { return null; } finally { if (fd != null) try { fs.closeSync(fd); } catch {} }
}
function checkLog(){
  const p = resolveLogPath(); if (!p) return;
  const chunk = readNew(p); if (!chunk) return;
  let buf = Buffer.concat([tail.buf, chunk]);
  const e = buf.lastIndexOf(END);
  if (e >= 0){
    const b = buf.lastIndexOf(BEGIN, e);
    let lineEnd = buf.indexOf(0x0a, e + 1); if (lineEnd < 0) lineEnd = buf.length;
    if (b >= 0){
      const text = cleanBlock(buf.slice(b, lineEnd).toString('utf8'));
      lastSeen.at = Date.now(); lastSeen.count = (lastSeen.count || 0) + 1;
      if (win && !win.isDestroyed()) win.webContents.send('export', text);
    }
    buf = buf.slice(lineEnd);
  }
  // Keep only what could still be the start of an unfinished export.
  const b2 = buf.lastIndexOf(BEGIN);
  tail.buf = b2 >= 0 ? buf.slice(b2) : buf.slice(Math.max(0, buf.length - 64));
}
function startWatching(){
  stopWatching();
  const p = resolveLogPath();
  if (!p) return;
  tail = { path:null, offset:0, buf:Buffer.alloc(0) };
  readNew(p); // first call only records the current end of the log; earlier exports are ignored
  watchTimer = setInterval(checkLog, 1500);
}
function stopWatching(){ if (watchTimer){ clearInterval(watchTimer); watchTimer = null; } }

function createWindow(){
  win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 900, minHeight: 600,
    title: 'Transit Overlay',
    backgroundColor: '#E7E5E0',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

ipcMain.handle('log-info', () => ({ path: resolveLogPath(), watching: !!watchTimer, lastAt: lastSeen.at, count: lastSeen.count }));
ipcMain.handle('read-latest', () => readLatest());
ipcMain.handle('set-watch', (_e, on) => { config.watching = !!on; saveConfig(); on ? startWatching() : stopWatching(); return !!watchTimer; });
ipcMain.handle('choose-log', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Choose the game log (stdout.txt)',
    defaultPath: resolveLogPath() || undefined,
    filters: [{ name: 'Game log', extensions: ['txt', 'log'] }], properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  config.logPath = r.filePaths[0]; saveConfig();
  if (config.watching) startWatching();
  return config.logPath;
});
ipcMain.handle('save-file', async (_e, name, data) => {
  const ext = path.extname(name).slice(1) || 'png';
  const r = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('pictures'), name),
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (r.canceled || !r.filePath) return null;
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  fs.writeFileSync(r.filePath, buf);
  return r.filePath;
});

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  if (config.watching) startWatching();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { stopWatching(); if (process.platform !== 'darwin') app.quit(); });
