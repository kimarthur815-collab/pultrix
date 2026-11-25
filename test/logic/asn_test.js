const {RULES,Logic:L}=require("./load.js"); const assert=require("assert");
let seed=1; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
const ids=["pA0001","pB0002","pC0003","pD0004","pE0005"], T0=1e12;
let a=L.asnStart(ids,T0,rnd); const ch=L.asnChain(a); assert.equal(ch.length,5);
const pidOf=k=>L.asnBoss(a,k), name=k=>pidOf(k);
console.log("chain", ch.map(name).join(" -> "));
// 1) 타깃의 우두머리를 잡으면 통째로 흡수 (1인 무리)
const A=pidOf(ch[0]), B=pidOf(ch[1]), C=pidOf(ch[2]), D=pidOf(ch[3]), E=pidOf(ch[4]);
assert.equal(L.asnCatch(a,C,A,T0,false),null,"타깃 아닌 무리는 못 잡음");
let r=L.asnCatch(a,B,A,T0,false); assert(r&&r.whole); a=r.asn;
assert.equal(a.mem[B],ch[0]); assert.equal(L.asnTarget(a,ch[0]),ch[2]); assert.equal(L.asnIsBoss(a,B),false); assert.equal(L.asnIsBoss(a,A),true);
// 2) 부하(B)도 다음 타깃(C)을 잡을 수 있고, C는 A 무리로
r=L.asnCatch(a,C,B,T0+1,false); assert(r&&r.whole); a=r.asn; assert.deepEqual(L.asnMembers(a,ch[0]).sort(),[A,B,C].sort());
assert.equal(a.n[B],1); assert.equal(L.asnChain(a).length,3); assert.equal(a.duelAt,null);
// 3) E(사냥꾼 무리)가 A 무리의 부하 C를 잡으면 C만 이동
r=L.asnCatch(a,C,E,T0+2,false); assert(r&&!r.whole); a=r.asn; assert.equal(a.mem[C],ch[4]); assert.equal(L.asnChain(a).length,3);
// 4) 피의 시간엔 사슬 무시: D가 E 무리(D의 타깃)… D->E 정상, 피의 시간이면 D가 A 무리(타깃 아님)의 B도 잡기 가능
assert.equal(L.asnCatch(a,B,D,T0+3,false),null); r=L.asnCatch(a,B,D,T0+3,true); assert(r); 
// 5) 하극상: C(E 무리 부하)가 E를 밀어냄 / 두 번은 못 함
let rb=L.asnRebel(a,C); assert(rb&&rb.old===E); let a2=rb.asn; assert.equal(L.asnIsBoss(a2,C),true); assert.equal(L.asnRebel(a2,C),null);
// 6) 팔아넘기기: E 무리의 사냥꾼 무리로
const sell=L.asnSell(a,C,T0+4); assert(sell); assert.equal(sell.to,L.asnHunter(a,ch[4]));
// 7) 우두머리 기권 → 잡은 수 많은 부하가 우두머리 / 다 기권 → 무리 빠짐
let fx=L.asnFix(a,[B,C,D,E],T0+5); assert(fx); assert.equal(L.asnBoss(fx,ch[0]),B,"A 기권 → B(잡은 수 1)");
fx=L.asnFix(a,[A,B,E],T0+5); assert(fx); assert(!L.asnChain(fx).includes(ch[3]),"D 혼자 기권 → D 무리 빠짐"); assert(fx.duelAt,"무리 2개 → 결투");
// 8) 승리
const P=Object.fromEntries(ids.map(id=>[id,{role:a.mem[id],name:id}]));
assert.equal(L.asnWinner(a,P,{},T0+6,T0,0),null);
let w=L.asnCatch(a,D,C===null?A:E,T0+7,true); // 아무나
let solo=L.asnStart(["x1aaaa","x2bbbb","x3cccc"],T0,rnd); let s1=L.asnCatch(solo,L.asnBoss(solo,L.asnTarget(solo,L.asnChain(solo)[0])),L.asnBoss(solo,L.asnChain(solo)[0]),T0,false).asn;
assert(s1.duelAt); let s2=L.asnCatch(s1,L.asnBoss(s1,L.asnTarget(s1,L.asnChain(s1)[0])),L.asnBoss(s1,L.asnChain(s1)[0]),T0,false).asn;
const P2=Object.fromEntries(Object.keys(s2.mem).map(id=>[id,{role:s2.mem[id]}]));
console.log("winner", JSON.stringify(L.asnWinner(s2,P2,{},T0,T0,0)));
// 9) 뒤 판정
assert.equal(L.behindOk(10,350,15,20,8),true,"같은 방향 + 앞쪽");
assert.equal(L.behindOk(10,190,15,20,8),false,"마주 봄");
assert.equal(L.behindOk(10,20,200,20,8),false,"상대가 내 뒤쪽");
assert.equal(L.behindOk(10,20,200,5,12),true,"너무 가까우면 앞쪽 검사 생략");
assert.equal(L.behindOk(null,20,0,5,5),false); assert.equal(L.behindOk(10,null,0,5,5),true);
// 10) 피의 시간 / 결투 구역
const st=T0, ce=st+RULES.HIDE_SEC*1000;
assert.equal(L.asnBlood(ce+299e3,st).on,false); assert.equal(L.asnBlood(ce+300e3,st).on,true); assert.equal(L.asnBlood(ce+361e3,st).on,false); assert.equal(L.asnBlood(ce+600e3+1,st).on,true);
console.log("duelK", L.asnDuelK({duelAt:0},0), L.asnDuelK({duelAt:0},150e3).toFixed(2), L.asnDuelK({duelAt:0},900e3));
// 11) 체력: 부하 60, 암살전은 0이어도 살아 있음(1)
console.log("hp minion", L.hpOf({role:"k1",hpMax:60,selfDmg:10},{}), "hp0", L.hpOf({role:"k1",selfDmg:200},{}), "forfeit", L.hpOf({role:"k1",forfeit:1},{}), "classic", L.hpOf({role:"runner",selfDmg:200},{}));
console.log("ALL OK");
