// Regenerates the console export command from the mod's export.lua:
//   console/tfo_export.lua          readable, BEGIN line says "console" instead of "mod:N"
//   console/tfo_export_oneline.lua  minified one-liner (the game console drops pastes over ~9.5 kB)
//   desktop/app/game.js             the EXPORT_CMD constant, same one-liner
// Run after every change to export.lua:  cd desktop && npm run export-cmd
const fs = require('fs'), path = require('path'), luamin = require('luamin');
const root = path.join(__dirname, '..', '..');
const lua = fs.readFileSync(path.join(root, 'mod/transit_overlay/content/transit_overlay/export.lua'), 'utf8').split('\n');
const a = lua.findIndex(l => l.startsWith('function export.run()')) + 2, b = lua.lastIndexOf('return export') - 2;
// Everything between CONSOLE-SKIP-BEGIN and CONSOLE-SKIP-END (people and cargo flows, mod 7+) is left out:
// the console command would otherwise go over the paste limit. Those exports come from the mod only.
let skip = false;
const body = lua.slice(a, b).map(l => l.replace(/^\t/, ''))
  .filter(l => { if (l.startsWith('-- CONSOLE-SKIP-BEGIN')) skip = true; const drop = skip; if (l.startsWith('-- CONSOLE-SKIP-END')) skip = false; return !drop; })
  .filter(l => !l.startsWith('-- "mod:<revision>"') && !l.startsWith('-- mod and the app are out of step'))
  .map(l => l.replace(/P\("TFO\|BEGIN\|1\|mod:\d+"\)/, 'P("TFO|BEGIN|1|console")'));
const readable = body.join('\n') + '\n';
fs.writeFileSync(path.join(root, 'console/tfo_export.lua'), readable);
const min = luamin.minify(readable);
fs.writeFileSync(path.join(root, 'console/tfo_export_oneline.lua'), min + '\n');
const html = path.join(root, 'desktop/app/game.js'), h = fs.readFileSync(html, 'utf8');
if (!/const EXPORT_CMD = ".*";\n/.test(h)) throw new Error('EXPORT_CMD not found in game.js');
const h2 = h.replace(/const EXPORT_CMD = ".*";\n/, 'const EXPORT_CMD = ' + JSON.stringify(min) + ';\n');
if (h2 !== h) fs.writeFileSync(html, h2);
console.log(`console command: ${min.length} bytes (readable ${readable.length})`);
