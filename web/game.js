const $ = (id) => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d');
const pristineHTML='<!doctype html>\n'+document.documentElement.outerHTML;
const session=new FredSession();
const buildings = [
  ['west', 'Nutwood West', 800, 180, 250, 160, 'A'], ['chapel', 'Pacific Auditorium', 1370, 170, 290, 185, 'B'],
  ['library', 'Darling Library', 1080, 400, 240, 210, 'C'], ['east', 'Nutwood East', 1430, 640, 235, 165, 'D'],
  ['gym', 'Darling Pavilion', 980, 930, 350, 240, 'E'], ['hub', 'Lawson-Fulton Center', 1000, 1260, 320, 190, 'F'],
  ['omega', 'Omega Residence Hall', 280, 860, 300, 200, 'G'], ['alpha', 'Alpha Residence Hall', 280, 1440, 300, 220, 'H'],
];
const sizes = {campus:[1920,1920], alpha:[880,660], gym:[1360,1000], chapel:[1140,1100]};
const zoneNames = {campus:'Hope International University', alpha:'Alpha Residence Hall', gym:'Darling Pavilion', chapel:'Pacific Auditorium'};
const gear = {
  hoodie:['Personal Space Hoodie','body',3,0,'Personal Space'], jersey:['MLB Prospect Jersey','body',1,4,'Royal Athletics'],
  shoes:['Black Air Forces','shoes',2,0,'Personal Space'], chain:['Chain of Personal Space','accessory',2,0,'Personal Space'],
};
const weaponNames = {nerf:"Owen’s Sidearm", saber:"Owen’s Blue Blade", bat:'MLB Prospect'};
let token = '', storageOK = session.storageOK;
let state = null, keys = new Set(), attack = false, block = false, aim = -Math.PI/2;
let pointerAim = false, camera = {x:0,y:0}, visual = new Map(), lastZone = '', notice = '', noticeUntil = 0;
let atlas = null, busy = false, lastFrame = performance.now();
let pixelScale=2,smoothCamera=true;
let activeDialog = () => document.querySelector('dialog[open]');
const actions = [];
const staticScenes = new Map();
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function rect(c,x,y,w,h,color) { c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function polygon(c,points,color) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill(); }
function text(c,value,x,y,size=10,color='#e6dec3',align='left') {c.fillStyle=color;c.font=`${size}px monospace`;c.textAlign=align;c.fillText(value,Math.round(x),Math.round(y));}
function rng(seed) { return () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}; }
function line(c,x,y,x2,y2,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke(); }
function tree(c,x,y,palm=false) {
  rect(c,x+6,y+5,22,10,'#40553d');
  if(palm) {
    rect(c,x,y-50,7,58,'#78644c');for(let j=0;j<6;j++)rect(c,x,y-44+j*9,7,2,'#9d8864');
    for(const [dx,dy] of [[-38,-4],[-25,-18],[0,-24],[23,-18],[38,-2],[-22,12],[21,12]]) {
      line(c,x+3,y-49,x+dx,y-49+dy,'#475b3a',7);line(c,x+3,y-51,x+dx,y-51+dy,'#7c8b4e',3);
    }
  } else {
    rect(c,x-3,y-35,8,43,'#66503f');
    rect(c,x-21,y-53,40,30,'#334d3c');rect(c,x-29,y-45,55,26,'#426044');
    rect(c,x-20,y-58,32,28,'#526b46');rect(c,x-23,y-44,25,19,'#627b4d');rect(c,x-10,y-59,22,9,'#6d8451');
    rect(c,x+10,y-40,12,15,'#3c573e');rect(c,x-18,y-47,6,5,'#80925c');
  }
}
function bench(c,x,y){rect(c,x+4,y+12,56,9,'#6e7258');rect(c,x,y,56,6,'#9c8060');rect(c,x,y+8,56,5,'#b49a71');rect(c,x+6,y+13,4,8,'#354a43');rect(c,x+45,y+13,4,8,'#354a43');}
function building(c,b) {
  const [id,name,x,y,w,h,letter] = b;
  rect(c,x+15,y+18,w+6,h+3,'#45553e');
  rect(c,x,y,w,h,'#c3baa0');rect(c,x+6,y+8,w-12,h-18,'#a59f88');
  // Glass curtain wall and two-storey columns, reflecting the campus's angular architecture.
  rect(c,x+15,y+35,w-30,h-52,'#3e5d65');
  for(let xx=x+19;xx<x+w-15;xx+=24){rect(c,xx,y+38,18,h-60,'#739595');rect(c,xx+1,y+40,3,h-64,'#8aa7a0');rect(c,xx+16,y+39,2,h-61,'#415e62');}
  rect(c,x,y+h*.6,w,9,'#d7cdb0');rect(c,x,y+h*.6+9,w,3,'#53616a');
  for(let xx=x+8;xx<x+w;xx+=56){rect(c,xx,y+22,8,h-22,'#d8d0b8');rect(c,xx+6,y+22,3,h-22,'#a89f87');}
  if(id==='alpha'||id==='omega'){
    for(let xx=x+25;xx<x+w-20;xx+=42){rect(c,xx,y+50,25,29,'#29494c');rect(c,xx,y+105,25,29,'#446769');rect(c,xx,y+105,2,29,'#a6b6a6');}
    rect(c,x+5,y+83,w-10,8,'#d8d1b8');for(let xx=x+8;xx<x+w-5;xx+=6)rect(c,xx,y+74,1,9,'#4a5656');
  }
  polygon(c,[[x-12,y+32],[x+w*.5,y-18],[x+w+12,y+32],[x+w,y+47],[x+w*.5,y+1],[x,y+47]],'#eee2bd');
  line(c,x-12,y+32,x+w*.5,y-18,'#fff3cf',3);line(c,x+w*.5,y-18,x+w+12,y+32,'#b5ac90',3);
  if(id==='chapel'||id==='library'){
    polygon(c,[[x+w*.25,y+19],[x+w*.5,y-40],[x+w*.75,y+19]],'#e4d8b6');
    polygon(c,[[x+w*.32,y+19],[x+w*.5,y-24],[x+w*.68,y+19]],'#738c88');
  }
  const doorX=x+w/2;
  rect(c,doorX-18,y+h-37,36,37,'#304a50');rect(c,doorX-16,y+h-34,30,29,'#6d9292');rect(c,doorX,y+h-34,2,33,'#c6c8ae');
  for(let step=0;step<4;step++)rect(c,doorX-30-step*3,y+h+step*5,60+step*6,4,step%2?'#b1ad95':'#ccc4a8');
  rect(c,x+9,y+h-29,26,20,'#253d4a');text(c,letter,x+22,y+h-14,12,'#d2bd76','center');
  text(c,name,doorX,y+h+48,10,'#22392f','center');
}
function roomBase(c,w,h,color) {
  rect(c,0,0,w,h,color);
  const random=rng(84);
  for(let i=0;i<w*h/60;i++){const x=random()*w,y=random()*h;rect(c,x,y,2,1,random()>.5?'#b2a48b':'#9b8d75');}
  rect(c,0,0,w,35,'#d9d4bf');rect(c,0,35,w,6,'#8c8d7d');rect(c,0,0,15,h,'#d4d0bc');rect(c,w-15,0,15,h,'#acae9c');rect(c,0,h-15,w,15,'#c1bca7');
  rect(c,w/2-32,h-22,64,22,'#3d5558');rect(c,w/2-27,h-17,54,17,'#617d78');text(c,'CAMPUS ↓',w/2,h-35,10,'#f0e3bc','center');
}
function bunk(c,x,y){
  rect(c,x+6,y+9,175,190,'#655742');rect(c,x,y,175,190,'#ad8352');rect(c,x+9,y+10,157,167,'#e4dcc1');rect(c,x+17,y+45,140,116,'#344e69');
  for(let k=0;k<8;k++)rect(c,x+20,y+48+k*14,134,2,'#536b7a');
  rect(c,x+24,y+15,123,28,'#f1e9d5');rect(c,x+8,y+177,160,10,'#c99b5d');
  for(const xx of [x,x+167]){rect(c,xx,y-8,8,205,'#c39658');rect(c,xx+2,y-8,2,204,'#e2b46e');}
  rect(c,x+139,y+35,6,150,'#cca15f');rect(c,x+160,y+35,6,150,'#cca15f');for(let yy=y+44;yy<y+177;yy+=23)rect(c,x+139,yy,27,5,'#dbb57a');
}
function scene(zone){
  if(staticScenes.has(zone))return staticScenes.get(zone);
  const [w,h]=sizes[zone], scene=document.createElement('canvas');scene.width=w;scene.height=h;
  const c=scene.getContext('2d');c.imageSmoothingEnabled=false;
  if(zone==='campus'){
    rect(c,0,0,w,h,'#7b8b55');const random=rng(720);
    for(let i=0;i<15000;i++){let x=random()*w,y=random()*h;rect(c,x,y,random()*3+1,1,['#8b995e','#6e814d','#809356'][i%3]);}
    rect(c,620,55,1180,65,'#74796d');rect(c,610,120,45,1700,'#d7ccb0');
    rect(c,1800,55,65,1780,'#777c71');rect(c,610,1810,1250,60,'#777c71');
    text(c,'NUTWOOD AVENUE',1200,96,14,'#d9dac8','center');
    c.save();c.translate(1845,1000);c.rotate(Math.PI/2);text(c,'COMMONWEALTH AVENUE',0,0,14,'#d9dac8','center');c.restore();
    text(c,'COLLEGE PLACE',1200,1848,14,'#d9dac8','center');
    rect(c,655,122,52,1688,'#b7b299');rect(c,100,1745,1660,60,'#c8bfa3');
    for(const b of buildings){const x=b[2]+b[4]/2,y=b[3]+b[5];rect(c,x-22,y,44,50,'#c8bfa3');rect(c,670,y+20,x-648,40,'#c8bfa3');}
    rect(c,1140,320,44,610,'#c8bfa3');rect(c,1260,820,520,42,'#c8bfa3');
    // East-side parking and Titan lot.
    for(const [xx,yy,cols,rows] of [[1390,1020,7,6],[720,410,3,7]]){
      rect(c,xx,yy,cols*42+12,rows*65,'#999c88');
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        line(c,xx+col*42,yy+row*65,xx+col*42,yy+row*65+35,'#d5ccb1');
        if(random()>.3){const cl=['#314b55','#c5b696','#a46d51','#687478'][col%4];rect(c,xx+col*42+8,yy+row*65+4,22,30,cl);rect(c,xx+col*42+10,yy+row*65+9,18,9,'#425b60');rect(c,xx+col*42+7,yy+row*65+8,2,8,'#263d3a');}
      }
    }
    rect(c,285,1135,290,180,'#d3c6a3');rect(c,300,1150,260,150,'#4b919a');
    for(let yy=1160;yy<1295;yy+=13)for(let xx=310;xx<550;xx+=24)rect(c,xx+(yy%3)*2,yy,16,2,'#78b3b1');
    line(c,320,1225,540,1225,'#c7c19a',2);text(c,'POOL',430,1255,12,'#dbe7cc','center');
    for(const b of buildings)building(c,b);
    for(const [x,y] of [[180,1560],[150,1420],[190,1000],[175,800],[750,1540],[780,1350],[860,1210],[855,1050],[920,790],[1270,680],[1300,150],[1380,510],[1710,480],[1720,730],[1650,1480],[1430,1700],[900,1700]])tree(c,x,y,x%3===0);
    for(const [x,y] of [[720,1680],[720,1360],[740,1000],[1330,850],[1160,720],[850,370],[1260,1640]]){
      bench(c,x,y);rect(c,x-22,y-18,4,35,'#45534b');rect(c,x-25,y-23,10,9,'#dfd09b');
    }
    for(let yy=300;yy<1730;yy+=110){rect(c,590,yy,17,26,'#546a45');rect(c,590,yy,17,5,'#87905b');}
    text(c,'TITAN DRIVE',680,220,11,'#394d3f','center');text(c,'PWCA PLAZA',855,1200,12,'#344c3d','center');
  }else if(zone==='alpha'){
    roomBase(c,w,h,'#a7987f');bunk(c,50,85);bunk(c,50,340);
    // Mirrored closets, paneling, TV, study desk, luggage and under-bed shoes.
    rect(c,640,80,170,80,'#d9d7c3');rect(c,647,87,74,64,'#95aaa4');rect(c,728,87,74,64,'#aec0b4');rect(c,670,104,30,45,'#536e6b');rect(c,750,90,3,60,'#e8e5cd');
    rect(c,650,320,150,115,'#9c774b');rect(c,656,326,138,103,'#c49c64');rect(c,660,340,42,25,'#243a43');rect(c,668,344,24,15,'#668581');rect(c,730,332,24,30,'#c1baa1');rect(c,732,333,2,27,'#716b59');
    rect(c,350,60,150,55,'#ac885a');rect(c,360,72,48,30,'#2c4248');rect(c,364,75,40,20,'#789b92');rect(c,414,80,45,25,'#d8c69b');rect(c,418,84,34,1,'#8a846b');rect(c,418,90,34,1,'#8a846b');rect(c,465,73,15,31,'#4b615c');
    rect(c,685,169,77,43,'#1e3036');rect(c,690,173,66,32,'#456770');text(c,'MY TV',723,193,8,'#d6d6b7','center');
    rect(c,682,190,70,18,'#c0aa78');rect(c,699,214,12,28,'#323d40');rect(c,702,218,6,4,'#bcaa7b');
    rect(c,280,330,42,62,'#d4b349');rect(c,287,332,28,7,'#735d37');rect(c,290,381,7,7,'#343d35');rect(c,280,410,57,32,'#994e42');rect(c,282,417,53,5,'#b56651');
    for(let k=0;k<6;k++){rect(c,245+k*7,170+k*8,6,11,'#273a3b');rect(c,245+k*7,178+k*8,6,3,'#bbc0ac');}
    rect(c,520,390,26,30,'#a76643');rect(c,523,394,20,15,'#d5b262');text(c,'CHIPS',533,405,5,'#283d38','center');
    rect(c,775,510,50,45,'#809085');for(let k=0;k<4;k++)rect(c,779+k*10,511,4,44,'#b6b9a0');
    // Lived-in objects drawn from the supplied room photo, not claims of ownership.
    for(let i=0;i<5;i++){rect(c,65+i*23,289,16,7,'#22373b');rect(c,66+i*23,295,15,2,'#9daca0');}
    rect(c,246,450,7,95,'#30434a');rect(c,238,533,25,17,'#24383f');rect(c,242,481,16,32,'#425961');rect(c,242,482,3,30,'#7e9490');
    for(let i=0;i<4;i++){rect(c,710+i*12,470,8,20,'#b9ccc0');rect(c,712+i*12,470,4,3,'#477e8d');rect(c,710+i*12,479,8,5,'#688b9b');}
    rect(c,300,560,54,14,'#34454a');rect(c,305,550,36,7,'#6a7c70');rect(c,340,553,7,7,'#c4aa7c');
    text(c,'ALPHA · SHARED ROOM / FICTIONAL ASSIGNMENT',w/2,27,11,'#4b5c50','center');
    text(c,'REST & WORKBENCH',440,604,11,'#e9ddbd','center');text(c,'MIRRORED CLOSET',726,180,9,'#e5d9bc','center');
    rect(c,408,528,64,6,'#817358');rect(c,414,534,52,33,'#bd9f69');rect(c,423,539,15,6,'#5c766a');
  }else if(zone==='gym'){
    roomBase(c,w,h,'#c2a36c');
    for(let xx=16;xx<w-16;xx+=19){line(c,xx,42,xx,h-16,'#b29665');for(let yy=80+(xx%120);yy<h;yy+=140)line(c,xx,yy,xx+19,yy,'#a58b5e');}
    for(const xx of [60,1200]){rect(c,xx,110,100,740,'#254758');for(let yy=118;yy<850;yy+=22)rect(c,xx+4,yy,92,3,'#557181');text(c,'HIU',xx+50,490,26,'#c3bba0','center');}
    c.strokeStyle='#ede0bb';c.lineWidth=3;c.strokeRect(230,125,900,720);line(c,230,485,1130,485,'#ede0bb',3);
    c.beginPath();c.arc(680,485,95,0,Math.PI*2);c.stroke();c.strokeRect(470,125,420,150);c.strokeRect(470,695,420,150);
    for(const yy of [130,830]){rect(c,630,yy-7,100,6,'#e0ddc4');rect(c,666,yy,28,5,'#ab6f42');}
    text(c,'HOPE',680,513,60,'#344f61','center');text(c,'ROYALS',680,544,15,'#eee0b7','center');
    text(c,'THREE-POINT PRACTICE',680,220,14,'#3a5260','center');text(c,'ROBBIE PHILLIPS · FICTIONAL CHALLENGE',680,240,9,'#3a5260','center');
    text(c,'APPROACH THE MARKER · E TO READY',680,372,10,'#3a5260','center');
  }else{
    roomBase(c,w,h,'#898779');rect(c,160,65,820,130,'#9f8862');rect(c,176,65,788,114,'#b39a6b');
    rect(c,540,102,60,60,'#6a6050');rect(c,551,104,38,10,'#c6b78d');rect(c,370,97,70,42,'#1e3540');
    for(const xx of [100,730])for(let yy=330;yy<900;yy+=85){rect(c,xx+3,yy+7,282,40,'#605f54');rect(c,xx,yy,280,40,'#3f5d6b');for(let sx=xx+5;sx<xx+275;sx+=30){rect(c,sx,yy+4,24,13,'#597b86');rect(c,sx,yy+22,24,14,'#4d6d7b');}}
    text(c,'PACIFIC AUDITORIUM / GRANA CHAPEL',570,49,13,'#4c625b','center');text(c,'BIG P — THE PRESIDENT',570,260,15,'#e8d7a9','center');
    text(c,'CONVOCATION IS A LATER CHAPTER',570,281,10,'#e0d9bd','center');
    text(c,'THE PRESIDENT ↑',570,790,12,'#ded5b3','center');
  }
  staticScenes.set(zone,scene);return scene;
}
function fred(c,p,x,y,time=0,walking=false,scale=1){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  if(p.hp<=0)c.rotate(-Math.PI/2);
  const bob=walking?Math.round(Math.sin(time*13)):0, stride=walking?Math.round(Math.sin(time*13)*3):0;
  rect(c,-12,-2,25,6,'#233c344d');
  if(atlas){
    const fw=atlas.width/10,fh=fw*1.0625;
    const a=(p.angle+Math.PI*2)%(Math.PI*2),row=a>Math.PI*.25&&a<Math.PI*.75?0:a>Math.PI*.75&&a<Math.PI*1.25?2:a>Math.PI*1.25&&a<Math.PI*1.75?4:2;
    c.save();if(Math.cos(a)<0)c.scale(-1,1);c.drawImage(atlas,(walking?Math.floor(time*10)%8:0)*fw,row*fh,fw,fh,-20,-47,40,47);c.restore();
  }else{
    // Provisional original pixel likeness: glasses, slim silhouette, stubble, dark chain.
    rect(c,-8,-16,7,14+stride,'#202e32');rect(c,2,-16,7,14-stride,'#29363a');
    rect(c,-10,-4+stride,10,5,'#16282b');rect(c,1,-4-stride,11,5,'#16282b');rect(c,-9,-1+stride,8,1,'#84928a');rect(c,2,-1-stride,9,1,'#84928a');
    const shirt=p.equipped?.body==='jersey'?'#a64f43':'#273238';
    rect(c,-10,-32+bob,20,19,shirt);rect(c,-8,-29+bob,2,13,'#3b4548');rect(c,7,-29+bob,2,13,'#172a2d');
    rect(c,-13,-29+bob,4,12,'#c39872');rect(c,10,-29+bob,4,12,'#b88a67');rect(c,-13,-30+bob,4,6,shirt);rect(c,10,-30+bob,4,6,shirt);
    if(p.equipped?.body==='jersey'){rect(c,-1,-30+bob,2,14,'#e2cfac');text(c,'A',0,-20+bob,7,'#e2cfac','center');}
    else {rect(c,-4,-30+bob,1,5,'#75817d');rect(c,3,-30+bob,1,5,'#75817d');rect(c,-3,-25+bob,6,1,'#75817d');}
    rect(c,-4,-35+bob,8,5,'#be916d');rect(c,-9,-48+bob,18,16,'#cda37c');rect(c,7,-44+bob,3,10,'#b68c69');
    rect(c,-10,-49+bob,20,5,'#6b503a');rect(c,-8,-52+bob,15,4,'#7e5c40');rect(c,-11,-46+bob,4,8,'#6b503a');rect(c,-6,-48+bob,5,5,'#8c6748');
    rect(c,-8,-42+bob,7,5,'#243437');rect(c,1,-42+bob,7,5,'#243437');rect(c,-1,-41+bob,3,1,'#243437');rect(c,-6,-41+bob,3,2,'#aec0b3');rect(c,3,-41+bob,3,2,'#aec0b3');
    rect(c,-4,-33+bob,9,2,'#786251');rect(c,-2,-35+bob,4,1,'#9b7359');rect(c,0,-38+bob,2,2,'#b0805f');
    if(p.equipped?.accessory==='chain'){rect(c,-5,-29+bob,1,6,'#a8b3a0');rect(c,4,-29+bob,1,6,'#a8b3a0');rect(c,-4,-23+bob,8,2,'#a8b3a0');}
  }
  if(p.hp<=0){rect(c,-18,-10,36,9,'#9a7b61');text(c,'Z z',0,-26,9,'#e5d7ae','center');}
  else{
    c.save();c.translate(8,-22);c.rotate(p.angle+(p.swing>0?Math.sin(p.swing*20)*.8:0));
    if(p.weapon==='nerf'){rect(c,0,-3,17,6,'#ce8749');rect(c,13,-3,7,5,'#8bb3b0');rect(c,0,3,5,5,'#476371');}
    if(p.weapon==='saber'){rect(c,0,-2,9,4,'#849a9c');rect(c,9,-3,26,6,'#4697b077');rect(c,9,-1,26,2,'#c8f3f4');}
    if(p.weapon==='bat'){rect(c,0,-1,10,3,'#a78050');rect(c,9,-3,22,6,'#ccaa70');rect(c,28,-2,4,4,'#dfc18b');}
    c.restore();
  }
  c.restore();
}
function resize(){canvas.width=Math.ceil(canvas.clientWidth/pixelScale);canvas.height=Math.ceil(canvas.clientHeight/pixelScale);ctx.imageSmoothingEnabled=false;}
new ResizeObserver(resize).observe(canvas);
function paint(now){
  const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
  const p=state?.self||{zone:'alpha',x:440,y:470}, zone=p.zone, [w,h]=sizes[zone];
  if(lastZone!==zone){camera={x:p.x-canvas.width/2,y:p.y-canvas.height/2};visual.clear();lastZone=zone;}
  camera.x+=(p.x-canvas.width/2-camera.x)*(smoothCamera?Math.min(1,dt*9):1);camera.y+=(p.y-canvas.height/2-camera.y)*(smoothCamera?Math.min(1,dt*9):1);
  const cx=Math.round(Math.max(0,Math.min(w-canvas.width,camera.x))),cy=Math.round(Math.max(0,Math.min(h-canvas.height,camera.y)));
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(-cx,-cy);ctx.drawImage(scene(zone),0,0);
  const time=state?.clock||now/1000;
  if(zone==='gym'&&!state?.boss){
    rect(ctx,662,275,36,36,'#314f5b');text(ctx,'E',680,300,19,'#e3c77e','center');
    fred(ctx,{equipped:{body:'hoodie'},weapon:'bat',angle:Math.PI/2,hp:100},680,300,time,false,1.2);
  }
  if(zone==='chapel'){fred(ctx,{equipped:{body:'hoodie'},weapon:'',angle:Math.PI/2,hp:100},570,225,time,false,1.2);text(ctx,'BIG P — THE PRESIDENT',570,174,10,'#ece0bd','center');}
  if(zone==='alpha'&&(!state||p.quest===0)){rect(ctx,697,210,18,32,'#ead19d55');text(ctx,'!',706,200,14,'#f1d28e','center');}
  const boss=state?.boss;
  if(boss&&zone==='gym'){
    for(const mark of boss.hazards){
      ctx.strokeStyle=mark.fired?'#f1ac79':'#c26b54';ctx.lineWidth=mark.fired?5:2;ctx.fillStyle=mark.fired?'#df8f6466':'#a9554433';ctx.beginPath();ctx.arc(mark.x,mark.y,mark.r,0,Math.PI*2);ctx.fill();ctx.stroke();
      line(ctx,mark.x-8,mark.y,mark.x+8,mark.y,'#d59676');line(ctx,mark.x,mark.y-8,mark.x,mark.y+8,'#d59676');text(ctx,mark.fired?'!':Math.max(0,mark.time).toFixed(1),mark.x,mark.y-15,10,'#ffe2ba','center');
    }
    fred(ctx,{hp:100,weapon:'',angle:Math.PI/2,equipped:{body:'jersey'}},boss.x,boss.y,time,false,1.4);text(ctx,'ROBBIE PHILLIPS',boss.x,boss.y-78,11,'#f7e1b3','center');
  }
  for(const e of state?.effects||[])if(e.zone===zone){ctx.strokeStyle=e.kind==='heal'?'#e3d19b':'#a3d9bc';ctx.lineWidth=3;ctx.fillStyle='#6bbca626';ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1-Math.min(e.ttl,.7)*.4),0,Math.PI*2);ctx.fill();ctx.stroke();}
  for(const q of [...(state?.players||[])].filter(q=>q.zone===zone).sort((a,b)=>a.y-b.y)){
    const v=visual.get(q.id)||{x:q.x,y:q.y};const walking=distance(v,q)>.5;
    v.x+=(q.x-v.x)*Math.min(1,dt*16);v.y+=(q.y-v.y)*Math.min(1,dt*16);visual.set(q.id,v);
    if(q.shield>0){ctx.strokeStyle='#8ed3bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(v.x,v.y-19,23,35,0,0,Math.PI*2);ctx.stroke();}
    if(q.invuln<=0||Math.floor(now/60)%2)fred(ctx,q,v.x,v.y,time,walking);
    rect(ctx,v.x-18,v.y-65,36,3,'#31483e');rect(ctx,v.x-18,v.y-65,36*q.hp/100,3,'#95c3a1');text(ctx,q.name,v.x,v.y-71,9,'#f5ecd1','center');
    if(q.revive>0)text(ctx,`REVIVE ${q.revive.toFixed(1)}/2.5`,v.x,v.y+15,9,'#e0c57d','center');
  }
  for(const d of state?.projectiles||[])if(d.zone===zone){rect(ctx,d.x-3,d.y-2,7,3,'#f4d38c');rect(ctx,d.x-1,d.y-1,3,1,'#87c0bd');}
  ctx.restore();
  if(state&&notice&&now>noticeUntil){$('speech').textContent='';notice='';}
  requestAnimationFrame(paint);
}
function showDialog(id){keys.clear();attack=block=false;if(!$(id).open)$(id).showModal();if(id==='inventory')renderInventory();if(id==='campus-map')renderMap();if(id==='game-menu'){$('pause-heading').textContent=session.role==='solo'?'Paused.':'Still on campus.';$('export-save').disabled=session.role==='guest';}}
for(const [button,id] of [['help-open','guide'],['inventory-open','inventory'],['map-open','campus-map'],['lan-open','lan'],['sprite-open','sprite']])$(button).onclick=()=>showDialog(id);
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d&&d.id!=='welcome'){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>queue(b.dataset.action));
document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>queue('weapon',b.dataset.weapon));
$('recover').onclick=()=>queue('recover');$('upgrade').onclick=()=>queue('upgrade');$('title-select').onchange=e=>queue('title',e.target.value);
function queue(action,value){if(state&&actions.length<8){actions.push({action,value});send();}}
async function request(path,body){
  if(path==='/api/input'){session.input(body);return {ok:true};}
  if(path==='/api/state')return session.snapshot();
  throw Error('Unknown local command.');
}
function begin(){token=session.localToken;state=session.snapshot();$('welcome').close();$('continue-game').hidden=false;renderHUD();canvas.focus();}
$('join-form').onsubmit=async(e)=>{
  e.preventDefault();const button=e.submitter;button.disabled=true;
  try{
    if((session.saved||session.hasStoredData)&&!confirm('Replace your current local world with a new game? Export your save first if you want to keep it.'))return;
    session.newGame($('name').value,new FormData(e.target).get('variant'));begin();
  }catch(error){$('join-error').textContent=error.message;}finally{button.disabled=false;}
};
async function send(){
  if(!state||busy)return;busy=true;
  const modal=activeDialog(), action=actions.shift();
  try{
    await request('/api/input',{keys:modal?[]:[...keys],attack:!modal&&attack,block:!modal&&block,angle:aim,...action});
    state=await request('/api/state');renderHUD();
    $('connection').textContent=session.status;$('status-light').style.background='#73b6a5';
  }catch(error){
    $('connection').textContent='DISCONNECTED';$('status-light').style.background='#d48a6b';
    $('speech').textContent=error.message+' Open Invite a Fred to exchange fresh codes. No offline combat is being simulated.';
  }finally{busy=false;}
}
setInterval(send,80);
function promptFor(p){
  if(p.hp<=0)return '';
  if(p.zone==='campus'){
    const b=buildings.find(b=>distance(p,{x:b[2]+b[4]/2,y:b[3]+b[5]+35})<100);
    return b?`${['alpha','gym','chapel'].includes(b[0])?'Enter':'Inspect'} ${b[1]}`:'';
  }
  const [w,h]=sizes[p.zone];if(distance(p,{x:w/2,y:h-35})<90)return 'Leave for campus';
  if(p.zone==='alpha'){
    if(p.quest===0&&distance(p,{x:700,y:230})<135)return 'Recover the remote';
    if(distance(p,{x:440,y:520})<140)return 'Rest & restock';
  }
  if(p.zone==='gym'&&!state.boss&&distance(p,{x:680,y:300})<175)return 'Ready for Three-Point Practice';
  if(p.zone==='chapel'&&distance(p,{x:570,y:225})<150)return 'Speak with The President';
  return '';
}
function renderHUD(){
  const p=state.self;
  $('location').textContent=zoneNames[p.zone];$('area-note').textContent=p.zone==='gym'?'Prepare. Read the floor. Find your opening.':p.zone==='chapel'?'A quiet moment before the next chapter.':p.zone==='campus'?'A familiar place. A different kind of semester.':'A little preparation goes a long way.';
  $('player-name').textContent=p.name;$('variant-name').textContent=p.variant.toUpperCase();$('player-title').textContent=p.title||'A new semester. Same Fred.';$('level').textContent=String(p.level).padStart(2,'0');
  $('hp').value=p.hp;$('hp-text').textContent=`${Math.ceil(p.hp)} / 100`;$('focus').value=p.focus;$('focus-text').textContent=`${Math.floor(p.focus)} / 100`;$('xp').textContent=`${p.xp%120} / 120 XP TO NEXT LEVEL`;
  const q=p.quest;
  $('quest-title').textContent=p.chapter?'Prepared for convocation':q===0?'Personal boundaries':q===1?'An hour early':'Preparation pays off';
  $('quest-description').textContent=p.chapter?'First chapter complete. A familiar campus has more stories to tell. Try another build or practice with friends.':q===0?'Find the remote beside the TV. Some things are not communal property.':q===1?'Bring your gear to Darling Pavilion. Robbie Phillips has a three-point practice challenge.':'Upgrade your gear at Alpha, then meet The President at Pacific Auditorium to finish the chapter.';
  $('quest-step').querySelector('span').textContent=p.chapter?'Chapter 01 complete · practice remains replayable':q===0?'Recover the remote in Alpha':q===1?'Complete Three-Point Practice':p.upgrade?'Meet The President in the chapel':'Upgrade at the Alpha workbench';
  for(const b of document.querySelectorAll('[data-weapon]'))b.classList.toggle('selected',b.dataset.weapon===p.weapon);
  $('weapon-name').textContent=weaponNames[p.weapon];$('ammo').textContent=p.weapon==='nerf'?p.reload>0?`RELOADING · ${p.reload.toFixed(1)}s`:`${p.ammo} / 8 DARTS · R RELOAD`:p.weapon==='saber'?'QUICK SWINGS · MEDIUM REACH':'HEAVY SWINGS · WIDE ARC';
  $('space-cd').textContent=p.ability_cd>0?p.ability_cd.toFixed(1):'25 F';$('heal-cd').textContent=p.heal_cd>0?p.heal_cd.toFixed(1):`×${p.chips}`;$('dodge-cd').textContent=p.dodge_cd>0?p.dodge_cd.toFixed(1):'12 F';
  $('party-count').textContent=`${state.players.length} / 4`;
  $('party-list').replaceChildren(...state.players.map(q=>{const row=document.createElement('div');row.className='party-row';const dot=document.createElement('i'),name=document.createElement('span'),status=document.createElement('small');name.textContent=q.name;status.textContent=q.hp<=0?'DOWNED':q.ready&&!state.boss?'READY':`${Math.ceil(q.hp)} HP · ${q.variant==='MLB Fred'?'MLB':'DORM'}`;row.append(dot,name,status);return row;}));
  const boss=state.boss;$('boss-hud').hidden=!(boss&&p.zone==='gym');if(boss){$('boss-name').textContent='Three-Point Practice';$('boss-phase').textContent=`POINT ${boss.phase} / 3`;$('boss-health').max=boss.max_hp;$('boss-health').value=boss.hp;}
  const prompt=promptFor(p);$('prompt').hidden=!prompt;$('prompt').querySelector('span').textContent=prompt;
  $('downed').hidden=p.hp>0;$('recover').disabled=!!boss;$('downed-note').textContent=boss?'Hold on—a teammate can hold E nearby to revive you. All Freds down resets the practice.':'Practice reset. Return to Alpha with your equipment intact.';
  if(p.notice!==notice&&p.notice!==$('speech').dataset.last){notice=p.notice;$('speech').textContent=notice;$('speech').dataset.last=notice;noticeUntil=performance.now()+10000;}
  storageOK=session.storageOK;$('save-status').textContent=session.role==='guest'?'SAVED BY HOST':!storageOK?'MEMORY ONLY · EXPORT YOUR SAVE':state.save_error?'SAVE ERROR · EXPORT BACKUP':'SAVED IN THIS BROWSER';
  const portrait=$('portrait').getContext('2d');portrait.clearRect(0,0,48,64);portrait.imageSmoothingEnabled=false;fred(portrait,p,24,59,0,false,1);
  if($('inventory').open)renderInventory();if($('campus-map').open)renderMap();
}
function renderInventory(){
  if(!state)return;const p=state.self;
  $('gear-stats').textContent=`Defense ${p.stats.defense} · Power +${p.stats.power} · Upgrade tier ${p.upgrade}/5`;
  $('materials').textContent=`${p.materials} practice materials. Upgrade at the Alpha workbench.`;
  $('upgrade').disabled=p.materials<3||p.upgrade>=5||p.zone!=='alpha';
  const ids=p.gear.join(',')+JSON.stringify(p.equipped);
  if($('gear-list').dataset.items!==ids){
    $('gear-list').dataset.items=ids;
    $('gear-list').replaceChildren(...p.gear.map(id=>{
      const g=gear[id],row=document.createElement('div');row.className='gear-row';const info=document.createElement('div'),name=document.createElement('b'),detail=document.createElement('small'),button=document.createElement('button');
      name.textContent=g[0];detail.textContent=`${g[1]} · ${g[2]} DEF · +${g[3]} power · ${g[4]}`;info.append(name,detail);button.textContent=p.equipped[g[1]]===id?'Equipped':'Equip';button.disabled=p.equipped[g[1]]===id;button.onclick=()=>queue('equip',id);row.append(info,button);return row;
    }));
  }
  const titles=p.titles.join('|');if($('title-select').dataset.items!==titles){$('title-select').dataset.items=titles;$('title-select').replaceChildren(...(p.titles.length?p.titles:['No titles yet']).map(t=>{const o=document.createElement('option');o.textContent=t;o.value=t;return o;}));}
  $('title-select').value=p.title||'No titles yet';
}
function renderMap(){
  const c=$('map').getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(scene('campus'),0,0,560,560);const scale=560/1920;
  const p=state?.self;let pos=p;
  if(p&&p.zone!=='campus'){const b=buildings.find(b=>b[0]===p.zone);pos={x:b[2]+b[4]/2,y:b[3]+b[5]+35};}
  for(const b of buildings){const x=(b[2]+b[4]/2)*scale,y=(b[3]+b[5]/2)*scale;rect(c,x-11,y-11,22,22,'#1a303be8');text(c,b[6],x,y+5,14,'#e6ce8d','center');}
  if(pos){c.strokeStyle='#fff5c9';c.lineWidth=2;c.beginPath();c.arc(pos.x*scale,pos.y*scale,7,0,Math.PI*2);c.stroke();rect(c,pos.x*scale-2,pos.y*scale-2,4,4,'#fff5c9');}
  let legend=$('map-legend');if(!legend){legend=document.createElement('p');legend.id='map-legend';legend.style.fontSize='10px';$('map').after(legend);legend.textContent=buildings.map(b=>`${b[6]} ${b[1]}`).join('  ·  ');}
}
const keyActions={' ':'dodge',q:'space',h:'heal',e:'interact',r:'reload'};
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!activeDialog()&&state){e.preventDefault();showDialog('game-menu');return;}
  if(activeDialog())return;
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))e.preventDefault();
  keys.add(key);if(key==='j')attack=true;if(key==='k')block=true;
  if(!pointerAim){const dx=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft')),dy=Number(keys.has('s')||keys.has('ArrowDown'))-Number(keys.has('w')||keys.has('ArrowUp'));if(dx||dy)aim=Math.atan2(dy,dx);}
  if(e.repeat)return;
  if(keyActions[key])queue(keyActions[key]);
  if(['1','2','3'].includes(key))queue('weapon',['nerf','saber','bat'][Number(key)-1]);
  if(key==='i')showDialog('inventory');if(key==='m')showDialog('campus-map');
});
window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys.delete(k);if(k==='j')attack=false;if(k==='k')block=false;});
window.addEventListener('blur',()=>{keys.clear();attack=block=false;pointerAim=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();attack=block=false;}});
canvas.addEventListener('pointermove',e=>{
  if(!state||e.pointerType==='touch')return;
  pointerAim=true;const r=canvas.getBoundingClientRect(),p=state.self,[w,h]=sizes[p.zone];
  const cx=Math.round(Math.max(0,Math.min(w-canvas.width,camera.x))),cy=Math.round(Math.max(0,Math.min(h-canvas.height,camera.y)));
  aim=Math.atan2((e.clientY-r.top)/r.height*canvas.height+cy-p.y,(e.clientX-r.left)/r.width*canvas.width+cx-p.x);
});
canvas.addEventListener('pointerdown',e=>{if(activeDialog())return;canvas.focus();canvas.setPointerCapture(e.pointerId);if(e.button===0)attack=true;if(e.button===2)block=true;});
window.addEventListener('pointerup',()=>{attack=block=false;});canvas.addEventListener('pointercancel',()=>{attack=block=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
for(const b of document.querySelectorAll('[data-key]')){
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);pointerAim=false;const dirs={w:-Math.PI/2,a:Math.PI,s:Math.PI/2,d:0};aim=dirs[b.dataset.key];};
  b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);
}
for(const [id,type] of [['touch-attack','attack'],['touch-block','block']]){
  $(id).onpointerdown=e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);if(type==='attack')attack=true;else block=true;};
  $(id).onpointerup=$(id).onpointercancel=()=>{if(type==='attack')attack=false;else block=false;};
}
$('sprite-file').onchange=async(e)=>{
  const f=e.target.files[0];if(!f)return;if(f.size>12*1024*1024){$('sprite-status').textContent='Choose a PNG or WebP under 12 MB.';return;}
  const url=URL.createObjectURL(f),img=new Image();
  img.onload=()=>{atlas=img;URL.revokeObjectURL(url);$('sprite-status').textContent='Local sprite preview loaded. Equipment overlays and action frames are not yet integrated.';};
  img.onerror=()=>{URL.revokeObjectURL(url);$('sprite-status').textContent='Could not read this image. Use PNG or WebP.';};img.src=url;
};
session.paused=()=>!!activeDialog()||document.hidden;
session.onstate=s=>{state=s;token=session.localToken;if($('welcome').open)$('welcome').close();renderHUD();};
session.onstatus=text=>{$('connection').textContent=text;$('lan-status').textContent=text;};
$('continue-game').hidden=!session.saved;
$('welcome-storage').textContent=session.saveError||'Solo works offline. Co-op uses direct local browser connections.';
$('continue-game').onclick=()=>{try{session.continueGame();begin();}catch(error){$('join-error').textContent=error.message;}};
$('menu-open').onclick=$('brand-menu').onclick=()=>showDialog('game-menu');
$('resume').onclick=()=>$('game-menu').close();
$('new-game').onclick=()=>{$('game-menu').close();$('continue-game').hidden=!session.saved;showDialog('welcome');};
$('touch-gear').onclick=()=>showDialog('inventory');
$('welcome-lan').onclick=()=>showDialog('lan');
$('pixel-scale').onchange=e=>{pixelScale=Number(e.target.value);resize();};
$('smooth-camera').onchange=e=>smoothCamera=e.target.checked;
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-save').onclick=()=>{try{download('The-Fred-Verse-save.json',session.exportSave(),'application/json');$('menu-status').textContent='Save exported. Keep it private: it includes your world and guest rejoin keys.';}catch(error){$('menu-status').textContent=error.message;}};
$('import-save').onclick=$('welcome-import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    if(f.size>1024*1024)throw Error('Save file is too large (maximum 1 MB).');
    const data=await f.text();FredCore.validateSave(JSON.parse(data));
    if((session.saved||session.role==='guest')&&!confirm('Replace local progress and close existing connections with this imported world? Export a backup first.'))return;
    session.importSave(data);$('game-menu').close();$('lan').close();begin();$('speech').textContent='Save imported at Alpha. Health and gear preserved.';
  }catch(error){$('menu-status').textContent=error.message;$('join-error').textContent=error.message;$('welcome-storage').textContent=error.message;}
  finally{e.target.value='';}
};
function downloadGame(){
  if(globalThis.FRED_STANDALONE)download('The-Fred-Verse.html',pristineHTML,'text/html');
  else{const a=document.createElement('a');a.href='../The-Fred-Verse.html';a.download='The-Fred-Verse.html';a.click();}
}
$('download-game').onclick=$('welcome-download').onclick=downloadGame;
async function lanTask(button,task){button.disabled=true;try{await task();}catch(error){$('lan-status').textContent=error.message;}finally{button.disabled=false;}}
$('create-invite').onclick=e=>lanTask(e.currentTarget,async()=>{$('invite-output').value=await session.invite();});
$('create-reply').onclick=e=>lanTask(e.currentTarget,async()=>{
  if(session.world&&session.role!=='guest'&&!confirm('Join your friend’s world? Your solo world will be saved first.'))return;
  $('reply-output').value=await session.answer($('invite-input').value,$('guest-name').value,$('guest-variant').value);
});
$('accept-reply').onclick=e=>lanTask(e.currentTarget,()=>session.accept($('reply-input').value));
$('leave-session').onclick=()=>{session.leave();$('invite-output').value=$('reply-output').value='';if(session.world)begin();else{state=null;showDialog('welcome');}};
document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{const source=$(b.dataset.copy);source.focus();source.select();try{await navigator.clipboard.writeText(source.value);$('lan-status').textContent='Code copied. Send the whole code privately.';}catch{$('lan-status').textContent='Code selected. Use Copy / Ctrl+C, then send it privately.';}});
window.addEventListener('pagehide',()=>{session.persist();});
resize();requestAnimationFrame(paint);$('welcome').showModal();
