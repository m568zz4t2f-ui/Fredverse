/* node test_core.js — no npm dependencies */
require('./web/core.js');
const assert=require('node:assert/strict');
const {World,solid,validateSave}=FredCore;
function player(w,name='Fred',variant='Dorm Fred'){const t=w.join('',name,variant);return [t,w.players.get(t)];}
function control(w,t,keys=[],extra={}){const p=w.players.get(t);w.input(t,{keys,angle:p.angle,...extra});w.tick(1/30);}
function walk(w,t,x,y){const p=w.players.get(t);for(let i=0;i<1500;i++){
  if(Math.hypot(p.x-x,p.y-y)<7)return;const keys=[];if(p.x<x-4)keys.push('d');if(p.x>x+4)keys.push('a');if(p.y<y-4)keys.push('s');if(p.y>y+4)keys.push('w');control(w,t,keys);
}throw Error(`Blocked at ${p.x},${p.y} on route to ${x},${y}`);}
function fight(w,t){const p=w.players.get(t),used=new Set();let darts=0;
  for(let frame=0;frame<6000&&w.boss;frame++){
    const weapon=['nerf','saber','bat'][Math.floor(frame/60)%3];if(p.weapon!==weapon)w.action(t,'weapon',weapon);used.add(weapon);
    const b=w.boss,phase=frame/38,radius=weapon==='nerf'?200:60,tx=b.x+Math.cos(phase)*radius,ty=b.y+Math.sin(phase)*radius,keys=[];
    if(p.x<tx-4)keys.push('d');if(p.x>tx+4)keys.push('a');if(p.y<ty-4)keys.push('s');if(p.y>ty+4)keys.push('w');
    const action=p.ammo===0&&p.reload<=0?'reload':p.hp<65&&p.chips>0?'heal':undefined;
    control(w,t,keys,{attack:true,action,angle:Math.atan2(b.y-p.y,b.x-p.x)});if(w.projectiles.length)darts++;
    assert(p.hp>0,'Solo fight should be completable');
  }
  assert.equal(w.boss,null);assert.equal(used.size,3);assert(darts>0);
}
{
  const w=new World(),[t,p]=player(w);
  walk(w,t,430,230);walk(w,t,700,230);w.action(t,'interact');assert.equal(p.quest,1);w.action(t,'interact');assert.equal(p.xp,20);
  walk(w,t,430,230);walk(w,t,440,610);w.action(t,'interact');assert.equal(p.zone,'campus');
  walk(w,t,680,1705);walk(w,t,680,1210);walk(w,t,1155,1210);w.action(t,'interact');assert.equal(p.zone,'gym');
  walk(w,t,680,440);w.action(t,'interact');assert(w.boss);assert(!JSON.stringify(w.snapshot(t)).includes(t));
  fight(w,t);assert.equal(p.wins,1);assert.equal(p.materials,3);assert(p.gear.includes('chain'));assert(p.titles.includes('An Hour Early'));
  for(let i=0;i<30;i++)control(w,t);assert.equal(p.wins,1);
  walk(w,t,680,940);w.action(t,'interact');walk(w,t,680,1210);walk(w,t,680,1705);walk(w,t,430,1705);w.action(t,'interact');assert.equal(p.zone,'alpha');
  w.action(t,'equip','chain');w.action(t,'upgrade');assert.equal(p.upgrade,1);assert.equal(p.materials,0);assert(w.stats(p).set);
  // Complete the chapter through connected campus navigation, not a multiplayer-only gate.
  walk(w,t,440,610);w.action(t,'interact');walk(w,t,680,1705);walk(w,t,680,875);walk(w,t,1730,875);walk(w,t,1730,395);walk(w,t,1515,395);w.action(t,'interact');assert.equal(p.zone,'chapel');
  walk(w,t,570,800);w.action(t,'interact');assert.equal(p.chapter,0,'Approach The President to finish the chapter');
  walk(w,t,570,250);w.action(t,'interact');assert.equal(p.chapter,1);assert.equal(p.xp,145);assert.equal(p.level,2);
  w.action(t,'interact');assert.equal(p.xp,145,'Chapter credit is idempotent');
  p.hp=27;const save=w.serialize(t),restored=World.load(save);const q=restored.world.players.get(t);assert.equal(q.hp,27);assert.equal(q.chapter,1);assert.equal(q.upgrade,1);assert.equal(q.wins,1);assert.equal(q.zone,'alpha');
  const bad=structuredClone(save);bad.players[0].character.hp=NaN;assert.throws(()=>validateSave(bad));
  const duplicate=structuredClone(save);duplicate.players.push(duplicate.players[0]);assert.throws(()=>validateSave(duplicate));
  assert.throws(()=>validateSave({version:0}));console.log('PASS: complete solo chapter, all weapons, rewards, upgrades, save roundtrip and invalid imports.');
}
{
  const w=new World(),members=Array.from({length:4},(_,i)=>player(w,'Fred '+i,i%2?'MLB Fred':'Dorm Fred'));
  assert.throws(()=>player(w,'Fifth'));
  for(const [t,p] of members){Object.assign(p,{zone:'gym',x:680,y:400,quest:1});}
  for(const [t] of members.slice(0,3))w.action(t,'interact');assert.equal(w.boss,null);
  w.action(members[3][0],'interact');assert.equal(w.boss.max_hp,695);
  const [a,p]=members[0],[b,q]=members[1];w.action(a,'space');assert(q.shield>0);const f=p.focus;w.action(a,'space');assert.equal(p.focus,f);
  q.hp=0;w.action(b,'recover');assert.equal(q.hp,0);w.boss.next=1000;w.boss.hazards=[];
  for(let i=0;i<40;i++)control(w,a,['e']);assert(q.revive>0);control(w,a,['e','w']);assert.equal(q.revive,0);
  Object.assign(p,{x:680,y:400});for(let i=0;i<80;i++)control(w,a,['e']);assert.equal(q.hp,45);
  q.hp=0;w.disconnect(b);w.join(b,q.name,q.variant);assert.equal(q.hp,0);assert.equal(q.zone,'alpha');
  w.hit(w.boss,99999);assert(members.every(([,p])=>p.wins===1&&p.materials===3));
  for(const [,p] of members)Object.assign(p,{zone:'gym',hp:100,ready:true,online:true,seen:w.clock});w.startBoss();
  for(const [t] of members)w.disconnect(t);w.tick(.1);assert.equal(w.boss,null);
  assert(solid('alpha',100,100));assert(solid('campus',900,200));assert(solid('gym',100,200));assert(solid('chapel',200,350));
  const [c,r]=members[2];w.join(c,r.name,r.variant);assert.throws(()=>w.input(c,{keys:[],angle:Infinity}));assert.throws(()=>w.input(c,{keys:'wasd',angle:0}));
  console.log('PASS: four-player ready checks, scaled hazards, shared shielding/credit, interruptible revive, disconnect/reset and input validation.');
}
