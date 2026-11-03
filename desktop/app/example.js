'use strict';
/* The example map shown before anything is loaded.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- example ---------- */
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeExampleMap(){
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const g = c.getContext('2d'); const R = rng(7);
  g.fillStyle = '#ECE8DF'; g.fillRect(0, 0, 1600, 1000);
  g.fillStyle = '#D4E6BE';
  [[300,170,170,105,0.3],[1260,700,120,85,-0.2],[720,915,210,60,0.05],[90,650,70,110,0]].forEach(([x,y,a,b,r]) => { g.beginPath(); g.ellipse(x,y,a,b,r,0,Math.PI*2); g.fill(); });
  g.save(); g.translate(800, 500); g.rotate(-0.12);
  for (let pass = 0; pass < 2; pass++){
    g.strokeStyle = pass ? '#FBFAF7' : '#D7D0C3'; g.lineWidth = pass ? 6 : 8.5;
    for (let x = -1100; x <= 1100; x += 64 + Math.floor(R()*14)){ g.beginPath(); g.moveTo(x, -900); g.lineTo(x + (R()-0.5)*40, 900); g.stroke(); }
    for (let y = -800; y <= 800; y += 58 + Math.floor(R()*14)){ g.beginPath(); g.moveTo(-1200, y); g.lineTo(1200, y + (R()-0.5)*40); g.stroke(); }
  }
  g.restore();
  const roads = [[[0,860],[400,700],[820,520],[1600,250]],[[230,0],[480,420],[640,1000]],[[1000,1000],[1080,600],[1150,0]],[[0,300],[600,260],[1600,820]]];
  [['#D8B663',16],['#F6DC95',12]].forEach(([col, w]) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; roads.forEach(r => { g.beginPath(); g.moveTo(r[0][0], r[0][1]); g.quadraticCurveTo(r[1][0], r[1][1], r[2][0], r[2][1]); if (r[3]) g.lineTo(r[3][0], r[3][1]); g.stroke(); }); });
  g.fillStyle = '#A8CDE0';
  g.beginPath(); g.moveTo(1600, 0); g.lineTo(1600, 520); g.bezierCurveTo(1470, 480, 1390, 340, 1310, 270); g.bezierCurveTo(1240, 200, 1210, 90, 1250, 0); g.closePath(); g.fill();
  g.strokeStyle = '#A8CDE0'; g.lineWidth = 44; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-20, 560); g.bezierCurveTo(360, 520, 560, 440, 760, 430); g.bezierCurveTo(980, 420, 1150, 330, 1330, 290); g.stroke();
  g.fillStyle = '#8A8377'; g.font = '600 italic 22px ' + FONT; g.textAlign = 'center';
  [['OLD TOWN',700,600],['NORRVIK',420,140],['HARBOUR',1420,200],['WESTGATE',230,760],['SÖDERDAL',1200,880],['EASTBANK',1450,690]].forEach(([t,x,y]) => { g.save(); g.translate(x, y); if (g.letterSpacing !== undefined) g.letterSpacing = '4px'; g.fillText(t, 0, 0); g.restore(); });
  return c;
}
function loadExample(){
  const c = makeExampleMap();
  bg = {img:c, src:null, w:1600, h:1000, kind:'example'};
  S = {nodes:{}, lines:[], stations:{}, nextId:1, settings:{...DEFAULT_SETTINGS}, example:true, game:null};
  const N = {};
  const pts = {A:[150,820],B:[450,640],C:[800,500],D:[1120,400],E:[1500,640],T1:[260,170],T2:[560,320],T3:[1180,700],T4:[1330,900],B1:[560,960],B2:[660,760],B3:[1050,170],L1:[800,735],L2:[880,610],R1:[40,430],R2:[930,860],R3:[1580,930]};
  for (const k in pts) N[k] = addNode(pts[k][0], pts[k][1]);
  const mk = (name, mode, color, ...brs) => S.lines.push(migrate({id:nid(), name, mode, color, branches:brs.map(([keys, oneway]) => ({path:keys.map(k => N[k]), oneway:!!oneway}))}));
  mk('M1', 'subway', '#D6282E', [['A','B','C','D','E']]);
  mk('Commuter 40', 'train', '#5B4A9E', [['R1','B','R2','R3']]);
  mk('Tram 7', 'tram', '#159447', [['T1','T2','C','D','T3','T4']]);
  mk('Bus 42', 'bus', '#1F5FAD', [['B1','B2','C','D','B3']], [['B2','L1','L2','C'], true]);
  S.stations[N.C] = {name:'Central', side:'w'};
  S.stations[N.D] = {name:'Harbour', side:'e'};
  S.stations[N.B] = {name:'Westgate', side:'n'};
  S.stations[N.T2] = {name:'Parkside', side:'e'};
  S.stations[N.E] = {name:'Eastbank', side:'e'};
  hist.u = []; hist.r = []; activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null};
}

