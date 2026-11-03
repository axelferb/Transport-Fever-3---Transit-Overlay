local C=api.type.ComponentType
local g=api.engine.getComponent
local S=api.engine.system
local P=print
local tc=table.concat
local function esc(s) s=tostring(s or "") s=s:gsub("[|;\r\n]"," ") return s end
local function f1(v) return string.format("%.1f",v) end
local function arr(t) local o={} if t==nil then return o end local n=#t for i=1,n do o[#o+1]=t[i] end return o end
local BX0,BY0,BX1,BY1
local function bbx(x,y) if not BX0 then BX0,BY0,BX1,BY1=x,y,x,y else if x<BX0 then BX0=x end if y<BY0 then BY0=y end if x>BX1 then BX1=x end if y>BY1 then BY1=y end end end
local function center(e) local bv=g(e,C.BOUNDING_VOLUME) if not bv then return nil end local a,b=bv.bbox.min,bv.bbox.max local x,y=(a.x+b.x)/2,(a.y+b.y)/2 bbx(x,y) return x,y end
local function chunks(tag,head,list,size) local buf={} for i=1,#list do buf[#buf+1]=list[i] if #buf>=size then P(tag..head..tc(buf,";")) buf={} end end if #buf>0 then P(tag..head..tc(buf,";")) end end
local function stockInfo(sl)
  local stk=g(sl,C.STOCK_LIST) if not stk then return nil end
  local st,sd={},arr(stk.stockDatas)
  for i,x in ipairs(arr(stk.stocks)) do st[#st+1]=x.type..":"..x.cargoType..":"..x.capacity..":"..f1((sd[i] and sd[i].consumeFrequency) or 0) end
  local rs={}
  for _,r in ipairs(arr(stk.rules)) do
    local alts={} for _,alt in ipairs(arr(r.input)) do alts[#alts+1]=tc(arr(alt),"/") end
    local outs={} pcall(function() for c,a in pairs(r.output) do outs[#outs+1]=c..":"..a end end)
    rs[#rs+1]=tc(alts,"+")..">"..tc(outs,"/")..">"..(r.booster and "b" or "")
  end
  local pr={} pcall(function() for c,d in pairs(stk.cargoData) do pr[#pr+1]=c..":"..f1(d.produceFrequency or 0) end end)
  return tc(st,";").."|"..tc(rs,"~").."|"..tc(pr,";")
end
P("TFO|BEGIN|1|console")
local sgs,sgList={},{}
local slOwner={} -- stock list entity -> the town building or industry it belongs to (cargo items name the stock list)
local ok,err=pcall(function()
  for _,l in ipairs(arr(S.lineSystem.getLines())) do
    local ln=g(l,C.LINE) local nm=g(l,C.NAME) local co=g(l,C.COLOR)
    local modes={} local tm=ln.vehicleInfo and ln.vehicleInfo.transportModes
    if tm then for i=0,16 do if tm[i]==true then modes[#modes+1]=i end end end
    local st={} for _,s in ipairs(arr(ln.stops)) do st[#st+1]=s.stationGroup if not sgs[s.stationGroup] then sgs[s.stationGroup]=true sgList[#sgList+1]=s.stationGroup end end
    local ld,lds={},{} for _,s in ipairs(arr(ln.stops)) do local lo=s.stopConfig and s.stopConfig.load if lo then for i=1,#lo do if lo[i]==true then ld[i]=true end end end end for i=1,64 do if ld[i] then lds[#lds+1]=i end end
    local c=(co and co.color) or {x=0.5,y=0.5,z=0.5}
    P("TFO|L|"..l.."|"..esc(nm and nm.name).."|"..string.format("%.3f,%.3f,%.3f",c.x,c.y,c.z).."|"..tc(modes,",").."|"..tc(st,",").."|"..tc(lds,","))
  end
end) if not ok then P("TFO|ERR|lines|"..esc(err)) end
local tbm=S.townBuildingSystem.getTown2BuildingMap
local catch={} local gsc=S.catchmentAreaSystem.getStationCatchables
ok,err=pcall(function()
  for _,sg in ipairs(sgList) do
    local G=g(sg,C.STATION_GROUP) local nm=g(sg,C.NAME)
    -- Position and radius are the mean and the largest of the group's catchment circles; every circle
    -- also goes out as x:y:r (a station building has one per terminal). Then "<stations>,<terminals>,<building>":
    -- a stop on the road has no construction of its own, a station building does.
    local xs,ys,k,r=0,0,0,0 local stations=arr(G and G.stations) local circ,nt,con={},0,0
    for _,s in ipairs(stations) do
      local st=g(s,C.STATION)
      for _,ca in ipairs(arr(st and st.catchmentAreas)) do local q=ca.position xs=xs+q.x ys=ys+q.y k=k+1 if ca.radius>r then r=ca.radius end circ[#circ+1]=f1(q.x)..":"..f1(q.y)..":"..f1(ca.radius) end
      nt=nt+#arr(st and st.terminals)
      local okc,ce=pcall(S.streetConnectorSystem.getConstructionEntityForStation,s) if okc and (tonumber(ce) or -1)>=0 then con=1 end
    end
    if k==0 then for _,s in ipairs(stations) do local x,y=center(s) if x then xs=xs+x ys=ys+y k=k+1 end end end
    if k>0 then P("TFO|G|"..sg.."|"..esc(nm and nm.name).."|"..f1(xs/k)..","..f1(ys/k).."|"..r.."|"..#stations..","..nt..","..con.."|"..tc(circ,";")) end
    local set,out={},{}
    for _,s in ipairs(stations) do
      local cs=arr(gsc(s,false))
      for _,b in ipairs(cs) do if not set[b] then set[b]=true out[#out+1]=b catch[b]=true end end
    end
    chunks("TFO|C|",sg.."|",out,400)
    local cset,cout={},{}
    for _,s in ipairs(stations) do
      local okc,cs=pcall(function() return arr(gsc(s,true)) end)
      if okc then for _,b in ipairs(cs) do if not cset[b] then cset[b]=true cout[#cout+1]=b end end end
    end
    chunks("TFO|K|",sg.."|",cout,400)
  end
end) if not ok then P("TFO|ERR|groups|"..esc(err)) end
ok,err=pcall(function()
  local tb=tbm()
  local rows={}
  for town,list in pairs(tb) do
    local tn=g(town,C.NAME)
    P("TFO|T|"..town.."|"..esc(tn and tn.name))
    for _,b in ipairs(arr(list)) do
      local x,y=center(b)
      if x then
        local tbc=g(b,C.TOWN_BUILDING)
        local pce=(tbc and tbc.personCapacity) or b
        local pc=(pce and pce>=0) and g(pce,C.PERSON_CAPACITY) or nil
        rows[#rows+1]=b..","..f1(x)..","..f1(y)..","..((pc and pc.capacity) or 0)..","..((pc and pc.type) or -1)..","..town..","..pce
        if tbc and tbc.stockList and tbc.stockList>=0 then slOwner[tbc.stockList]=b local oks,si=pcall(stockInfo,tbc.stockList) if oks and si then P("TFO|S|"..b.."|"..si) end end
      end
    end
  end
  chunks("TFO|B|","",rows,150)
end) if not ok then P("TFO|ERR|buildings|"..esc(err)) end
ok,err=pcall(function()
  api.engine.forEachEntityWithComponent(function(e)
    local okI,errI=pcall(function()
      local ind=g(e,C.INDUSTRY) local x,y=center(e)
      if not x and ind and ind.construction then x,y=center(ind.construction) end
      if not x then return end
      local nm=g(e,C.NAME) if (not nm) and ind and ind.construction then nm=g(ind.construction,C.NAME) end
      if ind and ind.stockList and ind.stockList>=0 then slOwner[ind.stockList]=e end
      local si=stockInfo((ind and ind.stockList) or e) or "||"
      P("TFO|I|"..e.."|"..f1(x)..","..f1(y).."|"..((ind and ind.level) or 0).."|"..esc(nm and nm.name).."|"..si)
    end)
    if not okI then P("TFO|ERR|industry|"..esc(errI)) end
  end, C.INDUSTRY)
end) if not ok then P("TFO|ERR|industries|"..esc(err)) end
ok,err=pcall(function()
  local rep=api.res.cargoTypeRep local all=rep.getAll()
  for i=0,63 do local path=all[i] if path then local nm=nil pcall(function() nm=rep.getName(i) end) if type(nm)~="string" or nm=="" then nm=tostring(path):match("([^/]+)%.cargo$") or tostring(path) end P("TFO|N|"..i.."|"..esc(nm)) end end
end) if not ok then P("TFO|ERR|cargonames|"..esc(err)) end
ok,err=pcall(function()
  for town,_ in pairs(tbm()) do
    for lu=1,2 do
      local okD,d=pcall(function() return S.townBuildingSystem.getCargoSupplyAndLimit(town,lu) end)
      if okD and d then local parts={} pcall(function() for c,v in pairs(d) do parts[#parts+1]=c..":"..f1(v[1] or 0)..":"..f1(v[2] or 0)..":"..f1(v[3] or 0) end end) if #parts>0 then P("TFO|D|"..town.."|"..lu.."|"..tc(parts,";")) end end
    end
  end
end) if not ok then P("TFO|ERR|demand|"..esc(err)) end
ok,err=pcall(function()
  for l,vs in pairs(S.transportVehicleSystem.getLine2VehicleMap()) do
    -- "V|<line>|<vehicles>|<seats>|<cargo capacity>": seats are the passenger capacity (cargo type 0),
    -- the rest is everything else, summed over the line's vehicles. Capacities missing -> 0,0.
    local nv,seats,cap=0,0,0
    for _,v in ipairs(arr(vs)) do
      nv=nv+1
      pcall(function()
        local cs=g(v,C.TRANSPORT_VEHICLE).config.capacities local b=cs[0]~=nil and 0 or 1
        for i=b,b+#cs-1 do local n=tonumber(cs[i]) or 0 if i==b then seats=seats+n else cap=cap+n end end
      end)
      local okv,mp=pcall(g,v,C.MOVE_PATH)
      if okv and mp and mp.path and mp.path.edges then
        local es,last={},nil
        for _,ed in ipairs(arr(mp.path.edges)) do local e=ed.edgeId and ed.edgeId.entity if e and e~=last then es[#es+1]=e last=e end end
        if #es>1 then P("TFO|R|"..l.."|"..tc(es,",")) end
      end
    end
    P("TFO|V|"..l.."|"..nv.."|"..seats.."|"..cap)
  end
end) if not ok then P("TFO|ERR|routes|"..esc(err)) end
local epos,eseen,erows,eerr={}, {}, {}, false
local function enp(n) local p=epos[n] if p==nil then local bn=g(n,C.BASE_NODE) p=(bn and bn.position) or false epos[n]=p if p then bbx(p.x,p.y) end end return p end
-- Street width in metres and speed: "<roadway>,<roadway plus both sidewalks>,<speed limit km/h>", from the edge's
-- TRANSPORT_NETWORK lanes (TF3 has no streetTypeRep). Sidewalks are the lanes that carry only persons/cargo
-- (modes 0,1); tram-only lanes (5,6 without car mode 2) overlap the roadway and are skipped. "0,0,0" when unknown.
local function swidth(e)
  local road,walk,spd=0,0,0
  local ok=pcall(function()
    for _,l in ipairs(arr(g(e,C.TRANSPORT_NETWORK).edges)) do
      local w=tonumber(l.geometry and l.geometry.width) or 0 local m=l.transportModes
      local car,tram,veh=m[2]==true,(m[5]==true or m[6]==true),false
      for i=2,16 do if m[i]==true then veh=true end end
      if not veh then walk=walk+w elseif car or not tram then road=road+w local v=tonumber(l.speedLimit) or 0 if v>spd then spd=v end end
    end
  end)
  if not ok or road<=0 then return "0,0,0" end
  return f1(road)..","..f1(road+walk)..","..string.format("%.0f",spd*3.6)
end
local function escan(kind,getmap)
  local ok2,err2=pcall(function()
    for _,edges in pairs(getmap()) do
      for _,e in ipairs(arr(edges)) do
        if not eseen[e] then eseen[e]=true
          local okE,errE=pcall(function()
            local be=g(e,C.BASE_EDGE)
            if be and be.node0 and be.node1 then
              local p0,p1=enp(be.node0),enp(be.node1)
              if p0 and p1 then
                local t0,t1=be.tangent0,be.tangent1
                erows[#erows+1]=e..","..be.node0..","..be.node1..","..f1(p0.x)..","..f1(p0.y)..","..f1(p1.x)..","..f1(p1.y)..","..(t0 and (f1(t0.x)..","..f1(t0.y)) or "0,0")..","..(t1 and (f1(t1.x)..","..f1(t1.y)) or "0,0")..","..kind..","..(kind=="s" and swidth(e) or "0,0,0")
              end
            end
          end)
          if not okE and not eerr then eerr=true P("TFO|ERR|edge|"..esc(errE)) end
        end
      end
    end
  end)
  if not ok2 then P("TFO|ERR|edges-"..kind.."|"..esc(err2)) end
end
escan("s",function() return S.streetSystem.getNode2StreetEdgeMap() end)
escan("t",function() return S.streetSystem.getNode2TrackEdgeMap() end)
chunks("TFO|E|","",erows,120)
ok,err=pcall(function()
  if not BX0 then return end
  local T=api.engine.terrain
  if not T then error("api.engine.terrain is missing") end
  local H=function(x,y) return T.getHeightAt(api.type.Vec2f.new(x,y)) end
  local okh,h0=pcall(H,BX0,BY0)
  if not okh or type(h0)~="number" then H=function(x,y) return T.getHeightAt(api.type.Vec2d.new(x,y)) end okh,h0=pcall(H,BX0,BY0) end
  if not okh or type(h0)~="number" then error("getHeightAt failed: "..tostring(h0)) end
  local wl=nil
  for _,f in ipairs({function() return T.getWaterLevel() end,function() return api.res.getBaseConfig().waterLevel end,function() return game.config.terrain.waterLevel end}) do local o,v=pcall(f) if o and type(v)=="number" then wl=v break end end
  local m=600 local x0,y0=BX0-m,BY0-m
  local step=math.max(16,math.ceil(math.max(BX1-BX0,BY1-BY0)/320))
  local cols=math.floor((BX1+m-x0)/step)+1 local rows=math.floor((BY1+m-y0)/step)+1
  P("TFO|W|"..f1(x0)..","..f1(y0)..","..step..","..cols..","..rows.."|"..(wl and f1(wl) or ""))
  for j=0,rows-1 do local r={} local y=y0+j*step for i=0,cols-1 do local o,h=pcall(H,x0+i*step,y) r[#r+1]=(o and type(h)=="number") and string.format("%.0f",h*2) or "" end P("TFO|H|"..j.."|"..tc(r,",")) end
end) if not ok then P("TFO|ERR|terrain|"..esc(err)) end
P("TFO|END|"..#sgList)
