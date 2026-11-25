const {RULES,Logic:L}=require("./load.js"); const assert=require("assert");
const area={lat:37.5665,lng:126.978,r:300};
const g=L.terrGrid(area); console.log("side",g.sd.toFixed(1),"cells",g.keys.length);
assert(g.keys.length>140&&g.keys.length<200);
// 칸 중심 → 그 칸
for (const k of g.keys.slice(0,50)) assert.equal(L.terrCellOf(g,L.terrCellCenter(g,k)),k);
// 이웃은 서로 거리 √3·변
const k0=g.keys[80], c0=L.terrCellCenter(g,k0); for (const nb of L.terrNb(k0)) if (g.set.has(nb)) { const d=L.dist(c0,L.terrCellCenter(g,nb)); assert(Math.abs(d-g.sd*Math.sqrt(3))<0.5,d); }
// 경계 흔들림: 이웃 칸으로 2m만 넘어가면 그대로, 깊이 들어가면 바뀜
const nb=L.terrNb(k0).find(x=>g.set.has(x)), c1=L.terrCellCenter(g,nb);
const mix=f=>({lat:c0.lat+(c1.lat-c0.lat)*f,lng:c0.lng+(c1.lng-c0.lng)*f});
assert.equal(L.terrCellOf(g,mix(0.55),k0),k0,"경계 바로 너머는 그대로"); assert.equal(L.terrCellOf(g,mix(0.9),k0),nb,"깊이 들어가면 바뀜");
// 작은/큰 구역
console.log("r100", L.terrGrid({lat:37.5,lng:127,r:100}).keys.length, "r1000", L.terrGrid({lat:37.5,lng:127,r:1000}).keys.length);
// 꼭짓점 구역
const poly={lat:37.5665,lng:126.978,r:200,poly:[[37.5665+0.002,126.978-0.002],[37.5665+0.002,126.978+0.002],[37.5665-0.002,126.978+0.002],[37.5665-0.002,126.978-0.002]]};
console.log("poly cells", L.terrGrid(poly).keys.length);
// 시작
let seed=3; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
const st=L.terrStart(area,["a1","b2","c3","d4","e5"],rnd); const tc=Object.values(st.teams); console.log("teams",JSON.stringify(st.teams),"base",JSON.stringify(st.terr.base));
assert(Math.abs(tc.filter(x=>x==="tR").length-tc.filter(x=>x==="tB").length)<=1);
const bR=L.terrCellCenter(g,st.terr.base.tR), bB=L.terrCellCenter(g,st.terr.base.tB); assert(bR.lng<area.lng&&bB.lng>area.lng,"빨강 서쪽, 파랑 동쪽");
// 필요한 시간
const T0=1e12, S0=T0+RULES.HIDE_SEC*1000; const terr=JSON.parse(JSON.stringify(st.terr)); const blank=g.keys.find(k=>!terr.cells[k]&&!L.terrNb(terr.base.tB).includes(k)&&!L.terrNb(terr.base.tR).includes(k));
assert.equal(L.terrNeed(terr,blank,"tR",S0+400e3,T0),3); terr.cells[blank]={t:"tB"}; assert.equal(L.terrNeed(terr,blank,"tR",S0+400e3,T0),5);
assert.equal(L.terrNeed(terr,blank,"tB",S0+400e3,T0),null,"우리 칸");
assert.equal(L.terrNeed(terr,terr.base.tB,"tR",S0+400e3,T0),null,"기지");
const prot=L.terrNb(terr.base.tB).find(k=>g.set.has(k)); assert.equal(L.terrNeed(terr,prot,"tR",S0+60e3,T0),null,"상대 기지 둘레 3분 보호"); assert.equal(L.terrNeed(terr,prot,"tR",S0+200e3,T0),3);
terr.cells[blank].sh=S0+500e3; assert.equal(L.terrNeed(terr,blank,"tR",S0+400e3,T0),null,"방어막");
assert.equal(L.terrNeed(terr,blank,"tR",S0+600e3,T0),5);
assert.equal(L.terrNeed(terr,blank,"tR",S0+RULES.GAME_SEC*1000-100e3,T0),2,"막판 3분 2초"); assert.equal(L.terrNeed(terr,blank,"tR",S0+600e3,T0,0,S0+601e3),1,"롤러 1초");
// 황금 칸: 결정적, 5분마다 3칸
const g1=L.terrGold(g,terr,"ABCDE",S0+299e3,T0), g2=L.terrGold(g,terr,"ABCDE",S0+601e3,T0), g3=L.terrGold(g,terr,"ABCDE",S0+601e3,T0);
assert.equal(g1.length,0); assert.equal(g2.length,6); assert.deepEqual(g2,g3); assert(!g2.includes(terr.base.tR));
// 점수·승리
const sc=L.terrScore(terr,g2); console.log("score",JSON.stringify(sc));
const over=S0+RULES.GAME_SEC*1000+1; console.log("winner",JSON.stringify(L.terrWinner(terr,{},g2,over,T0)));
const eq={cells:{a:{t:"tR"},b:{t:"tB"}}}; console.log("tie", JSON.stringify(L.terrWinner(eq,{x:{t:"tB",at:over-30e3}},[],over,T0)), JSON.stringify(L.terrWinner(eq,{},[],over,T0)));
console.log("hp", L.hpOf({role:"tR",selfDmg:500},{}), L.hpOf({role:"tR",forfeit:1},{}));
console.log("ALL OK");
