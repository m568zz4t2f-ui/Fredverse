/* One simulation for offline solo and the authoritative WebRTC host. No DOM or network. */
(() => {
  'use strict';
  const WEAPONS = {
    nerf:{name:"Owen's Sidearm",damage:12,cooldown:.32,range:460},
    saber:{name:"Owen's Blue Blade",damage:19,cooldown:.38,range:86},
    bat:{name:'MLB Prospect',damage:34,cooldown:.85,range:110},
  };
  const GEAR={hoodie:{slot:'body',defense:3,set:'space'},jersey:{slot:'body',defense:1,power:4},
    jeans:{slot:'pants',defense:1,power:1,set:'space'},shoes:{slot:'shoes',defense:2,set:'space'},
    chain:{slot:'accessory',defense:2,set:'space'},headphones:{slot:'head',defense:1,focus:2},backpack:{slot:'backpack',defense:1,focus:1}};
  const LOOT=[{id:'bag',item:'backpack',zone:'alpha',x:305,y:425,name:'The Semester Hauler'},
    {id:'notes',item:'headphones',zone:'alpha',x:425,y:140,name:'Five-Hour Study Session'}];
  const BUILDINGS=[
    ['west','Nutwood West',800,180,250,160],['chapel','Pacific Auditorium',1370,170,290,185],
    ['library','Darling Library',1080,400,240,210],['east','Nutwood East',1430,640,235,165],
    ['gym','Darling Pavilion',980,930,350,240],['hub','Lawson-Fulton Center',1000,1260,320,190],
    ['omega','Omega Residence Hall',280,860,300,200],['alpha','Alpha Residence Hall',280,1440,300,220],
  ];
  const ZONES={campus:[1920,1920],alpha:[880,660],gym:[1360,1000],chapel:[1140,1100]};
  const OBSTACLES={campus:[...BUILDINGS.map(b=>b.slice(2)),[300,1150,260,150]],
    alpha:[[50,85,175,190],[50,340,175,190],[640,80,170,80],[650,320,150,115],[350,60,150,55]],
    gym:[[60,110,100,740],[1200,110,100,740]],
    chapel:[...Array.from({length:7},(_,i)=>330+i*85).flatMap(y=>[[100,y,280,40],[730,y,280,40]]),[160,65,820,130]]};
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const clone=o=>JSON.parse(JSON.stringify(o));
  function id(){const a=new Uint8Array(24);globalThis.crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');}
  function solid(zone,x,y){const [w,h]=ZONES[zone];return x<22||y<42||x>w-22||y>h-22||OBSTACLES[zone].some(([a,b,c,d])=>x>a-13&&x<a+c+13&&y>b-10&&y<b+d+10);}
  function fresh(name,variant){return {name,variant,zone:'alpha',x:440,y:520,hp:100,focus:100,xp:0,level:1,materials:0,upgrade:0,
    weapon:variant==='Dorm Fred'?'nerf':'bat',gear:['hoodie','jersey','jeans','shoes'],equipped:{body:variant==='Dorm Fred'?'hoodie':'jersey',pants:'jeans',shoes:'shoes'},enhancements:{},claimed:[],
    titles:[],title:'',quest:0,wins:0,chapter:0,chips:3,ammo:8,angle:Math.PI/2,online:false,seen:0,input:{},swing:0,invuln:0,
    shield:0,attack_cd:0,dodge_cd:0,heal_cd:0,ability_cd:0,reload:0,revive:0,revive_time:0,ready:false,
    notice:'Find the remote beside the TV, northeast of the rest bench. E to interact. The bed is off limits.'};}
  const numeric={hp:[0,100],focus:[0,100],xp:[0,1e8],materials:[0,1e6],upgrade:[0,5],quest:[0,2],wins:[0,1e6],chapter:[0,1],chips:[0,3],ammo:[0,8]};
  function validateSave(data){
    if(!data||typeof data!=='object'||data.game!=='The Fred Verse'||data.version!==2)throw Error('Not a supported Fred Verse browser save (version 2). Your current game was not changed.');
    if(!Array.isArray(data.players)||data.players.length<1||data.players.length>100)throw Error('Save must contain 1–100 Freds.');
    if(!Number.isInteger(data.encounters)||data.encounters<0||data.encounters>1e8)throw Error('Invalid encounter history.');
    const tokens=new Set();
    const players=data.players.map(entry=>{
      if(!entry||typeof entry.token!=='string'||!/^[a-f0-9]{48}$/.test(entry.token)||tokens.has(entry.token))throw Error('Invalid or duplicate character key.');
      tokens.add(entry.token);const p=entry.character;
      if(!p||typeof p.name!=='string'||p.name.trim().length<1||p.name.length>24||!['Dorm Fred','MLB Fred'].includes(p.variant))throw Error('Invalid Fred identity.');
      const q=fresh(p.name.trim(),p.variant);
      for(const [key,[min,max]] of Object.entries(numeric)){
        const value=p[key]??(key==='chapter'?0:undefined);
        if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(key!=='hp'&&key!=='focus'&&!Number.isInteger(value)))throw Error('Invalid saved '+key+'.');
        q[key]=value;
      }
      if(!Object.hasOwn(WEAPONS,p.weapon)||!Array.isArray(p.gear)||p.gear.length>7||!p.gear.every(g=>typeof g==='string'&&Object.hasOwn(GEAR,g))||new Set(p.gear).size!==p.gear.length)throw Error('Invalid saved gear.');
      q.weapon=p.weapon;q.gear=[...p.gear];q.equipped={};
      if(!p.equipped||typeof p.equipped!=='object'||Array.isArray(p.equipped)||Object.keys(p.equipped).length>6)throw Error('Invalid equipment.');
      for(const [slot,g] of Object.entries(p.equipped)){
        if(!q.gear.includes(g)||GEAR[g].slot!==slot)throw Error('Equipment is not owned or has the wrong slot.');q.equipped[slot]=g;
      }
      if(!q.gear.includes('jeans')){q.gear.push('jeans');q.equipped.pants='jeans';}
      const enhancements=p.enhancements??(p.upgrade?{[p.weapon]:p.upgrade}:{});
      if(!enhancements||typeof enhancements!=='object'||Array.isArray(enhancements)||Object.keys(enhancements).length>10)throw Error('Invalid item upgrades.');
      q.enhancements={};for(const [item,rank] of Object.entries(enhancements)){
        if(!(Object.hasOwn(WEAPONS,item)||q.gear.includes(item))||!Number.isInteger(rank)||rank<0||rank>5)throw Error('Invalid item upgrade tier.');q.enhancements[item]=rank;
      }
      const claimed=p.claimed??[];if(!Array.isArray(claimed)||claimed.length>2||!claimed.every(v=>LOOT.some(l=>l.id===v))||new Set(claimed).size!==claimed.length)throw Error('Invalid supply pickups.');q.claimed=[...claimed];
      if(!Array.isArray(p.titles)||p.titles.length>2||!p.titles.every(t=>['An Hour Early','Prepared for Convocation'].includes(t))||new Set(p.titles).size!==p.titles.length||typeof p.title!=='string'||(p.title&&!p.titles.includes(p.title)))throw Error('Invalid title.');
      q.titles=[...p.titles];q.title=p.title;q.level=1+Math.floor(q.xp/120);
      // Resume in a safe place, preserve health and progression, discard transient encounter state.
      q.notice='Save restored at Alpha. Health and gear preserved; interrupted practice has reset.';
      return {token:entry.token,character:q};
    });
    if(!tokens.has(data.localToken))throw Error('Save has no matching local Fred.');
    if(typeof data.worldId!=='string'||!/^[a-f0-9]{48}$/.test(data.worldId))throw Error('Invalid world identity.');
    return {game:data.game,version:2,worldId:data.worldId,encounters:data.encounters,localToken:data.localToken,players};
  }
  class World{
    constructor(){this.players=new Map();this.boss=null;this.projectiles=[];this.effects=[];this.clock=0;this.encounters=0;this.worldId=id();this.dirty=false;}
    static load(data){const valid=validateSave(data),w=new World();w.worldId=valid.worldId;w.encounters=valid.encounters;for(const p of valid.players)w.players.set(p.token,p.character);return {world:w,localToken:valid.localToken};}
    serialize(localToken){return {game:'The Fred Verse',version:2,worldId:this.worldId,encounters:this.encounters,localToken,
      players:[...this.players].map(([token,character])=>({token,character:clone(character)}))};}
    join(token,name,variant){
      if(typeof name!=='string'||!name.trim()||name.length>24||!['Dorm Fred','MLB Fred'].includes(variant))throw Error('Choose a Fred variant and a name of 1–24 characters.');
      const existing=this.players.get(token),online=[...this.players.values()].filter(p=>p.online).length;
      if((!existing||!existing.online)&&online>=4)throw Error('Campus is full (four Freds, including the host).');
      if(existing){if(!existing.online){Object.assign(existing,{zone:'alpha',x:440,y:520,ready:false});}Object.assign(existing,{online:true,seen:this.clock,input:{}});return token;}
      if(this.players.size>=100)throw Error('World character limit reached. Export a backup and start another world.');
      token=id();const p=fresh(name.trim(),variant);Object.assign(p,{online:true,seen:this.clock});this.players.set(token,p);this.dirty=true;return token;
    }
    disconnect(token){const p=this.players.get(token);if(p)Object.assign(p,{online:false,ready:false,input:{}});this.dirty=true;}
    stats(p){const ids=Object.values(p.equipped),items=ids.map(g=>GEAR[g]);return {defense:items.reduce((s,g)=>s+g.defense,0)+ids.reduce((s,g)=>s+(p.enhancements[g]||0),0),
      power:items.reduce((s,g)=>s+(g.power||0),0)+(p.enhancements[p.weapon]||0)*3+p.level*2,
      focus_regen:6+items.reduce((s,g)=>s+(g.focus||0),0),set:items.filter(g=>g.set==='space').length>=2};}
    snapshot(token){const p=this.players.get(token);if(!p)throw Error('Enter campus first.');
      const fields=['name','variant','zone','x','y','hp','focus','level','weapon','equipped','angle','swing','invuln','shield','title','revive','ready'];
      const boss=this.boss?Object.fromEntries(Object.entries(this.boss).filter(([k])=>k!=='participants')):null;
      const self={...p,stats:this.stats(p)};delete self.input;delete self.seen;
      return clone({self,players:[...this.players].filter(([,q])=>q.online).map(([t,q])=>({id:t.slice(0,8),...Object.fromEntries(fields.map(k=>[k,q[k]]))})),boss,
        projectiles:this.projectiles,effects:this.effects,clock:this.clock,save_error:null});
    }
    input(token,data){const p=this.players.get(token);if(!p||!p.online)throw Error('Fred is disconnected. Rejoin the host.');
      if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.keys)||data.keys.length>12||!data.keys.every(k=>typeof k==='string'&&k.length<=12)||!Number.isFinite(data.angle))throw Error('Invalid controls.');
      p.input={keys:data.keys,attack:data.attack===true,block:data.block===true};p.angle=data.angle%(2*Math.PI);p.seen=this.clock;
      if(data.target!==undefined){const target=data.target;if(!target||typeof target!=='object'||!Number.isFinite(target.x)||!Number.isFinite(target.y))throw Error('Invalid walking target.');this.navigate(p,target.x,target.y);}
      if(data.action!==undefined){if(typeof data.action!=='string'||data.action.length>20||!(data.value===undefined||typeof data.value==='string'))throw Error('Invalid action.');this.action(token,data.action,data.value);}
    }
    action(token,action,value){const p=this.players.get(token);if(!p)return;
      if(action==='rest'&&p.zone==='alpha'&&dist(p,{x:440,y:520})<140){
        if(this.boss?.participants.includes(token)){p.notice='Finish the practice before resting.';return;}
        Object.assign(p,{hp:100,focus:100,chips:3,ammo:8});p.notice='Well rested—for once. Chips and darts restocked.';
      }else if(action==='recover'&&p.hp<=0){
        if(this.boss?.participants.includes(token)){p.notice='Hold on for a teammate revive, or wait for the practice to reset.';return;}
        Object.assign(p,{zone:'alpha',x:440,y:520,hp:100,focus:100,chips:3});
      }else if(p.hp<=0)return;
      else if(action==='weapon'&&Object.hasOwn(WEAPONS,value))p.weapon=value;
      else if(action==='equip'&&p.gear.includes(value))p.equipped[GEAR[value].slot]=value;
      else if(action==='upgrade'){
        const item=value??p.weapon,rank=p.enhancements[item]||0;
        if(p.zone!=='alpha')p.notice='Upgrade at the Alpha workbench.';
        else if(!(Object.hasOwn(WEAPONS,item)||p.gear.includes(item)))p.notice='That item is not in your inventory.';
        else if(p.materials>=3&&rank<5){p.materials-=3;p.enhancements[item]=rank+1;p.upgrade=Math.max(p.upgrade,rank+1);p.notice='Item reinforced to +'+(rank+1)+'. Weapons gain 3 power; armor gains 1 defense per tier.';}
        else p.notice='Upgrade needs three practice materials. Maximum tier: five.';
      }else if(action==='title'&&p.titles.includes(value))p.title=value;
      else if(action==='interact')this.interact(token);
      else if(action==='reload'&&p.ammo<8&&p.reload<=0)p.reload=1.3;
      else if(action==='heal'&&p.chips>0&&p.heal_cd<=0&&p.hp<100){p.hp=Math.min(100,p.hp+38);p.chips--;p.heal_cd=3;this.fx(p,'heal',45,.6);}
      else if(action==='dodge'&&p.dodge_cd<=0&&p.focus>=12){p.focus-=12;p.dodge_cd=1.8;p.invuln=.28;for(let i=0;i<12;i++)this.move(p,Math.cos(p.angle)*10,Math.sin(p.angle)*10);this.fx(p,'dodge',25,.28);}
      else if(action==='space'&&p.ability_cd<=0&&p.focus>=25){p.focus-=25;p.ability_cd=6;this.fx(p,'space',170,.7);
        for(const q of this.players.values())if(q.online&&q.zone===p.zone&&dist(p,q)<170){q.shield=Math.max(q.shield,p.variant==='Dorm Fred'?3:2);q.focus=Math.min(100,q.focus+8);}
        if(this.boss&&p.zone==='gym'&&dist(p,this.boss)<170)this.hit(this.boss,18+this.stats(p).power);
      }
      this.dirty=true;
    }
    interact(token){const p=this.players.get(token);
      const loot=LOOT.find(l=>l.zone===p.zone&&!p.claimed.includes(l.id)&&dist(l,p)<65);
      if(loot){p.claimed.push(loot.id);if(!p.gear.includes(loot.item))p.gear.push(loot.item);p.notice='FOUND · '+loot.name+'. Open your bag (I) to inspect and equip it.';this.dirty=true;return;}
      if(p.zone==='campus'){
        for(const [id,name,x,y,w,h] of BUILDINGS)if(dist(p,{x:x+w/2,y:y+h+35})<100){
          if(['alpha','gym','chapel'].includes(id)){
            if(id==='gym'&&this.boss&&!this.boss.participants.includes(token)){p.notice='Practice underway. Join the next round.';return;}
            const [zw,zh]=ZONES[id];Object.assign(p,{zone:id,x:zw/2,y:zh-65});
          }else p.notice=name+': interior reserved for a later chapter.';return;
        }
      }else{
        const [w,h]=ZONES[p.zone];if(dist(p,{x:w/2,y:h-35})<90){
          if(p.zone==='gym'&&this.boss?.participants.includes(token)){p.notice='Finish the practice or recover after defeat before leaving.';return;}
          const b=BUILDINGS.find(b=>b[0]===p.zone);Object.assign(p,{zone:'campus',x:b[2]+b[4]/2,y:b[3]+b[5]+45,ready:false});return;
        }
        if(p.zone==='alpha'){
          if(p.quest===0&&dist(p,{x:700,y:230})<135){p.quest=1;p.xp+=20;p.level=1+Math.floor(p.xp/120);p.notice='Remote recovered. Leave it safe in Alpha. Meet Robbie Phillips at Darling Pavilion for Three-Point Practice.';}
          else if(dist(p,{x:440,y:520})<140)this.action(token,'rest');
          else p.notice='Fred mumbles: “My bed. My remote. Clear boundaries.”';
        }else if(p.zone==='gym'&&dist(p,{x:680,y:300})<175&&!this.boss){
          if(p.quest===0)p.notice='Recover the remote in Alpha first. Preparation counts.';
          else{p.ready=true;this.startBoss();}
        }else if(p.zone==='chapel'){
          if(dist(p,{x:570,y:225})>150)p.notice='The President is waiting at the front of the auditorium. Follow the center aisle north.';
          else if(p.quest===2&&p.upgrade>0&&p.chapter===0){p.chapter=1;p.xp+=35;p.level=1+Math.floor(p.xp/120);p.titles.push('Prepared for Convocation');p.title='Prepared for Convocation';p.notice='CHAPTER COMPLETE · +35 XP · Prepared for Convocation. Big P — The President: “Good preparation, Fred. We will meet again.” Fictional dialogue; the culminating challenge is a later chapter.';}
          else p.notice='Big P — The President: “Prepare well, Fred. Complete the gym practice and improve your gear, then come see me.” Fictional dialogue.';
        }
      }
    }
    startBoss(){const members=[...this.players].filter(([,p])=>p.online&&p.zone==='gym'&&p.hp>0).map(([t])=>t);if(!members.length)return;
      if(!members.every(t=>this.players.get(t).ready)){for(const t of members)this.players.get(t).notice='Ready check: every living Fred in the gym must approach the marker and press E.';return;}
      this.encounters++;const hp=260+145*(members.length-1);this.boss={name:'Robbie Phillips · Three-Point Practice',x:680,y:300,hp,max_hp:hp,participants:members,encounter:this.encounters,age:0,next:1.8,hazards:[],phase:1};
      for(const t of members)this.players.get(t).notice='Fictional, nonlethal faculty practice. Dodge the red floor marks. Attack between patterns.';this.dirty=true;
    }
    fx(p,kind,r,ttl){this.effects.push({x:p.x,y:p.y,zone:p.zone,kind,r,ttl});}
    hit(b,amount){if(b!==this.boss)return;b.hp=Math.max(0,b.hp-amount);
      if(b.hp===0){for(const t of b.participants){const p=this.players.get(t);p.wins++;p.xp+=90;p.level=1+Math.floor(p.xp/120);p.materials+=3;p.quest=2;p.ready=false;
          if(!p.gear.includes('chain'))p.gear.push('chain');if(!p.titles.includes('An Hour Early')){p.titles.push('An Hour Early');p.title='An Hour Early';}
          p.notice='Practice complete! +90 XP, +3 materials, Chain of Personal Space. Upgrade at Alpha, then visit Big P in Pacific Auditorium.';}
        this.boss=null;this.projectiles=[];this.dirty=true;}
    }
    move(p,dx,dy){if(!solid(p.zone,p.x+dx,p.y))p.x+=dx;if(!solid(p.zone,p.x,p.y+dy))p.y+=dy;}
    navigate(p,x,y){
      p.path=[];p.path_zone=p.zone;if(p.hp<=0||solid(p.zone,x,y)){p.notice='That spot is blocked. Choose an open path.';return;}
      const cell=24,[w,h]=ZONES[p.zone],cols=Math.ceil(w/cell),rows=Math.ceil(h/cell),start=[Math.floor(p.x/cell),Math.floor(p.y/cell)],goal=[Math.floor(x/cell),Math.floor(y/cell)];
      const key=(cx,cy)=>cy*cols+cx,first=key(...start),last=key(...goal),queue=[start],parents=new Map([[first,null]]);
      // ponytail: bounded campus BFS on a 24px grid; replace only if worlds outgrow this campus.
      for(let head=0;head<queue.length;head++){
        const [cx,cy]=queue[head],current=key(cx,cy);if(current===last)break;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,k=key(nx,ny);
          if(nx<0||ny<0||nx>=cols||ny>=rows||parents.has(k)||solid(p.zone,nx*cell+cell/2,ny*cell+cell/2))continue;
          parents.set(k,current);queue.push([nx,ny]);
        }
      }
      if(!parents.has(last)){p.notice='No clear walking route. Try a nearer spot or use WASD.';return;}
      for(let k=last;k!==first;k=parents.get(k))p.path.unshift({x:(k%cols)*cell+cell/2,y:Math.floor(k/cols)*cell+cell/2});
      p.path.push({x,y});
    }
    tick(dt){if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Invalid simulation step.');this.clock+=dt;
      for(const [token,p] of this.players){if(this.clock-p.seen>5){p.online=false;p.input={};}if(!p.online)continue;
        for(const cd of ['swing','invuln','shield','attack_cd','dodge_cd','heal_cd','ability_cd'])p[cd]=Math.max(0,p[cd]-dt);
        if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=8;}
        const live=this.clock-p.seen<.5,keys=live?(p.input.keys||[]):[];
        if(p.hp<=0){p.revive=0;
          for(const q of this.players.values()){
            const qkeys=q.input.keys||[],stationary=!qkeys.some(k=>['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k));
            if(q!==p&&q.online&&q.hp>0&&q.invuln<=0&&!q.input.attack&&stationary&&q.zone===p.zone&&dist(p,q)<85&&qkeys.includes('e')&&this.clock-q.seen<.5){p.revive=p.revive_time+dt;break;}
          }
          p.revive_time=p.revive;if(p.revive>=2.5){Object.assign(p,{hp:45,invuln:2,revive:0,revive_time:0});this.dirty=true;}continue;
        }
        p.focus=Math.min(100,p.focus+dt*this.stats(p).focus_regen);
        let dx=Number(keys.includes('d')||keys.includes('ArrowRight'))-Number(keys.includes('a')||keys.includes('ArrowLeft')),
          dy=Number(keys.includes('s')||keys.includes('ArrowDown'))-Number(keys.includes('w')||keys.includes('ArrowUp'));
        if(dx||dy||!live||p.path_zone!==p.zone)p.path=[];
        const speed=p.input.block&&live?85:175;
        if(p.path?.length&&!dx&&!dy){const next=p.path[0],d=dist(p,next);if(d<speed*dt+1){this.move(p,next.x-p.x,next.y-p.y);p.path.shift();}
          else{dx=(next.x-p.x)/d;dy=(next.y-p.y)/d;if(!p.input.attack)p.angle=Math.atan2(dy,dx);this.move(p,dx*speed*dt,dy*speed*dt);}}
        else{const len=Math.hypot(dx,dy)||1;this.move(p,dx/len*speed*dt,dy/len*speed*dt);}
        if(p.input.attack&&live&&p.attack_cd<=0){
          const w=WEAPONS[p.weapon];p.attack_cd=w.cooldown;p.swing=.22;
          const bonus=this.stats(p).power+(p.variant==='MLB Fred'&&p.weapon==='bat'?5:0);
          if(p.weapon==='nerf'){if(p.ammo>0&&p.reload<=0){p.ammo--;this.projectiles.push({x:p.x,y:p.y,zone:p.zone,angle:p.angle,life:.8,damage:w.damage+bonus});}}
          else if(this.boss&&p.zone==='gym'&&dist(p,this.boss)<w.range){const a=Math.atan2(this.boss.y-p.y,this.boss.x-p.x),arc=Math.abs(((a-p.angle+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI);if(arc<(p.weapon==='bat'?1.4:1))this.hit(this.boss,w.damage+bonus);}
        }
      }
      for(const d of [...this.projectiles]){d.x+=Math.cos(d.angle)*590*dt;d.y+=Math.sin(d.angle)*590*dt;d.life-=dt;if(solid(d.zone,d.x,d.y))d.life=0;
        if(d.life>0&&this.boss&&d.zone==='gym'&&dist(d,this.boss)<34){this.hit(this.boss,d.damage);d.life=0;}}
      this.projectiles=this.projectiles.filter(d=>d.life>0);for(const fx of this.effects)fx.ttl-=dt;this.effects=this.effects.filter(e=>e.ttl>0).slice(-100);
      const b=this.boss;if(!b)return;const active=b.participants.map(t=>this.players.get(t)).filter(p=>p.online&&p.zone==='gym'&&p.hp>0);
      if(!active.length){for(const t of b.participants){const p=this.players.get(t);p.ready=false;p.notice='Practice reset. Recover at Alpha, prepare, and try again. Gear retained.';}this.boss=null;this.projectiles=[];this.dirty=true;return;}
      b.age+=dt;b.phase=1+Number(b.hp<b.max_hp*.65)+Number(b.hp<b.max_hp*.3);
      if(b.age>=b.next){const target=active[Math.floor(b.age)%active.length],count=Math.min(active.length,b.phase===1?2:3);
        for(const q of count===1?[target]:active.slice(0,count))b.hazards.push({x:q.x,y:q.y,r:70+10*b.phase,time:1.05,fired:false});
        if(b.phase>=2)b.hazards.push({x:680,y:500,r:125,time:1.5,fired:false});b.next=b.age+2.7-.4*b.phase;
      }
      for(const h of b.hazards){h.time-=dt;if(h.time<=0&&!h.fired){h.fired=true;for(const q of active)if(dist(q,h)<h.r&&q.invuln<=0){let damage=Math.max(4,24-this.stats(q).defense);if(q.shield>0)damage*=.35;
            if(q.input.block&&this.clock-q.seen<.5){damage*=.45;if(this.stats(q).set)q.shield=2;}q.hp=Math.max(0,q.hp-damage);q.invuln=.35;this.dirty=true;}}}
      b.hazards=b.hazards.filter(h=>h.time>-.3);
    }
  }
  globalThis.FredCore={World,WEAPONS,GEAR,BUILDINGS,ZONES,OBSTACLES,LOOT,solid,dist,id,validateSave};
})();
