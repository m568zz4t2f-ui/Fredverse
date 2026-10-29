/* Original pixel icons and room materials. Coordinates stay aligned with gameplay collision. */
(() => {
  const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  function icon(c,id,x=0,y=0,size=48){
    c.save();c.translate(x,y);c.scale(size/32,size/32);c.imageSmoothingEnabled=false;
    const r=(x,y,w,h,color)=>box(c,x,y,w,h,color),poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
    if(id==='nerf'){r(4,11,23,9,'#313046');r(5,12,20,6,'#e7a04f');r(7,12,11,2,'#f7ce7b');r(23,12,6,5,'#69a1b3');r(9,18,6,9,'#46677d');r(10,19,3,6,'#8eacb1');r(7,8,11,3,'#5d6f82');r(18,14,3,3,'#7c583b');}
    else if(id==='saber'){c.translate(16,16);c.rotate(Math.PI/4);r(-4,-18,8,24,'#3466b055');r(-2,-17,4,23,'#6ddef1');r(-1,-17,2,23,'#e7ffff');r(-3,6,6,10,'#9faec1');r(-3,6,6,2,'#dbe6e3');r(-2,11,4,1,'#415565');r(-4,15,8,2,'#526879');}
    else if(id==='bat'){c.translate(16,16);c.rotate(Math.PI/4);r(-3,-15,6,20,'#b97c48');r(-2,-16,4,20,'#e8bd75');r(-1,-14,1,15,'#f9d896');r(-1,5,3,9,'#94704e');r(-2,7,5,1,'#ddd2b0');r(-2,10,5,1,'#ddd2b0');r(-2,14,5,2,'#bca97f');}
    else if(['hoodie','jersey'].includes(id)){const color=id==='hoodie'?'#363a50':'#b94f50',light=id==='hoodie'?'#535b70':'#dd7c65';poly([[10,5],[5,8],[2,19],[7,21],[10,16],[10,28],[23,28],[23,16],[26,21],[30,19],[27,8],[22,5]],'#202538');poly([[11,6],[6,9],[4,18],[7,19],[11,13],[11,26],[22,26],[22,13],[26,19],[28,18],[25,9],[21,6]],color);r(12,7,9,3,light);r(12,21,9,3,light);if(id==='jersey'){r(15,10,2,16,'#efdba6');r(11,13,3,1,'#efdba6');r(19,13,2,5,'#efdba6');}else{r(13,11,1,5,'#c9c1ae');r(19,11,1,5,'#c9c1ae');r(14,18,5,3,'#222d40');}}
    else if(id==='jeans'){poly([[8,4],[24,4],[23,15],[21,29],[15,29],[16,17],[14,17],[13,29],[7,29],[8,15]],'#202a3d');r(9,6,13,8,'#3c4d63');r(9,15,5,12,'#34465a');r(17,15,5,12,'#34465a');r(10,15,1,11,'#596579');r(19,15,1,11,'#596579');r(9,5,13,2,'#596579');r(15,7,2,6,'#27364c');}
    else if(id==='shoes'){r(4,8,8,12,'#283142');r(19,7,8,12,'#283142');r(3,16,12,7,'#384258');r(18,15,12,7,'#384258');r(3,22,12,3,'#a8aead');r(18,21,12,3,'#a8aead');r(5,14,5,1,'#c4c4b8');r(5,17,5,1,'#c4c4b8');r(20,13,5,1,'#c4c4b8');r(20,16,5,1,'#c4c4b8');}
    else if(id==='chain'){for(let i=0;i<7;i++){const xx=7+i*3,yy=7+Math.round(Math.sin(i/6*Math.PI)*15);r(xx-1,yy-1,5,6,'#222d40');r(xx,yy,3,4,'#9cabc2');r(xx+1,yy+1,1,2,'#34455b');}r(14,25,5,4,'#d8c392');}
    else if(id==='headphones'){r(6,5,20,7,'#29344b');r(8,4,16,3,'#9ba7bb');r(5,9,4,14,'#4d6081');r(24,9,4,14,'#4d6081');r(4,13,7,12,'#202d43');r(22,13,7,12,'#202d43');r(6,15,3,8,'#829cb9');r(24,15,3,8,'#829cb9');}
    else if(id==='backpack'){r(11,3,11,4,'#a99b77');r(5,8,23,22,'#272f43');r(7,7,19,21,'#b29a61');r(8,9,17,4,'#d8bd7d');r(9,16,14,10,'#827749');r(11,16,10,2,'#e1cd95');r(5,13,3,12,'#ddbd7d');r(25,13,3,12,'#ddbd7d');r(15,19,3,4,'#d1c09a');}
    else if(id==='chips'){poly([[7,5],[24,5],[27,28],[4,28]],'#b67538');poly([[8,7],[23,7],[25,26],[6,26]],'#ecc160');r(7,6,17,3,'#f3dc9a');r(6,24,19,3,'#f3dc9a');r(8,11,15,4,'#9c4e39');poly([[12,18],[17,15],[21,21],[11,22]],'#f8dda0');r(12,18,4,1,'#c19145');}
    else if(id==='materials'){r(4,18,17,8,'#53647f');r(6,16,15,7,'#98abc1');r(6,16,15,2,'#d4dfdc');r(9,10,17,7,'#7761a4');r(11,8,15,7,'#b59cce');r(11,8,15,2,'#e0c3e9');r(12,20,5,1,'#e1dcb2');}
    else if(id==='remote'){r(10,3,12,27,'#242d40');r(11,4,9,24,'#485570');r(13,6,3,3,'#cd7664');r(17,6,2,2,'#b6cdbe');for(let row=0;row<4;row++)for(let col=0;col<2;col++)r(13+col*4,12+row*3,2,2,'#b7b9c2');}
    else if(id==='space'){poly([[5,5],[16,2],[27,5],[25,21],[16,30],[7,21]],'#c7bd91');poly([[8,7],[16,5],[24,7],[22,20],[16,26],[10,20]],'#5a9b9e');r(14,9,4,12,'#b5e4cf');r(10,13,12,4,'#b5e4cf');}
    else if(id==='dodge'){r(10,7,9,12,'#334958');r(10,17,17,7,'#7d97a0');r(9,23,19,3,'#e5c78e');r(12,14,6,2,'#e5c78e');r(2,10,7,2,'#d6a97a');r(0,15,7,2,'#d6a97a');r(3,20,5,2,'#d6a97a');}
    c.restore();
  }
  function floor(c,w,h,zone){
    box(c,0,0,w,h,zone==='alpha'?'#897a72':'#88827a');
    for(let y=42;y<h-15;y+=24)for(let x=15;x<w-15;x+=24){const n=((x*17+y*31)%19);box(c,x,y,24,24,n<5?'#94847a':n<11?'#8c7d73':'#907f75');box(c,x+3+n%4,y+6,2,1,'#a39483');box(c,x+13,y+17+n%3,2,1,'#7c6d67');}
    box(c,15,42,w-30,7,'#4f4550');box(c,15,42,8,h-60,'#645a62');box(c,w-23,42,8,h-60,'#65545b');
    // Vertical wall paneling, trim and a warm lit ceiling edge.
    box(c,0,0,w,35,'#c9b9a0');for(let x=0;x<w;x+=24){box(c,x,4,2,28,'#ac9b8a');box(c,x+2,4,1,28,'#ead8b4');}
    box(c,0,0,w,5,'#665365');box(c,0,30,w,6,'#e3c99e');box(c,0,36,w,6,'#72606a');box(c,0,h-15,w,15,'#c9b491');
    box(c,0,35,15,h-50,'#b7a78e');box(c,w-15,35,15,h-50,'#a59180');
    if(zone==='alpha'){
      // Threaded navy rug and a walking lane; the visible furniture still aligns with collision.
      box(c,347,306,218,174,'#4b4258');box(c,352,311,208,164,'#67717d');box(c,360,319,192,148,'#414d64');
      for(let y=320;y<465;y+=9){box(c,362,y,188,1,'#56657c');box(c,367,y+3,177,1,'#39455b');}
      box(c,365,322,182,2,'#b9a986');box(c,365,459,182,2,'#b9a986');
      for(let x=356;x<558;x+=8){box(c,x,305,3,4,'#c1ab85');box(c,x,479,3,4,'#c1ab85');}
    }
  }
  globalThis.FredArt={icon,floor};
})();
