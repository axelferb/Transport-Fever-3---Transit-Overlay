'use strict';
/* Transport Fever 3 import: parsing the export, coverage, roads and tracks, the game map, terrain, gaps, mod/app version checks.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- Transport Fever 3 import ---------- */
const EXPORT_CMD = "local a=api.type.ComponentType;local b=api.engine.getComponent;local c=api.engine.system;local d=print;local e=table.concat;local function f(g)g=tostring(g or\"\")g=g:gsub(\"[|;\\r\\n]\",\" \")return g end;local function h(i)return string.format(\"%.1f\",i)end;local function j(k)local l={}if k==nil then return l end;local m=#k;for n=1,m do l[#l+1]=k[n]end;return l end;local o,p,q,r;local function s(t,u)if not o then o,p,q,r=t,u,t,u else if t<o then o=t end;if u<p then p=u end;if t>q then q=t end;if u>r then r=u end end end;local function v(w)local x=b(w,a.BOUNDING_VOLUME)if not x then return nil end;local y,z=x.bbox.min,x.bbox.max;local t,u=(y.x+z.x)/2,(y.y+z.y)/2;s(t,u)return t,u end;local function A(B,C,D,E)local F={}for n=1,#D do F[#F+1]=D[n]if#F>=E then d(B..C..e(F,\";\"))F={}end end;if#F>0 then d(B..C..e(F,\";\"))end end;local function G(H)local I=b(H,a.STOCK_LIST)if not I then return nil end;local J,K={},j(I.stockDatas)for n,t in ipairs(j(I.stocks))do J[#J+1]=t.type..\":\"..t.cargoType..\":\"..t.capacity..\":\"..h(K[n]and K[n].consumeFrequency or 0)end;local L={}for M,N in ipairs(j(I.rules))do local O={}for M,P in ipairs(j(N.input))do O[#O+1]=e(j(P),\"/\")end;local Q={}pcall(function()for R,y in pairs(N.output)do Q[#Q+1]=R..\":\"..y end end)L[#L+1]=e(O,\"+\")..\">\"..e(Q,\"/\")..\">\"..(N.booster and\"b\"or\"\")end;local S={}pcall(function()for R,T in pairs(I.cargoData)do S[#S+1]=R..\":\"..h(T.produceFrequency or 0)end end)return e(J,\";\")..\"|\"..e(L,\"~\")..\"|\"..e(S,\";\")end;d(\"TFO|BEGIN|1|console\")local U,V={},{}local W={}local X,Y=pcall(function()for M,Z in ipairs(j(c.lineSystem.getLines()))do local _=b(Z,a.LINE)local a0=b(Z,a.NAME)local a1=b(Z,a.COLOR)local a2={}local a3=_.vehicleInfo and _.vehicleInfo.transportModes;if a3 then for n=0,16 do if a3[n]==true then a2[#a2+1]=n end end end;local J={}for M,g in ipairs(j(_.stops))do J[#J+1]=g.stationGroup;if not U[g.stationGroup]then U[g.stationGroup]=true;V[#V+1]=g.stationGroup end end;local a4,a5={},{}for M,g in ipairs(j(_.stops))do local a6=g.stopConfig and g.stopConfig.load;if a6 then for n=1,#a6 do if a6[n]==true then a4[n]=true end end end end;for n=1,64 do if a4[n]then a5[#a5+1]=n end end;local R=a1 and a1.color or{x=0.5,y=0.5,z=0.5}d(\"TFO|L|\"..Z..\"|\"..f(a0 and a0.name)..\"|\"..string.format(\"%.3f,%.3f,%.3f\",R.x,R.y,R.z)..\"|\"..e(a2,\",\")..\"|\"..e(J,\",\")..\"|\"..e(a5,\",\"))end end)if not X then d(\"TFO|ERR|lines|\"..f(Y))end;local a7=c.townBuildingSystem.getTown2BuildingMap;local a8={}local a9=c.catchmentAreaSystem.getStationCatchables;X,Y=pcall(function()for M,aa in ipairs(V)do local ab=b(aa,a.STATION_GROUP)local a0=b(aa,a.NAME)local ac,ad,ae,N=0,0,0,0;local af=j(ab and ab.stations)local ag,ah,ai={},0,0;for M,g in ipairs(af)do local J=b(g,a.STATION)for M,aj in ipairs(j(J and J.catchmentAreas))do local ak=aj.position;ac=ac+ak.x;ad=ad+ak.y;ae=ae+1;if aj.radius>N then N=aj.radius end;ag[#ag+1]=h(ak.x)..\":\"..h(ak.y)..\":\"..h(aj.radius)end;ah=ah+#j(J and J.terminals)local al,am=pcall(c.streetConnectorSystem.getConstructionEntityForStation,g)if al and(tonumber(am)or-1)>=0 then ai=1 end end;if ae==0 then for M,g in ipairs(af)do local t,u=v(g)if t then ac=ac+t;ad=ad+u;ae=ae+1 end end end;if ae>0 then d(\"TFO|G|\"..aa..\"|\"..f(a0 and a0.name)..\"|\"..h(ac/ae)..\",\"..h(ad/ae)..\"|\"..N..\"|\"..#af..\",\"..ah..\",\"..ai..\"|\"..e(ag,\";\"))end;local an,ao={},{}for M,g in ipairs(af)do local ap=j(a9(g,false))for M,z in ipairs(ap)do if not an[z]then an[z]=true;ao[#ao+1]=z;a8[z]=true end end end;A(\"TFO|C|\",aa..\"|\",ao,400)local aq,ar={},{}for M,g in ipairs(af)do local al,ap=pcall(function()return j(a9(g,true))end)if al then for M,z in ipairs(ap)do if not aq[z]then aq[z]=true;ar[#ar+1]=z end end end end;A(\"TFO|K|\",aa..\"|\",ar,400)end end)if not X then d(\"TFO|ERR|groups|\"..f(Y))end;X,Y=pcall(function()local as=a7()local at={}for au,D in pairs(as)do local av=b(au,a.NAME)d(\"TFO|T|\"..au..\"|\"..f(av and av.name))for M,z in ipairs(j(D))do local t,u=v(z)if t then local aw=b(z,a.TOWN_BUILDING)local ax=aw and aw.personCapacity or z;local ay=ax and ax>=0 and b(ax,a.PERSON_CAPACITY)or nil;at[#at+1]=z..\",\"..h(t)..\",\"..h(u)..\",\"..(ay and ay.capacity or 0)..\",\"..(ay and ay.type or-1)..\",\"..au..\",\"..ax;if aw and aw.stockList and aw.stockList>=0 then W[aw.stockList]=z;local az,aA=pcall(G,aw.stockList)if az and aA then d(\"TFO|S|\"..z..\"|\"..aA)end end end end end;A(\"TFO|B|\",\"\",at,150)end)if not X then d(\"TFO|ERR|buildings|\"..f(Y))end;X,Y=pcall(function()api.engine.forEachEntityWithComponent(function(w)local aB,aC=pcall(function()local aD=b(w,a.INDUSTRY)local t,u=v(w)if not t and aD and aD.construction then t,u=v(aD.construction)end;if not t then return end;local a0=b(w,a.NAME)if not a0 and aD and aD.construction then a0=b(aD.construction,a.NAME)end;if aD and aD.stockList and aD.stockList>=0 then W[aD.stockList]=w end;local aA=G(aD and aD.stockList or w)or\"||\"d(\"TFO|I|\"..w..\"|\"..h(t)..\",\"..h(u)..\"|\"..(aD and aD.level or 0)..\"|\"..f(a0 and a0.name)..\"|\"..aA)end)if not aB then d(\"TFO|ERR|industry|\"..f(aC))end end,a.INDUSTRY)end)if not X then d(\"TFO|ERR|industries|\"..f(Y))end;X,Y=pcall(function()local aE=api.res.cargoTypeRep;local aF=aE.getAll()for n=0,63 do local aG=aF[n]if aG then local a0=nil;pcall(function()a0=aE.getName(n)end)if type(a0)~=\"string\"or a0==\"\"then a0=tostring(aG):match(\"([^/]+)%.cargo$\")or tostring(aG)end;d(\"TFO|N|\"..n..\"|\"..f(a0))end end end)if not X then d(\"TFO|ERR|cargonames|\"..f(Y))end;X,Y=pcall(function()for au,M in pairs(a7())do for aH=1,2 do local aI,T=pcall(function()return c.townBuildingSystem.getCargoSupplyAndLimit(au,aH)end)if aI and T then local aJ={}pcall(function()for R,i in pairs(T)do aJ[#aJ+1]=R..\":\"..h(i[1]or 0)..\":\"..h(i[2]or 0)..\":\"..h(i[3]or 0)end end)if#aJ>0 then d(\"TFO|D|\"..au..\"|\"..aH..\"|\"..e(aJ,\";\"))end end end end end)if not X then d(\"TFO|ERR|demand|\"..f(Y))end;X,Y=pcall(function()for Z,aK in pairs(c.transportVehicleSystem.getLine2VehicleMap())do local aL,aM,aN=0,0,0;for M,i in ipairs(j(aK))do aL=aL+1;pcall(function()local ap=b(i,a.TRANSPORT_VEHICLE).config.capacities;local z=ap[0]~=nil and 0 or 1;for n=z,z+#ap-1 do local m=tonumber(ap[n])or 0;if n==z then aM=aM+m else aN=aN+m end end end)local aO,aP=pcall(b,i,a.MOVE_PATH)if aO and aP and aP.path and aP.path.edges then local aQ,aR={},nil;for M,aS in ipairs(j(aP.path.edges))do local w=aS.edgeId and aS.edgeId.entity;if w and w~=aR then aQ[#aQ+1]=w;aR=w end end;if#aQ>1 then d(\"TFO|R|\"..Z..\"|\"..e(aQ,\",\"))end end end;d(\"TFO|V|\"..Z..\"|\"..aL..\"|\"..aM..\"|\"..aN)end end)if not X then d(\"TFO|ERR|routes|\"..f(Y))end;local aT,aU,aV,aW={},{},{},false;local function aX(m)local aY=aT[m]if aY==nil then local aZ=b(m,a.BASE_NODE)aY=aZ and aZ.position or false;aT[m]=aY;if aY then s(aY.x,aY.y)end end;return aY end;local function a_(w)local b0,b1,b2=0,0,0;local X=pcall(function()for M,Z in ipairs(j(b(w,a.TRANSPORT_NETWORK).edges))do local b3=tonumber(Z.geometry and Z.geometry.width)or 0;local b4=Z.transportModes;local b5,b6,b7=b4[2]==true,b4[5]==true or b4[6]==true,false;for n=2,16 do if b4[n]==true then b7=true end end;if not b7 then b1=b1+b3 elseif b5 or not b6 then b0=b0+b3;local i=tonumber(Z.speedLimit)or 0;if i>b2 then b2=i end end end end)if not X or b0<=0 then return\"0,0,0\"end;return h(b0)..\",\"..h(b0+b1)..\",\"..string.format(\"%.0f\",b2*3.6)end;local function b8(b9,ba)local bb,bc=pcall(function()for M,bd in pairs(ba())do for M,w in ipairs(j(bd))do if not aU[w]then aU[w]=true;local be,bf=pcall(function()local bg=b(w,a.BASE_EDGE)if bg and bg.node0 and bg.node1 then local bh,bi=aX(bg.node0),aX(bg.node1)if bh and bi then local bj,bk=bg.tangent0,bg.tangent1;aV[#aV+1]=w..\",\"..bg.node0 ..\",\"..bg.node1 ..\",\"..h(bh.x)..\",\"..h(bh.y)..\",\"..h(bi.x)..\",\"..h(bi.y)..\",\"..(bj and h(bj.x)..\",\"..h(bj.y)or\"0,0\")..\",\"..(bk and h(bk.x)..\",\"..h(bk.y)or\"0,0\")..\",\"..b9 ..\",\"..(b9==\"s\"and a_(w)or\"0,0,0\")end end end)if not be and not aW then aW=true;d(\"TFO|ERR|edge|\"..f(bf))end end end end end)if not bb then d(\"TFO|ERR|edges-\"..b9 ..\"|\"..f(bc))end end;b8(\"s\",function()return c.streetSystem.getNode2StreetEdgeMap()end)b8(\"t\",function()return c.streetSystem.getNode2TrackEdgeMap()end)A(\"TFO|E|\",\"\",aV,120)X,Y=pcall(function()if not o then return end;local bl=api.engine.terrain;if not bl then error(\"api.engine.terrain is missing\")end;local bm=function(t,u)return bl.getHeightAt(api.type.Vec2f.new(t,u))end;local bn,bo=pcall(bm,o,p)if not bn or type(bo)~=\"number\"then bm=function(t,u)return bl.getHeightAt(api.type.Vec2d.new(t,u))end;bn,bo=pcall(bm,o,p)end;if not bn or type(bo)~=\"number\"then error(\"getHeightAt failed: \"..tostring(bo))end;local bp=nil;for M,bq in ipairs({function()return bl.getWaterLevel()end,function()return api.res.getBaseConfig().waterLevel end,function()return game.config.terrain.waterLevel end})do local l,i=pcall(bq)if l and type(i)==\"number\"then bp=i;break end end;local b4=600;local br,bs=o-b4,p-b4;local bt=math.max(16,math.ceil(math.max(q-o,r-p)/320))local bu=math.floor((q+b4-br)/bt)+1;local at=math.floor((r+b4-bs)/bt)+1;d(\"TFO|W|\"..h(br)..\",\"..h(bs)..\",\"..bt..\",\"..bu..\",\"..at..\"|\"..(bp and h(bp)or\"\"))for bv=0,at-1 do local N={}local u=bs+bv*bt;for n=0,bu-1 do local l,bw=pcall(bm,br+n*bt,u)N[#N+1]=l and type(bw)==\"number\"and string.format(\"%.0f\",bw*2)or\"\"end;d(\"TFO|H|\"..bv..\"|\"..e(N,\",\"))end end)if not X then d(\"TFO|ERR|terrain|\"..f(Y))end;d(\"TFO|END|\"..#V)";
let covCache = null, alignPick = null;
const cmul = (a, b) => [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]];
function W2I(X, Y){ const xf = S.game.xf; const z = cmul(xf.a, [X, xf.mirror ? Y : -Y]); return {x:z[0] + xf.b[0], y:z[1] + xf.b[1]}; }
const pxPerM = () => Math.hypot(S.game.xf.a[0], S.game.xf.a[1]);
function rgbHex(s){
  const v = String(s || '').split(',').map(Number);
  if (v.length < 3 || v.some(isNaN)) return '#888888';
  return '#' + v.slice(0, 3).map(c => Math.round(Math.max(0, Math.min(1, c))*255).toString(16).padStart(2, '0')).join('');
}
function parseExport(text){
  // keep only the TFO|... part of each line (a mod's print may add a prefix)
  const rows = text.split(/\r?\n/).map(l => { const i = l.indexOf('TFO|'); return i > 0 ? l.slice(i) : l; });
  let start = -1, end = -1;
  for (let i = rows.length - 1; i >= 0; i--){
    if (end < 0 && rows[i].startsWith('TFO|END')) end = i;
    if (end >= 0 && rows[i].startsWith('TFO|BEGIN')){ start = i; break; }
  }
  if (start < 0 || end < 0) throw new Error('No export found in that file. Run the export command in the game console first, then import stdout.txt.');
  const G = {lines:[], groups:{}, catch:{}, buildings:[], towns:{}, edges:[], industries:[], bstock:{}, ccatch:{}, cargoNames:{}, demand:{}, raw:[], legs:{}, vehicles:{}, people:{}, trips:{}, flows:[], errors:[], at:Date.now(), xf:null, align:null};
  { // TFO|BEGIN|<format>|mod:<revision> or |console; exports from before mod revision 4 have neither
    const h = rows[start].split('|'), src = h[3] || '';
    G.source = {format:+h[2] || 1, kind:src.startsWith('mod:') ? 'mod' : src === 'console' ? 'console' : null, rev:src.startsWith('mod:') ? +src.slice(4) || 0 : null};
  }
  for (let i = start + 1; i < end; i++){
    const p = rows[i].split('|');
    if (p[0] !== 'TFO') continue;
    if (p[1] === 'L') G.lines.push({id:+p[2], name:p[3] || ('Line ' + p[2]), color:rgbHex(p[4]),
      modes:p[5] ? p[5].split(',').map(Number) : [], stops:p[6] ? p[6].split(',').map(Number) : [],
      load:p[7] != null && p[7] !== '' ? p[7].split(',').map(Number) : null});
    else if (p[1] === 'G'){ // id | name | x,y | radius | stations,terminals,building (mod 6+) | x:y:r;… every catchment circle (mod 6+)
      const xy = (p[4] || '').split(',').map(Number), k = (p[6] || '').split(',').map(Number);
      const circles = (p[7] || '').split(';').filter(Boolean).map(c => c.split(':').map(Number)).filter(c => c.length === 3 && !c.some(isNaN));
      G.groups[p[2]] = {name:p[3] || 'Stop ' + p[2], x:xy[0], y:xy[1], r:+p[5] || 0, stations:k[0] || 0, terminals:k[1] || 0, building:k[2] === 1, circles};
    }
    else if (p[1] === 'V'){ G.vehicles[p[2]] = {n:+p[3] || 0, seats:+p[4] || 0, cargo:+p[5] || 0}; } // per line (mod 6+)
    else if (p[1] === 'C'){ (G.catch[p[2]] = G.catch[p[2]] || []).push(...p[3].split(';').filter(Boolean).map(Number)); }
    else if (p[1] === 'B'){ for (const r of p[2].split(';')){ if (!r) continue; const f = r.split(',').map(Number); if (f.length >= 6 && !isNaN(f[1])) G.buildings.push(f); } }
    else if (p[1] === 'E'){ for (const r of p[2].split(';')){ if (!r) continue; const f = r.split(','); if (f.length < 12) continue; const e = f.slice(0, 11).map(Number); if (e.some(isNaN)) continue; e.push(f[11] === 's' ? 0 : 1, Number(f[12]) || 0, Number(f[13]) || 0, Number(f[14]) || 0); G.edges.push(e); } } // e[12] roadway width, e[13] width incl. sidewalks (m), e[14] speed limit (km/h); 0 = unknown
    else if (p[1] === 'T') G.towns[p[2]] = p[3];
    else if (p[1] === 'I'){ const xy = (p[3] || '').split(',').map(Number); if (!isNaN(xy[0])) G.industries.push({id:+p[2], x:xy[0], y:xy[1], level:+p[4] || 0, name:p[5] || '', ...parseStock(p[6], p[7], p[8])}); }
    else if (p[1] === 'S') G.bstock[p[2]] = parseStock(p[3], p[4], p[5]);
    else if (p[1] === 'K'){ (G.ccatch[p[2]] = G.ccatch[p[2]] || []).push(...(p[3] || '').split(';').filter(Boolean).map(Number)); }
    else if (p[1] === 'N') G.cargoNames[p[2]] = p[3];
    else if (p[1] === 'R') G.raw.push({line:+p[2], ents:(p[3] || '').split(',').map(Number).filter(n => !isNaN(n))});
    else if (p[1] === 'D'){ const d = G.demand[p[2]] = G.demand[p[2]] || {}; d[+p[3]] = (p[4] || '').split(';').filter(Boolean).map(x => { const f = x.split(':').map(Number); return {cargo:f[0], supply:f[1], limit:f[2], extra:f[3]}; }); }
    else if (p[1] === 'W'){ const f = (p[2] || '').split(',').map(Number); if (f.length >= 5 && f.every(n => !isNaN(n)) && f[3] > 0 && f[4] > 0) G.terrain = {x0:f[0], y0:f[1], step:f[2], cols:f[3], rows:f[4], wl:p[3] !== '' && p[3] != null && !isNaN(+p[3]) ? +p[3] : null, h:new Array(f[3]*f[4]).fill(null)}; }
    else if (p[1] === 'H' && G.terrain){ const j = +p[2], T = G.terrain; if (j >= 0 && j < T.rows) (p[3] || '').split(',').forEach((v, i) => { if (v !== '' && i < T.cols){ const n = +v; if (!isNaN(n)) T.h[j*T.cols + i] = n / 2; } }); }
    // Where a building's traffic comes from (mod 7+), a snapshot at export time; see export.lua.
    else if (p[1] === 'P'){ for (const r of p[2].split(';')){ const f = r.split(',').map(Number); if (f.length < 6 || f.some(isNaN)) continue; (G.people[f[0]] = G.people[f[0]] || {})[f[1]] = f.slice(2, 6); } } // building,role,walk,drive,lines,other
    else if (p[1] === 'Q'){ for (const r of p[2].split(';')){ const f = r.split(',').map(Number); if (f.length < 6 || f.some(isNaN)) continue; (G.trips[f[0]] = G.trips[f[0]] || []).push({role:f[1], line:f[2], s0:f[3], s1:f[4], n:f[5]}); } } // building,role,line,stop0,stop1,people
    else if (p[1] === 'F'){ for (const r of p[2].split(';')){ const f = r.split(','); if (f.length < 8) continue; const [tgt, cargo, src, veh, term, stock, other] = [f[0], f[1], f[2], f[4], f[5], f[6], f[7]].map(Number); if ([tgt, cargo, src, veh, term, stock, other].some(isNaN)) continue;
      G.flows.push({tgt, cargo, src, lines:f[3].split('/').filter(Boolean).map(x => { const q = x.split(':').map(Number); return {line:q[0], s0:q[1], s1:q[2]}; }), veh, term, stock, other, at:f[8] != null && !isNaN(+f[8]) ? +f[8] : -1}); } } // target,cargo,source,line:stop0:stop1/…,in vehicle,at a station,at stock,other,stop group waited at
    else if (p[1] === 'ERR') G.errors.push(p.slice(2).join(' '));
  }
  if (!G.lines.length && !G.buildings.length) throw new Error('The export in that file is empty. Check the console for errors.');
  return G;
}
function isPax(l){
  if (l.modes.includes(4)) return false;
  if (/\bPAX\b/i.test(l.name)) return true;
  if (l.load && l.load.length) return l.load.includes(1);
  return l.modes.some(m => m === 3 || m === 5 || m === 6);
}
function gameMode(l){
  const m = l.modes;
  if (m.includes(5) || m.includes(6)) return 'tram';
  if (m.includes(7) || m.includes(8)) return 'train';
  if (m.includes(3) || m.includes(4)) return 'bus';
  if (m.includes(10) || m.includes(12)) return 'ferry';
  return null;
}
/* Vehicles per line come with the export from mod 6 on; a line that has none is in the map with n = 0
   or missing from it altogether. Without that data every line counts as running. */
function lineRuns(l){
  const V = S.game.vehicles; if (!V || !Object.keys(V).length) return true;
  return !!(V[l.id] && V[l.id].n > 0);
}
/* Buildings the game lists in the catchment of a stop that a running passenger line calls at.
   A stop that only idle lines (no vehicles) call at is not coverage: nobody can ride from it. */
function gameCovered(){
  if (covCache) return covCache;
  covCache = new Set();
  const groups = new Set();
  S.game.lines.forEach(l => { if (isPax(l) && lineRuns(l)) l.stops.forEach(s => groups.add(String(s))); });
  for (const k in S.game.catch) if (groups.has(k)) S.game.catch[k].forEach(id => covCache.add(id));
  return covCache;
}
/* Stops that only idle passenger lines call at, for the note in the coverage panel. */
function idleStops(){
  const live = new Set(), idle = new Set();
  S.game.lines.forEach(l => { if (!isPax(l)) return; l.stops.forEach(s => (lineRuns(l) ? live : idle).add(String(s))); });
  return [...idle].filter(s => !live.has(s));
}
const isServed = (b, cov) => cov.has(b[0]) || (b[6] != null && cov.has(b[6]));
/* 0 = not reached, 1 = reached by a game stop, 2 = reached only by a stop you planned */
function servedBy(b, cov, plan){ if (isServed(b, cov)) return 1; return plan.has(b[0]) ? 2 : 0; }
/* Planning: stops you add are measured like the game does it, by walking distance along streets. */
let bnCache = null, planCache = {sig:null, set:new Set(), per:{}};
function streetGrid(){
  const G = roadGraph(); if (G.grid) return G.grid;
  const grid = new Map();
  for (const n of G.adj[0].keys()){ const q = G.nodes.get(n), key = Math.floor(q[0]/100) + ',' + Math.floor(q[1]/100); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(n); }
  return G.grid = grid;
}
function nearStreet(x, y, maxD){
  const G = roadGraph(), grid = streetGrid(), cx = Math.floor(x/100), cy = Math.floor(y/100), rr = Math.ceil(maxD/100);
  let best = null, bd = maxD;
  for (let i = -rr; i <= rr; i++) for (let j = -rr; j <= rr; j++){
    const a = grid.get((cx + i) + ',' + (cy + j)); if (!a) continue;
    for (const n of a){ const q = G.nodes.get(n), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd){ bd = d; best = n; } }
  }
  return best == null ? null : {n:best, d:bd};
}
function buildingNodes(){ if (!bnCache) bnCache = S.game.buildings.map(b => nearStreet(b[1], b[2], 120)); return bnCache; }
function walkFrom(x, y, R){
  const st = nearStreet(x, y, 200); if (!st) return null;
  const A = roadGraph().adj[0], dist = new Map([[st.n, st.d]]), q = [[st.d, st.n]];
  while (q.length){
    let mi = 0; for (let i = 1; i < q.length; i++) if (q[i][0] < q[mi][0]) mi = i;
    const [d, n] = q[mi]; q[mi] = q[q.length - 1]; q.pop();
    if (d > dist.get(n)) continue;
    for (const [m, len] of (A.get(n) || [])){ const nd = d + len; if (nd <= R && nd < (dist.has(m) ? dist.get(m) : Infinity)){ dist.set(m, nd); q.push([nd, m]); } }
  }
  return dist;
}
function isCargoStop(id){
  const st = S.stations[id]; if (!st) return false;
  if (st.solo) return !!st.cargo;
  const users = S.lines.filter(l => lineHasNode(l, id));
  return users.length > 0 && users.every(l => l.cargo);
}
function planStations(){
  if (!S.game || !S.game.xf) return [];
  const out = [];
  for (const k in S.stations){
    const st = S.stations[k]; if (st.game || !S.nodes[k] || isCargoStop(+k)) continue;
    const w = I2W(S.nodes[k]); out.push({id:+k, x:w.x, y:w.y, r:+st.radius || defaultReach()});
  }
  return out;
}
function planCoverage(){
  const ps = planStations(), walk = S.settings.reach === 'walk' && !!(S.game.edges && S.game.edges.length);
  const sig = ps.map(p => p.id + ':' + p.x.toFixed(1) + ':' + p.y.toFixed(1) + ':' + p.r).join('|') + '#' + walk + S.game.at;
  if (planCache.sig === sig) return planCache;
  const set = new Set(), per = {}, bn = walk ? buildingNodes() : null;
  for (const p of ps){
    const mine = new Set(), dist = walk ? walkFrom(p.x, p.y, p.r) : null;
    S.game.buildings.forEach((b, i) => {
      let ok;
      if (walk){ const q = bn[i]; ok = q ? (dist != null && dist.has(q.n) && dist.get(q.n) + q.d*0.5 <= p.r) : Math.hypot(b[1] - p.x, b[2] - p.y) <= p.r*0.7; }
      else ok = Math.hypot(b[1] - p.x, b[2] - p.y) <= p.r;
      if (ok){ mine.add(b[0]); set.add(b[0]); }
    });
    per[p.id] = mine;
  }
  return planCache = {sig, set, per};
}
function drawCargoRadii(g, u){
  if (!S.game || !S.game.xf) return;
  const k = pxPerM();
  for (const p of cargoPlanStops()){
    const n = S.nodes[p.id]; g.beginPath(); g.arc(n.x, n.y, p.r*k, 0, Math.PI*2);
    g.fillStyle = 'rgba(242,169,0,0.10)'; g.fill(); g.setLineDash([6*u, 4*u]); g.lineWidth = Math.max(1, 1.4*u); g.strokeStyle = 'rgba(214,140,0,0.9)'; g.stroke(); g.setLineDash([]);
  }
}
function drawRadii(g, u){
  const mode = S.settings.radii || 'plan';
  if (!S.game || !S.game.xf || mode === 'off') return;
  const k = pxPerM();
  const circleOf = (st, n) => {
    // A game stop's reach is its real catchment circles (one per terminal, from mod 6 on); older exports
    // only have one averaged circle. A stop you planned is one circle at the marker.
    if (!st.game) return [[n.x, n.y, (+st.radius || defaultReach()) * k]];
    const gr = S.game.groups[st.sg];
    if (gr && gr.circles && gr.circles.length) return gr.circles.map(([x, y, r]) => { const q = W2I(x, y); return [q.x, q.y, r * k]; });
    return [[n.x, n.y, (st.r || 0) * k]];
  };
  const done = new Set();
  for (const id of Object.keys(S.stations)){
    const st = S.stations[id], n = S.nodes[id]; if (!n || isCargoStop(+id)) continue;
    if (st.game && mode !== 'all') continue;
    if (st.game && st.sg != null){ if (done.has(st.sg)) continue; done.add(st.sg); } // one marker per stop group is enough
    g.fillStyle = st.game ? 'rgba(40,40,40,0.04)' : 'rgba(242,169,0,0.10)';
    g.setLineDash(st.game ? [] : [6*u, 4*u]); g.lineWidth = Math.max(1, 1.4*u);
    g.strokeStyle = st.game ? 'rgba(40,40,40,0.28)' : 'rgba(214,140,0,0.9)';
    for (const [x, y, r] of circleOf(st, n)){ if (!r) continue; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill(); g.stroke(); }
    g.setLineDash([]);
  }
}
const CATS = [{label:'Homes', unit:'residents', color:'#8C7B5A'}, {label:'Businesses', unit:'jobs', color:'#8C7B5A'}, {label:'Industry', unit:'jobs', color:'#8C7B5A'}];
const covTypes = () => { const t = S.settings.covTypes; return Array.isArray(t) && t.length === 3 ? t : [true, false, false]; };
function catTotals(){
  const cov = gameCovered(), plan = planCoverage().set, out = CATS.map(() => ({people:0, served:0, planned:0}));
  for (const b of S.game.buildings){ const c = out[b[4]]; if (!c || !inFocus(b)) continue; c.people += b[3]; const sv = servedBy(b, cov, plan); if (sv) c.served += b[3]; if (sv === 2) c.planned += b[3]; }
  return out;
}
/* Road and track network: each edge is [id, node0, node1, x0, y0, x1, y1, t0x, t0y, t1x, t1y, kind(0 street, 1 track)]. */
let graphCache = null;
/* Road class per street edge, 0..3 (lane, street, avenue, highway), from the exported roadway width (e[12]).
   TF3 reports the width per block, and a block with a bus bay or station lanes comes out much wider than the
   street it belongs to, so each edge takes the median of itself and its two collinear continuations (two passes).
   Exports without widths (before mod revision 5) are all class 1. Cached on the game object. */
function roadClasses(G){
  if (G.rc && G.rc.for === G.edges) return G.rc;
  const E = G.edges, cls = e => { const w = e[12]; return !(w > 0) ? 1 : w <= 6.5 ? 0 : w <= 12.5 ? 1 : w <= 22.5 ? 2 : 3; };
  // Road type from the speed limit: 0 town street (up to 50 km/h, or unknown), 1 country road (60-80), 2 highway (90+).
  const typ = e => { const v = e[14]; return v >= 90 ? 2 : v >= 60 ? 1 : 0; };
  const byNode = new Map();
  E.forEach((e, i) => { if (e[11] !== 0) return; for (const n of [e[1], e[2]]){ if (!byNode.has(n)) byNode.set(n, []); byNode.get(n).push(i); } });
  const dir = (e, n) => { const dx = e[5] - e[3], dy = e[6] - e[4], L = Math.hypot(dx, dy) || 1; return e[1] === n ? [dx/L, dy/L] : [-dx/L, -dy/L]; };
  // the continuation of edge i through node n: the other street edge leaving n most nearly straight on (within ~60°)
  const cont = (i, n) => { const d = dir(E[i], n); let best = -1, bd = 0.5; for (const j of byNode.get(n) || []){ if (j === i) continue; const d2 = dir(E[j], n), dot = -(d[0]*d2[0] + d[1]*d2[1]); if (dot > bd){ bd = dot; best = j; } } return best; };
  // walk the street from edge i through node n: the next edge and the node after it
  const step = (i, n) => { const j = cont(i, n); return j < 0 ? null : [j, E[j][1] === n ? E[j][2] : E[j][1]]; };
  let c = E.map(cls);
  for (let pass = 0; pass < 3; pass++){
    const nc = c.slice();
    E.forEach((e, i) => {
      if (e[11] !== 0) return;
      const win = [c[i]];
      for (const n0 of [e[1], e[2]]){ let s = step(i, n0); if (!s) continue; win.push(c[s[0]]); s = step(s[0], s[1]); if (s) win.push(c[s[0]]); }
      if (win.length < 3) return;
      win.sort((x, y) => x - y); nc[i] = win[(win.length - 1) >> 1];
    });
    c = nc;
  }
  G.rc = {for:E, c, t:E.map(typ)};
  return G.rc;
}
function edgeInterior(e){
  const x0 = e[3], y0 = e[4], x1 = e[5], y1 = e[6], t0x = e[7], t0y = e[8], t1x = e[9], t1y = e[10];
  const cx = x1 - x0, cy = y1 - y0, L = Math.hypot(cx, cy), l0 = Math.hypot(t0x, t0y), l1 = Math.hypot(t1x, t1y);
  if (!L || !l0 || !l1) return [];
  const dev = Math.abs((t0x*cy - t0y*cx) / (l0*L)) + Math.abs((t1x*cy - t1y*cx) / (l1*L));
  if (dev < 0.06) return [];
  const n = Math.min(8, Math.max(2, Math.round(L / 35))), out = [];
  for (let i = 1; i < n; i++){
    const t = i / n, t2 = t*t, t3 = t2*t;
    const h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + t, h01 = -2*t3 + 3*t2, h11 = t3 - t2;
    out.push({x:h00*x0 + h10*t0x + h01*x1 + h11*t1x, y:h00*y0 + h10*t0y + h01*y1 + h11*t1y});
  }
  return out;
}
/* adj[0] streets, adj[1] tracks, adj[2] both together (kind MIXED): a tram that leaves the street for a stretch of
   railway is routed on the joint graph, which is connected where a street edge and a track edge share a node. */
const MIXED = 2;
function roadGraph(){
  if (graphCache) return graphCache;
  const nodes = new Map(), adj = [new Map(), new Map(), new Map()];
  S.game.edges.forEach((e, i) => {
    nodes.set(e[1], [e[3], e[4]]); nodes.set(e[2], [e[5], e[6]]);
    const len = Math.hypot(e[5] - e[3], e[6] - e[4]) || 0.1;
    for (const A of [adj[e[11]], adj[MIXED]]){
      if (!A.has(e[1])) A.set(e[1], []); if (!A.has(e[2])) A.set(e[2], []);
      A.get(e[1]).push([e[2], len, i]); A.get(e[2]).push([e[1], len, i]);
    }
  });
  return graphCache = {nodes, adj};
}
function nearestGraphNode(x, y, k, maxD){
  const G = roadGraph(); let best = null, bd = maxD;
  for (const n of G.adj[k].keys()){ const p = G.nodes.get(n), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd){ bd = d; best = n; } }
  return best;
}
function shortestPath(src, dst, k, pref){
  const A = roadGraph().adj[k], dist = new Map([[src, 0]]), prev = new Map(), h = [[0, src]];
  const push = (d, n) => { h.push([d, n]); let i = h.length - 1; while (i > 0){ const q = (i - 1) >> 1; if (h[q][0] <= h[i][0]) break; [h[q], h[i]] = [h[i], h[q]]; i = q; } };
  const pop = () => { const top = h[0], last = h.pop(); if (h.length){ h[0] = last; let i = 0; for (;;){ const l = 2*i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
  let guard = 0;
  while (h.length && guard++ < 400000){
    const [d, n] = pop();
    if (n === dst) break;
    if (d > dist.get(n)) continue;
    for (const [m, len, ei] of (A.get(n) || [])){
      const nd = d + (pref && pref.has(ei) ? len * 0.05 : len);
      if (nd < (dist.has(m) ? dist.get(m) : Infinity)){ dist.set(m, nd); prev.set(m, [n, ei]); push(nd, m); }
    }
  }
  if (!prev.has(dst)) return null;
  const path = []; let cur = dst;
  while (cur !== src){ const [q, ei] = prev.get(cur); path.push([q, cur, ei]); cur = q; }
  return path.reverse();
}
function townStats(){
  const cov = gameCovered(), plan = planCoverage().set, t = {}, types = covTypes();
  for (const b of S.game.buildings){
    if (!types[b[4]]) continue;
    const r = t[b[5]] || (t[b[5]] = {id:b[5], name:S.game.towns[b[5]] || ('Town ' + b[5]), people:0, served:0});
    r.people += b[3]; if (servedBy(b, cov, plan)) r.served += b[3];
  }
  return Object.values(t).filter(r => r.people > 0).sort((a, b) => (b.people - b.served) - (a.people - a.served));
}
const inFocus = b => S.game.focus == null || b[5] === S.game.focus;
function focusBox(){
  const f = S.game.focus; if (f == null) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of S.game.buildings){ if (b[5] !== f) continue; x0 = Math.min(x0, b[1]); x1 = Math.max(x1, b[1]); y0 = Math.min(y0, b[2]); y1 = Math.max(y1, b[2]); }
  if (!isFinite(x0)) return null;
  const m = 300; return {x0:x0 - m, y0:y0 - m, x1:x1 + m, y1:y1 + m};
}
const inBox = (bx, x, y) => !bx || (x >= bx.x0 && x <= bx.x1 && y >= bx.y0 && y <= bx.y1);
function gameBounds(){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { if (isNaN(x) || isNaN(y)) return; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  const fb = focusBox();
  if (fb){ add(fb.x0, fb.y0); add(fb.x1, fb.y1); return {x0, y0, x1, y1, focus:true}; }
  S.game.buildings.forEach(b => add(b[1], b[2]));
  Object.values(S.game.groups).forEach(gr => add(gr.x, gr.y));
  if (!isFinite(x0)) return {x0:-1000, y0:-1000, x1:1000, y1:1000};
  return {x0, y0, x1, y1};
}
/* Looks for the game map. Streets have a width in metres per class [roadway, with sidewalks]; the type
   (town, country, highway) picks the colours. Chosen in Settings; the live map and the export share it. */
const MAP_STYLES = {
  atlas: {label:'Atlas', paper:'#ECE9E2', grid:'rgba(60,50,40,0.07)',
    CASE:[['#D8D2C6', '#D3CCBF', '#C9B384', '#C19A5E'], ['#C4BFB3', '#B8B2A6', '#B5A074', '#A88950'], ['#B07F3C', '#B07F3C', '#B07F3C', '#B07F3C']],
    FILL:[['#FBFAF7', '#FBFAF7', '#F8EBB8', '#F3D28A'], ['#FBFAF7', '#FBFAF7', '#F8EBB8', '#F3D28A'], ['#F4C07A', '#F4C07A', '#F4C07A', '#F4C07A']],
    track:['#8F8A83', '#ECE9E2'], bld:['#C9B396', '#A9B7CB', '#BBB0C7'], bldEdge:null, label:'#7A7468', labelHalo:'rgba(236,233,226,0.9)'},
  plan: {label:'Plan', paper:'#F4F1EA', grid:'rgba(60,50,40,0.05)',
    CASE:[['#C9C3B6', '#C9C3B6', '#B9B2A3', '#A79E8C'], ['#BDB7AA', '#BDB7AA', '#ADA596', '#9B9280'], ['#9B9280', '#9B9280', '#9B9280', '#9B9280']],
    FILL:[['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'], ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'], ['#F6EFDD', '#F6EFDD', '#F6EFDD', '#F6EFDD']],
    track:['#8A857D', '#F4F1EA'], bld:['rgba(140,123,90,0.10)', 'rgba(70,95,130,0.10)', 'rgba(110,85,140,0.10)'], bldEdge:['#A8957A', '#8A9BB5', '#A594B8'], label:'#8A8378', labelHalo:'rgba(244,241,234,0.9)'},
  ink: {label:'Ink', paper:'#E8E4DA', grid:'rgba(60,50,40,0.06)',
    CASE:[[null, null, null, null], [null, null, null, null], [null, null, null, null]],
    FILL:[['#B9B2A5', '#A79F91', '#8E8678', '#6F6759'], ['#A79F91', '#9D9587', '#857D6F', '#6F6759'], ['#5C5447', '#5C5447', '#5C5447', '#5C5447']],
    track:['#4A443B', '#E8E4DA'], bld:['#CDBFA4', '#AEBBCB', '#C0B4CA'], bldEdge:null, label:'#5C5447', labelHalo:'rgba(232,228,218,0.9)'},
};
const mapStyle = () => MAP_STYLES[S.settings.mapStyle] || MAP_STYLES.atlas;
/* Kept outside S.game so it never ends up in a saved project: the base bitmap and the edge polylines. */
let gameMapCache = {game:null, base:null, segC:null};
/* Roads, tracks, buildings and town names in image coordinates, at s image px per metre. z is the screen
   zoom the result is seen at (1 for the export bitmap): widths never go under a couple of screen pixels, and
   town names keep a readable size. clip is the visible image rect; what lies outside it is skipped. */
function drawMapContent(g, s, z, clip){
  const ST = mapStyle(), W = bg.w;
  const vis = clip ? (x0, y0, x1, y1) => x1 >= clip.x0 && x0 <= clip.x1 && y1 >= clip.y0 && y0 <= clip.y1 : () => true;
  const segs = (e) => { const a = W2I(e[3], e[4]), b = W2I(e[5], e[6]); return [a, ...edgeInterior(e).map(q => W2I(q.x, q.y)), b]; };
  const segC = gameMapCache.segC && gameMapCache.segC.for === S.game.edges ? gameMapCache.segC : (gameMapCache.segC = {for:S.game.edges, pts:S.game.edges.map(segs), box:S.game.edges.map(e => {
    const pts = segs(e); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of pts){ x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); } return [x0, y0, x1, y1]; })});
  const m = 40/z; // margin for wide roads at the edge of the view
  const strokeEdges = (kind, color, w, dash, pick) => {
    if (!color) return;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []);
    g.beginPath();
    S.game.edges.forEach((e, i) => { if (e[11] !== kind || (pick && !pick(e, i))) return; const bx = segC.box[i]; if (!vis(bx[0] - m, bx[1] - m, bx[2] + m, bx[3] + m)) return;
      const pts = segC.pts[i]; g.moveTo(pts[0].x, pts[0].y); for (let j = 1; j < pts.length; j++) g.lineTo(pts[j].x, pts[j].y); });
    g.stroke(); g.setLineDash([]);
  };
  if (S.game.edges && S.game.edges.length){
    const {c:rc, t:rt} = roadClasses(S.game), RW = [[6, 10], [10, 14], [16, 22], [24, 32]];
    const pick = (k, t) => (e, i) => rc[i] === k && rt[i] === t;
    for (let t = 0; t < 3; t++) for (let k = 0; k < 4; k++) strokeEdges(0, ST.CASE[t][k], Math.max(2/z, s*RW[k][1]), null, pick(k, t));
    for (let t = 0; t < 3; t++) for (let k = 0; k < 4; k++) strokeEdges(0, ST.FILL[t][k], Math.max(1.2/z, s*RW[k][0]), null, pick(k, t));
    strokeEdges(1, ST.track[0], Math.max(1.2/z, s*4));
    strokeEdges(1, ST.track[1], Math.max(0.8/z, s*2.2), [Math.max(3/z, s*14), Math.max(3/z, s*14)]);
  }
  const tc = {};
  g.lineWidth = Math.max(0.6/z, s*0.8);
  for (const b of S.game.buildings){
    const p = W2I(b[1], b[2]);
    const sz = Math.max(2/z, s * (9 + Math.sqrt(Math.max(1, b[3])) * 4));
    const t = tc[b[5]] || (tc[b[5]] = {x:0, y:0, n:0}); t.x += p.x; t.y += p.y; t.n++;
    if (!vis(p.x - sz, p.y - sz, p.x + sz, p.y + sz)) continue;
    g.fillStyle = ST.bld[b[4]] || '#C4C0B8'; g.fillRect(p.x - sz/2, p.y - sz/2, sz, sz);
    if (ST.bldEdge){ g.strokeStyle = ST.bldEdge[b[4]] || '#A8957A'; g.strokeRect(p.x - sz/2, p.y - sz/2, sz, sz); }
  }
  const fs = Math.min(Math.round(W/110), 18/z);
  g.font = `italic 700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (g.letterSpacing !== undefined) g.letterSpacing = (fs*0.12) + 'px';
  for (const k in tc){
    const t = tc[k], name = (S.game.towns[k] || '').toUpperCase(); if (!name || t.n < 3) continue;
    const x = t.x / t.n, y = t.y / t.n;
    if (!vis(x - fs*name.length, y - fs, x + fs*name.length, y + fs)) continue;
    g.lineWidth = fs*0.4; g.strokeStyle = ST.labelHalo; g.strokeText(name, x, y);
    g.fillStyle = ST.label; g.fillText(name, x, y);
  }
  if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
}
/* The game map as a bitmap: paper, terrain and the 1 km grid go in a base canvas (gameMapCache.base) that the
   live map draws the roads and buildings over at the current zoom; the full bitmap is what the export uses. */
function makeGameMap(){
  const bb = gameBounds(), m = bb.focus ? 0 : 400;
  // Rotation: image = s·e^{iθ}·(X − iY) + b. Size the canvas to the rotated extent.
  const th = (S.game.rot || 0) * Math.PI / 180, rot = [Math.cos(th), Math.sin(th)];
  const pts = bb.focus ? [[bb.x0, bb.y0], [bb.x1, bb.y0], [bb.x0, bb.y1], [bb.x1, bb.y1]]
    : S.game.buildings.map(b => [b[1], b[2]]).concat(Object.values(S.game.groups).filter(gr => !isNaN(gr.x)).map(gr => [gr.x, gr.y]));
  if (!pts.length) pts.push([bb.x0, bb.y0], [bb.x1, bb.y1]);
  let rx0 = Infinity, ry0 = Infinity, rx1 = -Infinity, ry1 = -Infinity;
  for (const [X, Y] of pts){ const z = cmul(rot, [X, -Y]); rx0 = Math.min(rx0, z[0]); rx1 = Math.max(rx1, z[0]); ry0 = Math.min(ry0, z[1]); ry1 = Math.max(ry1, z[1]); }
  const s = Math.min(3600 / Math.max(rx1 - rx0 + 2*m, ry1 - ry0 + 2*m), 2.5);
  const W = Math.max(200, Math.round((rx1 - rx0 + 2*m) * s));
  const H = Math.max(200, Math.round((ry1 - ry0 + 2*m) * s));
  S.game.xf = {a:[s*rot[0], s*rot[1]], b:[s*(m - rx0), s*(m - ry0)], mirror:false, kind:'map'};
  gameMapCache = {game:S.game, base:null, segC:null};
  const ST = mapStyle();
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const g = base.getContext('2d');
  g.fillStyle = ST.paper; g.fillRect(0, 0, W, H);
  drawTerrain(g);
  g.strokeStyle = ST.grid; g.lineWidth = 1.5;
  const span = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) + 2*m + 2000, cxw = (bb.x0 + bb.x1)/2, cyw = (bb.y0 + bb.y1)/2;
  for (let k = Math.ceil((cxw - span)/1000)*1000; k < cxw + span; k += 1000){ const a = W2I(k, cyw - span), b = W2I(k, cyw + span); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  for (let k = Math.ceil((cyw - span)/1000)*1000; k < cyw + span; k += 1000){ const a = W2I(cxw - span, k), b = W2I(cxw + span, k); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  gameMapCache.base = base;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g2 = c.getContext('2d'); g2.drawImage(base, 0, 0);
  const savedBg = bg; bg = {...bg, w:W, h:H}; // drawMapContent reads the map size from bg
  try { drawMapContent(g2, s, 1, null); } finally { bg = savedBg; }
  return c;
}
function waterLevel(){ const T = S.game && S.game.terrain; const v = S.settings.waterLevel; return v != null && v !== '' && !isNaN(+v) ? +v : (T && T.wl != null ? T.wl : 0); }
// Terrain from the export's height grid: water below the water level, land with soft hill shading.
let terrainCache = {T:null, wl:null, rot:null, c:null, UP:1};
function drawTerrain(g){
  const T = S.game.terrain;
  if (!T || S.settings.terrain === false || !T.h || T.h.length !== T.cols*T.rows) return;
  const {step} = T, wl = waterLevel();
  const rot = S.game.rot || 0;
  if (terrainCache.T !== T || terrainCache.wl !== wl || terrainCache.rot !== rot) terrainCache = {T, wl, rot, ...terrainImage(T, wl, rot)};
  const {c, UP} = terrainCache;
  const o = W2I(T.x0 - step/2, T.y0 - step/2), a = S.game.xf.a;
  g.save();
  g.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
  g.setTransform(a[0]*step/UP, a[1]*step/UP, a[1]*step/UP, -a[0]*step/UP, o.x, o.y);
  g.drawImage(c, 0, 0);
  g.restore();
}
function terrainImage(T, wl, rot){
  const {cols, rows, step, h} = T;
  // Upsample with bilinear heights so shorelines are smooth; capped at ~2.5M pixels for speed.
  const UP = Math.max(1, Math.min(6, Math.floor(Math.sqrt(2.5e6 / (cols*rows))))), CW = cols*UP, CH = rows*UP;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const cg = c.getContext('2d'), im = cg.createImageData(CW, CH), d = im.data;
  let lo = Infinity, hi = -Infinity;
  for (const v of h) if (v != null && v > wl){ if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = Math.max(20, hi - lo);
  const at = (i, j) => { i = Math.max(0, Math.min(cols - 1, i)); j = Math.max(0, Math.min(rows - 1, j)); const v = h[j*cols + i]; return v == null ? wl + 1 : v; };
  // bilinear height between grid samples, so shorelines come out smooth
  const hb = (fi, fj) => { const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, w = fj - j;
    if (h[Math.max(0, Math.min(rows - 1, j))*cols + Math.max(0, Math.min(cols - 1, i))] == null) return null;
    return (at(i, j)*(1 - u) + at(i + 1, j)*u)*(1 - w) + (at(i, j + 1)*(1 - u) + at(i + 1, j + 1)*u)*w; };
  // Hill shading per grid point, lit from the top-left of the screen (follows map rotation).
  const th = rot * Math.PI / 180, ca = Math.cos(th), sa = Math.sin(th);
  let lx = -ca - sa, ly = ca - sa; const lh = Math.hypot(lx, ly) || 1; lx = lx / lh * 0.6; ly = ly / lh * 0.6;
  const lz = 0.8, ll = Math.hypot(lx, ly, lz);
  const SG = new Float32Array(cols*rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++){
    const dx = (at(i + 1, j) - at(i - 1, j)) / (2*step), dy = (at(i, j + 1) - at(i, j - 1)) / (2*step);
    const nl = Math.hypot(dx, dy, 1);
    SG[j*cols + i] = ((-dx)*lx + (-dy)*ly + lz) / (nl * ll) / (lz / ll); // 1 on flat ground
  }
  const sg = (i, j) => SG[Math.max(0, Math.min(rows - 1, j))*cols + Math.max(0, Math.min(cols - 1, i))];
  const sb = (fi, fj) => { const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, w = fj - j;
    return (sg(i, j)*(1 - u) + sg(i + 1, j)*u)*(1 - w) + (sg(i, j + 1)*(1 - u) + sg(i + 1, j + 1)*u)*w; };
  // World +Y points up the map, grid rows run along +Y.
  for (let J = 0; J < CH; J++) for (let I = 0; I < CW; I++){
    const fi = (I + 0.5)/UP - 0.5, fj = (J + 0.5)/UP - 0.5, i = Math.round(fi), j = Math.round(fj);
    const k = (J*CW + I) * 4, v = hb(fi, fj);
    if (v == null){ d[k + 3] = 0; continue; }
    if (v <= wl){
      const depth = Math.min(1, (wl - v) / 25);
      d[k] = 176 - 40*depth; d[k + 1] = 204 - 30*depth; d[k + 2] = 226 - 14*depth; d[k + 3] = 255;
      continue;
    }
    const shade = sb(fi, fj);
    const t = Math.min(1, Math.max(0, (v - lo) / span));
    let r = 230 + 12*t, gg = 234 - 2*t, b = 220 + 12*t;
    const f = Math.max(0.8, Math.min(1.05, 1 + (shade - 1) * 0.9));
    d[k] = r*f; d[k + 1] = gg*f; d[k + 2] = b*f; d[k + 3] = 255;
  }
  cg.putImageData(im, 0, 0);
  return {c, UP};
}
/* Road snapping: model nodes for road nodes and curved-edge points are shared by every line that uses them. */
const routeCache = new Map();
function I2W(p){
  const xf = S.game.xf, a = xf.a, d = a[0]*a[0] + a[1]*a[1];
  const zr = p.x - xf.b[0], zi = p.y - xf.b[1];
  const wr = (zr*a[0] + zi*a[1]) / d, wi = (zi*a[0] - zr*a[1]) / d;
  return {x:wr, y:xf.mirror ? wi : -wi};
}
function roadSnapOn(mode){
  return S.settings.roadSnap !== false && !!S.game && !!S.game.xf && !!(S.game.edges && S.game.edges.length) && (mode === 'bus' || mode === 'tram' || mode === 'train');
}
function roadNodeId(rn){
  S.game.rn = S.game.rn || {};
  const id = S.game.rn[rn];
  if (id != null && S.nodes[id]) return id;
  const q = roadGraph().nodes.get(rn), p = W2I(q[0], q[1]);
  return S.game.rn[rn] = addNode(p.x, p.y);
}
function edgeNodeIds(ei, fwd){
  S.game.ei = S.game.ei || {};
  let ids = S.game.ei[ei];
  if (!ids || !ids.every(i => S.nodes[i])) ids = S.game.ei[ei] = edgeInterior(S.game.edges[ei]).map(q => { const p = W2I(q.x, q.y); return addNode(p.x, p.y); });
  return fwd ? ids : ids.slice().reverse();
}
function cachedPath(ra, rb, k){
  const key = k + ':' + ra + '>' + rb;
  if (!routeCache.has(key)){ routeCache.set(key, shortestPath(ra, rb, k)); if (routeCache.size > 400) routeCache.delete(routeCache.keys().next().value); }
  return routeCache.get(key);
}
function roadEnds(pa, pb, mode){
  const k = mode === 'train' ? 1 : 0, A = I2W(pa), B = I2W(pb);
  const ra = nearestGraphNode(A.x, A.y, k, 150), rb = nearestGraphNode(B.x, B.y, k, 150);
  return (ra == null || rb == null || ra === rb) ? null : {ra, rb, k};
}
function roadRoute(fromId, toId, mode){
  const e = roadEnds(S.nodes[fromId], S.nodes[toId], mode); if (!e) return null;
  const r = cachedPath(e.ra, e.rb, e.k); if (!r) return null;
  const ids = [roadNodeId(e.ra)];
  for (const [u, v, ei] of r){ ids.push(...edgeNodeIds(ei, S.game.edges[ei][1] === u)); ids.push(roadNodeId(v)); }
  return ids.filter(i => i !== fromId && i !== toId);
}
function roadPreview(pa, pb, mode){
  const e = roadEnds(pa, pb, mode); if (!e) return null;
  const r = cachedPath(e.ra, e.rb, e.k); if (!r) return null;
  const G = roadGraph(), P = n => { const q = G.nodes.get(n); return W2I(q[0], q[1]); };
  const pts = [P(e.ra)];
  for (const [u, v, ei] of r){ const ed = S.game.edges[ei]; let mid = edgeInterior(ed).map(q => W2I(q.x, q.y)); if (ed[1] !== u) mid.reverse(); pts.push(...mid, P(v)); }
  return pts;
}
function computeAlign(){
  const A = S.game.align;
  if (!A || !A.p1 || !A.p2) return false;
  const g1 = S.game.groups[A.p1.sg], g2 = S.game.groups[A.p2.sg];
  if (!g1 || !g2 || A.p1.sg === A.p2.sg) return false;
  const mir = !!A.mirror;
  const w1 = [g1.x, mir ? g1.y : -g1.y], w2 = [g2.x, mir ? g2.y : -g2.y];
  const d = [w2[0] - w1[0], w2[1] - w1[1]], sd = [A.p2.x - A.p1.x, A.p2.y - A.p1.y];
  const den = d[0]*d[0] + d[1]*d[1]; if (!den) return false;
  const a = [(sd[0]*d[0] + sd[1]*d[1]) / den, (sd[1]*d[0] - sd[0]*d[1]) / den];
  const aw = cmul(a, w1);
  S.game.xf = {a, b:[A.p1.x - aw[0], A.p1.y - aw[1]], mirror:mir, kind:'align'};
  S.game.rn = {}; S.game.ei = {};
  return true;
}
function removeGameNetwork(){
  S.lines = S.lines.filter(l => !l.gameId);
  for (const k of Object.keys(S.stations)) if (S.stations[k].game) delete S.stations[k];
  activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null};
  cleanup();
}
/* Stops sit on the road: each stop is projected onto the nearest street (or track) edge it is served from. */
function edgePolyW(ei){ const e = S.game.edges[ei]; return [{x:e[3], y:e[4]}, ...edgeInterior(e), {x:e[5], y:e[6]}]; }
function projectOnEdge(ei, x, y){
  const pts = edgePolyW(ei); let best = null, acc = 0;
  for (let i = 0; i < pts.length - 1; i++){
    const L = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y), r = distSeg({x, y}, pts[i], pts[i+1]);
    if (!best || r.d < best.d) best = {d:r.d, seg:i, q:r.q, along:acc + r.t*L};
    acc += L;
  }
  best.total = acc; best.nseg = pts.length - 1; return best;
}
function nearestEdgeOfKind(x, y, k, maxD){
  let best = null;
  S.game.edges.forEach((e, ei) => {
    if (e[11] !== k) return;
    const pad = maxD + Math.hypot(e[5] - e[3], e[6] - e[4]) * 0.3;
    if (x < Math.min(e[3], e[5]) - pad || x > Math.max(e[3], e[5]) + pad || y < Math.min(e[4], e[6]) - pad || y > Math.max(e[4], e[6]) + pad) return;
    const pr = projectOnEdge(ei, x, y);
    if (pr.d <= maxD && (!best || pr.d < best.d)) best = {ei, ...pr};
  });
  return best;
}
function pathLen(r, pref){ let s = 0; for (const [, , ei] of r){ const e = S.game.edges[ei]; s += Math.hypot(e[5] - e[3], e[6] - e[4]) * (pref && pref.has(ei) ? 0.05 : 1); } return s; }
/* Real routes: vehicles report the edges they drive. Each recorded path is matched to the leg that ends at the stop nearest its end. */
function orientChain(G, ents){
  const idx = new Map(G.edges.map((e, i) => [e[0], i]));
  const list = ents.map(e => idx.get(e)).filter(i => i != null);
  if (!list.length) return null;
  const E = G.edges, orient = list.map((ei, i) => {
    const e = E[ei];
    if (i < list.length - 1){ const nx = E[list[i + 1]]; if (e[2] === nx[1] || e[2] === nx[2]) return true; if (e[1] === nx[1] || e[1] === nx[2]) return false; }
    if (i > 0){ const pv = E[list[i - 1]]; if (e[1] === pv[1] || e[1] === pv[2]) return true; if (e[2] === pv[1] || e[2] === pv[2]) return false; }
    return true;
  });
  return {list, orient};
}
/* How many recorded edges of the line are tracks (t) and streets (st); null if no route is known. */
function recordedKinds(lineId){
  const L = S.game.legs && S.game.legs[lineId]; if (!L || !S.game.edges) return null;
  const idx = prefSet([].concat(...Object.values(L)));
  let t = 0, st = 0; for (const i of idx){ if (S.game.edges[i][11] === 1) t++; else st++; }
  return {t, st};
}
/* 1 if the line's vehicles mostly drive on tracks, 0 if mostly on streets, null if no route is known. */
function runsOn(lineId){
  const r = recordedKinds(lineId); if (!r || r.t + r.st < 3) return null;
  return r.t > r.st ? 1 : 0;
}
/* True when the line's vehicles were recorded on both streets and tracks (a tram with a stretch on railway, a
   subway that surfaces onto the street): its stops may sit on either network and its legs are routed on both. */
function mixedLine(lineId){ const r = recordedKinds(lineId); return !!r && r.t > 0 && r.st > 0; }
function computeLegs(G){
  const legs = {};
  for (const r of G.raw){
    const gl = G.lines.find(l => l.id === r.line); if (!gl) continue;
    const ch = orientChain(G, r.ents); if (!ch || ch.list.length < 2) continue;
    const last = G.edges[ch.list[ch.list.length - 1]], endW = ch.orient[ch.orient.length - 1] ? [last[5], last[6]] : [last[3], last[4]];
    let j = -1, bd = 250;
    gl.stops.forEach((sg, k) => { const gr = G.groups[sg]; if (!gr) return; const d = Math.hypot(gr.x - endW[0], gr.y - endW[1]); if (d < bd){ bd = d; j = k; } });
    if (j < 0) continue;
    const L = legs[gl.id] = legs[gl.id] || {};
    if (!L[j] || L[j].length < r.ents.length) L[j] = r.ents;
  }
  return legs;
}
let eidxFor = null, eidxMap = null;
function prefSet(ents){
  if (eidxFor !== S.game){ eidxFor = S.game; eidxMap = new Map(S.game.edges.map((e, i) => [e[0], i])); }
  const set = new Set(); for (const e of ents){ const i = eidxMap.get(e); if (i != null) set.add(i); }
  return set;
}
/* The route the line's vehicles were actually driving when the export ran, as the game recorded it:
   every leg's edges in order, drawn as a thin bright thread with arrows over the selected line. Where the
   thread stops, the line on the map is an estimate (shortest road) until the next recorded leg. */
function vehiclePathPts(l){
  const gl = S.game && S.game.lines.find(x => x.id === l.gameId), L = gl && S.game.legs && S.game.legs[gl.id];
  if (!L) return [];
  const out = [];
  for (const j of Object.keys(L).map(Number).sort((a, b) => a - b)){
    const ch = orientChain(S.game, L[j]); if (!ch) continue;
    const pts = [];
    ch.list.forEach((ei, i) => { const seq = edgePolyW(ei); for (const q of (ch.orient[i] ? seq : seq.slice().reverse())) pts.push(W2I(q.x, q.y)); });
    if (pts.length > 1) out.push(pts);
  }
  return out;
}
function drawVehiclePath(g, l, u, z){
  const legs = vehiclePathPts(l); if (!legs.length) return;
  g.save(); g.setLineDash([]); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const pts of legs){
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4.5/z; poly(g, pts); g.stroke();
    g.strokeStyle = '#1E6B8C'; g.lineWidth = 2.2/z; poly(g, pts); g.stroke();
    // arrows every ~90 px of screen along the thread
    let acc = 0; const step = 90/z;
    for (let i = 1; i < pts.length; i++){
      const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y); if (!d) continue;
      while (acc + d >= step){ const t = (step - acc) / d, x = a.x + (b.x - a.x)*t, y = a.y + (b.y - a.y)*t; chevron(g, x, y, (b.x - a.x)/d, (b.y - a.y)/d, 5/z, '#1E6B8C', u); acc -= step; }
      acc += d;
    }
  }
  g.restore();
}
/* "{a} of {b} stretches recorded" for the selected game line, or null when nothing was recorded. */
function vehiclePathInfo(l){
  const gl = S.game && S.game.lines.find(x => x.id === l.gameId); if (!gl) return null;
  const n = gl.stops.length, legs = (n > 1 && gl.stops[0] !== gl.stops[n - 1]) ? n : n - 1;
  const L = S.game.legs && S.game.legs[gl.id], a = L ? Object.keys(L).length : 0;
  return {a, b:legs};
}
function chainNodes(ents){
  const ch = orientChain(S.game, ents); if (!ch) return [];
  const out = [];
  ch.list.forEach((ei, i) => {
    const e = S.game.edges[ei];
    const seq = [roadNodeId(e[1]), ...edgeNodeIds(ei, true), roadNodeId(e[2])];
    out.push(...(ch.orient[i] ? seq : seq.reverse()));
  });
  return dedupe(out);
}
/* Per-line choices that outlive a rebuild (re-import, roads on or off, game colours, a project reopened): the mode
   shown (a subway reports itself as a tram) and whether the line is hidden, by game line id, kept on the game data. */
function lineOpts(){ return S.game ? (S.game.lineOpts = S.game.lineOpts || {}) : {}; }
function setLineOpt(l, key, value){ if (!l.gameId || !S.game) return; const o = lineOpts(), c = o[l.gameId] || (o[l.gameId] = {}); if (value == null || value === false) delete c[key]; else c[key] = value; if (!Object.keys(c).length) delete o[l.gameId]; }
function buildGameNetwork(){
  // what the lines on the map say now wins over what was noted earlier (an undo may have changed it)
  if (S.game) for (const l of S.lines){ if (!l.gameId) continue; setLineOpt(l, 'hidden', !!l.hidden); const o = lineOpts()[l.gameId]; if (o && o.mode && o.mode !== l.mode) setLineOpt(l, 'mode', l.mode); }
  removeGameNetwork();
  if (!S.game || !S.game.xf) return;
  const opts = lineOpts();
  const routing = S.settings.roads !== false && S.game.edges && S.game.edges.length > 0;
  if (routing) roadGraph();
  const stOf = {}, anchorC = {}, segC = {};
  // For lines on both networks, the edge a recorded leg ended on says which network each stop is on
  // (a tram halt beside a railway is on the track, not on the street 80 m away).
  const recAt = {};
  if (routing && S.game.legs) for (const gl of S.game.lines){
    const L = S.game.legs[gl.id]; if (!L || !mixedLine(gl.id)) continue;
    for (const j in L){ const sg = gl.stops[+j], ents = L[j]; if (sg == null || !ents.length || recAt[sg] != null) continue; const set = prefSet([ents[ents.length - 1]]); if (set.size) recAt[sg] = [...set][0]; }
  }
  // The edge a stop sits on, of kind k; for a line on both networks (alt), the edge its vehicles were recorded
  // arriving on, or the other kind when none of kind k is near.
  const anchor = (sg, k, alt) => {
    const key = sg + ':' + k + (alt ? '+' : '');
    if (!(key in anchorC)){
      const gr = S.game.groups[sg];
      let an = null;
      if (alt && gr && recAt[sg] != null){ const pr = projectOnEdge(recAt[sg], gr.x, gr.y); if (pr.d <= 150) an = {ei:recAt[sg], ...pr}; }
      if (!an && routing && k >= 0 && gr) an = nearestEdgeOfKind(gr.x, gr.y, k, 150);
      if (!an && alt && routing && k >= 0 && gr) an = nearestEdgeOfKind(gr.x, gr.y, 1 - k, 150);
      anchorC[key] = an;
    }
    return anchorC[key];
  };
  const seqOf = ei => { const e = S.game.edges[ei]; return [roadNodeId(e[1]), ...edgeNodeIds(ei, true), roadNodeId(e[2])]; };
  const stopOnEdge = [];   // {node, ei, seg, along}
  const stNode = (sg, k, alt) => {
    const an = anchor(sg, k, alt);
    // Stops are shared by the network they sit on, so a tram stop on the railway is the train line's marker too.
    const key = sg + ':' + (an ? S.game.edges[an.ei][11] : k);
    if (stOf[key] != null) return stOf[key];
    const gr = S.game.groups[sg]; if (!gr || isNaN(gr.x)) return null;
    // A stop shared by bus and train lines gets one marker; reuse the first one made for this stop group.
    const other = Object.keys(stOf).find(kk => kk.startsWith(sg + ':'));
    let id;
    if (other && !an) id = stOf[other];
    else {
      const q = an ? W2I(an.q.x, an.q.y) : W2I(gr.x, gr.y);
      id = addNode(q.x, q.y);
      if (an) stopOnEdge.push({node:id, ei:an.ei, seg:an.seg, along:an.along});
      // building: a station with a construction of its own (bus/tram/train station), not a stop on the road
      if (!other) S.stations[id] = {name:gr.name, side:'e', game:true, r:gr.r, sg, building:!!gr.building, terminals:gr.terminals || 0};
      else { // second marker of the same stop (e.g. rail and road side): keep it unlabeled
        S.stations[id] = {name:gr.name, side:'none', game:true, r:gr.r, sg, secondary:true, building:!!gr.building, terminals:gr.terminals || 0};
      }
    }
    return stOf[key] = id;
  };
  const route = (ra, rb, k, pref, tag) => { const key = k + ':' + ra + '>' + rb + (pref ? '#' + tag : ''); if (!(key in segC)) segC[key] = ra === rb ? [] : shortestPath(ra, rb, k, pref); return segC[key]; };
  // Nodes from stop A to stop B along the road, both stops anchored on edges.
  const leg = (A, B, k, pref, tag) => {
    const sa = seqOf(A.ei), sb = seqOf(B.ei), out = [];
    if (A.ei === B.ei){
      if (A.along <= B.along){ for (let i = A.seg + 1; i <= B.seg; i++) out.push(sa[i]); }
      else { for (let i = A.seg; i >= B.seg + 1; i--) out.push(sa[i]); }
      return out;
    }
    const ea = S.game.edges[A.ei], eb = S.game.edges[B.ei];
    let best = null;
    for (const i of [0, 1]) for (const j of [0, 1]){
      const ra = i ? ea[2] : ea[1], rb = j ? eb[2] : eb[1];
      const r = route(ra, rb, k, pref, tag); if (!r) continue;
      const cost = (i ? A.total - A.along : A.along) + pathLen(r, pref) + (j ? B.total - B.along : B.along);
      if (!best || cost < best.cost) best = {cost, i, j, r};
    }
    if (!best) return null;
    if (best.i) for (let m = A.seg + 1; m < sa.length; m++) out.push(sa[m]); else for (let m = A.seg; m >= 0; m--) out.push(sa[m]);
    for (const [u, v, ei] of best.r){ out.push(...edgeNodeIds(ei, S.game.edges[ei][1] === u)); out.push(roadNodeId(v)); }
    if (best.j) for (let m = sb.length - 1; m > B.seg; m--) out.push(sb[m]); else for (let m = 0; m <= B.seg; m++) out.push(sb[m]);
    return out;
  };
  let routed = 0, straight = 0, fromGame = 0;
  const ends = new Set(), fbx = focusBox();
  for (const gl of S.game.lines){
    // Route on the network the vehicles actually drive on (from their recorded routes), not only on
    // the line's mode: a light rail or subway can report itself as a tram but run on its own tracks.
    const ran = runsOn(gl.id), mixed = routing && mixedLine(gl.id);
    const derived = gameMode(gl) || (ran === 1 ? 'train' : ran === 0 ? 'bus' : null); if (!derived) continue;
    const k = ran != null && derived !== 'ferry' ? ran : derived === 'train' ? 1 : (derived === 'bus' || derived === 'tram') ? 0 : -1;
    // How the line is shown is the user's choice (a subway reports itself as a tram); how it is routed is the game's.
    const opt = opts[gl.id] || {}, mode = (opt.mode && MODES[opt.mode]) ? opt.mode : derived;
    const stops = gl.stops.filter(sg => S.game.groups[sg] && !isNaN(S.game.groups[sg].x));
    if (stops.length < 2) continue;
    if (fbx && !stops.some(sg => inBox(fbx, S.game.groups[sg].x, S.game.groups[sg].y))) continue;
    const path = [];
    let first = null, last = null;
    // A leg of a line on both networks that no vehicle recorded (often the way back) keeps to the edges the line
    // was recorded on elsewhere, so it returns along its tracks instead of the shortest street.
    const anyRec = mixed ? prefSet([].concat(...Object.values(S.game.legs[gl.id]))) : null;
    // Lines run in a loop: after the last stop the vehicle returns to the first.
    const n = stops.length, legs = (n > 1 && stops[0] !== stops[n - 1]) ? n : n - 1;
    for (let i = 0; i < legs; i++){
      const a = stops[i], b = stops[(i + 1) % n];
      const na = stNode(a, k, mixed), nb = stNode(b, k, mixed); if (na == null || nb == null) continue;
      if (first == null) first = na; if (i === legs - 1) last = legs === n ? na : nb; // the first and the last stop's markers
      const rec = routing && k >= 0 && S.game.legs && S.game.legs[gl.id] && S.game.legs[gl.id][(i + 1) % n];
      const pref = rec ? prefSet(rec) : (anyRec && anyRec.size ? anyRec : null);
      path.push(na);
      const A = anchor(a, k, mixed), B = anchor(b, k, mixed);
      if (A && B){
        // A leg recorded on both networks, or between stops on different networks, is routed on the joint graph.
        const kk = mixed && (S.game.edges[A.ei][11] !== k || S.game.edges[B.ei][11] !== k || (pref && [...pref].some(ei => S.game.edges[ei][11] !== k))) ? MIXED : k;
        const mid = leg(A, B, kk, pref && pref.size ? pref : null, gl.id + '/' + i);
        if (mid){ path.push(...mid); if (rec && pref.size) fromGame++; else routed++; } else straight++;
      }
      else if (k >= 0 && routing) straight++;
      path.push(nb);
    }
    const p2 = dedupe(path);
    if (p2.length < 2) continue;
    const idx = S.lines.filter(l => l.gameId).length;
    const color = S.settings.gameColors ? gl.color : PALETTE[idx % PALETTE.length];
    const line = {id:nid(), gameId:gl.id, name:gl.name, mode, color, branches:[{path:p2}], oneway:{}, cargo:!isPax(gl)};
    if (opt.hidden) line.hidden = true;
    S.lines.push(line);
    if (first != null) ends.add(first); if (last != null) ends.add(last);
  }
  // Put every stop on the shared road piece for all lines using that piece, so lines stay bundled through it.
  const bySeg = {};
  for (const st of stopOnEdge){ const key = st.ei + ':' + st.seg; (bySeg[key] = bySeg[key] || []).push(st); }
  for (const key in bySeg){
    const list = bySeg[key].sort((x, y) => x.along - y.along), seq = seqOf(list[0].ei);
    const m1 = seq[list[0].seg], m2 = seq[list[0].seg + 1], ids = list.map(x => x.node);
    S.lines.forEach(l => l.branches.forEach(br => {
      const p = br.path, out = [];
      for (let i = 0; i < p.length; i++){
        out.push(p[i]);
        if (i < p.length - 1){
          if (p[i] === m1 && p[i+1] === m2) out.push(...ids);
          else if (p[i] === m2 && p[i+1] === m1) out.push(...ids.slice().reverse());
        }
      }
      br.path = dedupe(out);
    }));
  }
  // Out-and-back on the same street would draw a dashed line twice (and look solid): keep each street piece once per line.
  S.lines.forEach(l => {
    if (!l.gameId) return;
    const seen = new Set(), runs = [];
    for (const br of l.branches){
      let run = [];
      for (let i = 0; i < br.path.length; i++){
        if (i === 0){ run.push(br.path[0]); continue; }
        const key = ekey(br.path[i - 1], br.path[i]);
        if (seen.has(key)){ if (run.length > 1) runs.push(run); run = [br.path[i]]; continue; }
        seen.add(key); run.push(br.path[i]);
      }
      if (run.length > 1) runs.push(run);
    }
    if (runs.length) l.branches = runs.map(path => ({path}));
  });
  // A stop whose line follows a real route that skips its road piece: move the stop onto that route.
  const used = new Set(); S.lines.forEach(l => l.branches.forEach(b => b.path.forEach(x => used.add(x))));
  for (const k of Object.keys(S.stations)){
    const st = S.stations[k]; if (!st.game || used.has(+k) || !S.nodes[k]) continue;
    const P = S.nodes[k], serving = S.lines.filter(l => { const gl = S.game.lines.find(x => x.id === l.gameId); return gl && gl.stops.some(x => String(x) === String(st.sg)); });
    let best = null;
    for (const l of serving) for (const b of l.branches) for (let i = 0; i < b.path.length - 1; i++){
      const a = S.nodes[b.path[i]], c = S.nodes[b.path[i + 1]]; if (!a || !c) continue;
      const r = distSeg(P, a, c); if (!best || r.d < best.d) best = {d:r.d, q:r.q, a:b.path[i], c:b.path[i + 1]};
    }
    if (best && best.d <= 90 * pxPerM()){
      P.x = best.q.x; P.y = best.q.y;
      S.lines.forEach(l => l.branches.forEach(br => {
        const p = br.path, out = [];
        for (let i = 0; i < p.length; i++){ out.push(p[i]); if (i < p.length - 1 && ((p[i] === best.a && p[i+1] === best.c) || (p[i] === best.c && p[i+1] === best.a))) out.push(+k); }
        br.path = dedupe(out);
      }));
    } else st.solo = true;
  }
  cleanup();
  // Label only interchanges and line ends, so the map stays readable.
  for (const k of Object.keys(S.stations)){
    const st = S.stations[k]; if (!st.game || st.secondary) continue;
    const users = S.lines.filter(l => { if (!lineHasNode(l, +k)) return false; const gl = S.game.lines.find(x => x.id === l.gameId); return !gl || gl.stops.some(x => String(x) === String(st.sg)); }).length;
    st.side = (users > 1 || ends.has(+k)) ? 'auto' : 'none';
  }
  S.game.routeInfo = routing ? {routed, straight, fromGame} : null;
}
function useGameMap(){
  if (!S.game) return;
  const fromImage = bg.kind !== 'game';
  const oldXf = !fromImage && S.game.xf ? S.game.xf : null;
  const world = oldXf ? Object.fromEntries(Object.entries(S.nodes).map(([k, n]) => [k, I2W(n)])) : null;
  const c = makeGameMap();
  if (world) for (const k in world){ const q = W2I(world[k].x, world[k].y); S.nodes[k].x = q.x; S.nodes[k].y = q.y; }
  else { S.game.rn = {}; S.game.ei = {}; }
  bg = {img:c, src:null, w:c.width, h:c.height, kind:'game'};
  S.game.align = null; alignPick = null;
  let dropped = 0;
  if (fromImage){ dropped = S.lines.filter(l => !l.gameId).length; removeDrawnLines(); }
  buildGameNetwork(); fitNetwork(); ui(); draw();
  if (dropped) toast(T('Removed hand-drawn lines that belonged to the old screenshot ({n}). Ctrl+Z brings them back.', {n:dropped}));
}
function fitNetwork(){
  if (S.game && S.game.focus != null){ fit(); return; } // the map is cut to the town, so show all of it
  const pts = Object.keys(S.stations).filter(k => S.stations[k].game && S.nodes[k]).map(k => S.nodes[k]);
  if (pts.length >= 2) fitWorldBox(pts); else fit();
}
function removeDrawnLines(){
  S.lines = S.lines.filter(l => l.gameId);
  for (const k of Object.keys(S.stations)) if (!S.stations[k].game) delete S.stations[k];
  activeLine = null; activeBr = null; sel = {line:null, branch:null, node:null};
  cleanup();
}
/* Mod and app in step: each export says which mod revision made it (TFO|BEGIN|1|mod:5). */
const EXPORT_FORMAT = 1, MOD_REVISION = 7; // MOD_REVISION: keep equal to "revision" in mod/transit_overlay/mod.json
const MODIO_URL = 'https://mod.io/g/transportfever3/m/transit-overlay';
const RELEASE_URL = 'https://github.com/axelferb/Transport-Fever-3---Transit-Overlay/releases/latest';
let modNoticeHidden = '';
let updInfo = null;
function renderUpd(){
  const u = updInfo, a = $('#updLink'); if (!u) return;
  a.textContent = T('Update available: v{v}', {v:u.latest});
  a.href = u.url;
  a.title = T('You have v{cur}. Click to download v{v}. Release notes: {url}', {cur:u.current, v:u.latest, url:u.notes});
}
function checkSource(src){
  const pill = $('#modPill'), a = $('#modLink');
  let msg = null, tip = '', url = '';
  if (src.format > EXPORT_FORMAT || (src.kind === 'mod' && src.rev > MOD_REVISION)){
    msg = T('App older than the mod');
    tip = T('The in-game mod is newer than this app, so some data may be missing. Click to download the latest app.');
    url = RELEASE_URL;
  } else if (src.kind === 'mod' ? src.rev < MOD_REVISION : src.kind == null){
    msg = T('In-game mod out of date');
    tip = T('This export came from an older version of the mod; this app expects revision {rev}. Restart the game so mod.io updates it, or check that you\'re subscribed. Click to open the mod page.', {rev:MOD_REVISION});
    url = MODIO_URL;
  }
  if (!msg || modNoticeHidden === url){ pill.hidden = true; return; }
  a.textContent = msg; a.title = tip; a.href = url; pill.hidden = false;
}
$('#modClose').addEventListener('click', () => { modNoticeHidden = $('#modLink').getAttribute('href'); $('#modPill').hidden = true; });

function importGame(text){
  let G;
  try { G = parseExport(text); } catch (err){ toast(err.message); return; }
  const prev = S.game;
  commit();
  if (S.example){ S.nodes = {}; S.lines = []; S.stations = {}; S.example = false; hist.u = []; hist.r = []; }
  if (prev && prev.focus != null && G.towns[prev.focus] != null) G.focus = prev.focus;
  if (prev && prev.rot) G.rot = prev.rot;
  if (prev && prev.terrain && !G.terrain) G.terrain = prev.terrain;
  if (prev && prev.lineOpts) G.lineOpts = prev.lineOpts; // the modes picked and lines hidden per game line
  if (prev && prev.xf && bg.kind === 'game') G.xf = prev.xf;
  G.legs = computeLegs(G);
  if (prev && prev.legs){
    for (const id in prev.legs){
      const a = G.lines.find(l => String(l.id) === id), b = prev.lines.find(l => String(l.id) === id);
      if (!a || !b || a.stops.join(',') !== b.stops.join(',')) continue;
      const L = G.legs[id] = G.legs[id] || {};
      for (const j in prev.legs[id]) if (!L[j]) L[j] = prev.legs[id][j];
    }
  }
  delete G.raw;
  checkSource(G.source);
  S.game = G; covCache = null; graphCache = null; bnCache = null; cargoCache = null; alignPick = null; routeCache.clear();
  if (sel_ind != null && !G.industries.some(i => i.id === sel_ind)) sel_ind = null;
  if (sel_bld != null && !G.buildings.some(b => b[0] === sel_bld)) sel_bld = null;
  if (S.settings.coverage == null) S.settings.coverage = 'gaps';
  const nPax = G.lines.filter(isPax).length;
  if (bg.kind === 'image'){
    if (prev && prev.align && prev.xf && prev.xf.kind === 'align'){ G.align = prev.align; computeAlign(); buildGameNetwork(); toast(T('Updated from the game: {n} passenger lines', {n:nPax})); }
    else toast('Imported. Align it to your screenshot below, or use the game map.');
  } else {
    useGameMap();
    toast(T('Imported {n} passenger lines and {b} buildings', {n:nPax, b:G.buildings.length.toLocaleString(LOCALE())}));
  }
  if (G.errors.length) toast(T('Some data could not be read: {err}', {err:G.errors[0]}));
  ui(); draw();
}
function readGameFile(file){
  const r = new FileReader();
  r.onload = () => importGame(String(r.result));
  r.onerror = () => toast('That file could not be read.');
  r.readAsText(file);
}
function fitWorldBox(pts){
  if (!pts.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  const w = Math.max(x1 - x0, 60), h = Math.max(y1 - y0, 60);
  const z = Math.min(30, Math.min(cw / w, ch / h) * 0.8);
  view.z = z; view.x = cw/2 - (x0 + x1)/2*z; view.y = ch/2 - (y0 + y1)/2*z; draw();
}
function drawCoverage(g, u){
  if (!S.game || !S.game.xf) return;
  const mode = S.settings.coverage; if (!mode || mode === 'off') return;
  if (S.settings.gapHeat !== false) drawGapHeat(g);
  const cov = gameCovered(), plan = planCoverage().set, k = pxPerM(), all = mode === 'all', types = covTypes();
  for (const b of S.game.buildings){
    const t = b[4]; if (!types[t] || !inFocus(b)) continue;
    const sv = servedBy(b, cov, plan), served = sv > 0;
    if (sv === 1 && !all) continue;
    const p = W2I(b[1], b[2]);
    const r = Math.max(2.2*u, k * (5 + Math.sqrt(Math.max(1, b[3])) * 2));
    g.beginPath();
    if (t === 1) g.rect(p.x - r*0.88, p.y - r*0.88, r*1.76, r*1.76);
    else if (t === 2){ g.moveTo(p.x, p.y - r*1.15); g.lineTo(p.x + r*1.15, p.y); g.lineTo(p.x, p.y + r*1.15); g.lineTo(p.x - r*1.15, p.y); g.closePath(); }
    else g.arc(p.x, p.y, r, 0, Math.PI*2);
    g.fillStyle = sv === 2 ? COV.plan : served ? COV.ok : COV.gap; g.globalAlpha = served ? 1 : 0.9; g.fill(); g.globalAlpha = 1;
    g.lineWidth = Math.max(0.6*u, r*0.25); g.strokeStyle = sv === 2 ? COV.accent : 'rgba(255,255,255,0.9)';
    if (sv === 2) g.lineWidth = Math.max(1.2*u, r*0.45);
    g.stroke();
  }
}
/* Gaps: where the people are that no stop reaches. A heatmap of them, and the spots where one new
   stop would reach the most (picked one at a time, so the spots don't count the same people twice). */
let gapCache = {sig:null};
/* Reach of a stop you plan when you haven't set one: the usual reach of the stops already in the save. */
function defaultReach(){ return (S.game && S.game.groups && Object.keys(S.game.groups).length) ? Math.round(gapRadius()) : 160; }
function gapRadius(){ // the usual reach of a bus or tram stop in this save
  const rs = Object.values(S.game.groups).map(g => g.r).filter(r => r > 0).sort((a, b) => a - b);
  return rs.length ? rs[Math.floor(rs.length / 2)] : 160;
}
function gapData(){
  const cov = gameCovered(), pc = planCoverage(), types = covTypes();
  const sig = [S.game.at, pc.sig, S.game.focus, types.join(), S.settings.roadSnap !== false].join('#');
  if (gapCache.sig === sig) return gapCache;
  // one item per unreached building: its people count is the weight, its type and town come along for the spot summary
  const pts = S.game.buildings.filter(b => types[b[4]] && inFocus(b) && b[3] > 0 && !servedBy(b, cov, pc.set))
    .map(b => ({x:b[1], y:b[2], w:b[3], t:b[4], town:b[5]}));
  const R = gapRadius();
  const spots = pickSpots(pts, R, 20).map(s => {
    const people = [0, 0, 0], town = {};
    for (const it of s.items){ people[it.t] += it.w; town[it.town] = (town[it.town] || 0) + it.w; }
    const tid = Object.entries(town).sort((a, b) => b[1] - a[1])[0];
    return {...s, people, town, townName:tid ? (S.game.towns[tid[0]] || '') : '', total:people[0] + people[1] + people[2]};
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  return gapCache = {sig, pts, spots, R, heat:null};
}
function drawGapHeat(g){ drawHeatLayer(g, gapData(), it => Math.min(1, 0.04 + Math.sqrt(it.w) * 0.025)); }
function drawGapSpots(g, u){ drawSpotMarks(g, u, gapData().spots, s => '+' + s.total.toLocaleString(LOCALE())); }
function addSpotStop(s){
  commit();
  const at = W2I(s.x, s.y), id = addNode(at.x, at.y);
  S.stations[id] = {name:'', side:'auto', solo:true};
  sel = {line:null, branch:null, node:id}; ui(); draw();
  toast(T('Stop added. It reaches about {n} people no stop reaches today.', {n:s.total.toLocaleString(LOCALE())}));
}
function renderLegend(){
  const lg = $('#legend'); const has = S.game && S.game.xf; let rows = [];
  if (activeTab === 'coverage' && has && (S.settings.coverage || 'gaps') !== 'off'){
    rows = [[COV.ok, 'Has a stop nearby'], [COV.gap, 'No stop in reach'], [COV.plan, 'Reached by your new stop', COV.planEdge]];
    if (S.settings.gapSpots !== false) rows.push([COV.accent, 'Good spot for a stop', 'round']);
  } else if (activeTab === 'cargo' && has && S.game.industries && (S.settings.cargoView || 'problems') !== 'off'){
    const gs = goodSel(), gn = gs != null ? cargoName(gs) : null;
    rows = gn ? [[IND_COLORS.ok, T('Gets {g}', {g:gn})], [IND_COLORS.missing, T('Has a cargo stop, no {g} arrive', {g:gn})], [IND_COLORS.unreached, 'No cargo stop in reach'], [IND_COLORS.source, T('Makes {g}', {g:gn})]]
      : [[IND_COLORS.ok, 'supplied'], [IND_COLORS.missing, 'reached, missing'], [IND_COLORS.unreached, 'no cargo stop']];
    if (S.settings.cargoSpots !== false) rows.push([COV.accent, 'Good spot for a cargo stop', 'round']);
  }
  lg.hidden = !rows.length; lg.textContent = '';
  rows.forEach(([c, label, edge]) => {
    const row = document.createElement('span'), k = document.createElement('i');
    k.style.background = c; if (edge === 'round') k.className = 'round'; else if (edge) k.style.border = '1px solid ' + edge;
    row.append(k, T(label)); lg.append(row);
  });
}
function renderSpots(){
  const G = S.game, D = gapData(), types = covTypes(), any = types.some(Boolean);
  $('#gSpotsHead').hidden = $('#gSpotsBox').hidden = !any || !G.xf;
  $('#gHeat').checked = S.settings.gapHeat !== false;
  const on = S.settings.gapSpots !== false;
  $('#gSpotsOn').checked = on;
  const box = $('#gSpots'); box.textContent = '';
  $('#gSpotsInfo').hidden = !on;
  if (!any || !G.xf || !on) return;
  $('#gSpotsInfo').textContent = D.spots.length ? T('Where one new stop ({r} m reach, like your other stops) would reach the most people no stop reaches today. Click a spot to zoom to it.', {r:Math.round(D.R)}) : T('Every home and workplace shown is already reached. Nice work.');
  D.spots.forEach((s, n) => {
    const row = document.createElement('div'); row.className = 'spot-row'; row.title = T('Zoom to this spot');
    const num = document.createElement('span'); num.className = 'spot-n'; num.textContent = n + 1;
    const nm = document.createElement('span'); nm.className = 'nm';
    nm.textContent = '+' + s.total.toLocaleString(LOCALE()) + (s.townName ? ' · ' + s.townName : '');
    const why = document.createElement('span'); why.className = 'why';
    why.textContent = CATS.map((c, i) => s.people[i] ? s.people[i].toLocaleString(LOCALE()) + ' ' + T(c.unit) : '').filter(Boolean).join(', ');
    nm.append(why);
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn'; add.textContent = T('Add stop');
    add.addEventListener('click', e => { e.stopPropagation(); addSpotStop(s); });
    row.addEventListener('click', () => fitWorldBox([W2I(s.x - s.r*2, s.y - s.r*2), W2I(s.x + s.r*2, s.y + s.r*2)]));
    row.append(num, nm, add); box.append(row);
  });
}

/* Cargo gaps: town businesses that want goods no cargo stop reaches. A heatmap of that demand, and
   the spots where one new cargo stop would reach the most of it, with the nearest industry that
   makes the good most of them want (that's where a truck line would come from). */
let cgapCache = {sig:null};
function cargoRadius(){
  const rs = Object.keys(S.game.ccatch || {}).map(k => S.game.groups[k] && S.game.groups[k].r).filter(r => r > 0).sort((a, b) => a - b);
  return rs.length ? rs[Math.floor(rs.length / 2)] : gapRadius();
}
function pickSpots(items, R, minW){
  // items: {x, y, w}; greedy, one spot at a time, spots kept apart; returns spots with their items
  const CELL = Math.max(20, R / 4), rr = Math.ceil(R / CELL), spots = [], left = new Set(items);
  const snap = S.settings.roadSnap !== false && S.game.edges && S.game.edges.length;
  for (let n = 0; n < 5 && left.size; n++){
    const score = new Map();
    for (const it of left){
      const cx = Math.floor(it.x / CELL), cy = Math.floor(it.y / CELL);
      for (let i = -rr; i <= rr; i++) for (let j = -rr; j <= rr; j++){
        if (Math.hypot((cx + i + 0.5)*CELL - it.x, (cy + j + 0.5)*CELL - it.y) > R) continue;
        const k = (cx + i) + ',' + (cy + j); score.set(k, (score.get(k) || 0) + it.w);
      }
    }
    let best = null, bs = 0;
    for (const [k, v] of score){
      if (v <= bs) continue;
      const [ci, cj] = k.split(',').map(Number);
      if (spots.some(o => Math.hypot((ci + 0.5)*CELL - o.x, (cj + 0.5)*CELL - o.y) < R*1.2)) continue;
      bs = v; best = k;
    }
    if (!best || bs < minW) break;
    const [i, j] = best.split(',').map(Number);
    let x = (i + 0.5)*CELL, y = (j + 0.5)*CELL;
    if (snap){ const rn = nearStreet(x, y, R * 0.5); if (rn){ const q = roadGraph().nodes.get(rn.n); x = q[0]; y = q[1]; } }
    const s = {x, y, r:R, items:[]};
    for (const it of [...left]) if (Math.hypot(it.x - x, it.y - y) <= R){ s.items.push(it); left.delete(it); }
    if (s.items.length) spots.push(s);
  }
  return spots;
}
function cargoGapData(){
  const reach = cargoReach(), c = goodSel();
  const sig = [S.game.at, cargoPlan.sig, S.game.focus, c, S.settings.cargoBiz !== false, S.settings.cargoTind !== false, S.settings.roadSnap !== false].join('#');
  if (cgapCache.sig === sig) return cgapCache;
  const items = [];
  for (const [b, st] of bizInView()){
    if (reach.has(b[0])) continue;
    const ss = stockStatus(st);
    const want = (c == null ? ss.req : ss.req.concat(ss.opt).filter(x => x.cargo === c)).filter(x => x.cf <= 0);
    if (!want.length) continue;
    const w = Math.max(1, want.reduce((a, x) => a + (x.cap > 0 ? x.cap : 1), 0));
    items.push({x:b[1], y:b[2], w, town:b[5], goods:want.map(x => x.cargo)});
  }
  const R = cargoRadius(), wmax = items.reduce((a, it) => Math.max(a, it.w), 1);
  const spots = pickSpots(items, R, 1).map(s => {
    const goods = {}, town = {};
    for (const it of s.items){ for (const g of it.goods) goods[g] = (goods[g] || 0) + 1; town[it.town] = (town[it.town] || 0) + 1; }
    const gl = Object.entries(goods).sort((a, b) => b[1] - a[1]).map(([g, n]) => ({cargo:+g, n}));
    const tid = Object.entries(town).sort((a, b) => b[1] - a[1])[0];
    let src = null;
    if (gl.length){
      for (const ind of S.game.industries || []){
        if (!stockStatus(ind).outputs.some(o => o.cargo === gl[0].cargo)) continue;
        const d = Math.hypot(ind.x - s.x, ind.y - s.y);
        if (!src || d < src.d) src = {ind, d};
      }
    }
    return {...s, total:s.items.length, weight:s.items.reduce((a, it) => a + it.w, 0), goods:gl, townName:tid ? (S.game.towns[tid[0]] || '') : '', src};
  }).sort((a, b) => b.total - a.total || b.weight - a.weight);
  return cgapCache = {sig, pts:items, wmax, spots, R, heat:null};
}
/* Looks for the heatmaps (gaps, unmet cargo demand). Each maps t (0 faint .. 1 strong) to a colour and
   alpha; "bands" quantises t into steps so the layer reads like contour bands. Chosen in Settings. */
const HEAT_STYLES = {
  ember: {label:'Ember', bands:0, at:t => [244 - 34*t, 190 - 150*t, 60 - 30*t, Math.min(0.6, 0.12 + t*0.6)]},   // amber to deep red
  field: {label:'Field guide', bands:0, at:t => [242 - 25*t, 169 - 86*t, 0 + 43*t, Math.min(0.55, 0.10 + t*0.55)]}, // the app's amber to terracotta
  bands: {label:'Bands', bands:4, at:t => [242 - 25*t, 169 - 86*t, 0 + 43*t, 0.06 + t*0.42]},                  // same colours, four flat steps
  sea:   {label:'Sea', bands:0, at:t => [140 - 110*t, 203 - 96*t, 224 - 84*t, Math.min(0.55, 0.10 + t*0.55)]},   // cool teal: the red gap dots stand out on it
};
const heatStyle = () => HEAT_STYLES[S.settings.heatStyle] || HEAT_STYLES.ember;
function drawHeatLayer(g, D, alphaOf){
  if (!D.pts.length) return;
  const HS = heatStyle(), sc = 0.25, key = bg.w + 'x' + bg.h + ':' + pxPerM() + ':' + (S.settings.heatStyle || '');
  if (!D.heat || D.heat.key !== key){
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(bg.w*sc)); c.height = Math.max(1, Math.ceil(bg.h*sc));
    const h = c.getContext('2d'), r = Math.max(3, D.R * 0.7 * pxPerM() * sc);
    const blob = document.createElement('canvas'), bs = Math.ceil(r*2); blob.width = blob.height = bs;
    const bx = blob.getContext('2d'), gr = bx.createRadialGradient(bs/2, bs/2, 0, bs/2, bs/2, bs/2);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, bs, bs);
    for (const it of D.pts){ const p = W2I(it.x, it.y); h.globalAlpha = alphaOf(it); h.drawImage(blob, p.x*sc - bs/2, p.y*sc - bs/2); }
    const id = h.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4){
      const a = d[i + 3] / 255; if (!a) continue;
      let t = Math.min(1, a * 1.5);
      if (HS.bands){ t = Math.ceil(t * HS.bands) / HS.bands; }
      const [R, G, B, A] = HS.at(t);
      d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = Math.round(255 * A);
    }
    h.putImageData(id, 0, 0);
    D.heat = {key, c};
  }
  g.save(); g.imageSmoothingEnabled = true; g.drawImage(D.heat.c, 0, 0, bg.w, bg.h); g.restore();
}
function drawCargoGapHeat(g){ const D = cargoGapData(); drawHeatLayer(g, D, it => Math.min(1, 0.12 + 0.35 * Math.sqrt(it.w / D.wmax))); }
function drawSpotMarks(g, u, spots, labelOf){
  const k = pxPerM(), font = getComputedStyle(document.body).fontFamily;
  spots.forEach((s, n) => {
    const p = W2I(s.x, s.y);
    g.beginPath(); g.arc(p.x, p.y, s.r*k, 0, Math.PI*2); g.setLineDash([6*u, 4*u]); g.lineWidth = 1.6*u; g.strokeStyle = 'rgba(43,36,25,0.6)'; g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(p.x, p.y, 12*u, 0, Math.PI*2); g.fillStyle = COV.accent; g.fill(); g.lineWidth = 2*u; g.strokeStyle = STATION_INK; g.stroke();
    g.fillStyle = STATION_INK; g.font = `800 ${12*u}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n + 1), p.x, p.y + 0.5*u);
    const lbl = labelOf(s);
    g.font = `700 ${11.5*u}px ${font}`; const w = g.measureText(lbl).width + 12*u;
    g.beginPath(); g.roundRect(p.x + 14*u, p.y - 9*u, w, 18*u, 9*u); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill(); g.lineWidth = u; g.strokeStyle = 'rgba(0,0,0,0.2)'; g.stroke();
    g.fillStyle = STATION_INK; g.textAlign = 'left'; g.fillText(lbl, p.x + 20*u, p.y + 0.5*u);
  });
}
function drawCargoGapSpots(g, u){
  const D = cargoGapData();
  drawSpotMarks(g, u, D.spots, s => '+' + s.total + (s.goods[0] ? ' · ' + cargoName(s.goods[0].cargo) : ''));
}
function addCargoSpotStop(s){
  commit();
  const at = W2I(s.x, s.y), id = addNode(at.x, at.y);
  S.stations[id] = {name:'', side:'auto', solo:true, cargo:true};
  sel = {line:null, branch:null, node:id}; ui(); draw();
  toast(T('Cargo stop added. It reaches {n} businesses that want goods no cargo stop reaches.', {n:s.total}));
}
function renderCargoSpots(){
  const G = S.game, D = cargoGapData(), any = S.settings.cargoBiz !== false || S.settings.cargoTind !== false;
  $('#cSpotsHead').hidden = $('#cSpotsBox').hidden = !any || !G.xf;
  $('#cHeat').checked = S.settings.cargoHeat !== false;
  const on = S.settings.cargoSpots !== false;
  $('#cSpotsOn').checked = on;
  const box = $('#cSpots'); box.textContent = '';
  $('#cSpotsInfo').hidden = !on;
  if (!any || !G.xf || !on) return;
  $('#cSpotsInfo').textContent = D.spots.length ? T('Where one new cargo stop ({r} m reach) would reach the most town businesses that want goods no cargo stop reaches. A truck line still has to bring the goods: the nearest industry that makes them is shown.', {r:Math.round(D.R)}) : T('Every business shown that wants goods is already reached by a cargo stop.');
  D.spots.forEach((s, n) => {
    const row = document.createElement('div'); row.className = 'spot-row'; row.title = T('Zoom to this spot');
    const num = document.createElement('span'); num.className = 'spot-n'; num.textContent = n + 1;
    const nm = document.createElement('span'); nm.className = 'nm';
    nm.textContent = T(s.total === 1 ? '+1 business' : '+{n} businesses', {n:s.total}) + (s.townName ? ' · ' + s.townName : '');
    const why = document.createElement('span'); why.className = 'why';
    why.textContent = s.goods.slice(0, 3).map(x => T(x.n === 1 ? '1 wants {good}' : '{n} want {good}', {n:x.n, good:cargoName(x.cargo)})).join(', ') + (s.goods.length > 3 ? ', …' : '');
    nm.append(why);
    if (s.goods[0]){
      const src = document.createElement('span'); src.className = 'why';
      src.textContent = s.src ? T('{good} from {name} ({km} km)', {good:cargoName(s.goods[0].cargo), name:industryLabel(s.src.ind, stockStatus(s.src.ind)), km:(s.src.d / 1000).toLocaleString(LOCALE(), {maximumFractionDigits:1})}) : T('No industry on the map makes {good} yet', {good:cargoName(s.goods[0].cargo)});
      nm.append(src);
    }
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn'; add.textContent = T('Add stop');
    add.addEventListener('click', e => { e.stopPropagation(); addCargoSpotStop(s); });
    row.addEventListener('click', () => fitWorldBox([W2I(s.x - s.r*2, s.y - s.r*2), W2I(s.x + s.r*2, s.y + s.r*2)]));
    row.append(num, nm, add); box.append(row);
  });
}

function fillAlignSelects(){
  const opts = Object.entries(S.game.groups).filter(([, gr]) => gr.r > 0 || true).sort((a, b) => a[1].name.localeCompare(b[1].name));
  for (const id of ['gA1', 'gA2']){
    const s = $('#' + id), keep = s.value; s.textContent = '';
    for (const [k, gr] of opts){ const o = document.createElement('option'); o.value = k; o.textContent = gr.name; s.append(o); }
    if (keep && S.game.groups[keep]) s.value = keep;
  }
  const A = S.game.align;
  if (A && A.p1) $('#gA1').value = A.p1.sg;
  if (A && A.p2) $('#gA2').value = A.p2.sg;
}
function gameUI(){
  const G = S.game;
  $('#gameEmpty').hidden = !!G; $('#gameOn').hidden = !G;
  $('#vRotBox').hidden = !(G && bg.kind === 'game');
  if (G) $('#vRot').textContent = (G.rot || 0) + '°';
  if (!G){ $('#covSec').hidden = true; $('#topAreaWrap').hidden = true; return; }
  if ($('#gA1').options.length !== Object.keys(G.groups).length) fillAlignSelects();
  const pax = G.lines.filter(isPax).length, cargo = G.lines.length - pax;
  $('#gSummary').textContent = T('{pax} passenger lines, {cargo} cargo · {st} stations · {b} buildings', {pax, cargo, st:Object.keys(G.groups).length, b:G.buildings.length.toLocaleString(LOCALE())});
  const tot = catTotals(), types = covTypes();
  const cs = $('#gCats'); cs.textContent = '';
  CATS.forEach((c, i) => {
    const row = document.createElement('label'); row.className = 'cat-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!types[i]; cb.id = 'gT' + i;
    cb.addEventListener('change', () => { const t = covTypes().slice(); t[i] = cb.checked; S.settings.covTypes = t; ui(); draw(); });
    const sw = document.createElement('span'); sw.className = 'cat-sw s' + i; sw.style.background = c.color;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = T(c.label);
    const v = tot[i], pct = v.people ? Math.round(v.served / v.people * 100) : 0;
    const pc = document.createElement('span'); pc.className = 'pc'; pc.textContent = pct + ' %';
    const bar = document.createElement('span'); bar.className = 'bar'; const fill = document.createElement('i'); fill.style.width = pct + '%'; bar.append(fill);
    const num = document.createElement('span'); num.className = 'num'; num.textContent = T('{a} of {b} {unit}', {a:v.served.toLocaleString(LOCALE()), b:v.people.toLocaleString(LOCALE()), unit:T(c.unit)});
    row.append(cb, sw, nm, pc, bar, num);
    if (v.planned){ const pl = document.createElement('span'); pl.className = 'plus'; pl.textContent = T('+{n} {unit} with your new stops', {n:v.planned.toLocaleString(LOCALE()), unit:T(c.unit)}); num.append(' \u00b7 ', pl); }
    cs.append(row);
  });
  { // stops that no running line calls at
    const idle = idleStops();
    let note = $('#gIdleNote'); if (!note){ note = document.createElement('p'); note.className = 'info'; note.id = 'gIdleNote'; cs.after(note); }
    note.hidden = !idle.length;
    if (idle.length) note.textContent = T(idle.length === 1 ? '1 stop is only on lines without vehicles and is not counted as reached.' : '{n} stops are only on lines without vehicles and are not counted as reached.', {n:idle.length});
  }
  const ri = G.routeInfo;
  $('#gRoadsRow').hidden = !(G.edges && G.edges.length);
  $('#gRoadsNote').hidden = !!(G.edges && G.edges.length);
  $('#gRoads').checked = S.settings.roads !== false;
  $('#gRouteInfo').hidden = !ri;
  if (ri){ const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    $('#gRouteInfo').textContent = T('Routes: {a} stretches from vehicles in the game, {b} estimated as the shortest road', {a:ri.fromGame || 0, b:ri.routed}) + (ri.straight ? T(', {n} drawn straight', {n:ri.straight}) : '') + T('. Re-export later to capture more real routes.'); }
  const needsAlign = bg.kind === 'image' && !(G.xf && G.xf.kind === 'align');
  $('#gAlign').hidden = bg.kind !== 'image';
  $('#gAlignHint').hidden = !needsAlign;
  $('#gMirror').checked = !!(G.align && G.align.mirror);
  const A = G.align || {};
  $('#gP1').textContent = T(alignPick === 1 ? 'Click it on the map…' : (A.p1 ? 'Placed ✓ · move' : 'Click it on the map'));
  $('#gP2').textContent = T(alignPick === 2 ? 'Click it on the map…' : (A.p2 ? 'Placed ✓ · move' : 'Click it on the map'));
  $('#gSnap').checked = S.settings.roadSnap !== false;
  $('#gSnap').disabled = !(G.edges && G.edges.length);
  $('#gColors').checked = !!S.settings.gameColors;
  $('#gRebuild').hidden = !G.xf || S.lines.some(l => l.gameId);
  setVal($('#gCov'), S.settings.coverage || 'gaps');
  setVal($('#gRadii'), S.settings.radii || 'plan');
  setVal($('#gReach'), S.settings.reach || 'circle');
  $('#gMapBtn').hidden = bg.kind === 'game';
  $('#topAreaWrap').hidden = bg.kind !== 'game';
  $('#covSec').hidden = false;
  const areaSel = $('#gArea');
  if (areaSel.dataset.n !== String(G.at)){
    areaSel.textContent = '';
    const pop = {}; G.buildings.forEach(b => { if (b[4] === 0) pop[b[5]] = (pop[b[5]] || 0) + b[3]; });
    const o0 = document.createElement('option'); o0.value = ''; o0.textContent = T('Whole map'); areaSel.append(o0);
    Object.keys(G.towns).sort((a, b) => (pop[b] || 0) - (pop[a] || 0)).forEach(k => {
      const o = document.createElement('option'); o.value = k; o.textContent = T('{town} ({n} residents)', {town:G.towns[k], n:(pop[k] || 0).toLocaleString(LOCALE())}); areaSel.append(o);
    });
    areaSel.dataset.n = String(G.at);
  }
  setVal(areaSel, G.focus == null ? '' : String(G.focus));
  $('#gDrawn').hidden = !S.lines.some(l => !l.gameId);
  renderSpots();
  const stats = townStats();
  const anyType = types.some(Boolean);
  $('#gTownsHead').hidden = !anyType || !stats.length || G.focus != null;
  const box = $('#gTowns'); box.textContent = '';
  if (!anyType || G.focus != null) return;
  stats.slice(0, 14).forEach(r => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'town-row';
    const p = r.people ? Math.round(r.served / r.people * 100) : 0;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
    const num = document.createElement('span'); num.className = 'num'; num.textContent = T('{n} not reached', {n:(r.people - r.served).toLocaleString(LOCALE())});
    const bar = document.createElement('span'); bar.className = 'bar'; const fill = document.createElement('i'); fill.style.width = p + '%'; bar.append(fill);
    const pc = document.createElement('span'); pc.className = 'pc'; pc.textContent = p + '%';
    b.append(nm, num, bar, pc);
    b.title = T('{a} of {b} within reach of a stop', {a:r.served.toLocaleString(LOCALE()), b:r.people.toLocaleString(LOCALE())});
    b.addEventListener('click', () => {
      if (!G.xf){ toast('Line the game data up with your screenshot first'); return; }
      fitWorldBox(G.buildings.filter(x => x[5] === r.id).map(x => W2I(x[1], x[2])));
    });
    box.append(b);
  });
}
function alignClick(p){
  const sg = $(alignPick === 1 ? '#gA1' : '#gA2').value;
  if (!S.game.align) S.game.align = {mirror:false};
  S.game.align['p' + alignPick] = {sg, x:p.x, y:p.y};
  const which = alignPick; alignPick = null;
  if (S.game.align.p1 && S.game.align.p2){
    if (computeAlign()){ commit(); buildGameNetwork(); toast('Aligned. If lines look flipped, tick Mirror.'); }
    else toast('Pick two different stations');
  } else toast(T('Station {n} placed. Now place the other one.', {n:which}));
  ui(); draw();
}
function copyExportCmd(){
  const done = () => toast('Export command copied. Paste it in the game console.');
  const fallback = () => { const t = $('#gCmd'); t.hidden = false; t.value = EXPORT_CMD; t.focus(); t.select(); toast('Press Ctrl+C to copy the selected command'); };
  try { navigator.clipboard.writeText(EXPORT_CMD).then(done, fallback); } catch { fallback(); }
}

