'use strict';
const fs = require('fs');
const path = require('path');

// Keeps only the TFO|... part of each line. The console prints export lines as they are; a mod's
// GUI print may put a prefix in front, and other log lines can land in between.
function cleanBlock(text){
  return text.split(/\r?\n/).map(l => { const i = l.indexOf('TFO|'); return i < 0 ? null : l.slice(i); }).filter(Boolean).join('\n');
}

// Returns the newest complete export (TFO|BEGIN … TFO|END) in the game log, or null.
function lastExportBlock(text){
  const end = text.lastIndexOf('TFO|END');
  if (end < 0) return null;
  const begin = text.lastIndexOf('TFO|BEGIN', end);
  if (begin < 0) return null;
  const lineStart = text.lastIndexOf('\n', begin) + 1;
  const endLine = text.indexOf('\n', end);
  const raw = text.slice(lineStart, endLine < 0 ? text.length : endLine);
  // Position plus length identifies an export; a new export appends a new block further down.
  return { text: cleanBlock(raw), signature: begin + ':' + raw.length };
}

// Finds stdout.txt for the given Steam app id under every Steam user, newest first.
function findGameLogs(appId){
  const roots = new Set();
  const pf86 = process.env['ProgramFiles(x86)'], pf = process.env.ProgramFiles;
  if (pf86) roots.add(path.join(pf86, 'Steam'));
  if (pf) roots.add(path.join(pf, 'Steam'));
  roots.add('C:\\Program Files (x86)\\Steam');
  roots.add('C:\\Program Files\\Steam');
  if (process.env.HOME){
    roots.add(path.join(process.env.HOME, '.steam', 'steam'));
    roots.add(path.join(process.env.HOME, '.local', 'share', 'Steam'));
  }
  const hits = [];
  for (const root of roots){
    const ud = path.join(root, 'userdata');
    let users = [];
    try { users = fs.readdirSync(ud); } catch { continue; }
    for (const u of users){
      const p = path.join(ud, u, appId, 'local', 'crash_dump', 'stdout.txt');
      try { const st = fs.statSync(p); hits.push({ p, t: st.mtimeMs }); } catch {}
    }
  }
  return hits.sort((a, b) => b.t - a.t).map(h => h.p);
}

module.exports = { lastExportBlock, findGameLogs, cleanBlock };
