
(function(){
"use strict";
const W=480,H=760,RAD=Math.PI/180,CX=240;
const cv=document.getElementById('c');
let g=cv.getContext('2d');
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const fr=x=>x-Math.floor(x);

/* ============================================================
   SPRITES EXTERNOS · rellena rutas o arrastra archivos encima.
   El nombre de archivo decide la clave: bunneary.gif -> bunneary
   ------------------------------------------------------------
   SEGMENTOS define qué parte del gif es reposo y cuál acción:
   fennekin-decoracion  reposo=1ª mitad, acción(llama)=último cuarto
   starmie   reposo=2ª mitad, acción(giro)=1ª mitad
   chandelure-fuego es un gif aparte que sustituye al normal
   mientras dispara. Sin gif, se usa el dibujo en canvas.
   ============================================================ */
const SPRITES_EXTERNOS={
  'fennekin-decoracion':'', exeggutor:'', koffing:'', bunneary:'',
  starmie:'', chandelure:'', 'chandelure-fuego':'', emolga:'', snorlax:'', lugia:'',
  // capturables (arrastra doduo.gif, braixen.gif, ... sobre la ventana)
  doduo:'', dragonair:'', arcanine:'', noibat:'', garchomp:'', tyrunt:'',combusken:'',
  braixen:'', delphox:'', fennekin:'', torracat:'', glaceon:'',skiddo:'',
  drapion:'', lucario:'', pichu:'', noivern:'', salazzle:'', riolu:'',lurantis:'',
  sceptile:'', relicanth:'', popplio:'', blaziken:'',venusaur:'',eevee:'',
  // bonus del laboratorio secreto
  'mew-durmiendo':'', 'mew-despierto':'', 'mew-volando':'', 'mew-ataque':'', 'mew-huida':'',
  // bonus de la pista de atletismo
  'pikachu-corriendo':'', 'scorbunny-corriendo':''
};

/* Rutas por defecto: cada clave carga assets/sprites/<clave>.gif al arrancar.
   Arrastrar un gif sobre la ventana sigue funcionando y tiene prioridad,
   y cualquier ruta escrita a mano arriba se respeta. */
const RUTA_SPRITES='assets/sprites/';
for(const k in SPRITES_EXTERNOS) if(!SPRITES_EXTERNOS[k]) SPRITES_EXTERNOS[k]=RUTA_SPRITES+k+'.gif';
// segundo tablero · el bosque de la cascada (tienen su propia carpeta)
const RUTA_BOSQUE=RUTA_SPRITES+'segundo tablero/';
Object.assign(SPRITES_EXTERNOS,{
  'bounsweet-decoracion':RUTA_BOSQUE+'bounsweet-decoracion.gif',
  'machamp-decoracion':RUTA_BOSQUE+'machamp-decoracion.gif',
  'venomoth-decoracion':RUTA_BOSQUE+'venomoth-decoración.gif',
  'spinda-decoracion':RUTA_BOSQUE+'spinda-decoracion.gif',
  'dragonite-decoracion':RUTA_BOSQUE+'dragonite-decoracion.gif',
  'politoed-decoracion':RUTA_BOSQUE+'politoed-decoracion.gif'
});
// estos gifs traen mucho lienzo vacío alrededor: se recortan al cargarlos
const RECORTAR=new Set(['bounsweet-decoracion','machamp-decoracion','venomoth-decoracion','spinda-decoracion',
  'dragonite-decoracion','politoed-decoracion']);
const CAPTURABLES=['doduo','dragonair','arcanine','noibat','garchomp','tyrunt','skiddo','combusken',
  'braixen','delphox','fennekin','torracat','glaceon','drapion','lucario','venusaur','eevee','lurantis',
  'pichu','noivern','salazzle','riolu','sceptile','relicanth','popplio','blaziken'];
const nombreBonito=k=>k.charAt(0).toUpperCase()+k.slice(1);
// Mew no está en el sorteo: solo entra en la pokédex si lo capturas en el bonus
const totalDex=()=>CAPTURABLES.length+(G.mewCapturado?1:0);
const ESCALA_SPRITE=1.5;
const SEGMENTOS={
  'fennekin-decoracion':{reposo:[0,0.5],accion:[0.75,1]},   // la llama es el último cuarto
  starmie:{reposo:[0.5,1],accion:[0,0.5]},
  // machamp flexiona en el primer tercio y lanza el gancho en el segundo; el último no se usa
  'machamp-decoracion':{reposo:[0,1/3],accion:[1/3,2/3]}
};
const SPRITE_CACHE={};
(function(){for(const k in SPRITES_EXTERNOS){const s=SPRITES_EXTERNOS[k];
  if(!s||/\.gif(\?|#|$)/i.test(s))continue;
  const im=new Image();im.src=s;SPRITE_CACHE[k]=im;}})();
const spriteListo=k=>{const im=SPRITE_CACHE[k];return im&&im.complete&&im.naturalWidth>0;};

/* function interlaceMap(h){const m=[];
  for(let i=0;i<h;i+=8)m.push(i); for(let i=4;i<h;i+=8)m.push(i);
  for(let i=2;i<h;i+=4)m.push(i); for(let i=1;i<h;i+=2)m.push(i); return m;}
function lzwDescomprimir(data,minCode,total){
  const out=new Uint8Array(total);
  const clear=1<<minCode, eoi=clear+1;
  let dict=[],codeSize=minCode+1,next=eoi+2,prev=-1,oi=0,acc=0,accBits=0,di=0;
  const reset=()=>{dict=[];for(let i=0;i<clear;i++)dict[i]=[i];
    dict[clear]=[];dict[eoi]=[];next=eoi+1;codeSize=minCode+1;prev=-1;};
  reset();
  while(oi<total){
    while(accBits<codeSize&&di<data.length){acc|=data[di++]<<accBits;accBits+=8;}
    if(accBits<codeSize)break;
    const code=acc&((1<<codeSize)-1); acc>>>=codeSize; accBits-=codeSize;
    if(code===clear){reset();continue;}
    if(code===eoi)break;
    let entry;
    if(code<next&&dict[code])entry=dict[code];
    else if(prev>=0&&dict[prev])entry=dict[prev].concat(dict[prev][0]);
    else break;
    for(let i=0;i<entry.length&&oi<total;i++)out[oi++]=entry[i];
    if(prev>=0&&next<4096){dict[next++]=dict[prev].concat(entry[0]);
      if(next===(1<<codeSize)&&codeSize<12)codeSize++;}
    prev=code;
  }
  return out;
}
function descodificarGIF(buffer){
  const d=new Uint8Array(buffer); let p=0;
  if(!(d[0]===71&&d[1]===73&&d[2]===70))throw new Error('no es un GIF');
  p=6;
  const rd8=()=>d[p++], rd16=()=>{const v=d[p]|(d[p+1]<<8);p+=2;return v;};
  const W=rd16(),H=rd16(),pk=rd8(); rd8();rd8();
  let gct=null;
  if(pk&0x80){const n=2<<(pk&7);gct=d.subarray(p,p+n*3);p+=n*3;}
  const bloques=()=>{const partes=[];let len,tot=0;
    while((len=rd8())){partes.push(d.subarray(p,p+len));p+=len;tot+=len;}
    const out=new Uint8Array(tot);let o=0;partes.forEach(a=>{out.set(a,o);o+=a.length;});return out;};
  const crudos=[]; let gce={delay:10,transp:-1,disposal:0};
  while(p<d.length){
    const b=rd8();
    if(b===0x3B||b===undefined)break;
    if(b===0x21){
      const label=rd8();
      if(label===0xF9){const size=rd8(),f=d[p],delay=d[p+1]|(d[p+2]<<8),ti=d[p+3];
        p+=size;rd8();
        gce={delay:delay||10,transp:(f&1)?ti:-1,disposal:(f>>2)&7};
      } else bloques();
    } else if(b===0x2C){
      const x=rd16(),y=rd16(),w=rd16(),h=rd16(),ipk=rd8();
      let ct=gct;
      if(ipk&0x80){const n=2<<(ipk&7);ct=d.subarray(p,p+n*3);p+=n*3;}
      const min=rd8(), datos=bloques();
      crudos.push({x,y,w,h,ct,entre:!!(ipk&0x40),idx:lzwDescomprimir(datos,min,w*h),
                   delay:gce.delay,transp:gce.transp,disposal:gce.disposal});
      gce={delay:10,transp:-1,disposal:0};
    } else break;
  }
  if(!crudos.length)throw new Error('GIF sin fotogramas');
  // composición con métodos de descarte
  const buf=new Uint8ClampedArray(W*H*4), salida=[];
  crudos.forEach(f=>{
    const guardado=f.disposal===3?buf.slice():null;
    const map=f.entre?interlaceMap(f.h):null;
    for(let r=0;r<f.h;r++){
      const dy=(map?map[r]:r)+f.y; if(dy<0||dy>=H)continue;
      for(let c=0;c<f.w;c++){
        const v=f.idx[r*f.w+c]; if(v===f.transp||!f.ct)continue;
        const dx=c+f.x; if(dx<0||dx>=W)continue;
        const o=(dy*W+dx)*4, ci=v*3;
        buf[o]=f.ct[ci];buf[o+1]=f.ct[ci+1];buf[o+2]=f.ct[ci+2];buf[o+3]=255;
      }
    }
    const cv2=document.createElement('canvas');cv2.width=W;cv2.height=H;
    cv2.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
    salida.push({lienzo:cv2,delay:Math.max(20,f.delay*10)});
    if(f.disposal===2){
      for(let r=0;r<f.h;r++){const dy=r+f.y;if(dy<0||dy>=H)continue;
        for(let c=0;c<f.w;c++){const dx=c+f.x;if(dx<0||dx>=W)continue;buf[(dy*W+dx)*4+3]=0;}}
    } else if(f.disposal===3&&guardado) buf.set(guardado);
  });
  return {W,H,frames:salida};
} va aquí (descodificador de GIF) */
function interlaceMap(h){const m=[];
  for(let i=0;i<h;i+=8)m.push(i); for(let i=4;i<h;i+=8)m.push(i);
  for(let i=2;i<h;i+=4)m.push(i); for(let i=1;i<h;i+=2)m.push(i); return m;}
function lzwDescomprimir(data,minCode,total){
  const out=new Uint8Array(total);
  const clear=1<<minCode, eoi=clear+1;
  let dict=[],codeSize=minCode+1,next=eoi+2,prev=-1,oi=0,acc=0,accBits=0,di=0;
  const reset=()=>{dict=[];for(let i=0;i<clear;i++)dict[i]=[i];
    dict[clear]=[];dict[eoi]=[];next=eoi+1;codeSize=minCode+1;prev=-1;};
  reset();
  while(oi<total){
    while(accBits<codeSize&&di<data.length){acc|=data[di++]<<accBits;accBits+=8;}
    if(accBits<codeSize)break;
    const code=acc&((1<<codeSize)-1); acc>>>=codeSize; accBits-=codeSize;
    if(code===clear){reset();continue;}
    if(code===eoi)break;
    let entry;
    if(code<next&&dict[code])entry=dict[code];
    else if(prev>=0&&dict[prev])entry=dict[prev].concat(dict[prev][0]);
    else break;
    for(let i=0;i<entry.length&&oi<total;i++)out[oi++]=entry[i];
    if(prev>=0&&next<4096){dict[next++]=dict[prev].concat(entry[0]);
      if(next===(1<<codeSize)&&codeSize<12)codeSize++;}
    prev=code;
  }
  return out;
}
function descodificarGIF(buffer){
  const d=new Uint8Array(buffer); let p=0;
  if(!(d[0]===71&&d[1]===73&&d[2]===70))throw new Error('no es un GIF');
  p=6;
  const rd8=()=>d[p++], rd16=()=>{const v=d[p]|(d[p+1]<<8);p+=2;return v;};
  const W=rd16(),H=rd16(),pk=rd8(); rd8();rd8();
  let gct=null;
  if(pk&0x80){const n=2<<(pk&7);gct=d.subarray(p,p+n*3);p+=n*3;}
  const bloques=()=>{const partes=[];let len,tot=0;
    while((len=rd8())){partes.push(d.subarray(p,p+len));p+=len;tot+=len;}
    const out=new Uint8Array(tot);let o=0;partes.forEach(a=>{out.set(a,o);o+=a.length;});return out;};
  const crudos=[]; let gce={delay:10,transp:-1,disposal:0};
  while(p<d.length){
    const b=rd8();
    if(b===0x3B||b===undefined)break;
    if(b===0x21){
      const label=rd8();
      if(label===0xF9){const size=rd8(),f=d[p],delay=d[p+1]|(d[p+2]<<8),ti=d[p+3];
        p+=size;rd8();
        gce={delay:delay||10,transp:(f&1)?ti:-1,disposal:(f>>2)&7};
      } else bloques();
    } else if(b===0x2C){
      const x=rd16(),y=rd16(),w=rd16(),h=rd16(),ipk=rd8();
      let ct=gct;
      if(ipk&0x80){const n=2<<(ipk&7);ct=d.subarray(p,p+n*3);p+=n*3;}
      const min=rd8(), datos=bloques();
      crudos.push({x,y,w,h,ct,entre:!!(ipk&0x40),idx:lzwDescomprimir(datos,min,w*h),
                   delay:gce.delay,transp:gce.transp,disposal:gce.disposal});
      gce={delay:10,transp:-1,disposal:0};
    } else break;
  }
  if(!crudos.length)throw new Error('GIF sin fotogramas');
  // composición con métodos de descarte
  const buf=new Uint8ClampedArray(W*H*4), salida=[];
  crudos.forEach(f=>{
    const guardado=f.disposal===3?buf.slice():null;
    const map=f.entre?interlaceMap(f.h):null;
    for(let r=0;r<f.h;r++){
      const dy=(map?map[r]:r)+f.y; if(dy<0||dy>=H)continue;
      for(let c=0;c<f.w;c++){
        const v=f.idx[r*f.w+c]; if(v===f.transp||!f.ct)continue;
        const dx=c+f.x; if(dx<0||dx>=W)continue;
        const o=(dy*W+dx)*4, ci=v*3;
        buf[o]=f.ct[ci];buf[o+1]=f.ct[ci+1];buf[o+2]=f.ct[ci+2];buf[o+3]=255;
      }
    }
    const cv2=document.createElement('canvas');cv2.width=W;cv2.height=H;
    cv2.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf),W,H),0,0);
    salida.push({lienzo:cv2,delay:Math.max(20,f.delay*10)});
    if(f.disposal===2){
      for(let r=0;r<f.h;r++){const dy=r+f.y;if(dy<0||dy>=H)continue;
        for(let c=0;c<f.w;c++){const dx=c+f.x;if(dx<0||dx>=W)continue;buf[(dy*W+dx)*4+3]=0;}}
    } else if(f.disposal===3&&guardado) buf.set(guardado);
  });
  return {W,H,frames:salida};
}

function Reproductor(gif,seg){
  this.f=gif.frames;this.W=gif.W;this.H=gif.H;
  this.seg=seg||{reposo:[0,1]};this.one=null;this.acc=0;
  this.i=this._rng(this.seg.reposo||[0,1])[0];
}
Reproductor.prototype._rng=function(r){const n=this.f.length;
  const a=clamp(Math.floor(r[0]*n),0,n-1);
  const b=clamp(Math.max(a+1,Math.round(r[1]*n)),a+1,n);return [a,b];};
Reproductor.prototype.accion=function(cb){
  if(!this.seg.accion){if(cb)cb();return;}
  this.one={r:this._rng(this.seg.accion),cb:cb||null};
  this.i=this.one.r[0];this.acc=0;};
Reproductor.prototype.avanzar=function(ms){
  this.acc+=ms;let gu=0;
  while(this.acc>=this.f[this.i].delay&&gu++<8){
    this.acc-=this.f[this.i].delay;this.i++;
    if(this.one){
      if(this.i>=this.one.r[1]){const cb=this.one.cb;this.one=null;
        this.i=this._rng(this.seg.reposo||[0,1])[0];if(cb)cb();}
    }else{
      const r=this._rng(this.seg.reposo||[0,1]);
      if(this.i>=r[1]||this.i<r[0])this.i=r[0];
    }}};
Reproductor.prototype.lienzo=function(){return this.f[Math.min(this.i,this.f.length-1)].lienzo;};
Reproductor.prototype.enAccion=function(){return !!this.one;};

const GIFS={};
function usarGif(k,buffer){
  try{let gif=descodificarGIF(buffer);if(RECORTAR.has(k))gif=recortaGif(gif);
    GIFS[k]=new Reproductor(gif,SEGMENTOS[k]);return true;}
  catch(e){console.warn('GIF no válido para '+k+':',e.message);return false;}
}
/* recorta todos los fotogramas al rectángulo que ocupa el dibujo en el conjunto del gif,
   para que el tamaño y el apoyo en el suelo no dependan del lienzo vacío */
function recortaGif(gif){
  let x0=gif.W,y0=gif.H,x1=-1,y1=-1;
  gif.frames.forEach(f=>{
    const d=f.lienzo.getContext('2d').getImageData(0,0,gif.W,gif.H).data;
    for(let y=0;y<gif.H;y++)for(let x=0;x<gif.W;x++)
      if(d[(y*gif.W+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  });
  if(x1<0)return gif;
  const w=x1-x0+1,h=y1-y0+1;
  gif.frames.forEach(f=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(f.lienzo,x0,y0,w,h,0,0,w,h);f.lienzo=c;
  });
  gif.W=w;gif.H=h;return gif;
}
(function(){for(const k in SPRITES_EXTERNOS){const s=SPRITES_EXTERNOS[k];
  if(!s||!/\.gif(\?|#|$)/i.test(s))continue;
  fetch(s).then(r=>r.arrayBuffer()).then(b=>usarGif(k,b))
    .catch(()=>console.info('No se pudo leer '+s+' (con file:// arrastra el gif sobre la ventana, o sirve la carpeta con: python3 -m http.server)'));}})();
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{
  e.preventDefault();
  [...(e.dataTransfer?e.dataTransfer.files:[])].forEach(f=>{
    // los espacios del nombre valen como guiones: "scorbunny corriendo.gif" -> scorbunny-corriendo
    // y las tildes se ignoran: "venomoth-decoración.gif" -> venomoth-decoracion
    const k=f.name.replace(/\.[^.]+$/,'').toLowerCase().trim().replace(/[\s_]+/g,'-')
      .normalize('NFD').replace(/[̀-ͯ]/g,'');
    const rd=new FileReader();
    if(/\.gif$/i.test(f.name)){rd.onload=()=>{if(usarGif(k,rd.result))say('Sprite cargado: '+k,150);};rd.readAsArrayBuffer(f);}
    else{rd.onload=()=>{const im=new Image();im.onload=()=>{SPRITE_CACHE[k]=im;say('Sprite cargado: '+k,150);};im.src=rd.result;};rd.readAsDataURL(f);}
  });
});

/* const RAW=[
// --- Playa de Melemele ---
['rowlet','Rowlet','dartrix','p','ave','#a9e37f','#48793a','#f4b23c'],
['dartrix','Dartrix','decidueye','p','ave','#8fd36e','#3f6a33','#f0e6d2'],
['decidueye','Decidueye',null,'p','ave','#5f8f4e','#2c4a29','#d9503f'],
['popplio','Popplio','brionne','p','foca','#67c8f0','#2a6fa8','#f5a8d0'],
['brionne','Brionne','primarina','p','foca','#8fdcf5','#3a7fb5','#ff9ecb'],
['primarina','Primarina',null,'p','foca','#bfeaff','#3f6fc0','#ff7fb8'],
['pikipek','Pikipek','trumbeak','p','ave','#2f3b45','#151c22','#e8493a'],
['trumbeak','Trumbeak','toucannon','p','ave','#39474f','#1a2228','#f2a03c'],
['toucannon','Toucannon',null,'p','ave','#2b353d','#12181d','#ff5a35'],
['yungoos','Yungoos','gumshoos','p','cuadrupedo','#c99a5b','#7a5a2e','#f0e2c4'],
['gumshoos','Gumshoos',null,'p','cuadrupedo','#b9873f','#6b4a1e','#f5ecd2'],
['wishiwashi','Wishiwashi',null,'p','pez','#7fd6ef','#2f7ba0','#f7f7f7'],
['mareanie','Mareanie','toxapex','p','blob','#7b5ec8','#3d2a72','#3fd8c4'],
['toxapex','Toxapex',null,'p','blob','#6b4fbf','#2f1f60','#ff5f8a'],
['dewpider','Dewpider','araquanid','p','bicho','#4fc6c4','#1f6a72','#c9f4ff'],
['araquanid','Araquanid',null,'p','bicho','#3aa9ba','#154f5c','#d8f6ff'],
['bounsweet','Bounsweet','steenee','p','planta','#d94a8c','#7d2450','#7fd36a'],
['steenee','Steenee','tsareena','p','planta','#e05f9c','#8a2a5c','#8fdc72'],
['tsareena','Tsareena',null,'p','planta','#f07ab0','#93306a','#6fc45c'],
['cutiefly','Cutiefly','ribombee','p','bicho','#f5d44f','#b8892a','#f7a7cf'],
['ribombee','Ribombee',null,'p','bicho','#f7dd6a','#c09330','#ffbcd9'],
['sandygast','Sandygast','palossand','p','espectro','#e0c489','#9c7c3f','#6ee0d8'],
['palossand','Palossand',null,'p','espectro','#d4b578','#8a6a30','#5fd0cc'],
['pyukumuku','Pyukumuku',null,'p','blob','#2b2f38','#111419','#ff7d9c'],
['bruxish','Bruxish',null,'p','pez','#f77fb0','#a8386c','#57d4e0'],
['wimpod','Wimpod','golisopod','p','bicho','#9aa8b5','#4f5c68','#e8e2c8'],
['golisopod','Golisopod',null,'p','bicho','#7d8b99','#3a4550','#d8d2b0'],
['rattata-a','Rattata de Alola','raticate-a','p','cuadrupedo','#3a3540','#1a171f','#f2e0c0'],
['raticate-a','Raticate de Alola',null,'p','cuadrupedo','#302b36','#141118','#f7e8cc'],
['meowth-a','Meowth de Alola','persian-a','p','felino','#4a4f6b','#22253a','#f2d98a'],
['persian-a','Persian de Alola',null,'p','felino','#5a5f80','#2a2d45','#ffd76a'],
['exeggutor-a','Exeggutor de Alola',null,'p','planta','#e0c04a','#8a6a1e','#4fae4a'],
['comfey','Comfey',null,'p','planta','#f79ec4','#b8558a','#8fd86a'],
['oricorio','Oricorio',null,'p','ave','#e8443a','#8a1c1a','#f5c24a'],
['morelull','Morelull','shiinotic','p','planta','#6fe0d0','#2a7a72','#c9a8f5'],
['shiinotic','Shiinotic',null,'p','planta','#8ff0dc','#357f78','#d8b8ff'],
['dhelmise','Dhelmise',null,'p','espectro','#4fbf7a','#1e5a38','#c0c8d0'],
// --- Volcán de Wela ---
['litten','Litten','torracat','v','felino','#3a2f33','#181316','#f26a2e'],
['torracat','Torracat','incineroar','v','felino','#4a3236','#1e1518','#ff7a35'],
['incineroar','Incineroar',null,'v','felino','#5c2b28','#2a1210','#ff5a2a'],
['salandit','Salandit','salazzle','v','reptil','#2f2b33','#131117','#f0703c'],
['salazzle','Salazzle',null,'v','reptil','#3a2f45','#171320','#ff8a4a'],
['grubbin','Grubbin','charjabug','v','bicho','#4a5f6b','#1f2c33','#f0d24a'],
['charjabug','Charjabug','vikavolt','v','bicho','#5faf5a','#25552a','#f5dc5a'],
['vikavolt','Vikavolt',null,'v','bicho','#3f77b5','#173a5c','#f7e05a'],
['rockruff','Rockruff','lycanroc','v','cuadrupedo','#c98a5f','#7a4a2a','#e8e2d4'],
['lycanroc','Lycanroc',null,'v','cuadrupedo','#d9603f','#7d2c1c','#f2ece0'],
['mudbray','Mudbray','mudsdale','v','cuadrupedo','#a8845f','#5c4228','#e0cfae'],
['mudsdale','Mudsdale',null,'v','cuadrupedo','#8f6f4a','#4a341c','#d8c49c'],
['fomantis','Fomantis','lurantis','v','planta','#f28fb5','#a8406e','#7fd86a'],
['lurantis','Lurantis',null,'v','planta','#ff7fa8','#b03260','#6fcf5a'],
['stufful','Stufful','bewear','v','humanoide','#f2b5c0','#a85f70','#5f7f9c'],
['bewear','Bewear',null,'v','humanoide','#f5a8b8','#9c4f62','#3f5f7f'],
['turtonator','Turtonator',null,'v','reptil','#d94a3a','#7a1e18','#f0c04a'],
['togedemaru','Togedemaru',null,'v','blob','#c9c4bc','#5f5a54','#f2a03c'],
['mimikyu','Mimikyu',null,'v','espectro','#f0dc7a','#a08a2a','#3a3540'],
['marowak-a','Marowak de Alola',null,'v','humanoide','#7a6a5c','#3a3028','#5fe0c4'],
['geodude-a','Geodude de Alola','graveler-a','v','roca','#4a4f57','#1f2328','#f2d24a'],
['graveler-a','Graveler de Alola','golem-a','v','roca','#565c66','#25292f','#f5dc5a'],
['golem-a','Golem de Alola',null,'v','roca','#5f6670','#2a2f36','#ffe06a'],
['diglett-a','Diglett de Alola','dugtrio-a','v','roca','#a87f5f','#5c4028','#f2e0b0'],
['dugtrio-a','Dugtrio de Alola',null,'v','roca','#9c7350','#523720','#f7e8c0'],
['grimer-a','Grimer de Alola','muk-a','v','blob','#5faf4a','#245a1e','#f2d44a'],
['muk-a','Muk de Alola',null,'v','blob','#6fbf5a','#2a6a22','#ff7fb0'],
['crabrawler','Crabrawler','crabominable','v','bicho','#8a5f3f','#4a2e1c','#f2ece0'],
['crabominable','Crabominable',null,'v','bicho','#e8eef2','#8a9aa8','#d95f4a'],
['jangmo-o','Jangmo-o','hakamo-o','v','dragon','#9aa0a8','#4a5058','#d94a3a'],
['hakamo-o','Hakamo-o','kommo-o','v','dragon','#a8aeb5','#545a62','#e0553a'],
['kommo-o','Kommo-o',null,'v','dragon','#b5bac0','#5f656d','#f0603a'],
['minior','Minior',null,'v','roca','#e8703a','#8a3418','#7fd8f0'],
['komala','Komala',null,'v','cuadrupedo','#b5bcc4','#5f666e','#c99a5f'],
['drampa','Drampa',null,'v','dragon','#eef2f5','#9aa4ae','#6fc45c'],
['oranguru','Oranguru',null,'v','humanoide','#f2ece0','#a89a88','#d94a4a'],
['passimian','Passimian',null,'v','humanoide','#eee8dc','#a09884','#5fae5a'],
['type-null','Código Cero','silvally','v','cuadrupedo','#9aa4ae','#4a545e','#d9d2c4'],
['silvally','Silvally',null,'v','cuadrupedo','#b5bec8','#5c666f','#e05f4a'],
// --- Ambas mesas ---
['vulpix-a','Vulpix de Alola','ninetales-a','b','cuadrupedo','#eef6fb','#a8c4d8','#7fd8f0'],
['ninetales-a','Ninetales de Alola',null,'b','cuadrupedo','#f5fbff','#b5d0e2','#5fc8ee'],
['sandshrew-a','Sandshrew de Alola','sandslash-a','b','roca','#bfe4f5','#5f92ae','#eef8ff'],
['sandslash-a','Sandslash de Alola',null,'b','roca','#a8d8ef','#4a7d9c','#f5fcff']
];
const SPECIES={};
RAW.forEach(r=>SPECIES[r[0]]={k:r[0],n:r[1],e:r[2],z:r[3],a:r[4],c:[r[5],r[6],r[7]]});
const EVO_TARGETS=new Set(RAW.map(r=>r[2]).filter(Boolean));
const BASE=Object.keys(SPECIES).filter(k=>!EVO_TARGETS.has(k)); (pokédex para el modo captura) */
const RAW=[
// --- Playa de Melemele ---
['rowlet','Rowlet','dartrix','p','ave','#a9e37f','#48793a','#f4b23c'],
['dartrix','Dartrix','decidueye','p','ave','#8fd36e','#3f6a33','#f0e6d2'],
['decidueye','Decidueye',null,'p','ave','#5f8f4e','#2c4a29','#d9503f'],
['popplio','Popplio','brionne','p','foca','#67c8f0','#2a6fa8','#f5a8d0'],
['brionne','Brionne','primarina','p','foca','#8fdcf5','#3a7fb5','#ff9ecb'],
['primarina','Primarina',null,'p','foca','#bfeaff','#3f6fc0','#ff7fb8'],
['pikipek','Pikipek','trumbeak','p','ave','#2f3b45','#151c22','#e8493a'],
['trumbeak','Trumbeak','toucannon','p','ave','#39474f','#1a2228','#f2a03c'],
['toucannon','Toucannon',null,'p','ave','#2b353d','#12181d','#ff5a35'],
['yungoos','Yungoos','gumshoos','p','cuadrupedo','#c99a5b','#7a5a2e','#f0e2c4'],
['gumshoos','Gumshoos',null,'p','cuadrupedo','#b9873f','#6b4a1e','#f5ecd2'],
['wishiwashi','Wishiwashi',null,'p','pez','#7fd6ef','#2f7ba0','#f7f7f7'],
['mareanie','Mareanie','toxapex','p','blob','#7b5ec8','#3d2a72','#3fd8c4'],
['toxapex','Toxapex',null,'p','blob','#6b4fbf','#2f1f60','#ff5f8a'],
['dewpider','Dewpider','araquanid','p','bicho','#4fc6c4','#1f6a72','#c9f4ff'],
['araquanid','Araquanid',null,'p','bicho','#3aa9ba','#154f5c','#d8f6ff'],
['bounsweet','Bounsweet','steenee','p','planta','#d94a8c','#7d2450','#7fd36a'],
['steenee','Steenee','tsareena','p','planta','#e05f9c','#8a2a5c','#8fdc72'],
['tsareena','Tsareena',null,'p','planta','#f07ab0','#93306a','#6fc45c'],
['cutiefly','Cutiefly','ribombee','p','bicho','#f5d44f','#b8892a','#f7a7cf'],
['ribombee','Ribombee',null,'p','bicho','#f7dd6a','#c09330','#ffbcd9'],
['sandygast','Sandygast','palossand','p','espectro','#e0c489','#9c7c3f','#6ee0d8'],
['palossand','Palossand',null,'p','espectro','#d4b578','#8a6a30','#5fd0cc'],
['pyukumuku','Pyukumuku',null,'p','blob','#2b2f38','#111419','#ff7d9c'],
['bruxish','Bruxish',null,'p','pez','#f77fb0','#a8386c','#57d4e0'],
['wimpod','Wimpod','golisopod','p','bicho','#9aa8b5','#4f5c68','#e8e2c8'],
['golisopod','Golisopod',null,'p','bicho','#7d8b99','#3a4550','#d8d2b0'],
['rattata-a','Rattata de Alola','raticate-a','p','cuadrupedo','#3a3540','#1a171f','#f2e0c0'],
['raticate-a','Raticate de Alola',null,'p','cuadrupedo','#302b36','#141118','#f7e8cc'],
['meowth-a','Meowth de Alola','persian-a','p','felino','#4a4f6b','#22253a','#f2d98a'],
['persian-a','Persian de Alola',null,'p','felino','#5a5f80','#2a2d45','#ffd76a'],
['exeggutor-a','Exeggutor de Alola',null,'p','planta','#e0c04a','#8a6a1e','#4fae4a'],
['comfey','Comfey',null,'p','planta','#f79ec4','#b8558a','#8fd86a'],
['oricorio','Oricorio',null,'p','ave','#e8443a','#8a1c1a','#f5c24a'],
['morelull','Morelull','shiinotic','p','planta','#6fe0d0','#2a7a72','#c9a8f5'],
['shiinotic','Shiinotic',null,'p','planta','#8ff0dc','#357f78','#d8b8ff'],
['dhelmise','Dhelmise',null,'p','espectro','#4fbf7a','#1e5a38','#c0c8d0'],
// --- Volcán de Wela ---
['litten','Litten','torracat','v','felino','#3a2f33','#181316','#f26a2e'],
['torracat','Torracat','incineroar','v','felino','#4a3236','#1e1518','#ff7a35'],
['incineroar','Incineroar',null,'v','felino','#5c2b28','#2a1210','#ff5a2a'],
['salandit','Salandit','salazzle','v','reptil','#2f2b33','#131117','#f0703c'],
['salazzle','Salazzle',null,'v','reptil','#3a2f45','#171320','#ff8a4a'],
['grubbin','Grubbin','charjabug','v','bicho','#4a5f6b','#1f2c33','#f0d24a'],
['charjabug','Charjabug','vikavolt','v','bicho','#5faf5a','#25552a','#f5dc5a'],
['vikavolt','Vikavolt',null,'v','bicho','#3f77b5','#173a5c','#f7e05a'],
['rockruff','Rockruff','lycanroc','v','cuadrupedo','#c98a5f','#7a4a2a','#e8e2d4'],
['lycanroc','Lycanroc',null,'v','cuadrupedo','#d9603f','#7d2c1c','#f2ece0'],
['mudbray','Mudbray','mudsdale','v','cuadrupedo','#a8845f','#5c4228','#e0cfae'],
['mudsdale','Mudsdale',null,'v','cuadrupedo','#8f6f4a','#4a341c','#d8c49c'],
['fomantis','Fomantis','lurantis','v','planta','#f28fb5','#a8406e','#7fd86a'],
['lurantis','Lurantis',null,'v','planta','#ff7fa8','#b03260','#6fcf5a'],
['stufful','Stufful','bewear','v','humanoide','#f2b5c0','#a85f70','#5f7f9c'],
['bewear','Bewear',null,'v','humanoide','#f5a8b8','#9c4f62','#3f5f7f'],
['turtonator','Turtonator',null,'v','reptil','#d94a3a','#7a1e18','#f0c04a'],
['togedemaru','Togedemaru',null,'v','blob','#c9c4bc','#5f5a54','#f2a03c'],
['mimikyu','Mimikyu',null,'v','espectro','#f0dc7a','#a08a2a','#3a3540'],
['marowak-a','Marowak de Alola',null,'v','humanoide','#7a6a5c','#3a3028','#5fe0c4'],
['geodude-a','Geodude de Alola','graveler-a','v','roca','#4a4f57','#1f2328','#f2d24a'],
['graveler-a','Graveler de Alola','golem-a','v','roca','#565c66','#25292f','#f5dc5a'],
['golem-a','Golem de Alola',null,'v','roca','#5f6670','#2a2f36','#ffe06a'],
['diglett-a','Diglett de Alola','dugtrio-a','v','roca','#a87f5f','#5c4028','#f2e0b0'],
['dugtrio-a','Dugtrio de Alola',null,'v','roca','#9c7350','#523720','#f7e8c0'],
['grimer-a','Grimer de Alola','muk-a','v','blob','#5faf4a','#245a1e','#f2d44a'],
['muk-a','Muk de Alola',null,'v','blob','#6fbf5a','#2a6a22','#ff7fb0'],
['crabrawler','Crabrawler','crabominable','v','bicho','#8a5f3f','#4a2e1c','#f2ece0'],
['crabominable','Crabominable',null,'v','bicho','#e8eef2','#8a9aa8','#d95f4a'],
['jangmo-o','Jangmo-o','hakamo-o','v','dragon','#9aa0a8','#4a5058','#d94a3a'],
['hakamo-o','Hakamo-o','kommo-o','v','dragon','#a8aeb5','#545a62','#e0553a'],
['kommo-o','Kommo-o',null,'v','dragon','#b5bac0','#5f656d','#f0603a'],
['minior','Minior',null,'v','roca','#e8703a','#8a3418','#7fd8f0'],
['komala','Komala',null,'v','cuadrupedo','#b5bcc4','#5f666e','#c99a5f'],
['drampa','Drampa',null,'v','dragon','#eef2f5','#9aa4ae','#6fc45c'],
['oranguru','Oranguru',null,'v','humanoide','#f2ece0','#a89a88','#d94a4a'],
['passimian','Passimian',null,'v','humanoide','#eee8dc','#a09884','#5fae5a'],
['type-null','Código Cero','silvally','v','cuadrupedo','#9aa4ae','#4a545e','#d9d2c4'],
['silvally','Silvally',null,'v','cuadrupedo','#b5bec8','#5c666f','#e05f4a'],
// --- Ambas mesas ---
['vulpix-a','Vulpix de Alola','ninetales-a','b','cuadrupedo','#eef6fb','#a8c4d8','#7fd8f0'],
['ninetales-a','Ninetales de Alola',null,'b','cuadrupedo','#f5fbff','#b5d0e2','#5fc8ee'],
['sandshrew-a','Sandshrew de Alola','sandslash-a','b','roca','#bfe4f5','#5f92ae','#eef8ff'],
['sandslash-a','Sandslash de Alola',null,'b','roca','#a8d8ef','#4a7d9c','#f5fcff']
];
const SPECIES={};
RAW.forEach(r=>SPECIES[r[0]]={k:r[0],n:r[1],e:r[2],z:r[3],a:r[4],c:[r[5],r[6],r[7]]});
const EVO_TARGETS=new Set(RAW.map(r=>r[2]).filter(Boolean));
const BASE=Object.keys(SPECIES).filter(k=>!EVO_TARGETS.has(k));

/* let AC=null,sound=true;
function beep(f,d,type,vol){
  if(!sound)return; try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),gg=AC.createGain();
    o.type=type||'square';o.frequency.value=f;
    gg.gain.setValueAtTime(vol||0.05,AC.currentTime);
    gg.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+(d||0.08));
    o.connect(gg);gg.connect(AC.destination);o.start();o.stop(AC.currentTime+(d||0.08));
  }catch(e){}
}
function chime(list,step){list.forEach((f,i)=>setTimeout(()=>beep(f,.16,'triangle',.06),i*(step||70)));} */
let AC=null,sound=true;
/* barrido de frecuencia: la base del sonido de tragar */
function barrido(f0,f1,d,type,vol){
  if(!sound)return; try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),gg=AC.createGain(),t0=AC.currentTime;
    o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+d);
    gg.gain.setValueAtTime(vol||0.06,t0);
    gg.gain.exponentialRampToValueAtTime(0.0001,t0+d);
    o.connect(gg);gg.connect(AC.destination);o.start();o.stop(t0+d);
  }catch(e){}
}
function beep(f,d,type,vol){
  if(!sound)return; try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(),gg=AC.createGain();
    o.type=type||'square';o.frequency.value=f;
    gg.gain.setValueAtTime(vol||0.05,AC.currentTime);
    gg.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+(d||0.08));
    o.connect(gg);gg.connect(AC.destination);o.start();o.stop(AC.currentTime+(d||0.08));
  }catch(e){}
}
function chime(list,step){list.forEach((f,i)=>setTimeout(()=>beep(f,.16,'triangle',.06),i*(step||70)));}

function eyes(ctx,dx,dy,r,dark){
  ctx.fillStyle='#fdfdfd';
  ctx.beginPath();ctx.ellipse(-dx,dy,r,r*1.15,0,0,7);ctx.ellipse(dx,dy,r,r*1.15,0,0,7);ctx.fill();
  ctx.fillStyle=dark||'#141018';
  ctx.beginPath();ctx.arc(-dx+r*.15,dy+r*.1,r*.55,0,7);ctx.arc(dx+r*.15,dy+r*.1,r*.55,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.beginPath();ctx.arc(-dx-r*.1,dy-r*.3,r*.2,0,7);ctx.arc(dx-r*.1,dy-r*.3,r*.2,0,7);ctx.fill();
}
function blob(ctx,x,y,rx,ry,wob,t){
  ctx.beginPath();
  for(let i=0;i<=28;i++){
    const a=i/28*Math.PI*2;
    const k=1+Math.sin(a*3+t/18)*wob;
    const px=x+Math.cos(a)*rx*k, py=y+Math.sin(a)*ry*k;
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();ctx.fill();
}
function grad(ctx,c1,c2,y0,y1){
  const gr=ctx.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,c1);gr.addColorStop(1,c2);return gr;
}
function drawMon(ctx,sp,x,y,size,t){
  const [c1,c2,c3]=sp.c, s=size/40;
  ctx.save();
  ctx.translate(x,y+Math.sin(t/24)*size*0.035);
  ctx.scale(s,s);
  // sombra
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(0,19,13,3.6,0,0,7);ctx.fill();
  ctx.lineJoin='round';ctx.lineCap='round';
  const body=grad(ctx,c1,c2,-18,18);
  ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.4;
  switch(sp.a){
    case 'ave':
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,2,13,15,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(-9,3,6,10,-.4,0,7);ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(9,4);ctx.lineTo(0,7);ctx.closePath();ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(-4,-14);ctx.lineTo(1,-21);ctx.lineTo(4,-13);ctx.closePath();ctx.fill();
      eyes(ctx,5,-4,3.1);break;
    case 'felino':
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,6,12,11,0,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-11,-6);ctx.lineTo(-13,-17);ctx.lineTo(-4,-10);ctx.closePath();
      ctx.moveTo(11,-6);ctx.lineTo(13,-17);ctx.lineTo(4,-10);ctx.closePath();ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,-6,11,9,0,0,7);ctx.fill();ctx.stroke();
      ctx.strokeStyle=c3;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(11,10);ctx.quadraticCurveTo(20,6,17,-3);ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(0,-1,4.5,3,0,0,7);ctx.fill();
      eyes(ctx,5,-7,3);break;
    case 'foca':
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,4,12,13,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(-12,8,5,8,.5,0,7);ctx.ellipse(12,8,5,8,-.5,0,7);ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(0,4,6,4.5,0,0,7);ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.arc(0,-13,5,0,7);ctx.fill();
      eyes(ctx,5,-4,3);break;
    case 'bicho':
      ctx.strokeStyle=c2;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-5,-11);ctx.lineTo(-9,-19);ctx.moveTo(5,-11);ctx.lineTo(9,-19);ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.arc(-9,-20,2.2,0,7);ctx.arc(9,-20,2.2,0,7);ctx.fill();
      ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(-11,4,7,9,.4,0,7);ctx.ellipse(11,4,7,9,-.4,0,7);ctx.fill();
      ctx.fillStyle=body;ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.ellipse(0,8,9,8,0,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(0,-4,10,9,0,0,7);ctx.fill();ctx.stroke();
      eyes(ctx,4.5,-5,2.8);break;
    case 'pez':
      ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(11,2);ctx.lineTo(21,-7);ctx.lineTo(20,11);ctx.closePath();ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(-1,2,14,10,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(-3,-9);ctx.lineTo(3,-17);ctx.lineTo(6,-8);ctx.closePath();ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(-10,6,4,3,.3,0,7);ctx.fill();
      eyes(ctx,-6,-1,3);break;
    case 'planta':
      ctx.fillStyle=c3;
      for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.55;
        ctx.beginPath();ctx.ellipse(Math.cos(a)*11,-8+Math.sin(a)*9,6.5,3.4,a,0,7);ctx.fill();}
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,6,11,12,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.arc(0,-9,4,0,7);ctx.fill();
      eyes(ctx,4.5,3,3);break;
    case 'roca':
      ctx.fillStyle=body;ctx.beginPath();
      const pts=[[-13,2],[-8,-12],[3,-15],[13,-4],[11,10],[-2,16],[-12,11]];
      pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();
      ctx.moveTo(-8,-12);ctx.lineTo(3,-15);ctx.lineTo(1,-3);ctx.lineTo(-10,-1);ctx.closePath();ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(6,-13);ctx.lineTo(10,-20);ctx.lineTo(12,-11);ctx.closePath();ctx.fill();
      eyes(ctx,5,0,3);break;
    case 'humanoide':
      ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(-12,4,4.5,9,.3,0,7);ctx.ellipse(12,4,4.5,9,-.3,0,7);ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,7,10,11,0,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(0,-7,9.5,9,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(0,11,6,5,0,0,7);ctx.fill();
      eyes(ctx,4.5,-8,3);break;
    case 'espectro':
      ctx.fillStyle=body;ctx.beginPath();
      ctx.moveTo(-12,6);ctx.quadraticCurveTo(-13,-16,0,-16);ctx.quadraticCurveTo(13,-16,12,6);
      for(let i=0;i<4;i++)ctx.quadraticCurveTo(9-i*6,15+((i%2)?-4:4),6-i*6,7);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(0,-4,15,0,7);ctx.fill();ctx.globalAlpha=1;
      eyes(ctx,5,-5,3.2);break;
    case 'dragon':
      ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(-4,-4);ctx.lineTo(-19,-13);ctx.lineTo(-11,3);ctx.closePath();
      ctx.moveTo(4,-4);ctx.lineTo(19,-13);ctx.lineTo(11,3);ctx.closePath();ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,4,11,13,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(-7,-12);ctx.lineTo(-10,-20);ctx.lineTo(-3,-14);ctx.closePath();
      ctx.moveTo(7,-12);ctx.lineTo(10,-20);ctx.lineTo(3,-14);ctx.closePath();ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(0,10,5,4,0,0,7);ctx.fill();
      eyes(ctx,5,-4,3);break;
    case 'reptil':
      ctx.fillStyle=c3;for(let i=0;i<4;i++){ctx.beginPath();
        ctx.moveTo(-3+i*0.5,-13+i*7);ctx.lineTo(-13-i,-11+i*7);ctx.lineTo(-4,-7+i*7);ctx.closePath();ctx.fill();}
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(1,4,12,12,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c2;ctx.beginPath();ctx.ellipse(8,-2,7,5,-.2,0,7);ctx.fill();
      eyes(ctx,4,-8,2.9);break;
    case 'cuadrupedo':
      ctx.fillStyle=c2;ctx.beginPath();
      ctx.roundRect(-10,8,5,10,2.5);ctx.roundRect(5,8,5,10,2.5);ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(-1,3,13,10,0,0,7);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(8,-6,9,8,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(4,-12);ctx.lineTo(3,-19);ctx.lineTo(10,-13);ctx.closePath();
      ctx.moveTo(13,-12);ctx.lineTo(16,-19);ctx.lineTo(17,-11);ctx.closePath();ctx.fill();
      ctx.strokeStyle=c3;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-13,1);ctx.quadraticCurveTo(-21,-2,-18,-10);ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(15,-4,3,2.4,0,0,7);ctx.fill();
      eyes(ctx,3.5,-8,2.7);break;
    case 'tapu':
      ctx.fillStyle=c2;ctx.beginPath();
      ctx.moveTo(0,-20);ctx.lineTo(17,-4);ctx.lineTo(11,17);ctx.lineTo(-11,17);ctx.lineTo(-17,-4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=c1;ctx.beginPath();
      ctx.moveTo(0,-13);ctx.lineTo(11,-2);ctx.lineTo(7,12);ctx.lineTo(-7,12);ctx.lineTo(-11,-2);ctx.closePath();ctx.fill();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(-9,-19);ctx.lineTo(-3,-26);ctx.lineTo(-1,-17);ctx.closePath();
      ctx.moveTo(9,-19);ctx.lineTo(3,-26);ctx.lineTo(1,-17);ctx.closePath();ctx.fill();
      eyes(ctx,5,-2,3.4,'#2a1030');break;
    case 'solar':
      ctx.fillStyle=c3;ctx.globalAlpha=.75;
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2+t/120;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13);
        ctx.lineTo(Math.cos(a+.14)*23,Math.sin(a+.14)*23);ctx.lineTo(Math.cos(a+.28)*13,Math.sin(a+.28)*13);
        ctx.closePath();ctx.fill();}
      ctx.globalAlpha=1;
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,2,13,13,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.ellipse(0,7,6,4,0,0,7);ctx.fill();
      eyes(ctx,5,-3,3.2);break;
    case 'lunar':
      ctx.fillStyle=c3;ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.fill();
      ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(9,-5,17,0,7);ctx.fill();
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.fillStyle=c2;ctx.beginPath();
      ctx.moveTo(-3,-6);ctx.quadraticCurveTo(-22,-14,-25,4);ctx.quadraticCurveTo(-14,-1,-4,6);ctx.closePath();
      ctx.moveTo(3,-6);ctx.quadraticCurveTo(22,-14,25,4);ctx.quadraticCurveTo(14,-1,4,6);ctx.closePath();ctx.fill();
      ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,1,9,13,0,0,7);ctx.fill();ctx.stroke();
      eyes(ctx,4,-4,3,'#12082a');break;
    case 'prisma':
      for(let i=0;i<7;i++){const a=i/7*Math.PI*2+t/90;
        ctx.fillStyle=i%2?c3:'#ff6bd0';ctx.globalAlpha=.55;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*24,Math.sin(a)*24);
        ctx.lineTo(Math.cos(a+.5)*15,Math.sin(a+.5)*15);ctx.closePath();ctx.fill();}
      ctx.globalAlpha=1;
      ctx.fillStyle=body;ctx.beginPath();
      ctx.moveTo(0,-16);ctx.lineTo(12,-5);ctx.lineTo(8,14);ctx.lineTo(-8,14);ctx.lineTo(-12,-5);ctx.closePath();
      ctx.fill();ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,0);ctx.lineTo(0,8);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();
      break;
    default:
      ctx.fillStyle=body;blob(ctx,0,3,12,12,.07,t);ctx.stroke();
      ctx.fillStyle=c3;ctx.beginPath();ctx.arc(-8,-6,3,0,7);ctx.arc(9,-3,2.4,0,7);ctx.fill();
      eyes(ctx,5,-2,3.2);
  }
  ctx.restore();
}

/* ============================================================
   PROYECCIÓN FALSO 3D
   El mundo físico es plano (480x760). Al dibujar, la X se
   estrecha con la profundidad y todo se apoya en un horizonte.
   ============================================================ */
const PS=y=>0.74+0.26*(y/H);
const PX=(x,y)=>CX+(x-CX)*PS(y);
const PY=y=>30+y*0.945;
function pathChain(ch){g.beginPath();ch.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1]);i?g.lineTo(X,Y):g.moveTo(X,Y);});}

/* ============================================================
   GEOMETRÍA (coordenadas de mundo)
   ============================================================ */
const CHAINS=[];
(function(){
  // La pared izquierda desaparece desde y=311 (donde estaba la sombrilla roja)
  // hasta el labio del domo: esa es la BOCA GRANDE del carril del bunneary.
  const Y_BOCA=326, X_EXT=-28, Y_TAPA=120, Y_LABIO=214;
  // el labio superior cae EXACTAMENTE sobre el domo, así la pared del carril
  // ya no se mete dentro del tablero
  const X_INT=240-Math.sqrt(224*224-(260-Y_LABIO)**2);
  const A_BOCA=Math.acos((X_INT-240)/224)/RAD;
  const dome=[];
  for(let a=A_BOCA;a>=0;a-=5)dome.push([240+224*Math.cos(a*RAD),260-224*Math.sin(a*RAD)]);
  CHAINS.push(dome);
  window.BOCA_ALTA=dome[0];                 // labio superior, sobre el domo
  window.BOCA_BAJA=[16,Y_BOCA];             // labio inferior, en la pared recta
  /* ---------- CARRIL DEL SNORLAX ----------
     La pared inferior izquierda se parte para dejar caer la bola por un
     canal vertical que baja recto hasta el snorlax; al chocar con él sale
     disparada hacia arriba. */
  CHAINS.push([[16,Y_BOCA],[16,588],[24,595],[44,642],[44,692]]);
  CHAINS.push([[80,692],[80,645],[86,650],[168,694]]);
  window.SNOR={x:62,xIzq:44,xDer:80,yTope:689,yBoca:595,xBoca:24,yCuello:642};
  CHAINS.push([[464,258],[464,700],[430,700]]);
  const guide=[];for(let a=105;a>=-8;a-=5)guide.push([240+186*Math.cos(a*RAD),260-186*Math.sin(a*RAD)]);
  guide.push([430,300],[430,700]);
  CHAINS.push(guide);
  CHAINS.push([[430,588],[394,650],[312,694]]);
  // guías curvas que flanquean a los koffing (las dos curvas largas del boceto)
  const izq=[],der=[],izq2=[];
  for(let i=0;i<=10;i++){const t=i/10;
    izq.push([158-Math.sin(t*2.6)*18-t*3, 195+t*92]);
    der.push([322+Math.sin(t*2.6)*18+t*3, 195+t*92]);
    izq2.push([98-Math.sin(t*2.6)*18-t*3, 195+t*92]);}   // gemela exterior (desplazada a la izquierda)
  CHAINS.push(izq);CHAINS.push(der);CHAINS.push(izq2);
  // tapa que cierra por arriba las dos lunas del exeggutor;
  // golpearla desde ABAJO es lo único que hace salir al emolga
  window.TAPA_EGG=[[95,196],[128,187],[161,196]];
  CHAINS.push(TAPA_EGG);
  // estas tres barreras se dibujan como un único seto (la física no cambia)
  window.ARBUSTOS_CH=[izq,izq2,TAPA_EGG,der];
  window.SETO_DER=der;
  window.SETO_PATH=izq2.slice().reverse().concat(TAPA_EGG,izq);

  /* ---------- MEDIA LUNA SOBRE LA CIÉNAGA ----------
     Rellena el hueco entre la ciénaga y la flecha de arriba: dos cuartos de
     círculo de seto separados por un carril vertical que cae justo por donde
     el emolga sube y suelta la bola (x=240). */
  const LUNA={cx:240,cy:160,rx:70,ry:40,canal:26};
  window.LUNA=LUNA;
  const pLuna=a=>[LUNA.cx+LUNA.rx*Math.cos(a*RAD),LUNA.cy-LUNA.ry*Math.sin(a*RAD)];
  const aJunta=Math.acos(LUNA.canal/LUNA.rx)/RAD;  // ángulo donde el arco topa con el carril
  const lunaIzq=[[LUNA.cx-LUNA.rx,LUNA.cy]];
  for(let a=180;a>180-aJunta;a-=5)lunaIzq.push(pLuna(a));
  lunaIzq.push(pLuna(180-aJunta));                 // esquina alta, junto al carril
  lunaIzq.push([LUNA.cx-LUNA.canal,LUNA.cy]);      // pared del carril
  lunaIzq.push([LUNA.cx-LUNA.rx,LUNA.cy]);         // base cerrada
  const lunaDer=lunaIzq.map(p=>[2*LUNA.cx-p[0],p[1]]);
  CHAINS.push(lunaIzq);CHAINS.push(lunaDer);
  window.LUNA_IZQ=lunaIzq;window.LUNA_DER=lunaDer;
  ARBUSTOS_CH.push(lunaIzq,lunaDer);

  /* ---------- CARRIL DEL BUNNEARY ----------
     Torre casi vertical adosada al costado izquierdo. Arranca en la boca con
     una curva suave y a partir de ahí sube completamente recta hasta la TAPA,
     donde espera el segundo bunneary. Pared exterior e interior paralelas.  */
  const EXT=[[16,Y_BOCA],[5,317],[-6,306],[-16,293],[-24,278],[X_EXT,262],[X_EXT,Y_TAPA]];
  const INT=[BOCA_ALTA,[X_INT,Y_TAPA]];
  const TAPA_CARRIL=[[X_EXT,Y_TAPA],[X_EXT+5,Y_TAPA],[X_INT-5,Y_TAPA],[X_INT,Y_TAPA]];
  CHAINS.push(EXT);CHAINS.push(INT);CHAINS.push(TAPA_CARRIL);
  window.CARRIL={ext:EXT,int:INT,tapa:TAPA_CARRIL,xInt:X_INT,xExt:X_EXT,yTapa:Y_TAPA,yBoca:Y_BOCA};
})();
const SLINGS=[{a:[64,566],b:[118,616]},{a:[384,574],b:[346,620]}];
// salientes: fennekin y starmie viven a caballo del borde; el botón está en la punta
CHAINS.push([[10,450],[46,453],[74,468]]);    // saliente izquierdo: plano y luego caída
CHAINS.push([[430,468],[404,471],[384,481]]); // saliente derecho: plano y luego caída
const KOFFINGS=[{x:240,y:222},{x:200,y:274},{x:280,y:274}];
const FEN={x:30,y:429,btn:{x:74,y:459,r:10}};
const STAR={x:426,y:448,btn:{x:384,y:472,r:10}};
// bunneary: ahora vive donde estaba el exeggutor, entre el seto
const BUN={x:112,y:240,amp:26,per:150,rad:20};
// valla de madera que tapa la boca del carril del bunneary
const VALLA={x0:84,x1:148,y:302};
// exeggutor: ahora corona la tapa del carril; golpear la tapa desde abajo saca al emolga
const EGG={x:(CARRIL.xInt+CARRIL.xExt)/2,y:CARRIL.yTapa+41};
const CHAN={x:447,y:714};
const WILD={x:240,y:390};

/* ============================================================
   ESTADO
   ============================================================ */
const SUB=6, SPD=0.75, GRAV=0.34*SPD*SPD, MAXV=24*SPD;
const F={
  // len 72: con el reposo a 0.52 rad las puntas se tocan en el centro, sin hueco;
  // con 62 o menos quedaba sitio para que la bola (d=16) se colase entre ellas
  L:{x:168,y:694,len:72,rest:0.52,up:-0.44,a:0.52,w:0,press:false},
  R:{x:312,y:694,len:72,rest:Math.PI-0.52,up:Math.PI+0.44,a:Math.PI-0.52,w:0,press:false}
};
const ball={x:447,y:668,vx:0,vy:0,r:8,rot:0,state:'ready',trail:[],idle:0,lane:0};
let G=null;
function estadoNuevo(){return {state:'menu',score:0,balls:3,mult:1,dex:new Set(),order:[],
  mode:null,timer:0,timerMax:1,wild:null,
  fen:{boton:false,llama:0,cd:0},star:{boton:false,giro:0,cd:0},fenGhost:0,
  em:{fase:null,t:0,x:0,y:0,cd:0},capAnim:null,bunCd:0,chanFuego:0,
  saver:0,charge:0,charging:false,paused:false,tick:0,msg:'',msgT:0,snor:0,snorCd:0,
  escena:'alola',hoyo:0,hoyoRetardo:0,mew:null,pista:null,tragado:null,bonusN:0,
  capturasBonus:0,mewHuido:false,mewCapturado:false,mewVisitas:0,flechas:0,
  orbita:0,orbitaT:0,bola:0,bolaFx:0,bolaT:0,vueltas:0,valla:true,vallaFx:0,vallaPend:false,
  mesa:'alola',bosque:null};}
G=estadoNuevo();
const fx=[],texts=[];let shake=0;
function addFx(x,y,n,color,spd){for(let i=0;i<n;i++){const a=Math.random()*7,s=(spd||3)*(0.4+Math.random());
  fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color,size:1.5+Math.random()*2.5});}}
function addText(x,y,txt,color){texts.push({x,y,txt,color:color||'#fff',life:1});}
const MULT_BOLA=[1,1.5,2];
function score(n,x,y){const v=Math.round(n*G.mult*MULT_BOLA[G.bola||0]);G.score+=v;
  if(x!==undefined)addText(x,y,'+'+v.toLocaleString('es'),'#ffe9a8');}
function say(t,f){G.msg=t;G.msgT=f||150;}

/* ============================================================
   FÍSICA
   ============================================================ */
function collide(ax,ay,bx,by,rad,rest,kick,cb){
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
  let t=L2?((ball.x-ax)*dx+(ball.y-ay)*dy)/L2:0;t=clamp(t,0,1);
  const px=ax+dx*t,py=ay+dy*t;
  let nx=ball.x-px,ny=ball.y-py,d=Math.hypot(nx,ny);
  const R=ball.r+rad;
  if(d<R){
    if(d<1e-4){nx=0;ny=-1;d=1;}
    nx/=d;ny/=d;
    ball.x=px+nx*R;ball.y=py+ny*R;
    const vn=ball.vx*nx+ball.vy*ny;
    if(vn<0){ball.vx-=(1+rest)*vn*nx;ball.vy-=(1+rest)*vn*ny;}
    if(kick){ball.vx+=nx*kick;ball.vy+=ny*kick;}
    if(cb)cb(px,py,nx,ny);
    return true;
  }
  return false;
}
function flipperHit(f){
  const bx=f.x+Math.cos(f.a)*f.len, by=f.y+Math.sin(f.a)*f.len;
  const dx=bx-f.x,dy=by-f.y,L2=dx*dx+dy*dy;
  let t=clamp(((ball.x-f.x)*dx+(ball.y-f.y)*dy)/L2,0,1);
  const px=f.x+dx*t,py=f.y+dy*t;
  let nx=ball.x-px,ny=ball.y-py,d=Math.hypot(nx,ny);
  const R=ball.r+9.5;
  if(d<R){
    if(d<1e-4){nx=0;ny=-1;d=1;}
    nx/=d;ny/=d;
    ball.x=px+nx*R;ball.y=py+ny*R;
    const vpx=-f.w*(py-f.y), vpy=f.w*(px-f.x);
    const vn=(ball.vx-vpx)*nx+(ball.vy-vpy)*ny;
    if(vn<0){ball.vx-=1.5*vn*nx;ball.vy-=1.5*vn*ny;}
    if(Math.abs(f.w)>0.04)beep(180+t*120,.05,'square',.03);
  }
}
function bunOffsetDe(b){const ph=fr(G.tick/b.per);return -(ph<0.5?ph*2:2-ph*2)*b.amp;}
function physics(){
  const f=1/SUB;
  for(let s=0;s<SUB;s++){
    // el flipper gira poco a poco dentro del subpaso: su punta ya no se teletransporta
    [F.L,F.R].forEach(fl=>{
      const tgt=fl.press?fl.up:fl.rest, prev=fl.a;
      fl.a+=clamp(tgt-fl.a,-0.5*SPD/SUB,0.5*SPD/SUB);
      fl.w=(fl.a-prev)*SUB;
    });
    ball.vy+=GRAV*f;
    ball.x+=ball.vx*f;ball.y+=ball.vy*f;
    for(const ch of CHAINS)
      for(let i=0;i<ch.length-1;i++) collide(ch[i][0],ch[i][1],ch[i+1][0],ch[i+1][1],7,0.42,0,
        ch===CARRIL.tapa?((px2,py2,nx,ny)=>{if(ny>0.3)emolgaGolpe();}):null);
    for(const sl of SLINGS)
      collide(sl.a[0],sl.a[1],sl.b[0],sl.b[1],9,0.35,12.4*SPD,(x,y)=>{score(120);addFx(x,y,6,'#ffd27a',3);beep(520,.05,'square',.04);shake=Math.max(shake,3);});
    // snorlax al fondo de su carril: devuelve la bola disparada hacia arriba
    collide(SNOR.xIzq+6,SNOR.yTope,SNOR.xDer-6,SNOR.yTope,7,0.2,0,()=>golpeSnorlax());
    // valla de madera: mientras esté en pie, el bunneary es inalcanzable
    if(G.valla)collide(VALLA.x0,VALLA.y,VALLA.x1,VALLA.y,7,0.42,0,
      (x,y)=>{if(G.tick%9===0)beep(150,.05,'square',.03);});
    // koffings: rebote muy fuerte (la bola en llamas los atraviesa)
    KOFFINGS.forEach(k=>{
      if(G.fenGhost>0){k.lit=6;return;}
      collide(k.x,k.y,k.x,k.y,23,0.5,9.5*SPD,()=>{
        k.lit=14;score(800*(1+G.flechas),k.x,k.y-30);
        addFx(k.x,k.y,12,G.flechas===2?'#ffb03a':G.flechas===1?'#e8e14a':'#c9a0f0',4.5);
        beep(160,.09,'sawtooth',.05);shake=Math.max(shake,6);
      });
    });
    // botones (la bola en llamas los ignora)
    if(G.fenGhost<=0){
      botonHit(FEN.btn,G.fen,'¡Botón de Fennekin activado! Pulsa ← cerca de él','Botón de Fennekin apagado');
      botonHit(STAR.btn,G.star,'¡Botón de Starmie activado! Pulsa → cerca de él','Botón de Starmie apagado');
    }
    // fennekin y starmie: cuerpo sólido
    if(G.fenGhost<=0){
      collide(FEN.x+8,FEN.y+4,FEN.x+8,FEN.y+4,17,0.45,2*SPD,()=>{beep(700,.04,'sine',.03);});
      if(ball.x<=428) // la bola del carril pasa por detrás de starmie
        collide(STAR.x-7,STAR.y+4,STAR.x-7,STAR.y+4,17,0.45,2*SPD,()=>{beep(700,.04,'sine',.03);});
    }
    // bunneary entre el seto: cualquier toque inicia la captura
    const by=BUN.y+bunOffsetDe(BUN);
    if(G.fenGhost>0){}
    else if(G.mode!=='captura'&&G.bunCd<=0){
      collide(BUN.x,by,BUN.x,by,BUN.rad,0.55,3.4*SPD,()=>{
        G.bunCd=240;score(4000,BUN.x,by-30);addFx(BUN.x,by,14,'#ffe1a8',4);
        shake=Math.max(shake,5);startCatch();
      });
    } else collide(BUN.x,by,BUN.x,by,BUN.rad,0.55,3.4*SPD,null);
    // pokémon salvaje del modo captura
    if(G.mode==='captura'&&G.wild) collide(G.wild.x,G.wild.y,G.wild.x,G.wild.y,30,0.4,3.5*SPD,()=>hurtWild());
    flipperHit(F.L);flipperHit(F.R);
    const sp=Math.hypot(ball.vx,ball.vy);
    if(sp>MAXV){ball.vx*=MAXV/sp;ball.vy*=MAXV/sp;}
    ball.vx*=0.99985;ball.vy*=0.99985;
  }
  ball.rot+=ball.vx*0.11;
  // agujero de la pokébola: absorbe la bola y abre el bonus de Mew
  if(G.hoyo>0&&ball.state==='play'){
    const d=Math.hypot(ball.x-HOYO.x,ball.y-HOYO.y);
    if(d<62){ball.vx+=(HOYO.x-ball.x)*0.007;ball.vy+=(HOYO.y-ball.y)*0.007;}
    if(d<30)iniciaTragado();
  }
}
function golpeSnorlax(){
  if(G.snorCd>0)return;
  G.snorCd=20;G.snor=26;
  ball.vy=-23*SPD;ball.vx=(Math.random()-.5)*2.2;   // siempre hacia arriba
  score(7500,SNOR.x,SNOR.yTope-30);
  addFx(SNOR.x,SNOR.yTope-6,18,'#bfe8ff',5);
  beep(120,.26,'sine',.07);shake=Math.max(shake,10);
  // el porrazo mejora la bola: pokéball -> superball -> ultraball
  if(G.bola===0){
    G.bola=1;G.bolaT=0;G.bolaFx=40;
    chime([659,880,1046],75);
    addFx(ball.x,ball.y,20,'#ffe14a',5);
    say('¡Snorlax la manda arriba! SUPERBALL · puntos x1,5',230);
  } else if(G.bola===1&&G.bolaT>=600){        // 10 s como superball
    G.bola=2;G.bolaFx=40;
    chime([880,1175,1568],75);
    addFx(ball.x,ball.y,20,'#ff6b5a',5);
    say('¡Otro porrazo! ULTRABALL · puntos x2',230);
  } else if(G.bola===1){
    chime([392,523,659],70);
    say('¡Snorlax la manda arriba! Aguanta '+Math.ceil((600-G.bolaT)/60)+' s más de superball',180);
  } else {
    chime([392,523,659],70);
    say('¡Snorlax se despierta y la manda arriba!',150);
  }
}
/* la valla de madera del carril del bunneary */
function tiraValla(){
  G.valla=false;G.vallaFx=34;
  shake=Math.max(shake,11);
  for(let i=0;i<26;i++)addFx(VALLA.x0+Math.random()*(VALLA.x1-VALLA.x0),VALLA.y,1,i%2?'#a97240':'#6b4423',5);
  say('¡Flechas en rojo! La valla salta en pedazos · ve a por el Bunneary',240);
  chime([523,659,880,1175],70);
}
/* ¿está la bola dentro del carril del bunneary, por encima de la valla? */
function bolaEnCarrilBun(){
  return ball.state==='play'&&ball.x>VALLA.x0-6&&ball.x<VALLA.x1+6
         &&ball.y>188&&ball.y<VALLA.y+6;
}
function cierraValla(){
  G.vueltas=0;G.orbita=0;G.orbitaT=0;      // hay que volver a dar las dos vueltas
  // si la bola sigue arriba, la valla espera: cerrarla la dejaría encerrada
  if(bolaEnCarrilBun()){G.vallaPend=true;return;}
  G.valla=true;G.vallaFx=0;G.vallaPend=false;
}
function botonHit(b,st,msj,msjOff){
  collide(b.x,b.y,b.x,b.y,b.r,0.5,1.2*SPD,()=>{
    if(st.cd>0)return;               // un solo cambio por golpe
    st.cd=24;
    st.boton=!st.boton;
    if(st.boton){
      score(500,b.x,b.y-22);addFx(b.x,b.y,10,'#ffd27a',3.5);
      chime([660,880],80);say(msj,190);
    } else {
      addFx(b.x,b.y,8,'#8fa4b4',2.8);
      beep(300,.12,'square',.045);say(msjOff,150);
    }
  });
}

/* ============================================================
   MECÁNICAS ESPECIALES
   ============================================================ */
function ruidoFuego(){
  if(!sound)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const dur=0.5, n=Math.floor(AC.sampleRate*dur), buf=AC.createBuffer(1,n,AC.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++){const t=i/n; d[i]=(Math.random()*2-1)*(1-t)*(0.55+0.45*Math.sin(t*46));}
    const src=AC.createBufferSource();src.buffer=buf;
    const fl=AC.createBiquadFilter();fl.type='lowpass';
    fl.frequency.setValueAtTime(1500,AC.currentTime);
    fl.frequency.exponentialRampToValueAtTime(230,AC.currentTime+dur);
    const gn=AC.createGain();
    gn.gain.setValueAtTime(0.001,AC.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.22,AC.currentTime+0.05);
    gn.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
    src.connect(fl);fl.connect(gn);gn.connect(AC.destination);src.start();
  }catch(e){}
}
function llamaFennekin(){
  if(!G.fen.boton||G.fen.llama>0||G.state!=='play')return;
  G.fen.llama=32;
  if(GIFS['fennekin-decoracion'])GIFS['fennekin-decoracion'].accion();
  ruidoFuego();
  chispasFennekin();                     // chispas solo en el instante del disparo
  if(ball.state==='play'&&Math.hypot(ball.x-FEN.x,ball.y-FEN.y)<98){
    ball.vx=19.5*SPD;ball.vy=0;          // siempre horizontal, hacia la derecha
    G.fenGhost=38;
    score(2000,ball.x,ball.y-24);say('¡Lanzallamas horizontal!',130);
    addFx(ball.x,ball.y,16,'#ffb45a',6);shake=Math.max(shake,7);
  }
}
/* chispas de fuego que saltan alrededor del fennekin al lanzar la llamarada */
function chispasFennekin(){
  for(let i=0;i<16;i++){
    const a=Math.random()*7, r=10+Math.random()*26;
    fx.push({x:FEN.x+8+Math.cos(a)*r,y:FEN.y+2+Math.sin(a)*r*0.8,
      vx:(Math.random()-.5)*2.2,vy:-0.9-Math.random()*1.8,life:1,
      color:Math.random()<0.45?'#ffe08a':(Math.random()<0.5?'#ffb45a':'#ff7a3a'),
      size:0.9+Math.random()*1.5});
  }
}
function giroStarmie(){
  if(!G.star.boton||G.star.giro>0||G.state!=='play')return;
  G.star.giro=34;
  if(GIFS.starmie)GIFS.starmie.accion();
  beep(980,.16,'triangle',.06);
  addFx(STAR.x,STAR.y,16,'#b48cff',5);
  if(ball.state==='play'&&Math.hypot(ball.x-STAR.x,ball.y-STAR.y)<98){
    const tiro=apuntaAlCarril();
    ball.vx=tiro[0];ball.vy=tiro[1];
    score(2000,ball.x,ball.y-24);say('¡Rapidez! Directo a la boca del carril',130);
    addFx(ball.x,ball.y,16,'#d0b8ff',6);shake=Math.max(shake,7);
  }
}
/* calcula el tiro balístico que mete la bola por la boca del carril:
   busca el ángulo que entra por la boca con más impulso hacia arriba
   sin llevarse por delante el seto, los koffing ni ninguna pared */
function distSeg(px,py,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;
  let u=L2?((px-a[0])*dx+(py-a[1])*dy)/L2:0;u=u<0?0:u>1?1:u;
  return Math.hypot(px-(a[0]+dx*u),py-(a[1]+dy*u));
}
function apuntaAlCarril(){
  const V=23*SPD, XB=16, YMIN=232, YMAX=316, D=ball.x-XB;
  if(D>=60){
    let mejor=null;
    for(let deg=8;deg<=78;deg+=0.5){
      const th=deg*RAD, vx=V*Math.cos(th), vy=V*Math.sin(th);
      const t=D/vx, yE=ball.y-vy*t+0.5*GRAV*t*t;
      if(yE<YMIN||yE>YMAX)continue;
      let libre=true;
      for(let k=1;k<=80&&libre;k++){
        const tk=t*k/80, x=ball.x-vx*tk, y=ball.y-vy*tk+0.5*GRAV*tk*tk;
        if(x<45)break;                       // ya está en la boca: fuera del chequeo
        if(Math.hypot(x-ball.x,y-ball.y)<44)continue;  // no mires lo que rodea a starmie
        for(const K of KOFFINGS) if(Math.hypot(x-K.x,y-K.y)<33){libre=false;break;}
        if(!libre)break;
        for(const ch of CHAINS){
          if(ch===CARRIL.ext||ch===CARRIL.int||ch===CARRIL.tapa)continue;
          for(let i=0;i<ch.length-1;i++) if(distSeg(x,y,ch[i],ch[i+1])<17.5){libre=false;break;}
          if(!libre)break;
        }
      }
      if(!libre)continue;
      const vyE=-vy+GRAV*t;                  // negativo = entra subiendo
      if(!mejor||vyE<mejor[2])mejor=[-vx,-vy,vyE];
    }
    if(mejor)return mejor;
  }
  return [-V*0.8,-V*0.6];
}
function emolgaGolpe(){
  if(!G.em.fase&&G.em.cd<=0&&G.fenGhost<=0&&ball.state==='play')emolgaEmpieza();
}
function emolgaEmpieza(){
  G.em.fase='baja';G.em.t=0;G.em.x=EGG.x+26;G.em.y=EGG.y-40;
  ball.state='held';ball.vx=0;ball.vy=0;
  say('¡Emolga sale del exeggutor!',170);chime([523,659,784],70);
  score(1500,EGG.x,EGG.y+30);
  // cada visita al emolga enciende una flecha del carril y calienta la ciénaga
  if(G.flechas<2){
    G.flechas++;
    const f=FLECHAS[G.flechas-1];
    addFx(f[0],f[1],14,G.flechas===1?'#e8e14a':'#ff9a2e',4.5);
    chime(G.flechas===1?[659,880]:[880,1175],70);shake=Math.max(shake,6);
    say(G.flechas===1?'¡Flecha 1! La ciénaga fermenta · Koffing x2'
                     :'¡Flecha 2! Azufre hirviendo · Koffing x3',220);
  }
}
function emolgaPaso(){
  const e=G.em;e.t++;
  const lerp=(a,b,t)=>a+(b-a)*t;
  if(e.fase==='baja'){const t=Math.min(1,e.t/36);
    e.x=lerp(EGG.x+26,ball.x,t);e.y=lerp(EGG.y-40,ball.y-14,t);
    if(t>=1){e.fase='sube';e.t=0;e.gx=ball.x;e.gy=ball.y;}}
  else if(e.fase==='sube'){const t=Math.min(1,e.t/46);
    e.x=lerp(e.gx,240,t);e.y=lerp(e.gy-14,116,t);
    ball.x=e.x;ball.y=e.y+16;
    if(t>=1){e.fase='pausa';e.t=0;}}
  else if(e.fase==='pausa'){
    e.x=240+Math.sin(e.t/5)*3;ball.x=e.x;ball.y=e.y+16;
    if(e.t>22){e.fase='coloca';e.t=0;}}
  else if(e.fase==='coloca'){const t=Math.min(1,e.t/26);
    e.x=240;e.y=lerp(116,160,t);
    ball.x=240;ball.y=e.y+16;
    if(t>=1){e.fase='suelta';e.t=0;}}
  else if(e.fase==='suelta'){
    ball.state='play';ball.x=240;ball.y=177;
    ball.vx=(Math.random()-.5)*1.2;ball.vy=1.2;
    say('¡Emolga suelta la bola entre los koffing!',150);
    e.fase='vuelve';e.t=0;}
  else if(e.fase==='vuelve'){const t=Math.min(1,e.t/34);
    e.x=lerp(240,EGG.x+26,t);e.y=lerp(160,EGG.y-40,t);
    if(t>=1){e.fase=null;e.cd=420;}}
}

/* ============================================================
   MODO CAPTURA
   ============================================================ */
function pickWild(){
  const fresh=CAPTURABLES.filter(k=>!G.dex.has(k));
  const arr=fresh.length?fresh:CAPTURABLES;
  const k=arr[Math.floor(Math.random()*arr.length)];
  return SPECIES[k]||{k,n:nombreBonito(k),c:['#ffd27a','#8fd8ff']};
}
/* pinta un capturable: gif > imagen > dibujo propio > pokéball provisional */
function pintarCapturable(ctx,k,x,y,size,t,escala){
  if(k==='mew'&&!GIFS.mew&&!spriteListo('mew'))k='mew-volando';
  if(k==='mew-volando'&&!GIFS[k]&&!spriteListo(k)){
    mewPropio(ctx,x,y,size/30,'vuela',t);return;}
  const rep=GIFS[k], im=(!rep&&spriteListo(k))?SPRITE_CACHE[k]:null;
  if(rep||im){
    const W0=rep?rep.W:im.naturalWidth, H0=rep?rep.H:im.naturalHeight;
    let h=size*(escala?ESCALA_SPRITE:1), w=h*W0/H0;
    if(!escala&&w>size){w=size;h=w*H0/W0;}
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(rep?rep.lienzo():im,x-w/2,y-h/2,w,h);
    ctx.restore();return;
  }
  if(SPECIES[k]){drawMon(ctx,SPECIES[k],x,y,size,t);return;}
  // pokéball provisional mientras no haya gif
  const r=size*0.32;
  ctx.save();ctx.translate(x,y);ctx.lineJoin='round';
  ctx.fillStyle='#e8453a';ctx.beginPath();ctx.arc(0,0,r,Math.PI,0);ctx.fill();
  ctx.fillStyle='#f2ecd8';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI);ctx.fill();
  ctx.strokeStyle='#2a2430';ctx.lineWidth=Math.max(2,r*0.14);
  ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();
  ctx.fillStyle='#f2ecd8';ctx.beginPath();ctx.arc(0,0,r*0.32,0,7);ctx.fill();
  ctx.strokeStyle='#2a2430';ctx.beginPath();ctx.arc(0,0,r*0.32,0,7);ctx.stroke();
  ctx.restore();
}
function startCatch(){
  if(G.mode||G.hoyo>0||(G.escena!=='alola'&&G.escena!=='bosque'))return;
  const sp=pickWild();
  G.mode='captura';G.timerMax=G.timer=30*60;
  G.wild={sp,hp:3,max:3,x:WILD.x,y:WILD.y,flash:0};
  say('¡'+(G.escena==='bosque'?'Spinda':'Bunneary')+' llama a un '+sp.n+' salvaje! Golpéalo 3 veces',200);
  chime([440,554,659]);
}
function hurtWild(){
  const w=G.wild;if(w.flash>5||G.capAnim)return;w.hp--;w.flash=12;shake=Math.max(shake,6);
  addFx(w.x,w.y,14,w.sp.c[0],4.5);score(2500,w.x,w.y-40);
  if(w.hp<=0){
    // arranca la captura: la pokéball se queda quieta y dispara el rayo rojo
    G.capAnim={t:0,sp:w.sp,x:w.x,y:w.y};
    ball.state='held';ball.vx=0;ball.vy=0;
    say('¡Pokéball, ve!',120);
    beep(980,.1,'square',.05);
  } else beep(300,.09,'sawtooth',.05);
}
function capturaPaso(){
  const a=G.capAnim;a.t++;
  if(a.t===30)beep(620,.16,'sine',.05);
  if(a.t===52)beep(430,.22,'sine',.05);
  if(a.t>=50&&a.t%4===0){
    const u=(a.t-50)/30;
    addFx(a.x+(ball.x-a.x)*u,a.y+(ball.y-a.y)*u,2,'#ff8a6b',2);
  }
  if(a.t>=82){
    G.dex.add(a.sp.k);G.order.push(a.sp.k);
    G.mult=Math.min(6,G.mult+1);
    G.capturasBonus++;
    // la pokébola del bonus solo existe en la playa
    if(G.escena==='alola'&&G.capturasBonus>=3&&!G.mewCapturado&&G.hoyo<=0&&G.hoyoRetardo<=0){
      G.hoyoRetardo=300;say('La mesa empieza a vibrar…',150);}
    score(15000,a.x,a.y-50);
    say('¡'+a.sp.n+' capturado!'+(G.escena==='bosque'?' · las flores se marchitan':''),200);
    addFx(ball.x,ball.y,26,'#ffd27a',5.5);chime([523,659,784,1046],80);
    G.mode=null;G.wild=null;G.capAnim=null;
    if(G.escena==='bosque')finCapturaBosque();else cierraValla();
    ball.state='play';ball.vy=-2.5;ball.vx=(ball.x<240?1.5:-1.5);
  }
}

/* ============================================================
   CICLO
   ============================================================ */
function newBall(keepMult){
  ball.x=447;ball.y=668;ball.vx=0;ball.vy=0;ball.state='ready';ball.trail.length=0;
  ball.idle=0;ball.lane=0;
  G.charge=0;G.charging=false;if(!keepMult)G.mult=1;G.saver=8*60;
  say(G.escena==='bosque'?'Mantén Espacio: Machamp prepara el gancho':'Mantén Espacio: Chandelure carga el disparo',150);
}
function loseBall(){
  beep(220,.4,'sawtooth',.06);
  if(G.escena==='bosque')pierdeBolaBosque();
  // reseteo de los estados especiales
  G.fen={boton:false,llama:0,cd:0};G.star={boton:false,giro:0,cd:0};
  if(G.em.fase){G.em.fase=null;}
  if(G.mode)say('Modo interrumpido',120);
  G.mode=null;G.wild=null;
  G.hoyo=0;G.hoyoRetardo=0;G.flechas=0;   // se apagan las flechas y la ciénaga se enfría
  G.orbita=0;G.orbitaT=0;G.bola=0;G.bolaT=0;   // la bola vuelve a ser una pokéball
  G.valla=true;G.vallaFx=0;G.vueltas=0;G.vallaPend=false;   // la valla del bunneary se rehace
  G.balls--;updateHUD();
  if(G.balls<=0)gameOver();else newBall();
}
function gameOver(){
  G.state='over';
  $('overTxt').textContent=G.score.toLocaleString('es')+' puntos · '+
    G.dex.size+' especies registradas de '+totalDex()+' posibles.';
  const grid=$('overGrid');
  grid.style.display='grid';grid.style.gridTemplateColumns='repeat(auto-fill,minmax(84px,1fr))';
  grid.style.gap='8px';grid.style.alignContent='start';
  fillDex(grid);
  $('over').classList.remove('hidden');
}
function startGame(practica){
  G=estadoNuevo();G.state='play';
  if(practica==='bosque'){G.mesa=G.escena='bosque';G.bosque=bosqueNuevo();}
  KOFFINGS.forEach(k=>k.lit=0);BOUNSWEETS.forEach(b=>b.lit=0);
  fx.length=0;texts.length=0;
  $('menu').classList.add('hidden');$('over').classList.add('hidden');
  $('dex').classList.add('hidden');$('info').classList.add('hidden');
  newBall();updateHUD();
  // práctica: directo al nivel de bonus elegido, sin pasar por Alola
  if(practica==='mew')entrarMew();
  else if(practica==='pista')entrarPista();
}
let msPrevio=0;
function update(){
  G.tick++;
  const ahora=performance.now();
  const dt=msPrevio?Math.min(120,ahora-msPrevio):16;msPrevio=ahora;
  for(const k in GIFS)GIFS[k].avanzar(dt);
  if(shake>0)shake*=0.86;
  KOFFINGS.forEach(k=>{if(k.lit)k.lit--;});
  if(G.msgT>0)G.msgT--;
  if(G.fen.llama>0)G.fen.llama--;
  if(G.fen.cd>0)G.fen.cd--;
  if(G.star.cd>0)G.star.cd--;
  if(G.fenGhost>0)G.fenGhost--;
  if(G.star.giro>0)G.star.giro--;
  if(G.chanFuego>0)G.chanFuego--;
  if(G.bunCd>0)G.bunCd--;
  if(G.snor>0)G.snor--;
  if(G.snorCd>0)G.snorCd--;
  if(G.vallaFx>0)G.vallaFx--;
  if(G.vallaPend&&!bolaEnCarrilBun()){G.valla=true;G.vallaFx=0;G.vallaPend=false;}
  if(G.bola===1)G.bolaT++;
  if(G.em.cd>0)G.em.cd--;
  for(let i=fx.length-1;i>=0;i--){const p=fx[i];p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.vx*=0.97;p.life-=0.022;if(p.life<=0)fx.splice(i,1);}
  for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.y-=0.8;t.life-=0.014;if(t.life<=0)texts.splice(i,1);}
  if(G.state!=='play'||G.paused)return;
  if(G.escena==='mew'){updateMew();updateHUD();return;}
  if(G.escena==='pista'){updatePista();updateHUD();return;}
  if(G.escena==='bosque'){updateBosque();updateHUD();return;}
  if(G.tragado){tragadoPaso();updateHUD();return;}
  pasoOrbita();if(G.bolaFx>0)G.bolaFx--;
  if(G.hoyoRetardo>0&&--G.hoyoRetardo<=0)abreHoyo();
  if(G.hoyo>0&&--G.hoyo<=0)say('La pokébola se cierra',110);
  if(G.saver>0)G.saver--;
  if(G.em.fase){emolgaPaso();updateHUD();return;}
  if(G.capAnim){capturaPaso();updateHUD();return;}
  if(ball.state==='ready'){
    if(G.charging){G.charge=Math.min(1,G.charge+0.022);G.chanFuego=8;}
    ball.y=668+G.charge*22;
  } else if(ball.state==='play'){
    physics();
    // si la bola se ha colado por la pokébola ya estamos en el laboratorio:
    // salir aquí evita que el desagüe de Alola cuente una bola perdida
    if(G.escena!=='alola'){updateHUD();return;}
    ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();
    const spd=Math.hypot(ball.vx,ball.vy);
    if(ball.x>434&&ball.y>640&&spd<2.2*SPD){if(++ball.lane>25){ball.state='ready';ball.lane=0;say('Bola de vuelta con Chandelure',110);}}
    else ball.lane=0;
    if(spd<0.7*SPD){if(++ball.idle>150){ball.vx+=(Math.random()-.5)*6*SPD;ball.vy-=3*SPD;ball.idle=0;shake=Math.max(shake,5);}}
    else ball.idle=0;
    // la bola que baja por el carril del snorlax no cuenta como perdida
    if(ball.y>745&&!(ball.x>SNOR.xIzq&&ball.x<SNOR.xDer)){
      if(G.saver>0){say('Salvabolas activado',120);beep(700,.15,'sine',.05);newBall(true);}
      else loseBall();
    }
  }
  if(G.mode){
    G.timer--;
    if(G.wild&&G.wild.flash)G.wild.flash--;
    if(G.timer<=0){say('Se escapó…',140);beep(200,.3,'sawtooth',.05);G.mode=null;G.wild=null;cierraValla();}
  }
  updateHUD();
}

/* ============================================================
   BONUS · PINBALL DE MEW (laboratorio pokémon secreto)
   Se entra por el agujero de la pokébola del centro de Alola,
   que se abre al encadenar 3 capturas seguidas.
   ============================================================ */
const HOYO={x:240,y:430,r:17};   // encaja con el círculo dibujado en el tablero
const MEW_R=224, MEW_CY=437, MEW_TECHO=MEW_CY-MEW_R;   // 213 → 3/4 del largo de Alola
const MEW_CH=[];
(function(){
  const techo=[];
  for(let a=180;a>=0;a-=5)techo.push([240+MEW_R*Math.cos(a*RAD),MEW_CY-MEW_R*Math.sin(a*RAD)]);
  MEW_CH.push(techo);
  MEW_CH.push([[16,MEW_CY],[16,588],[86,650],[168,694]]);
  MEW_CH.push([[464,MEW_CY],[464,588],[394,650],[312,694]]);
})();
const MEW_SLINGS=[{a:[64,566],b:[118,616]},{a:[384,574],b:[346,620]}];
const TANQUE={x:240,y:344,w:134,h:126};
const MEW_ALTO=39, MEW_RAD=36;   // en el aire Mew va 1,5 veces más grande
const TANQUE_CH=(function(){
  const x=TANQUE.x,y=TANQUE.y,w=TANQUE.w,h=TANQUE.h,r=18,p=[];
  [[x+w/2-r,y-h/2+r,-Math.PI/2],[x+w/2-r,y+h/2-r,0],
   [x-w/2+r,y+h/2-r,Math.PI/2],[x-w/2+r,y-h/2+r,Math.PI]]
  .forEach(c=>{for(let k=0;k<=4;k++)p.push([c[0]+Math.cos(c[2]+k*Math.PI/8)*r,c[1]+Math.sin(c[2]+k*Math.PI/8)*r]);});
  p.push(p[0]);return p;
})();

function bonusNuevo(){return{
  fase:'entra',t:0,tiempo:90*60,golpesT:0,golpesM:0,roto:false,
  cdT:0,cdM:0,flash:0,sirve:0,premio:0,grietas:[],trozos:[],
  x:TANQUE.x,y:TANQUE.y,rumbo:-1.2,rumboObj:-1.2,rumboT:0,vhuida:2,
  ataque:0,ataqueCd:600,congelado:0};}

function abreHoyo(){
  G.hoyo=20*60;
  say('Pokédex con '+G.dex.size+' especies · mete la bola en la pokébola',260);
  chime([523,659,784,1046],90);shake=Math.max(shake,8);
  addFx(HOYO.x,HOYO.y,26,'#ff8a6b',5);
}
/* la pokébola se traga la bola: espiral hacia dentro, cierre y glup */
function iniciaTragado(){
  if(G.tragado)return;
  G.tragado={t:0,r0:Math.hypot(ball.x-HOYO.x,ball.y-HOYO.y)||14,
             a0:Math.atan2(ball.y-HOYO.y,ball.x-HOYO.x)};
  ball.state='held';ball.vx=0;ball.vy=0;
  say('¡La pokébola te absorbe!',150);
  barrido(760,110,0.75,'sine',0.075);
  beep(150,.5,'sawtooth',.05);
  shake=Math.max(shake,7);
}
function tragadoPaso(){
  const T=G.tragado;T.t++;
  const u=Math.min(1,T.t/54);
  // espiral que se cierra sobre el centro del agujero
  const r=(T.r0+26)*(1-u)*(1-u), a=T.a0+u*9.2;
  ball.x=HOYO.x+Math.cos(a)*r;ball.y=HOYO.y+Math.sin(a)*r;
  ball.rot+=0.4;
  if(T.t%7===0)addFx(ball.x,ball.y,3,'#ffd27a',2.5);
  if(T.t===18)barrido(420,90,0.4,'triangle',0.05);
  if(T.t===36)beep(90,.3,'sine',.07);
  if(T.t>=54){
    G.tragado=null;
    addFx(HOYO.x,HOYO.y,26,'#ff8a6b',5);chime([392,294,196],80);
    entrarBonus();
  }
}
/* Los niveles de bonus se alternan: la pista de atletismo va antes del primer
   laboratorio de Mew y otra vez entre el primero y el segundo. */
function entrarBonus(){
  if(G.bonusN%2===0)entrarPista();else entrarMew();
  G.bonusN++;
}
function entrarMew(){
  G.escena='mew';G.mew=bonusNuevo();G.pista=null;G.hoyo=0;G.hoyoRetardo=0;
  G.mewVisitas++;
  G.mode=null;G.wild=null;G.capAnim=null;G.em.fase=null;G.em.cd=0;
  G.fen={boton:false,llama:0,cd:0};G.star={boton:false,giro:0,cd:0};G.fenGhost=0;
  ball.state='held';ball.y=820;ball.trail.length=0;fx.length=0;
  say('Laboratorio secreto · rompe el tanque de Mew',240);
  chime([392,523,659,880],80);shake=Math.max(shake,12);
}
function sirveMew(){
  ball.x=438;ball.y=520;ball.vx=-1.2;ball.vy=-19.5*SPD;
  ball.state='play';ball.trail.length=0;ball.idle=0;
  beep(360,.12,'square',.05);
}
function mewHuye(premio){
  const m=G.mew;m.premio=premio;m.fase='huye';m.t=0;
  m.vhuida=(m.x+90)/120;                       // llega al borde izquierdo en 2 s
}
function salirBonus(){
  G.escena='alola';G.mew=null;G.pista=null;
  G.capturasBonus=0;                 // hay que capturar otros 3 para volver
  newBall(true);
  say('De vuelta a Alola',150);
}
function golpeTanque(x,y){
  const m=G.mew;if(m.cdT>0||m.fase!=='tanque')return;m.cdT=14;
  m.golpesT++;shake=Math.max(shake,6);
  score(5000,x,y-18);addFx(x,y,10,'#bfefff',4.5);
  beep(940-m.golpesT*46,.07,'square',.05);
  // cada golpe deja una grieta nueva, que se abre hacia dentro del cristal
  const px=clamp(x,TANQUE.x-TANQUE.w/2+6,TANQUE.x+TANQUE.w/2-6);
  const py=clamp(y,TANQUE.y-TANQUE.h/2+6,TANQUE.y+TANQUE.h/2-6);
  const gr=[[px,py]];let ang=Math.atan2(TANQUE.y-py,TANQUE.x-px)+(Math.random()-.5)*1.1;
  for(let k=0;k<4;k++){ang+=(Math.random()-.5)*1.3;
    gr.push([gr[k][0]+Math.cos(ang)*(8+Math.random()*13),gr[k][1]+Math.sin(ang)*(8+Math.random()*13)]);}
  m.grietas.push(gr);
  if(m.golpesT>=10){
    m.fase='rompe';m.t=0;m.roto=true;m.x=TANQUE.x;m.y=TANQUE.y;shake=Math.max(shake,16);
    say('¡El tanque revienta! Mew despierta',200);
    chime([784,988,1319,1568],80);
    for(let k=0;k<26;k++)m.trozos.push({
      x:TANQUE.x+(Math.random()-.5)*TANQUE.w,y:TANQUE.y+(Math.random()-.5)*TANQUE.h,
      vx:(Math.random()-.5)*9,vy:-2-Math.random()*7,rot:Math.random()*7,vr:(Math.random()-.5)*.35,
      w:5+Math.random()*13,h:5+Math.random()*13});
    for(let k=0;k<40;k++)addFx(TANQUE.x+(Math.random()-.5)*TANQUE.w,TANQUE.y+(Math.random()-.5)*TANQUE.h,1,k%2?'#bfefff':'#6fd0ff',7);
  } else say('¡El cristal aguanta!',70);
}
function golpeMew(){
  const m=G.mew;if(m.cdM>0||m.fase!=='vuela')return;m.cdM=18;
  m.golpesM++;m.flash=14;shake=Math.max(shake,7);
  score(15000,m.x,m.y-30);addFx(m.x,m.y,14,'#ff9ede',4.5);
  beep(1180,.08,'triangle',.05);
  if(m.golpesM>=10){
    if(G.mewHuido&&!G.mewCapturado){
      // ya se escapó una vez: ahora sí se deja capturar
      m.fase='captura';m.t=0;
      G.capAnim={t:0,mew:true,x:m.x,y:m.y};
      ball.state='held';ball.vx=0;ball.vy=0;
      say('¡Mew está agotado! ¡Pokéball, ve!',200);beep(980,.1,'square',.05);
    } else {
      say('¡Mew huye del laboratorio!',220);chime([1319,1047,784,523],80);
      G.mewHuido=true;mewHuye(1000000);
    }
  } else say('¡Tocado!',70);
}
function physicsMew(){
  const m=G.mew,f=1/SUB;
  for(let s=0;s<SUB;s++){
    [F.L,F.R].forEach(fl=>{const tgt=fl.press?fl.up:fl.rest,prev=fl.a;
      fl.a+=clamp(tgt-fl.a,-0.5*SPD/SUB,0.5*SPD/SUB);fl.w=(fl.a-prev)*SUB;});
    if(m.congelado>0){ball.vx=0;ball.vy=0;continue;}   // ataque psíquico: la bola no se mueve
    ball.vy+=GRAV*f;
    ball.x+=ball.vx*f;ball.y+=ball.vy*f;
    for(const ch of MEW_CH)
      for(let i=0;i<ch.length-1;i++)collide(ch[i][0],ch[i][1],ch[i+1][0],ch[i+1][1],7,0.42,0,null);
    for(const sl of MEW_SLINGS)
      collide(sl.a[0],sl.a[1],sl.b[0],sl.b[1],9,0.35,12.4*SPD,(x,y)=>{score(120);addFx(x,y,6,'#ffd27a',3);beep(520,.05,'square',.04);shake=Math.max(shake,3);});
    if(m.fase==='tanque')
      for(let i=0;i<TANQUE_CH.length-1;i++)
        collide(TANQUE_CH[i][0],TANQUE_CH[i][1],TANQUE_CH[i+1][0],TANQUE_CH[i+1][1],7,0.55,3.4*SPD,(x,y)=>golpeTanque(x,y));
    else if(m.fase==='vuela')
      collide(m.x,m.y,m.x,m.y,MEW_RAD,0.5,7*SPD,()=>golpeMew());
    flipperHit(F.L);flipperHit(F.R);
    const sp=Math.hypot(ball.vx,ball.vy);
    if(sp>MAXV){ball.vx*=MAXV/sp;ball.vy*=MAXV/sp;}
    ball.vx*=0.99985;ball.vy*=0.99985;
  }
  ball.rot+=ball.vx*0.11;
}
function updateMew(){
  const m=G.mew;m.t++;
  if(m.cdT>0)m.cdT--;if(m.cdM>0)m.cdM--;if(m.flash>0)m.flash--;
  if(m.congelado>0)m.congelado--;
  m.trozos.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.34;p.vx*=0.99;p.rot+=p.vr;});
  // 90 s en total para las dos fases
  if(m.fase==='tanque'||m.fase==='rompe'||m.fase==='vuela'){
    if(--m.tiempo<=0){
      say('Se acabó el tiempo · bonus fallido',200);beep(200,.4,'sawtooth',.05);
      m.premio=0;m.fase='fallo';m.t=0;shake=Math.max(shake,8);
    }
  }
  if(m.fase==='entra'){if(m.t>50){m.fase='tanque';m.t=0;sirveMew();}return;}
  if(m.fase==='rompe'){
    if(m.t%5===0)addFx(TANQUE.x+(Math.random()-.5)*TANQUE.w,TANQUE.y+(Math.random()-.5)*TANQUE.h,2,'#a8e8ff',5);
    // Mew emerge del tanque mientras salta el cristal
    m.y-=0.42;m.x+=Math.sin(m.t/13)*0.7;
    if(m.t>70){m.fase='vuela';m.t=0;
      m.rumbo=-1.2;m.rumboObj=-1.2;m.rumboT=0;m.ataqueCd=600;
      say('¡Mew despierta! Golpéalo 10 veces',220);}
  }
  if(m.fase==='vuela'||(m.fase==='fallo'&&m.roto)){
    // vuelo errático, pero con giros suaves para poder anticiparlo
    if(--m.rumboT<=0){m.rumboT=45+Math.random()*70;m.rumboObj=Math.random()*Math.PI*2;}
    if(m.x<74||m.x>406||m.y<MEW_TECHO+56||m.y>556)m.rumboObj=Math.atan2(370-m.y,240-m.x);
    let d=m.rumboObj-m.rumbo;while(d>Math.PI)d-=6.283185;while(d<-Math.PI)d+=6.283185;
    m.rumbo+=clamp(d,-0.03,0.03);
    m.x=clamp(m.x+Math.cos(m.rumbo)*2.5,66,414);
    m.y=clamp(m.y+Math.sin(m.rumbo)*2.5,MEW_TECHO+58,578);
    // ataque psíquico cada 10 s (durante el cartel de fallo Mew ya no ataca)
    if(m.fase==='fallo'){}
    else if(m.ataque>0){
      m.ataque--;
      if(m.ataque===34){
        if(ball.state==='play'&&Math.hypot(ball.x-m.x,ball.y-m.y)<200){
          m.congelado=180;ball.vx=0;ball.vy=0;
          say('¡Ataque psíquico! Bola congelada 3 s',170);
          beep(130,.5,'sine',.06);shake=Math.max(shake,9);
          addFx(ball.x,ball.y,18,'#ff9ede',4);
        } else say('El ataque psíquico no te alcanza',110);
      }
    } else if(--m.ataqueCd<=0){
      m.ataque=72;m.ataqueCd=600;
      say('¡Mew carga un ataque psíquico!',110);beep(280,.35,'sine',.05);
    }
  }
  if(m.fase==='huye'){
    m.x-=m.vhuida;m.y+=Math.sin(m.t/9)*1.4;
    if(m.t%6===0)addFx(m.x+20,m.y,1,'#ff9ede',2);
    if(m.t>=120){m.fase='letrero';m.t=0;G.score+=m.premio;updateHUD();
      chime([523,659,784,1046,1319],90);shake=Math.max(shake,12);
      addFx(240,380,40,'#ffd27a',7);}
    return;
  }
  if(m.fase==='captura'){
    const a=G.capAnim;a.t++;
    if(a.t===30)beep(620,.16,'sine',.05);
    if(a.t===52)beep(430,.22,'sine',.05);
    if(a.t>=50&&a.t%4===0){const u=(a.t-50)/30;
      addFx(a.x+(ball.x-a.x)*u,a.y+(ball.y-a.y)*u,2,'#ff8a6b',2);}
    if(a.t>=82){
      G.capAnim=null;G.mewCapturado=true;
      G.dex.add('mew');G.order.push('mew');
      m.premio=5000000;m.fase='letrero';m.t=0;
      G.score+=m.premio;updateHUD();
      say('¡Mew capturado!',220);chime([523,659,784,1046,1319],90);
      shake=Math.max(shake,14);addFx(240,380,44,'#ffd27a',7);
    }
    return;
  }
  if(m.fase==='letrero'||m.fase==='fallo'){if(m.t>170)salirBonus();return;}
  // bola
  if(ball.state==='play'){
    physicsMew();
    if(m.congelado<=0){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();}
    const spd=Math.hypot(ball.vx,ball.vy);
    if(m.congelado<=0&&spd<0.7*SPD){if(++ball.idle>150){ball.vx+=(Math.random()-.5)*6*SPD;ball.vy-=3*SPD;ball.idle=0;shake=Math.max(shake,5);}}
    else ball.idle=0;
    if(ball.y>745){ball.state='held';ball.y=820;m.sirve=120;
      say('Bola perdida · vuelve en 2 s',130);beep(220,.25,'sawtooth',.05);}
  } else if(m.sirve>0&&--m.sirve<=0)sirveMew();
}

/* ============================================================
   BONUS · CARRERA EN LA PISTA DE ATLETISMO
   Cinco carriles horizontales; scorbunny cruza de derecha a
   izquierda a velocidad media y pikachu de izquierda a derecha
   más rápido. 60 s para derribar a ocho corredores.
   ============================================================ */
const PISTA_R=224, PISTA_CY=437, PISTA_TECHO=PISTA_CY-PISTA_R;
const PISTA_CH=[];
(function(){
  const techo=[];
  for(let a=180;a>=0;a-=5)techo.push([240+PISTA_R*Math.cos(a*RAD),PISTA_CY-PISTA_R*Math.sin(a*RAD)]);
  PISTA_CH.push(techo);
  PISTA_CH.push([[16,PISTA_CY],[16,588],[86,650],[168,694]]);
  PISTA_CH.push([[464,PISTA_CY],[464,588],[394,650],[312,694]]);
})();
const PISTA_SLINGS=[{a:[64,566],b:[118,616]},{a:[384,574],b:[346,620]}];
// los cinco carriles van en la mitad ancha de la mesa, para que se cruce
// de lado a lado sin que la cúpula recorte la carrera
const CARRILES=[296,348,400,452,504];          // altura de los cinco carriles
const LINEAS=[270,322,374,426,478,530];        // separaciones entre carriles
const PISTA_RAD=30, PISTA_ALTO=25;
const META_GOLPES=8, PISTA_PREMIO=500000, PISTA_SPAWN=300;   // uno cada 5 s
const CORREDORES={
  scorbunny:{n:'Scorbunny',gif:'scorbunny-corriendo',v:-2.2*SPD,c:'#fff1e4',c2:'#f0703a'},
  pikachu:{n:'Pikachu',gif:'pikachu-corriendo',v:3.8*SPD,c:'#ffe14d',c2:'#e08a1e'}
};
function pistaNuevo(){return{fase:'entra',t:0,tiempo:60*60,golpes:0,premio:0,
  sirve:0,cdSpawn:0,corredores:[]};}

function entrarPista(){
  G.escena='pista';G.pista=pistaNuevo();G.mew=null;G.hoyo=0;G.hoyoRetardo=0;
  G.mode=null;G.wild=null;G.capAnim=null;G.em.fase=null;G.em.cd=0;
  G.fen={boton:false,llama:0,cd:0};G.star={boton:false,giro:0,cd:0};G.fenGhost=0;
  ball.state='held';ball.y=820;ball.trail.length=0;fx.length=0;
  say('Pista de atletismo · derriba a 8 corredores',240);
  chime([523,659,784,1046],80);shake=Math.max(shake,10);
}
function sirvePista(){
  ball.x=438;ball.y=548;ball.vx=-1.2;ball.vy=-19.5*SPD;
  ball.state='play';ball.trail.length=0;ball.idle=0;
  beep(360,.12,'square',.05);
}
function spawnCorredor(){
  const m=G.pista;
  const tipo=Math.random()<0.5?'scorbunny':'pikachu';
  const d=CORREDORES[tipo];
  const c=Math.floor(Math.random()*CARRILES.length);   // carril al azar
  m.corredores.push({tipo,carril:c,y:CARRILES[c],x:d.v>0?-46:526,v:d.v,ko:0,t:0});
  beep(tipo==='pikachu'?880:620,.07,'square',.035);
}
function golpeCorredor(r){
  const m=G.pista;if(r.ko||m.fase!=='corre')return;
  const d=CORREDORES[r.tipo];
  r.ko=1;m.golpes++;shake=Math.max(shake,7);
  score(20000,r.x,r.y-26);addFx(r.x,r.y,16,d.c2,5);
  beep(1040,.08,'triangle',.05);
  if(m.golpes>=META_GOLPES){
    m.premio=PISTA_PREMIO;m.fase='letrero';m.t=0;
    G.score+=m.premio;updateHUD();
    say('¡Ocho derribos! Carrera ganada',220);
    chime([523,659,784,1046,1319],90);shake=Math.max(shake,14);
    addFx(240,380,44,'#ffd27a',7);
  } else say('¡'+d.n+' fuera! '+m.golpes+'/'+META_GOLPES,80);
}
function physicsPista(){
  const m=G.pista,f=1/SUB;
  for(let s=0;s<SUB;s++){
    [F.L,F.R].forEach(fl=>{const tgt=fl.press?fl.up:fl.rest,prev=fl.a;
      fl.a+=clamp(tgt-fl.a,-0.5*SPD/SUB,0.5*SPD/SUB);fl.w=(fl.a-prev)*SUB;});
    ball.vy+=GRAV*f;
    ball.x+=ball.vx*f;ball.y+=ball.vy*f;
    for(const ch of PISTA_CH)
      for(let i=0;i<ch.length-1;i++)collide(ch[i][0],ch[i][1],ch[i+1][0],ch[i+1][1],7,0.42,0,null);
    for(const sl of PISTA_SLINGS)
      collide(sl.a[0],sl.a[1],sl.b[0],sl.b[1],9,0.35,12.4*SPD,(x,y)=>{score(120);addFx(x,y,6,'#ffd27a',3);beep(520,.05,'square',.04);shake=Math.max(shake,3);});
    if(m.fase==='corre')
      for(const r of m.corredores){
        if(r.ko)continue;
        collide(r.x,r.y,r.x,r.y,PISTA_RAD,0.5,7*SPD,()=>golpeCorredor(r));
      }
    flipperHit(F.L);flipperHit(F.R);
    const sp=Math.hypot(ball.vx,ball.vy);
    if(sp>MAXV){ball.vx*=MAXV/sp;ball.vy*=MAXV/sp;}
    ball.vx*=0.99985;ball.vy*=0.99985;
  }
  ball.rot+=ball.vx*0.11;
}
function updatePista(){
  const m=G.pista;m.t++;
  // 60 s para los ocho derribos
  if(m.fase==='corre'&&--m.tiempo<=0){
    say('Se acabó el tiempo · bonus fallido',200);beep(200,.4,'sawtooth',.05);
    m.premio=0;m.fase='fallo';m.t=0;shake=Math.max(shake,8);
  }
  // los corredores siguen cruzando incluso durante el letrero final
  for(let i=m.corredores.length-1;i>=0;i--){
    const r=m.corredores[i];r.t++;
    if(r.ko){
      r.ko++;r.y+=1.6;r.x+=r.v*0.22;
      if(r.ko>44){m.corredores.splice(i,1);continue;}
    } else {
      r.x+=r.v;
      if(r.t%9===0)addFx(r.x-(r.v>0?18:-18),r.y+15,1,'#e9c9a8',1.6);
      if(r.x<-70||r.x>550){m.corredores.splice(i,1);continue;}
    }
  }
  if(m.fase==='entra'){
    if(m.t>50){m.fase='corre';m.t=0;m.cdSpawn=45;sirvePista();
      say('¡Golpea a 8 corredores antes de que acabe el tiempo!',210);}
    return;
  }
  if(m.fase==='letrero'||m.fase==='fallo'){if(m.t>170)salirBonus();return;}
  if(--m.cdSpawn<=0){m.cdSpawn=PISTA_SPAWN;spawnCorredor();}
  // bola
  if(ball.state==='play'){
    physicsPista();
    ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();
    const spd=Math.hypot(ball.vx,ball.vy);
    if(spd<0.7*SPD){if(++ball.idle>150){ball.vx+=(Math.random()-.5)*6*SPD;ball.vy-=3*SPD;ball.idle=0;shake=Math.max(shake,5);}}
    else ball.idle=0;
    if(ball.y>745){ball.state='held';ball.y=820;m.sirve=120;
      say('Bola perdida · vuelve en 2 s',130);beep(220,.25,'sawtooth',.05);}
  } else if(m.sirve>0&&--m.sirve<=0)sirvePista();
}

/* ---------------- dibujo de la pista ---------------- */
const GRADA=(function(){
  const cols=['#ffd27a','#7fe8d8','#ff8a6b','#8f7bff','#e8fbff','#f2c530','#5fb8e8'],a=[];
  for(let i=0;i<96;i++)a.push(cols[(i*5+((i*i)%7))%cols.length]);
  return a;
})();
function fondoPista(t){
  const gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#08192c');gr.addColorStop(.42,'#0b2438');gr.addColorStop(1,'#040f1a');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.save();
  // gradas del estadio con el público haciendo la ola
  g.fillStyle='#0d2334';g.fillRect(0,0,W,118);
  g.fillStyle='#14324a';
  for(let k=0;k<4;k++)g.fillRect(0,92-k*23,W,7);
  for(let i=0;i<96;i++){
    const fila=i%3, col=(i-fila)/3;
    const x=9+col*15, y=32+fila*23+Math.sin(t/20+col*0.42+fila*0.8)*2.6;
    g.globalAlpha=.42+0.28*Math.sin(t/15+i*1.3);
    g.fillStyle=GRADA[i];
    g.beginPath();g.arc(x,y,3.1,0,7);g.fill();
  }
  g.globalAlpha=1;
  // torres de focos
  [46,434].forEach((x,i)=>{
    g.strokeStyle='#1b3446';g.lineWidth=6;
    g.beginPath();g.moveTo(x,124);g.lineTo(x,46);g.stroke();
    g.fillStyle='#20415a';roundRectPath(g,x-27,20,54,27,4);g.fill();
    g.strokeStyle='#31627f';g.lineWidth=1.5;roundRectPath(g,x-27,20,54,27,4);g.stroke();
    for(let a=0;a<3;a++)for(let b=0;b<2;b++){
      const pul=0.7+0.3*Math.sin(t/12+a*1.1+b*2+i);
      g.fillStyle='rgba(255,250,222,'+pul+')';
      g.beginPath();g.arc(x-16+a*16,28+b*12,4.4,0,7);g.fill();
    }
    const cono=g.createLinearGradient(x,48,x,560);
    cono.addColorStop(0,'rgba(255,248,214,.13)');
    cono.addColorStop(1,'rgba(255,248,214,0)');
    g.fillStyle=cono;g.beginPath();
    g.moveTo(x-22,48);g.lineTo(x+22,48);g.lineTo(x+160,560);g.lineTo(x-160,560);
    g.closePath();g.fill();
  });
  g.restore();
}
function perimetroPista(paso){
  const per=[];
  for(let a=180;a>=0;a-=(paso||6))per.push([240+PISTA_R*Math.cos(a*RAD),PISTA_CY-PISTA_R*Math.sin(a*RAD)]);
  per.push([464,588],[394,650],[312,694],[240,760],[168,694],[86,650],[16,588]);
  return per;
}
function tableroPista(t){
  g.save();
  pathChain(perimetroPista(6));g.closePath();
  const fill=g.createLinearGradient(0,PY(PISTA_TECHO),0,PY(760));
  fill.addColorStop(0,'#8d3524');fill.addColorStop(.5,'#a8412a');fill.addColorStop(1,'#6b2617');
  g.fillStyle=fill;g.fill();
  g.save();g.clip();
  const banda=(y1,y2)=>{g.beginPath();
    g.moveTo(PX(0,y1),PY(y1));g.lineTo(PX(480,y1),PY(y1));
    g.lineTo(PX(480,y2),PY(y2));g.lineTo(PX(0,y2),PY(y2));g.closePath();};
  // los cinco carriles, alternando el tono del tartán
  for(let i=0;i<5;i++){
    g.fillStyle=i%2?'rgba(255,140,95,.11)':'rgba(24,9,6,.13)';
    banda(LINEAS[i],LINEAS[i+1]);g.fill();
  }
  // líneas blancas de separación
  LINEAS.forEach((y,i)=>{
    g.strokeStyle=(i===0||i===5)?'rgba(255,255,255,.85)':'rgba(255,255,255,.6)';
    g.lineWidth=(i===0||i===5)?4:2.4;
    g.beginPath();g.moveTo(PX(0,y),PY(y));g.lineTo(PX(480,y),PY(y));g.stroke();
  });
  // damero de salida y meta en los dos extremos
  for(let i=0;i<5;i++)for(let k=0;k<4;k++){
    const y1=LINEAS[i]+(LINEAS[i+1]-LINEAS[i])*k/4;
    const y2=LINEAS[i]+(LINEAS[i+1]-LINEAS[i])*(k+1)/4;
    g.fillStyle=(i+k)%2?'rgba(244,239,226,.9)':'rgba(30,17,13,.85)';
    [[0,34],[446,480]].forEach(rg=>{
      g.beginPath();
      g.moveTo(PX(rg[0],y1),PY(y1));g.lineTo(PX(rg[1],y1),PY(y1));
      g.lineTo(PX(rg[1],y2),PY(y2));g.lineTo(PX(rg[0],y2),PY(y2));
      g.closePath();g.fill();
    });
  }
  // número de carril en los dos lados, dentro de la cúpula
  g.textAlign='center';g.fillStyle='rgba(255,255,255,.28)';
  for(let i=0;i<5;i++){
    const y=CARRILES[i];
    g.font='800 '+Math.round(20*PS(y))+'px system-ui';
    g.fillText(String(i+1),PX(108,y),PY(y)+7);
    g.fillText(String(i+1),PX(372,y),PY(y)+7);
  }
  // césped del interior del estadio, sobre el primer carril
  const cesped=g.createLinearGradient(0,PY(PISTA_TECHO),0,PY(LINEAS[0]));
  cesped.addColorStop(0,'#1d4f30');cesped.addColorStop(1,'#2a6b3d');
  g.fillStyle=cesped;banda(PISTA_TECHO-16,LINEAS[0]);g.fill();
  g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=8;
  for(let x=40;x<480;x+=44){g.beginPath();
    g.moveTo(PX(x,PISTA_TECHO),PY(PISTA_TECHO));g.lineTo(PX(x,LINEAS[0]),PY(LINEAS[0]));g.stroke();}
  g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=3;
  g.beginPath();g.moveTo(PX(0,LINEAS[0]),PY(LINEAS[0]));g.lineTo(PX(480,LINEAS[0]),PY(LINEAS[0]));g.stroke();
  // zona neutra de abajo, con marcas de tartán
  g.strokeStyle='rgba(255,255,255,.10)';g.lineWidth=2;
  for(let y=566;y<764;y+=34){g.beginPath();g.moveTo(PX(0,y),PY(y));g.lineTo(PX(480,y),PY(y));g.stroke();}
  g.globalAlpha=.4;g.fillStyle='rgba(255,220,160,.07)';
  g.beginPath();g.ellipse(PX(240,630),PY(630),150*PS(630),64*PS(630),0,0,7);g.fill();
  g.globalAlpha=1;
  g.restore();g.restore();
}
/* corredores dibujados a mano: valen mientras no haya gif cargado */
function corredorPropio(ctx,cx,cy,s,tipo,t){
  const izq=CORREDORES[tipo].v<0, ph=Math.sin(t/3.2);
  ctx.save();ctx.translate(cx,cy);ctx.scale(izq?-s:s,s);
  ctx.lineJoin='round';ctx.lineCap='round';
  const pika=tipo==='pikachu';
  const cuerpo=pika?'#ffe14d':'#fff4ea', osc=pika?'#e0a51c':'#f0703a';
  // cola
  ctx.fillStyle=pika?'#f0c02c':'#f0703a';
  if(pika){ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(-19,-2);ctx.lineTo(-13,-6);
    ctx.lineTo(-21,-14);ctx.lineTo(-11,-11);ctx.lineTo(-7,-2);ctx.closePath();ctx.fill();}
  else{ctx.beginPath();ctx.ellipse(-11,3,5,4.5,0,0,7);ctx.fill();}
  // piernas en zancada
  ctx.strokeStyle=osc;ctx.lineWidth=3.4;
  ctx.beginPath();ctx.moveTo(-1,9);ctx.lineTo(-5+ph*5,16);ctx.stroke();
  ctx.beginPath();ctx.moveTo(2,9);ctx.lineTo(7-ph*5,16);ctx.stroke();
  // cuerpo
  ctx.fillStyle=cuerpo;ctx.beginPath();ctx.ellipse(0,3,9,9.5,0,0,7);ctx.fill();
  // cabeza
  ctx.beginPath();ctx.ellipse(3,-8,9.5,8.5,0,0,7);ctx.fill();
  // orejas
  if(pika){
    ctx.fillStyle=cuerpo;
    ctx.beginPath();ctx.moveTo(-1,-13);ctx.lineTo(-6,-25);ctx.lineTo(2,-15);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(6,-14);ctx.lineTo(4,-26);ctx.lineTo(10,-15);ctx.closePath();ctx.fill();
    ctx.fillStyle='#3a2a18';
    ctx.beginPath();ctx.moveTo(-4,-21);ctx.lineTo(-6,-25);ctx.lineTo(-2,-22);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(4.6,-22);ctx.lineTo(4,-26);ctx.lineTo(7.5,-22.5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e8453a';ctx.beginPath();ctx.arc(8.5,-5,2.6,0,7);ctx.fill();
  } else {
    ctx.fillStyle=cuerpo;
    ctx.beginPath();ctx.ellipse(0,-19,3,8,-0.2,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(6,-19,3,8,0.2,0,7);ctx.fill();
    ctx.fillStyle=osc;
    ctx.beginPath();ctx.ellipse(0,-21,1.6,5,-0.2,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(6,-21,1.6,5,0.2,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(9,-6.5,2.2,1.8,0,0,7);ctx.fill();
  }
  // brazos bombeando
  ctx.strokeStyle=cuerpo;ctx.lineWidth=3.2;
  ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(6+ph*4,4-ph*3);ctx.stroke();
  // ojo
  ojo(ctx,6.5,-9,1.9);
  ctx.restore();
}
function dCorredores(t){
  const m=G.pista;if(!m)return;
  g.save();
  pathChain(perimetroPista(8));g.closePath();g.clip();   // nadie se sale de la pista
  m.corredores.forEach(r=>{
    const d=CORREDORES[r.tipo],s=PS(r.y),X=PX(r.x,r.y),Y=PY(r.y);
    g.save();
    g.globalAlpha=r.ko?Math.max(0,1-r.ko/44):1;
    if(r.ko){g.translate(X,Y);g.rotate(r.ko*0.085);g.translate(-X,-Y);}
    g.fillStyle='rgba(0,0,0,.3)';
    g.beginPath();g.ellipse(X,Y+PISTA_ALTO*s*1.1,PISTA_RAD*s*0.78,PISTA_RAD*s*0.28,0,0,7);g.fill();
    if(!gifCentrado(d.gif,r.x,r.y,PISTA_ALTO))
      corredorPropio(g,X,Y,s*1.4,r.tipo,t+r.t*3);
    g.restore();
  });
  g.globalAlpha=1;g.restore();
}
function dibujaPista(t){
  fondoPista(t);
  g.drawImage(capaMesa(),0,0);
  dCorredores(t);
}
function hudPista(t){
  const m=G.pista;
  g.save();g.textAlign='center';
  if(m.fase==='letrero'||m.fase==='fallo'){
    dLetreroBonus(m,t,'PUNTOS','Los corredores se te han escapado');g.restore();return;}
  g.fillStyle='rgba(6,18,28,.74)';roundRectPath(g,108,12,264,54,12);g.fill();
  g.strokeStyle='rgba(255,210,122,.4)';g.lineWidth=1.5;
  roundRectPath(g,108,12,264,54,12);g.stroke();
  g.fillStyle='#ffd27a';g.font='700 11px system-ui';
  g.fillText('ESTADIO DE ALOLA · CARRERA BONUS',240,28);
  const seg=Math.max(0,Math.ceil(m.tiempo/60));
  g.fillStyle=seg<=10?'#ff8a6b':'#eaffff';g.font='800 16px system-ui';
  g.textAlign='left';g.fillText(seg+' s',120,49);
  // ocho marcas de derribo
  for(let i=0;i<META_GOLPES;i++){
    const x=186+i*22.5;
    g.beginPath();g.arc(x,44,6.2,0,7);
    g.fillStyle=i<m.golpes?'#ffd27a':'rgba(255,255,255,.15)';g.fill();
    g.strokeStyle=i<m.golpes?'rgba(255,244,210,.95)':'rgba(255,255,255,.22)';
    g.lineWidth=1.3;g.stroke();
  }
  g.fillStyle='rgba(255,255,255,.14)';g.fillRect(114,60,252,3);
  g.fillStyle=seg<=10?'#ff8a6b':'#ffd27a';g.fillRect(114,60,252*clamp(m.tiempo/(60*60),0,1),3);
  g.restore();
}

/* ---------------- dibujo del bonus ---------------- */
/* alza: altura de vuelo sobre el suelo (el sprite sube, la posición de mundo no) */
function gifCentrado(k,x,y,alto,esp,alza){
  const rep=GIFS[k],im=(!rep&&spriteListo(k))?SPRITE_CACHE[k]:null;
  if(!rep&&!im)return false;
  const W0=rep?rep.W:im.naturalWidth,H0=rep?rep.H:im.naturalHeight;
  const s=PS(y),h=alto*s*ESCALA_SPRITE*2,w=h*W0/H0;
  g.save();g.imageSmoothingEnabled=false;
  if(esp)g.globalAlpha=esp;
  g.drawImage(rep?rep.lienzo():im,PX(x,y)-w/2,PY(y)-(alza||0)*s-h/2,w,h);
  g.restore();return true;
}
/* Mew dibujado a mano: sirve mientras no haya gif cargado */
function mewPropio(ctx,cx,cy,s,pose,t){
  ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.lineJoin='round';ctx.lineCap='round';
  const cuerpo='#f6b8d8',oscuro='#e08bb8';
  // cola larga y ondulante
  ctx.strokeStyle=cuerpo;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(6,10);
  ctx.quadraticCurveTo(26+Math.sin(t/14)*6,16,30+Math.sin(t/11)*8,-6+Math.cos(t/13)*6);
  ctx.stroke();
  ctx.fillStyle=cuerpo;ctx.beginPath();ctx.ellipse(31+Math.sin(t/11)*8,-8+Math.cos(t/13)*6,4.5,5.5,0,0,7);ctx.fill();
  // patas
  ctx.fillStyle=oscuro;
  ctx.beginPath();ctx.ellipse(-6,14,4,6,.3,0,7);ctx.fill();
  ctx.beginPath();ctx.ellipse(6,14,4,6,-.3,0,7);ctx.fill();
  // cuerpo
  ctx.fillStyle=cuerpo;ctx.beginPath();ctx.ellipse(0,6,11,12,0,0,7);ctx.fill();
  // cabeza
  ctx.beginPath();ctx.ellipse(0,-8,13,11.5,0,0,7);ctx.fill();
  // orejas
  ctx.beginPath();ctx.moveTo(-9,-15);ctx.lineTo(-13,-22);ctx.lineTo(-4,-17);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(9,-15);ctx.lineTo(13,-22);ctx.lineTo(4,-17);ctx.closePath();ctx.fill();
  // brazos
  ctx.strokeStyle=cuerpo;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-8,2);ctx.lineTo(-13,pose==='ataque'?-4:6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(8,2);ctx.lineTo(13,pose==='ataque'?-4:6);ctx.stroke();
  // cara
  if(pose==='duerme'){
    ctx.strokeStyle='#5b3448';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.arc(-4.5,-8,2.4,0.15,Math.PI-0.15);ctx.stroke();
    ctx.beginPath();ctx.arc(4.5,-8,2.4,0.15,Math.PI-0.15);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='700 9px system-ui';ctx.fillText('z',13,-19);
  } else {
    ojo(g,-4.5,-8.5,2.4);ojo(g,4.5,-8.5,2.4);
    ctx.strokeStyle='#5b3448';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(0,-4,2.6,0.2,Math.PI-0.2);ctx.stroke();
  }
  ctx.fillStyle='rgba(255,160,205,.5)';
  ctx.beginPath();ctx.arc(-8,-5,2.6,0,7);ctx.arc(8,-5,2.6,0,7);ctx.fill();
  ctx.restore();
}
/* halo psíquico rosa: el mismo en Mew y en la bola afectada */
function haloPsiquico(X,Y,r,t,fuerza){
  g.save();
  const gl=g.createRadialGradient(X,Y,r*0.15,X,Y,r);
  gl.addColorStop(0,'rgba(255,180,235,'+(0.42*fuerza)+')');
  gl.addColorStop(.55,'rgba(232,120,220,'+(0.26*fuerza)+')');
  gl.addColorStop(1,'rgba(190,80,200,0)');
  g.fillStyle=gl;g.beginPath();g.arc(X,Y,r,0,7);g.fill();
  g.lineWidth=2.2;
  for(let k=0;k<3;k++){
    const ph=fr(t/58+k/3), rr=r*(0.32+ph*0.72);
    g.strokeStyle='rgba(255,170,232,'+((1-ph)*0.55*fuerza)+')';
    g.beginPath();g.ellipse(X,Y,rr,rr*0.92,0,0,7);g.stroke();
  }
  g.strokeStyle='rgba(255,225,250,'+(0.5*fuerza)+')';g.lineWidth=1.4;
  for(let k=0;k<7;k++){
    const a=t/40+k*0.897, rr=r*(0.55+0.3*Math.sin(t/17+k));
    g.beginPath();g.arc(X+Math.cos(a)*rr,Y+Math.sin(a)*rr*0.9,1.8,0,7);g.stroke();
  }
  g.restore();
}
function fondoLab(t){
  const gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#0a1622');gr.addColorStop(.55,'#0c1c2b');gr.addColorStop(1,'#060c14');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.save();
  g.strokeStyle='rgba(90,180,220,.09)';g.lineWidth=1;
  for(let x=0;x<=W;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}
  for(let y=0;y<=H;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
  // tuberías laterales
  [26,454].forEach((x,i)=>{
    g.strokeStyle='#1b3446';g.lineWidth=13;
    g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();
    g.strokeStyle='rgba(140,220,255,.16)';g.lineWidth=3;
    g.beginPath();g.moveTo(x-3,0);g.lineTo(x-3,H);g.stroke();
    for(let y=60;y<H;y+=120){g.fillStyle='#25455c';g.fillRect(x-11,y,22,10);}
    // burbuja de fluido que sube por la tubería
    const ph=fr(t/240+i*0.5);
    g.fillStyle='rgba(160,240,255,.35)';
    g.beginPath();g.arc(x-3,H-ph*H,3.4,0,7);g.fill();
  });
  // monitores del laboratorio
  [[62,70],[418,70]].forEach((p,i)=>{
    g.fillStyle='#0e2534';g.strokeStyle='#2d5c78';g.lineWidth=2;
    roundRectPath(g,p[0]-30,p[1]-22,60,44,5);g.fill();g.stroke();
    g.save();roundRectPath(g,p[0]-27,p[1]-19,54,38,4);g.clip();
    g.strokeStyle='rgba(120,240,220,.5)';g.lineWidth=1.4;
    g.beginPath();
    for(let x=0;x<=54;x+=3){
      const y=p[1]-2+Math.sin((x+t*(1.7+i))/7)*Math.sin((x+t)/23)*11;
      g.lineTo(p[0]-27+x,y);}
    g.stroke();
    g.fillStyle='rgba(120,240,220,.16)';
    for(let k=0;k<4;k++)g.fillRect(p[0]-24,p[1]-16+k*3,18+((k*7+Math.floor(t/40))%16),1.6);
    g.restore();
  });
  // luz de alarma cuando Mew ya está suelto
  if(G.mew&&(G.mew.fase==='vuela'||G.mew.fase==='huye')){
    const pul=0.12+0.1*Math.sin(t/9);
    g.fillStyle='rgba(255,60,90,'+pul+')';g.fillRect(0,0,W,H);
  }
  g.restore();
}
function tableroMew(t){
  const per=[];
  for(let a=180;a>=0;a-=6)per.push([240+MEW_R*Math.cos(a*RAD),MEW_CY-MEW_R*Math.sin(a*RAD)]);
  per.push([464,588],[394,650],[312,694],[240,760],[168,694],[86,650],[16,588]);
  g.save();
  pathChain(per);g.closePath();
  const fill=g.createLinearGradient(0,PY(MEW_TECHO),0,PY(760));
  fill.addColorStop(0,'#17323f');fill.addColorStop(.55,'#122a3a');fill.addColorStop(1,'#0d1f2c');
  g.fillStyle=fill;g.fill();
  g.save();g.clip();
  // chapa: juntas horizontales y verticales
  g.strokeStyle='rgba(150,210,240,.07)';g.lineWidth=2;
  for(let y=MEW_TECHO;y<780;y+=54){g.beginPath();
    for(let x=0;x<=480;x+=20)g.lineTo(PX(x,y),PY(y));g.stroke();}
  for(let x=48;x<480;x+=64){g.beginPath();
    g.moveTo(PX(x,MEW_TECHO),PY(MEW_TECHO));g.lineTo(PX(x,780),PY(780));g.stroke();}
  // círculo de seguridad bajo el tanque
  g.strokeStyle='rgba(255,190,90,.16)';g.lineWidth=7;g.setLineDash([16,12]);
  g.beginPath();g.ellipse(PX(240,TANQUE.y),PY(TANQUE.y),128*PS(TANQUE.y),104*PS(TANQUE.y),0,0,7);g.stroke();
  g.setLineDash([]);
  g.globalAlpha=.5;g.fillStyle='rgba(120,220,255,.06)';
  g.beginPath();g.ellipse(PX(240,470),PY(470),150*PS(470),90*PS(470),0,0,7);g.fill();
  g.globalAlpha=1;
  g.restore();g.restore();
}
function dTanque(t){
  const m=G.mew,T=TANQUE,s=PS(T.y);
  const X=PX(T.x,T.y),Y=PY(T.y),w=T.w*s,h=T.h*s,r=18*s;
  const roto=m.roto;
  g.save();
  // peana
  const gris=g.createLinearGradient(0,Y-h/2-14,0,Y+h/2+16);
  gris.addColorStop(0,'#e4e9ee');gris.addColorStop(.5,'#c2cbd3');gris.addColorStop(1,'#9aa6b0');
  g.fillStyle=gris;roundRectPath(g,X-w/2-8,Y+h/2-4,w+16,20,6);g.fill();
  g.fillStyle='rgba(0,0,0,.4)';roundRectPath(g,X-w/2+4,Y-h/2+10,w,h,r);g.fill();
  if(!roto){
    // líquido
    g.save();roundRectPath(g,X-w/2,Y-h/2,w,h,r);g.clip();
    const liq=g.createLinearGradient(0,Y-h/2,0,Y+h/2);
    liq.addColorStop(0,'rgba(110,225,240,.55)');liq.addColorStop(1,'rgba(24,110,170,.8)');
    g.fillStyle=liq;g.fillRect(X-w/2,Y-h/2,w,h);
    for(let i=0;i<11;i++){
      const ph=fr(t/150+i/11),bx=X-w/2+8+((i*41)%(w-16)),by=Y+h/2-ph*h;
      g.fillStyle='rgba(225,252,255,'+(0.4*(1-ph))+')';
      g.beginPath();g.arc(bx+Math.sin(ph*7+i)*4,by,1.8+((i*7)%4),0,7);g.fill();
    }
    // mew dormido o despierto según visita
    const mewSprite = G.mewVisitas >= 2 ? 'mew-despierto' : 'mew-durmiendo';
    if(!gifCentrado(mewSprite,T.x,T.y+6,26))
      mewPropio(g,PX(T.x,T.y+6),PY(T.y+6),PS(T.y+6),G.mewVisitas >= 2 ? 'despierto' : 'duerme',t);
    g.restore();
  } else {
    // tanque reventado: líquido derramado y restos del cristal
    g.save();roundRectPath(g,X-w/2,Y+h/2-22,w,22,r*0.4);g.clip();
    g.fillStyle='rgba(24,110,170,.5)';g.fillRect(X-w/2,Y+h/2-22,w,22);g.restore();
  }
  // cristal
  g.strokeStyle=roto?'rgba(150,220,245,.35)':'rgba(190,240,255,.75)';
  g.lineWidth=roto?2:3.5;
  roundRectPath(g,X-w/2,Y-h/2,w,h,r);g.stroke();
  if(!roto){
    const bril=g.createLinearGradient(X-w/2,Y-h/2,X-w/6,Y+h/2);
    bril.addColorStop(0,'rgba(255,255,255,.22)');bril.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=bril;roundRectPath(g,X-w/2,Y-h/2,w,h,r);g.fill();
    // grietas acumuladas, recortadas al cristal para que no salgan del tanque
    g.save();roundRectPath(g,X-w/2,Y-h/2,w,h,r);g.clip();
    g.strokeStyle='rgba(240,255,255,.8)';g.lineWidth=1.5;
    m.grietas.forEach(gr=>{g.beginPath();
      gr.forEach((p,i)=>{const px=PX(p[0],p[1]),py=PY(p[1]);i?g.lineTo(px,py):g.moveTo(px,py);});
      g.stroke();});
    g.restore();
    // tapa y base, en gris claro
    g.fillStyle=gris;
    roundRectPath(g,X-w/2-6,Y-h/2-12,w+12,16,5);g.fill();
    roundRectPath(g,X-w/2-6,Y+h/2-4,w+12,14,5);g.fill();
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.2;
    roundRectPath(g,X-w/2-6,Y-h/2-12,w+12,16,5);g.stroke();
    roundRectPath(g,X-w/2-6,Y+h/2-4,w+12,14,5);g.stroke();
    g.fillStyle='rgba(120,240,220,'+(0.5+Math.sin(t/8)*0.3)+')';
    g.beginPath();g.arc(X+w/2-10,Y-h/2-4,3.2,0,7);g.fill();
  }
  // trozos de cristal volando
  m.trozos.forEach(p=>{
    if(p.y>780)return;
    g.save();g.translate(PX(p.x,p.y),PY(p.y));g.rotate(p.rot);
    g.fillStyle='rgba(190,240,255,.7)';g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1;
    g.beginPath();g.moveTo(-p.w/2,-p.h/2);g.lineTo(p.w/2,-p.h/3);g.lineTo(p.w/3,p.h/2);g.closePath();
    g.fill();g.stroke();g.restore();
  });
  g.restore();
}
function dMewVuela(t){
  const m=G.mew;
  if(!m.roto||(m.fase!=='rompe'&&m.fase!=='vuela'&&m.fase!=='huye'&&m.fase!=='fallo'))return;
  const X=PX(m.x,m.y),Y=PY(m.y),s=PS(m.y);
  // halo del ataque psíquico
  if(m.ataque>0){
    const f=m.ataque>34?(72-m.ataque)/38:m.ataque/34;
    haloPsiquico(X,Y,80*s,t,clamp(f,0,1));
  }
  if(m.flash>0){g.save();g.globalAlpha=0.5;
    g.fillStyle='#fff';g.beginPath();g.arc(X,Y,MEW_RAD*1.25*s,0,7);g.fill();g.restore();}
  const clave=m.fase==='huye'?'mew-huida':(m.ataque>0?'mew-ataque':'mew-volando');
  if(!gifCentrado(clave,m.x,m.y,MEW_ALTO))
    mewPropio(g,X,Y,PS(m.y)*(MEW_ALTO/26),m.ataque>0?'ataque':'vuela',t);
}
function hudMew(t){
  const m=G.mew;
  g.save();g.textAlign='center';
  if(m.fase==='letrero'||m.fase==='fallo'){dLetreroBonus(m,t);g.restore();return;}
  // marcador superior del bonus
  g.fillStyle='rgba(6,18,28,.72)';roundRectPath(g,120,14,240,42,12);g.fill();
  g.strokeStyle='rgba(120,240,220,.35)';g.lineWidth=1.5;
  roundRectPath(g,120,14,240,42,12);g.stroke();
  g.fillStyle='#7fe8d8';g.font='700 11px system-ui';
  g.fillText('LABORATORIO SECRETO · BONUS',240,30);
  const seg=Math.max(0,Math.ceil(m.tiempo/60));
  g.fillStyle=seg<=15?'#ff8a6b':'#eaffff';g.font='800 17px system-ui';
  g.fillText(seg+' s',240,48);
  // barra de tiempo
  g.fillStyle='rgba(255,255,255,.14)';g.fillRect(126,57,228,3);
  g.fillStyle=seg<=15?'#ff8a6b':'#7fe8d8';g.fillRect(126,57,228*clamp(m.tiempo/(90*60),0,1),3);
  if(m.congelado>0){
    g.fillStyle='#ff9ede';g.font='700 12px system-ui';
    g.fillText('BOLA CONGELADA · '+Math.ceil(m.congelado/60)+' s',240,76);
  }
  g.restore();
}
function dLetreroBonus(m,t,txtOk,txtKo){
  {
    const u=clamp(m.t/16,0,1), pop=1+Math.sin(clamp(m.t/16,0,1)*Math.PI)*0.18;
    g.globalAlpha=u;
    g.fillStyle='rgba(4,12,20,.78)';g.fillRect(0,0,W,H);
    g.translate(240,360);g.scale(pop,pop);
    const ok=m.fase==='letrero';
    g.fillStyle=ok?'#ffd27a':'#ff8a6b';g.font='800 46px system-ui';
    g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=6;
    g.strokeText('BONUS',0,-24);g.fillText('BONUS',0,-24);
    g.fillStyle='#fff';g.font='800 40px system-ui';
    const p=ok?m.premio.toLocaleString('es'):'FALLIDO';
    g.strokeText(p,0,30);g.fillText(p,0,30);
    g.font=ok?'700 15px system-ui':'600 14px system-ui';
    g.fillStyle=ok?'#9fe8d8':'#9fbcc8';
    g.fillText(ok?(txtOk||'PUNTOS'):(txtKo||'Mew sigue suelto en el laboratorio'),0,58);
  }
  g.restore();
}
function dibujaMew(t){
  const m=G.mew;
  fondoLab(t);
  g.drawImage(capaMesa(),0,0);
  dTanque(t);
  dMewVuela(t);
  if(G.capAnim)drawCaptura(t);
}
/* pokébola gigante con agujero: la puerta al bonus, en el centro de Alola */
function dHoyo(t){
  if(G.hoyo<=0)return;
  const s=PS(HOYO.y),X=PX(HOYO.x,HOYO.y),Y=PY(HOYO.y);
  const RX=110*s,RY=96*s*0.9;                    // mismos radios que el motivo del tablero
  const fin=G.hoyo<120?(G.hoyo%16<8?0.35:1):1;   // parpadea al caducar
  g.save();g.globalAlpha=fin;
  g.save();
  g.beginPath();g.ellipse(X,Y,RX,RY,0,0,7);g.clip();
  g.fillStyle='#e8453a';g.fillRect(X-RX,Y-RY,RX*2,RY);
  g.fillStyle='#f2ecd8';g.fillRect(X-RX,Y,RX*2,RY);
  g.fillStyle='#2a2430';g.fillRect(X-RX,Y-RY*0.11,RX*2,RY*0.22);
  // volumen: brillo arriba a la izquierda y oscurecido hacia el borde,
  // para que las dos mitades se lean como una esfera
  const luz=g.createRadialGradient(X-RX*0.34,Y-RY*0.42,RX*0.06,X-RX*0.2,Y-RY*0.24,RX*1.15);
  luz.addColorStop(0,'rgba(255,255,255,.55)');
  luz.addColorStop(.35,'rgba(255,255,255,.16)');
  luz.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=luz;g.fillRect(X-RX,Y-RY,RX*2,RY*2);
  const som=g.createRadialGradient(X-RX*0.2,Y-RY*0.24,RX*0.35,X,Y,RX*1.02);
  som.addColorStop(0,'rgba(0,0,0,0)');
  som.addColorStop(.62,'rgba(30,10,14,.16)');
  som.addColorStop(1,'rgba(20,6,10,.62)');
  g.fillStyle=som;g.fillRect(X-RX,Y-RY,RX*2,RY*2);
  g.restore();
  g.strokeStyle='rgba(42,36,48,.85)';g.lineWidth=4;
  g.beginPath();g.ellipse(X,Y,RX,RY,0,0,7);g.stroke();
  // agujero
  const HX=HOYO.r*s*3, HY=HOYO.r*s*2.5;
  g.fillStyle='#05121a';g.beginPath();g.ellipse(X,Y,HX,HY,0,0,7);g.fill();
  const bo=g.createRadialGradient(X,Y,2,X,Y,HX);
  bo.addColorStop(0,'rgba(0,0,0,.92)');bo.addColorStop(.7,'rgba(0,0,0,.75)');
  bo.addColorStop(1,'rgba(80,220,255,.25)');
  g.fillStyle=bo;g.beginPath();g.ellipse(X,Y,HX,HY,0,0,7);g.fill();
  g.strokeStyle='rgba(140,245,255,'+(0.45+Math.sin(t/7)*0.3)+')';g.lineWidth=3;
  g.beginPath();g.ellipse(X,Y,HX*1.1,HY*1.12,0,0,7);g.stroke();
  if(G.tragado){
    // remolino: anillos que se cierran sobre el agujero
    const u=G.tragado.t/54;
    g.save();g.lineCap='round';
    for(let k=0;k<4;k++){
      const ph=fr(u*1.8+k/4), rr=(1-ph)*RX*0.9+6;
      g.strokeStyle='rgba(120,240,255,'+(0.5*ph*(1-u*0.4))+')';
      g.lineWidth=3.2;
      g.beginPath();
      for(let q=0;q<=26;q++){const an=q/26*Math.PI*1.7+ph*7+k;
        g.lineTo(X+Math.cos(an)*rr,Y+Math.sin(an)*rr*0.82);}
      g.stroke();
    }
    g.fillStyle='rgba(4,12,18,'+(0.35+0.6*u)+')';
    g.beginPath();g.ellipse(X,Y,HX*(1+u*1.1),HY*(1+u*1.1),0,0,7);g.fill();
    g.restore();
  }
  g.restore();
}

/* ============================================================
   DIBUJO DE ACTORES (canvas; con gif se usa la imagen)
   ============================================================ */
function ojo(ctx,x,y,r,col){
  ctx.fillStyle=col||'#1a1418';ctx.beginPath();ctx.ellipse(x,y,r,r*1.1,0,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.35,r*.32,0,7);ctx.fill();
}
function llamita(ctx,x,y,s,t,c1,c2){
  const w=Math.sin(t/5)*s*0.14;
  ctx.fillStyle=c1;ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x-s*.55,y-s*.5,x+w,y-s*1.25);
  ctx.quadraticCurveTo(x+s*.55,y-s*.5,x,y);ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x-s*.3,y-s*.32,x+w*.6,y-s*.75);
  ctx.quadraticCurveTo(x+s*.3,y-s*.32,x,y);ctx.fill();
}
function actorGif(k,x,y,alto){
  const rep=GIFS[k];if(!rep)return false;
  const s=PS(y), h=alto*s*ESCALA_SPRITE*2, w=h*(rep.W/rep.H);
  const X=PX(x,y),Y=PY(y);
  g.save();g.imageSmoothingEnabled=false;
  g.fillStyle='rgba(0,0,0,.30)';
  g.beginPath();g.ellipse(X,Y+alto*s,w*0.32,w*0.08,0,0,7);g.fill();
  g.drawImage(rep.lienzo(),X-w/2,Y+alto*s-h,w,h);
  g.restore();return true;
}
function actorImg(k,x,y,alto){
  if(!spriteListo(k))return false;
  const im=SPRITE_CACHE[k], s=PS(y), h=alto*s*ESCALA_SPRITE*2, w=h*(im.naturalWidth/im.naturalHeight);
  const X=PX(x,y),Y=PY(y);
  g.save();g.imageSmoothingEnabled=false;
  g.fillStyle='rgba(0,0,0,.30)';
  g.beginPath();g.ellipse(X,Y+alto*s,w*0.32,w*0.08,0,0,7);g.fill();
  g.drawImage(im,X-w/2,Y+alto*s-h,w,h);
  g.restore();return true;
}
function marco(x,y,alto){ // prepara transform con escala de profundidad
  const s=PS(y);g.save();g.translate(PX(x,y),PY(y));g.scale(s,s);
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,alto,alto*0.8,alto*0.2,0,0,7);g.fill();
  g.lineJoin='round';g.lineCap='round';return s;
}
function dFennekin(t){
  if(actorGif('fennekin-decoracion',FEN.x,FEN.y,24)||actorImg('fennekin-decoracion',FEN.x,FEN.y,24)){}
  else{
    marco(FEN.x,FEN.y,22);
    const esp=G.fen.boton;
    // colas y orejas con mechones
    g.fillStyle='#f0c04a';
    g.beginPath();g.moveTo(-9,-4);g.lineTo(-15,-26);g.lineTo(-1,-12);g.closePath();
    g.moveTo(9,-4);g.lineTo(15,-26);g.lineTo(1,-12);g.closePath();g.fill();
    g.fillStyle='#e8842f';
    g.beginPath();g.moveTo(-9.5,-8);g.lineTo(-13,-22);g.lineTo(-3,-12);g.closePath();
    g.moveTo(9.5,-8);g.lineTo(13,-22);g.lineTo(3,-12);g.closePath();g.fill();
    g.fillStyle='#f5d98a';g.beginPath();g.ellipse(-13,8,8,5,-.4,0,7);g.fill();
    g.fillStyle='#f0c04a';
    g.beginPath();g.ellipse(0,10,12,9,0,0,7);g.fill();
    g.fillStyle='#fdf3da';g.beginPath();g.ellipse(0,13,8,5,0,0,7);g.fill();
    g.fillStyle='#f0c04a';g.beginPath();g.ellipse(0,-3,10.5,9,0,0,7);g.fill();
    ojo(g,-4,-4,2.6);ojo(g,4,-4,2.6);
    g.fillStyle='#3a2a20';g.beginPath();g.ellipse(0,1,1.8,1.3,0,0,7);g.fill();
    if(esp)llamita(g,10,-14,9+Math.sin(t/6)*1.5,t,'#ff8a3a','#ffd84a');
    g.restore();
  }
}
function dStarmie(t){
  const giro=G.star.giro>0;
  if(actorGif('starmie',STAR.x,STAR.y,22)||actorImg('starmie',STAR.x,STAR.y,22)){}
  else{
    const s=PS(STAR.y);g.save();g.translate(PX(STAR.x,STAR.y),PY(STAR.y));g.scale(s,s);
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,22,17,4.5,0,0,7);g.fill();
    const rot=giro?t*0.9:t*0.02;
    g.rotate(rot);
    for(const [rr,cc] of [[21,'#6b4fbf'],[15,'#8f6fe0']]){
      g.fillStyle=cc;g.beginPath();
      for(let i=0;i<10;i++){const a=i*Math.PI/5, r=i%2?rr*0.42:rr;
        const X=Math.cos(a)*r,Y=Math.sin(a)*r;i?g.lineTo(X,Y):g.moveTo(X,Y);}
      g.closePath();g.fill();
      g.rotate(Math.PI/10);
    }
    g.rotate(-Math.PI/10-rot);
    const nucleo=g.createRadialGradient(-2,-2,1,0,0,8);
    nucleo.addColorStop(0,'#ffe9f5');nucleo.addColorStop(.6,'#e8453a');nucleo.addColorStop(1,'#7d1c30');
    g.fillStyle=nucleo;g.beginPath();g.arc(0,0,7.5,0,7);g.fill();
    g.strokeStyle='#f5c23c';g.lineWidth=2;g.stroke();
    g.restore();
  }
  if(giro){
    const s=PS(STAR.y),X=PX(STAR.x,STAR.y),Y=PY(STAR.y);
    g.save();g.translate(X,Y);g.scale(s,s);
    g.strokeStyle='rgba(200,170,255,'+(G.star.giro/34*0.9)+')';g.lineWidth=3;
    for(let i=0;i<3;i++){g.beginPath();g.arc(0,0,26+i*9,t/3+i*2,t/3+i*2+2.2);g.stroke();}
    g.restore();
  }
}
/* ciénaga circular verde y marrón bajo los tres koffing */
const CIENAGA={x:240,y:254,r:76};
/* tres estados: pantano en calma, fermentando y azufre hirviendo */
const CIENAGA_PAL=[
  {orilla:['#4a3320','#6b4a2a'],agua:['#4c7a34','#37622a','#22401d'],
   limo:['rgba(120,170,70,.22)','rgba(90,70,40,.3)'],
   burbuja:'rgba(190,225,140,',brillo:'rgba(190,230,150,.16)',burbujas:9,vel:150,tam:1},
  {orilla:['#5c4a1c','#846c22'],agua:['#a8bb2e','#7d9a26','#4d661c'],
   limo:['rgba(220,225,80,.24)','rgba(120,100,30,.3)'],
   burbuja:'rgba(245,240,150,',brillo:'rgba(240,240,150,.2)',burbujas:14,vel:105,tam:1.2},
  {orilla:['#8a7a2a','#c9bd6a'],agua:['#fdf6d2','#f5df58','#c9a616'],
   limo:['rgba(255,250,225,.4)','rgba(240,215,90,.34)'],
   burbuja:'rgba(255,255,245,',brillo:'rgba(255,255,235,.34)',burbujas:20,vel:70,tam:1.5}
];
function dCienaga(t){
  const C=CIENAGA,s=PS(C.y),X=PX(C.x,C.y),Y=PY(C.y),RX=C.r*s,RY=C.r*s*0.86;
  // el contorno no es un círculo perfecto: se ondula despacio
  const borde=(esc,off)=>{
    g.beginPath();
    for(let a=0;a<=64;a++){
      const an=a/64*Math.PI*2;
      const rz=Math.sin(a*1.7)*0.05+Math.sin(a*0.9+2.1)*0.045+Math.sin(a*3.3+t/90)*0.018;
      g.lineTo(X+Math.cos(an)*RX*(esc+rz),Y+off+Math.sin(an)*RY*(esc+rz));
    }
    g.closePath();
  };
  g.save();
  // la paleta cambia con las flechas encendidas del carril
  const P=CIENAGA_PAL[Math.min(2,G.flechas||0)];
  // orilla de barro
  borde(1.06,4);g.fillStyle='rgba(0,0,0,.3)';g.fill();
  borde(1.06,0);g.fillStyle=P.orilla[0];g.fill();
  borde(0.98,0);g.fillStyle=P.orilla[1];g.fill();
  borde(0.9,0);
  const agua=g.createRadialGradient(X-RX*0.25,Y-RY*0.3,4,X,Y,RX);
  agua.addColorStop(0,P.agua[0]);agua.addColorStop(.55,P.agua[1]);agua.addColorStop(1,P.agua[2]);
  g.fillStyle=agua;g.fill();
  g.save();borde(0.9,0);g.clip();
  // manchas de limo y burbujas de pantano
  for(let i=0;i<14;i++){
    const sd=Math.sin(i*91.7)*43758.5453, rz=sd-Math.floor(sd);
    const an=rz*7, rr=(0.25+((i*37)%60)/100)*RX;
    g.fillStyle=i%3?P.limo[0]:P.limo[1];
    g.beginPath();g.ellipse(X+Math.cos(an)*rr,Y+Math.sin(an)*rr*0.85,7+rz*13,4+rz*7,an,0,7);g.fill();
  }
  // burbujas: cuanto más caliente, más y más rápidas
  const nb=P.burbujas, vel=P.vel;
  for(let i=0;i<nb;i++){
    const ph=fr(t/vel+i/nb), sd=Math.sin(i*57.3)*43758.5453, rz=sd-Math.floor(sd);
    const bx=X+(rz-0.5)*RX*1.5, by=Y+(1-ph*1.7)*RY*0.7;
    g.fillStyle=P.burbuja+(0.32*(1-ph))+')';
    g.beginPath();g.arc(bx,by,1.8+rz*3.4*(1-ph)*P.tam,0,7);g.fill();
  }
  // brillos de la superficie
  g.strokeStyle=P.brillo;g.lineWidth=2;
  for(let i=0;i<3;i++){g.beginPath();
    for(let x=-1;x<=1;x+=0.08)g.lineTo(X+x*RX*0.8,Y-RY*0.35+i*RY*0.42+Math.sin((x*5+t/40+i))*3.5);
    g.stroke();}
  g.restore();
  g.strokeStyle='rgba(30,20,10,.45)';g.lineWidth=2.5;borde(0.9,0);g.stroke();
  g.restore();
}
function dKoffing(k,i,t){
  if(actorGif('koffing',k.x,k.y,23)||actorImg('koffing',k.x,k.y,23))return;
  const s=marco(k.x,k.y,22);
  const lit=k.lit>0, inf=lit?1.14:1+Math.sin(t/34+i*2)*0.035;
  g.scale(inf,inf);
  // gas
  for(let j=0;j<2;j++){const pr=fr(t/130+j/2+i*.4);
    g.globalAlpha=(1-pr)*0.4;g.fillStyle='#c9b8e8';
    g.beginPath();g.arc(-6+j*10,-20-pr*20,2+pr*5,0,7);g.fill();}
  g.globalAlpha=1;
  const cuerpo=g.createRadialGradient(-6,-8,3,0,0,23);
  cuerpo.addColorStop(0,lit?'#e0d0ff':'#b89ae0');cuerpo.addColorStop(1,'#6b4a9c');
  g.fillStyle=cuerpo;g.beginPath();g.arc(0,0,21,0,7);g.fill();
  g.fillStyle='rgba(255,255,255,.35)';
  [[-10,-12,4],[8,-14,3],[14,4,3.5],[-14,6,3],[2,16,3]].forEach(c=>{
    g.beginPath();g.arc(c[0],c[1],c[2],0,7);g.fill();});
  // cruz
  g.strokeStyle='#f2ecd8';g.lineWidth=2.6;
  g.beginPath();g.moveTo(-5,-24);g.lineTo(5,-30);g.moveTo(0,-30.5);g.lineTo(0,-23);g.stroke();
  ojo(g,-6,-3,3,'#f7f2e8');ojo(g,6,-3,3,'#f7f2e8');
  g.fillStyle='#1a1418';
  g.beginPath();g.arc(-6,-3,1.4,0,7);g.arc(6,-3,1.4,0,7);g.fill();
  g.strokeStyle='#2a2030';g.lineWidth=2;
  g.beginPath();g.arc(0,4,6,0.25,Math.PI-0.25);g.stroke();
  g.restore();
}
function dBunneary(t){pintarBunneary(BUN,t);}
function pintarBunneary(BUN,t){
  const off=bunOffsetDe(BUN), y=BUN.y+off;
  if(actorGif('bunneary',BUN.x,y,20)||actorImg('bunneary',BUN.x,y,20)){}
  else{
    const s=PS(y);g.save();
    // sombra fija en el suelo, se encoge al subir
    g.fillStyle='rgba(0,0,0,.3)';
    const sw=(16+off*0.25)*PS(BUN.y);
    g.beginPath();g.ellipse(PX(BUN.x,BUN.y),PY(BUN.y)+20*PS(BUN.y),Math.max(6,sw),Math.max(2,sw*0.26),0,0,7);g.fill();
    g.translate(PX(BUN.x,y),PY(y));g.scale(s,s);
    g.lineJoin='round';
    const est=1+Math.max(0,-off)/BUN.amp*0.08;
    g.scale(1/Math.sqrt(est),est);
    // orejas enrolladas
    g.fillStyle='#e8ddc8';
    g.beginPath();g.ellipse(-7,-22,4.5,11,-.2,0,7);g.ellipse(7,-22,4.5,11,.2,0,7);g.fill();
    g.fillStyle='#b8925c';
    g.beginPath();g.ellipse(-7,-29,4.5,5,0,0,7);g.ellipse(7,-29,4.5,5,0,0,7);g.fill();
    g.fillStyle='#e8ddc8';
    g.beginPath();g.ellipse(0,6,10,10,0,0,7);g.fill();
    g.fillStyle='#b8925c';g.beginPath();g.ellipse(0,12,8,5,0,0,7);g.fill();
    g.fillStyle='#e8ddc8';g.beginPath();g.ellipse(0,-7,9,8.5,0,0,7);g.fill();
    ojo(g,-3.6,-8,2.4);ojo(g,3.6,-8,2.4);
    g.fillStyle='#8a5f3f';g.beginPath();g.ellipse(0,-4,1.6,1.2,0,0,7);g.fill();
    g.restore();
  }
}
function dExeggutor(t){
  if(actorGif('exeggutor',EGG.x,EGG.y-60,52)||actorImg('exeggutor',EGG.x,EGG.y-60,52))return;
  const s=PS(EGG.y);g.save();g.translate(PX(EGG.x,EGG.y),PY(EGG.y));g.scale(s,s);
  const sway=Math.sin(t/70)*3;
  g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(0,96,30,7,0,0,7);g.fill();
  // tronco larguísimo (exeggutor de Alola)
  g.strokeStyle='#a8834a';g.lineWidth=15;g.lineCap='round';
  g.beginPath();g.moveTo(0,94);g.quadraticCurveTo(-4,30,sway,-34);g.stroke();
  g.strokeStyle='rgba(120,88,44,.8)';g.lineWidth=15;
  g.setLineDash([3,9]);g.beginPath();g.moveTo(0,94);g.quadraticCurveTo(-4,30,sway,-34);g.stroke();g.setLineDash([]);
  // fronda
  g.fillStyle='#3f8f3f';
  for(let i=0;i<6;i++){const a=-Math.PI/2+(i-2.5)*.6;
    g.save();g.translate(sway,-38);g.rotate(a+Math.sin(t/60+i)*0.05);
    g.beginPath();g.ellipse(0,-16,7,19,0,0,7);g.fill();g.restore();}
  // cabezas
  const cara=(x,y,r,feliz)=>{
    g.fillStyle='#f2d8a0';g.beginPath();g.arc(x,y,r,0,7);g.fill();
    g.fillStyle='#1a1418';
    g.beginPath();g.arc(x-r*.34,y-r*.15,r*.13,0,7);g.arc(x+r*.34,y-r*.15,r*.13,0,7);g.fill();
    g.strokeStyle='#1a1418';g.lineWidth=1.6;
    g.beginPath();
    if(feliz)g.arc(x,y+r*.2,r*.4,0.3,Math.PI-0.3);
    else{g.moveTo(x-r*.35,y+r*.4);g.lineTo(x+r*.35,y+r*.4);}
    g.stroke();};
  cara(sway,-34,12,true);
  cara(sway-13,-22,8,false);
  cara(sway+13,-22,8,true);
  // cola-cabeza de dragón asomando abajo
  g.fillStyle='#7fbf5a';g.beginPath();g.ellipse(16,84,8,6,0,0,7);g.fill();
  g.fillStyle='#1a1418';g.beginPath();g.arc(19,83,1.3,0,7);g.fill();
  g.restore();
}
function dEmolga(t){
  const e=G.em;if(!e.fase)return;
  if(GIFS.emolga){
    const rep=GIFS.emolga,s=PS(e.y),h=34*s*ESCALA_SPRITE*2,w=h*(rep.W/rep.H);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(rep.lienzo(),PX(e.x,e.y)-w/2,PY(e.y)-h/2,w,h);g.restore();return;
  }
  if(spriteListo('emolga')){
    const im=SPRITE_CACHE.emolga,s=PS(e.y),h=34*s*ESCALA_SPRITE*2,w=h*(im.naturalWidth/im.naturalHeight);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(im,PX(e.x,e.y)-w/2,PY(e.y)-h/2,w,h);g.restore();return;
  }
  const s=PS(e.y);g.save();g.translate(PX(e.x,e.y),PY(e.y));g.scale(s,s);
  const aleteo=Math.sin(t/4)*0.5;
  g.fillStyle='#f2ecd8';
  g.save();g.rotate(-aleteo);g.beginPath();g.ellipse(-16,2,13,7,-.3,0,7);g.fill();g.restore();
  g.save();g.rotate(aleteo);g.beginPath();g.ellipse(16,2,13,7,.3,0,7);g.fill();g.restore();
  g.fillStyle='#3a3540';
  g.beginPath();g.moveTo(-4,10);g.lineTo(-12,22);g.lineTo(2,18);g.closePath();g.fill();
  g.fillStyle='#f2ecd8';g.beginPath();g.ellipse(0,4,9,10,0,0,7);g.fill();
  g.fillStyle='#3a3540';
  g.beginPath();g.moveTo(-6,-8);g.lineTo(-10,-18);g.lineTo(-1,-11);g.closePath();
  g.moveTo(6,-8);g.lineTo(10,-18);g.lineTo(1,-11);g.closePath();g.fill();
  g.fillStyle='#f2ecd8';g.beginPath();g.ellipse(0,-6,8.5,7.5,0,0,7);g.fill();
  g.fillStyle='#f5d84a';
  g.beginPath();g.arc(-6.5,-3,2.6,0,7);g.arc(6.5,-3,2.6,0,7);g.fill();
  ojo(g,-3.4,-7,2.2);ojo(g,3.4,-7,2.2);
  if(fr(t/40)<0.2){g.strokeStyle='#f7e05a';g.lineWidth=1.6;
    g.beginPath();g.moveTo(12,-14);g.lineTo(17,-19);g.lineTo(13,-21);g.stroke();}
  g.restore();
}
/* carril del bunneary: torre vertical adosada al costado izquierdo */
const EJE_CARRIL_X=(CARRIL.xInt+CARRIL.xExt)/2;
const FLECHAS=[[EJE_CARRIL_X,209],[EJE_CARRIL_X,173]];
function dFlechasCarril(t){
  // dos flechas en el suelo: se encienden al llegar al emolga
  FLECHAS.forEach((f,i)=>{
    const on=G.escena==='alola'&&G.flechas>i, s2=PS(f[1]);
    const X=PX(f[0],f[1]),Y=PY(f[1]),w=6.3*s2,h=9*s2;
    g.save();g.lineJoin='round';g.lineCap='round';
    const pul=on?0.72+0.28*Math.sin(t/7-i*1.2):1;
    for(let k=0;k<2;k++){
      const dy=k*9*s2;
      g.beginPath();
      g.moveTo(X-w,Y+dy+h*0.5);g.lineTo(X,Y+dy-h*0.5);g.lineTo(X+w,Y+dy+h*0.5);
      if(on){
        g.strokeStyle=(i?'rgba(255,154,46,':'rgba(232,225,74,')+pul+')';
        g.lineWidth=4.5*s2;g.shadowColor=i?'#ff9a2e':'#e8e14a';g.shadowBlur=12;
      } else {
        g.strokeStyle='rgba(150,200,150,.22)';g.lineWidth=4*s2;g.shadowBlur=0;
      }
      g.stroke();
    }
    g.restore();
  });
}
/* Vuelta a la ciénaga: tres flechas que hay que cruzar de derecha a izquierda.
   Una vuelta convierte la bola en superball (x1,5) y la segunda en ultraball (x2). */
const ORBITA=[
  {x:382,y:250,dir:'arriba'},     // a la derecha de la ciénaga
  {x:240,y:95,dir:'izq'},         // por encima de la ciénaga, pegada al arco LED
  {x:52 ,y:250,dir:'abajo'}       // a la izquierda del bunneary
];
const NOMBRE_BOLA=['pokéball','superball','ultraball'];
function pasoOrbita(){
  if(G.orbitaT>0&&--G.orbitaT<=0&&G.orbita>0){G.orbita=0;}   // se enfría el intento
  if(ball.state!=='play'||G.escena!=='alola')return;
  const f=ORBITA[G.orbita];
  if(Math.hypot(ball.x-f.x,ball.y-f.y)<36){
    G.orbita++;G.orbitaT=200;
    addFx(f.x,f.y,7,G.vueltas?'#ff6b5a':'#ffe14a',3);
    beep(560+G.orbita*120,.06,'triangle',.045);
    if(G.orbita>=ORBITA.length){
      G.orbita=0;G.orbitaT=0;
      if(G.vueltas<2){
        G.vueltas++;shake=Math.max(shake,7);
        chime(G.vueltas===1?[659,880,1046]:[880,1175,1568],75);
        addFx(ball.x,ball.y,20,G.vueltas===1?'#ffe14a':'#ff6b5a',5);
        if(G.vueltas>=2)tiraValla();
        else say('¡Vuelta completa! Flechas amarillas · una más y cae la valla',230);
      } else { score(5000,ball.x,ball.y-24);say('¡Vuelta completa!',120); }
    }
  }
}
/* recorrido en el suelo: une las tres flechas rodeando la ciénaga */
const ORBITA_PATH=(function(){
  const p=[[382,300],[382,250],[380,196],[352,140],[300,104],[240,95],
           [180,104],[122,132],[80,180],[58,220],[52,250],[52,300]];
  const out=[];                                 // Catmull-Rom para que sea una curva limpia
  const P=i=>p[Math.max(0,Math.min(p.length-1,i))];
  for(let i=0;i<p.length-1;i++)for(let j=0;j<10;j++){
    const u=j/10,a=P(i-1),b=P(i),c=P(i+1),d=P(i+2);
    const f=(A,B,C,D)=>0.5*(2*B+(-A+C)*u+(2*A-5*B+4*C-D)*u*u+(-A+3*B-3*C+D)*u*u*u);
    out.push([f(a[0],b[0],c[0],d[0]),f(a[1],b[1],c[1],d[1])]);
  }
  out.push(p[p.length-1]);return out;
})();
function dOrbitaPista(t){
  const col=G.vueltas>=2?'255,107,90':G.vueltas>=1?'255,225,74':'190,235,225';
  g.save();g.lineCap='round';g.lineJoin='round';
  // destellos que viajan por el circuito marcando el sentido
  const n=ORBITA_PATH.length;
  for(let k=0;k<3;k++){
    const u=fr(t/230+k/3), q=ORBITA_PATH[Math.min(n-1,Math.floor(u*(n-1)))];
    g.fillStyle='rgba('+col+','+(0.55*Math.sin(u*Math.PI))+')';
    g.beginPath();g.arc(PX(q[0],q[1]),PY(q[1]),3.4,0,7);g.fill();
  }
  g.restore();
}
function dOrbita(t){
  ORBITA.forEach((f,i)=>{
    const on=G.vueltas>0||G.orbita>i, s2=PS(f.y);
    const X=PX(f.x,f.y),Y=PY(f.y),w=7*s2,h=10*s2;
    const col=G.vueltas>=2?'#ff6b5a':G.vueltas>=1?'#ffe14a':(G.orbita>i?'#bfe8b0':null);
    const ang=f.dir==='arriba'?0:f.dir==='abajo'?Math.PI:-Math.PI/2;
    g.save();g.translate(X,Y);g.rotate(ang);
    g.lineJoin='round';g.lineCap='round';
    const pul=col?0.72+0.28*Math.sin(t/7-i*1.1):1;
    for(let k=0;k<2;k++){
      const dy=k*10*s2;
      g.beginPath();
      g.moveTo(-w,dy+h*0.5);g.lineTo(0,dy-h*0.5);g.lineTo(w,dy+h*0.5);
      if(col){g.strokeStyle=col;g.globalAlpha=pul;g.lineWidth=5*s2;
        g.shadowColor=col;g.shadowBlur=12;}
      else{g.strokeStyle='rgba(210,240,235,.22)';g.globalAlpha=1;
        g.lineWidth=4.5*s2;g.shadowBlur=0;}
      g.stroke();
    }
    g.restore();
  });
}
function dCarril(t){
  const C=CARRIL;
  // borde derecho del suelo: el domo hasta el labio de la boca y luego recto
  const bordeDer=C.int.slice().reverse().concat([[16,C.yBoca]]);
  const contorno=off=>{
    g.beginPath();
    C.ext.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1])+off;i?g.lineTo(X,Y):g.moveTo(X,Y);});
    C.tapa.forEach(p=>g.lineTo(PX(p[0],p[1]),PY(p[1])+off));
    bordeDer.forEach(p=>g.lineTo(PX(p[0],p[1]),PY(p[1])+off));
    g.closePath();
  };
  g.save();
  // la torre va elevada sobre la playa
  contorno(15);g.fillStyle='rgba(0,0,0,.42)';g.fill();
  contorno(6);g.fillStyle='rgba(5,26,34,.9)';g.fill();
  contorno(0);
  const sup=g.createLinearGradient(0,PY(C.yTapa),0,PY(C.yBoca));
  sup.addColorStop(0,'#0d3318');sup.addColorStop(.55,'#0a2b14');sup.addColorStop(1,'#07200f');
  g.fillStyle=sup;g.fill();
  g.restore();
  // paredes del carril: un seto continuo en U (lateral + tapa + lateral),
  // así la tapa entronca con los lados sin costura ni escalón
  const seto=C.ext.concat(C.tapa.slice(1),C.int.slice().reverse().slice(1));
  setoStroke([seto],['#071a0c','#0d2f16','#164a22','#20612b','#3d8a44'],t);
}
/* pinta cadenas como un seto alto: la misma técnica del seto del bunneary */
function setoStroke(cadenas,col,t){
  g.save();g.lineCap='round';g.lineJoin='round';
  cadenas.forEach(ch=>{
    const path=off=>{g.beginPath();
      ch.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1])+off;i?g.lineTo(X,Y):g.moveTo(X,Y);});};
    path(9);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=25;g.stroke();
    path(5);g.strokeStyle=col[0];g.lineWidth=23;g.stroke();
    path(-1);g.strokeStyle=col[1];g.lineWidth=22;g.stroke();
    path(-8);g.strokeStyle=col[2];g.lineWidth=20;g.stroke();
    path(-14);g.strokeStyle=col[3];g.lineWidth=13;g.stroke();
    path(-16.5);g.strokeStyle=col[4];g.lineWidth=5.5;g.stroke();
    for(let i=0;i<ch.length-1;i++)for(let f=0;f<4;f++){
      const u=(f+0.5)/4;
      const wx=ch[i][0]+(ch[i+1][0]-ch[i][0])*u, wy=ch[i][1]+(ch[i+1][1]-ch[i][1])*u;
      const X=PX(wx,wy),Y=PY(wy);
      const sd=Math.sin((i*4+f)*12.9898+78.233)*43758.5453, rz=sd-Math.floor(sd);
      g.fillStyle=rz>0.5?col[3]:col[4];
      g.beginPath();g.arc(X+(rz-0.5)*5,Y-19-rz*2.5,2.6+rz*1.6,0,7);g.fill();
    }
  });
  g.restore();
}
/* un único seto alto y continuo sobre las barreras del exeggutor */
/* suelo del canal que baja desde la mesa hasta el snorlax */
function dCarrilSnorlax(t){
  const S=SNOR;
  g.save();
  g.beginPath();
  g.moveTo(PX(S.xBoca,S.yBoca),PY(S.yBoca));
  g.lineTo(PX(S.xDer,645),PY(645));
  g.lineTo(PX(S.xDer,S.yTope+6),PY(S.yTope+6));
  g.lineTo(PX(S.xIzq,S.yTope+6),PY(S.yTope+6));
  g.lineTo(PX(S.xIzq,S.yCuello),PY(S.yCuello));
  g.closePath();
  const gr=g.createLinearGradient(0,PY(S.yBoca),0,PY(S.yTope+6));
  gr.addColorStop(0,'#1d5f63');gr.addColorStop(1,'#123f47');
  g.fillStyle=gr;g.fill();
  g.save();g.clip();
  // travesaños que marcan la bajada
  g.strokeStyle='rgba(190,240,235,.09)';g.lineWidth=2;
  for(let y=612;y<S.yTope+6;y+=22){
    g.beginPath();g.moveTo(PX(S.xBoca,y),PY(y));g.lineTo(PX(S.xDer,y),PY(y));g.stroke();}
  g.restore();g.restore();
}
function drawArbustos(t){
  // carril vertical que parte la media luna, embutido en la arena
  const L=LUNA, yTop=L.cy-L.ry-8, yBot=L.cy+22;
  g.save();
  g.beginPath();
  g.moveTo(PX(L.cx-L.canal,yTop),PY(yTop));g.lineTo(PX(L.cx+L.canal,yTop),PY(yTop));
  g.lineTo(PX(L.cx+L.canal,yBot),PY(yBot));g.lineTo(PX(L.cx-L.canal,yBot),PY(yBot));
  g.closePath();
  g.fillStyle='rgba(20,40,26,.3)';g.fill();
  g.restore();
  // los dos cuartos de círculo, con el mismo follaje que el resto de setos
  setoStroke([LUNA_IZQ,LUNA_DER],['#123a1c','#1c5229','#2c8040','#3f9e4e','#66bd67'],t);
  // la barrera derecha de los koffing, con el mismo follaje
  setoStroke([SETO_DER],['#123a1c','#1c5229','#2c8040','#3f9e4e','#66bd67'],t);
  const ch=SETO_PATH;
  const path=off=>{g.beginPath();
    ch.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1])+off;i?g.lineTo(X,Y):g.moveTo(X,Y);});};
  g.lineCap='round';g.lineJoin='round';
  // sombra en la arena
  path(9);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=25;g.stroke();
  // cara lateral: la pared del seto (le da altura)
  path(5);g.strokeStyle='#123a1c';g.lineWidth=23;g.stroke();
  path(-1);g.strokeStyle='#1c5229';g.lineWidth=22;g.stroke();
  // franja media
  path(-8);g.strokeStyle='#2c8040';g.lineWidth=20;g.stroke();
  // copa recortada con su luz
  path(-14);g.strokeStyle='#3f9e4e';g.lineWidth=13;g.stroke();
  path(-16.5);g.strokeStyle='#66bd67';g.lineWidth=5.5;g.stroke();
  // borde superior con bultitos de hoja
  for(let i=0;i<ch.length-1;i++){
    for(let f=0;f<4;f++){
      const u=(f+0.5)/4;
      const wx=ch[i][0]+(ch[i+1][0]-ch[i][0])*u;
      const wy=ch[i][1]+(ch[i+1][1]-ch[i][1])*u;
      const X=PX(wx,wy),Y=PY(wy);
      const sd=Math.sin((i*4+f)*12.9898+78.233)*43758.5453, rz=sd-Math.floor(sd);
      g.fillStyle=rz>0.5?'#3f9e4e':'#66bd67';
      g.beginPath();g.arc(X+(rz-0.5)*5,Y-19-rz*2.5,2.6+rz*1.6,0,7);g.fill();
      if(f%2===0){
        g.strokeStyle='rgba(10,40,18,.5)';g.lineWidth=1.4;
        g.beginPath();g.moveTo(X-2+(rz*4|0),Y-3+rz*4);g.lineTo(X+1+(rz*4|0),Y-6+rz*4);g.stroke();
      }
    }
  }
}
function hoguera(t,fuego){
  const s=PS(CHAN.y);g.save();g.translate(PX(CHAN.x,CHAN.y),PY(CHAN.y)+16*s);g.scale(s,s);
  // piedras alrededor
  for(let i=0;i<6;i++){const a=Math.PI+i*Math.PI/5;
    g.fillStyle=i%2?'#7c7c8a':'#5c5c6a';
    g.beginPath();g.ellipse(Math.cos(a)*20,6+Math.sin(a)*4,4.5,3.2,0,0,7);g.fill();}
  // troncos cruzados
  g.lineCap='round';
  g.strokeStyle='#4a3220';g.lineWidth=7.5;
  g.beginPath();g.moveTo(-14,6);g.lineTo(14,-1);g.stroke();
  g.strokeStyle='#6a4a2e';g.lineWidth=7;
  g.beginPath();g.moveTo(-14,-1);g.lineTo(14,6);g.stroke();
  g.fillStyle='#8a6a42';
  g.beginPath();g.ellipse(14,6,3,2.6,0,0,7);g.ellipse(-14,-1,3,2.6,0,0,7);g.fill();
  // llamas de campamento
  const c1=fuego?'#ff4a2a':'#ff8a3a', c2='#ffd84a', k=fuego?1.5:1;
  llamita(g,-7,0,7*k,t+5,c1,c2);
  llamita(g,7,0,7*k,t+11,c1,c2);
  llamita(g,0,2,11*k+Math.sin(t/6)*1.5,t,c1,c2);
  g.restore();
}
function dChandelure(t){
  const fuego=G.chanFuego>0;
  hoguera(t,fuego);
  const kf=fuego?('chandelure-fuego' in GIFS?'chandelure-fuego':'chandelure'):'chandelure';
  if(actorGif(kf,CHAN.x,CHAN.y-10,24)||actorImg(fuego&&spriteListo('chandelure-fuego')?'chandelure-fuego':'chandelure',CHAN.x,CHAN.y-10,24))return;
  const s=PS(CHAN.y);g.save();g.translate(PX(CHAN.x,CHAN.y),PY(CHAN.y)-10*s);g.scale(s*.92,s*.92);
  const c1=fuego?'#ff5a2a':'#8f7bff', c2=fuego?'#ffd84a':'#c9baff';
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,22,16,4,0,0,7);g.fill();
  // brazos
  g.strokeStyle='#2f2a3a';g.lineWidth=4.5;g.lineCap='round';
  g.beginPath();g.moveTo(-8,-2);g.quadraticCurveTo(-20,-6,-19,-16);
  g.moveTo(8,-2);g.quadraticCurveTo(20,-6,19,-16);g.stroke();
  llamita(g,-19,-15,7+(fuego?3:0),t,c1,c2);
  llamita(g,19,-15,7+(fuego?3:0),t+7,c1,c2);
  // cuerpo
  const cuerpo=g.createRadialGradient(-3,-6,2,0,0,15);
  cuerpo.addColorStop(0,'#4a4260');cuerpo.addColorStop(1,'#232030');
  g.fillStyle=cuerpo;g.beginPath();g.arc(0,0,13,0,7);g.fill();
  g.fillStyle='#38304a';g.beginPath();g.moveTo(-6,11);g.lineTo(0,20);g.lineTo(6,11);g.closePath();g.fill();
  ojo(g,-4.5,-2,2.6,'#f5d84a');ojo(g,4.5,-2,2.6,'#f5d84a');
  // llama de la cabeza
  llamita(g,0,-11,11+(fuego?5:0)+Math.sin(t/5)*1.5,t+3,c1,c2);
  g.restore();
}

/* ============================================================
   SEGUNDO TABLERO · EL BOSQUE DE LA CASCADA
   Una pradera con tres Bounsweet en el centro, la cueva de
   Venomoth en la falda de la montaña (izquierda) y una cascada
   que cae a la derecha. Machamp saca la bola de un gancho.
   ------------------------------------------------------------
   Cada visita a la cueva saca a Venomoth, que revolotea hasta
   que lo golpeas; entonces poliniza la pradera y brotan flores
   (rojas: Bounsweet x2; rojas y azules: x3). La tercera visita
   saca a Spinda, que abre el modo captura. Al acabar la
   captura, bien o mal, las flores se marchitan y se empieza de 0.
   ============================================================ */
const lerp=(a,b,u)=>a+(b-a)*u;
const PRADERA={x:240,y:254,rx:80,ry:72};
const BOUNSWEETS=[{x:240,y:222},{x:200,y:274},{x:280,y:274}];
// la cueva está al final de un carril corto que sale fuera de la mesa por la izquierda.
// La pared exterior es la propia cúpula, que al llegar abajo se abre hacia fuera, así
// que la bola que rodea la mesa pegada a la pared de derecha a izquierda cae dentro.
// La interior arranca con una punta en (52,246) y baja hasta unirse a la pared en (16,344).
const CUEVA={x:-22,y:352};   // fondo del carril, donde espera la bola
// la cueva devuelve la bola carril arriba con poca fuerza: lo justo para salir por la boca
const FUERZA_CUEVA=13;
// al salir por la boca se le marca la velocidad (derecha, arriba): pasa la punta de la
// pared interior y cae suave entre el carril y el tronco de la izquierda (x≈97 en y=300)
const SALIDA_CUEVA=[2,3];
const CARRIL_EXT=[[16,260],[12.3,280.7],[6.5,299],[-3.4,315.6],[-17.1,329.2],[-29.9,338.2],
                  [-36,350],[-26,363],[-10,366]];
const CARRIL_INT=[[52,246],[48,262],[45.7,287.3],[37.5,313],[23.4,336.4],[16,344],[5.1,354.8],[-10,366]];
// tope triangular pegado a la cúpula, a ~125°: la base apoya en la cúpula y el vértice
// apunta hacia dentro (radio 209). El saque de Machamp va pegado a la cúpula (radio ~205
// desde el centro) y choca con él, así que cae a la mesa en vez de dar la vuelta hasta la
// cueva; la bola que rodea la mesa desde abajo va por dentro (radio ~180) y pasa por debajo
const DESVIO=[[123,69],[121.6,87.8],[103.6,82.3]];
// carril de Dragonite: sale de la cúpula a 153°, justo donde la montaña del fondo pasa de
// gris claro a gris oscuro, sube curvándose hacia la izquierda y acaba en una cámara
// redonda junto al borde izquierdo de la pantalla, donde la montaña se junta con el cielo.
// La cúpula se abre entre 145,5° y 160,5° para la boca, que hace de embudo hacia el carril.
// Es una sola pared: el lado de arriba,
// la vuelta a la cámara y el lado de abajo de regreso a la cúpula.
const DRAGONITE={x:-40,y:94,alcance:20};   // alcance: distancia a la que su cola golpea la bola
// compuerta de un solo sentido en la boca (el tramo de cúpula que falta): para la bola
// que rodea la mesa es pared, así que sigue de largo hacia la cueva; la que sube hacia
// el carril la atraviesa, y la que vuelve del carril no la nota
const COMPUERTA=[],COMPUERTA_SUBE=1.5;   // velocidad hacia arriba a partir de la cual se abre
const DRA_PARED=[[55.4,133.1],[44.4,125],[24.9,102.9],[1.3,88.6],[-15.5,82.6],
  [-19.3,76.6],[-26.5,70.6],[-35.3,67.4],[-44.7,67.4],[-53.5,70.6],[-60.7,76.6],[-65.4,84.8],
  [-67,94],[-65.4,103.2],[-60.7,111.4],[-53.5,117.4],[-44.7,120.6],[-35.3,120.6],
  [-24.5,116.1],[-13.3,119.4],[3.1,129.1],[15.6,143],[28.8,185.2]];
// dos troncos caídos flanquean la pradera, como los setos de los koffing en la playa
// el de la izquierda empieza más abajo: por encima de su extremo pasa Spinda al salir de la cueva
const TRONCOS=[[],[]];
for(let i=0;i<=8;i++){const u=i/8;
  if(i>=2)TRONCOS[0].push([150-Math.sin(u*2.6)*16-u*3,196+u*90]);
  TRONCOS[1].push([330+Math.sin(u*2.6)*16+u*3,196+u*90]);}
const BOSQUE_CH=[],BOSQUE_PINTA=[];
(function(){
  // la cúpula se abre entre 145,5° y 160,5° para la boca del carril de Dragonite
  const arco=(a0,a1)=>{const q=[];for(let a=a0;a>a1;a-=5)q.push([240+224*Math.cos(a*RAD),260-224*Math.sin(a*RAD)]);
    q.push([240+224*Math.cos(a1*RAD),260-224*Math.sin(a1*RAD)]);return q;};
  const domo=arco(145.5,0),domoIzq=arco(180,160.5);
  COMPUERTA.push(...arco(160.5,145.5));
  // pared derecha y carril del lanzador: los mismos que en la playa
  const derecha=[[464,258],[464,700],[430,700]];
  const guia=[];for(let a=105;a>=-8;a-=5)guia.push([240+186*Math.cos(a*RAD),260-186*Math.sin(a*RAD)]);
  guia.push([430,300],[430,700]);
  const bajaDer=[[430,588],[394,650],[312,694]];
  const izquierda=[[16,344],[16,588],[86,650],[168,694]];
  BOSQUE_CH.push(domo,domoIzq,derecha,guia,bajaDer,izquierda,CARRIL_EXT,CARRIL_INT,DESVIO,DRA_PARED,TRONCOS[0],TRONCOS[1]);
  // la pared izquierda se pinta como roca hasta y=470; de ahí abajo, muro normal
  BOSQUE_PINTA.push(domo,domoIzq,derecha,guia,bajaDer,[[-10,366],[5.1,354.8],[16,344],[16,588],[86,650],[168,694]]);
})();
// la cascada cae sobre una poza y sigue en arroyo hasta el estanque
const POZA={x:378,y:170,rx:22,ry:12};
const ARROYO=[[378,178],[386,226],[392,276],[388,330],[378,384],[372,430]];
const ESTANQUE={x:372,y:448,rx:36,ry:20};
const MACHAMP={x:447,y:712};
const GANCHO_T=16, GANCHO_IMPACTO=8;   // el puño llega a la bola 8 frames después de soltar
const VM_ALTO=22, VM_RAD=28;
const SP_Y=158, SP_AMP=45, SP_PER=220, SP_RAD=20, SP_ALTO=19;   // vaivén de 90 px, de 285 a 195
// Spinda va y viene de la cueva por este punto, alto y a la izquierda del tronco recortado
const SP_PASO=[96,166], SP_CUEVA=[CUEVA.x+8,CUEVA.y-46];
const FLORES_POR_PASADA=14;

function bosqueNuevo(){return{
  cueva:0,gancho:0,carga:0,expulsada:false,
  rio:null,draGolpe:0,pol:nuevoPolitoed(),   // el viaje de la bola por el río y Politoed en el estanque
  lanzada:false,   // la bola acaba de salir de Machamp y aún no ha vuelto a la parte baja de la mesa
  estado:0,      // pasadas de polen completadas: con 2, la cueva ya no saca a Venomoth sino a Spinda
  nivel:0,       // flores que puntúan: 0 ninguna, 1 rojas (x2), 2 rojas y azules (x3)
  flores:[],polen:[],marchita:0,
  vm:{fase:null,t:0,x:CUEVA.x,y:CUEVA.y,z:0,px:0,py:0,pz:0,rumbo:0,rumboObj:0,rumboT:0,
      flash:0,pend:[],emitidas:0,listo:false,espera:0},
  sp:{fase:null,t:0,x:CUEVA.x,y:CUEVA.y,z:0,px:0,py:0}
};}

/* ---------------- cueva ---------------- */
// con Venomoth o Spinda fuera, o en plena captura, la cueva no hace nada
const cuevaLibre=()=>{const B=G.bosque;return !B.vm.fase&&!B.sp.fase&&!G.mode&&!G.capAnim;};
/* la bola que llega al fondo del carril entra en la cueva; si la cueva está
   ocupada, la devuelve carril arriba y no pasa nada más */
function compruebaCueva(){
  const B=G.bosque;
  if(ball.y>420&&ball.x<430)B.lanzada=false;   // ya de vuelta en la mesa, fuera del carril del lanzador
  if(Math.hypot(ball.x-CUEVA.x,ball.y-CUEVA.y)>14)return;
  // ocupada, o el saque de Machamp que se ha colado por debajo del tope: se devuelve
  if(!cuevaLibre()||B.lanzada){devuelveBola();beep(200,.08,'square',.04);return;}
  B.cueva=50;
  ball.state='held';ball.vx=0;ball.vy=0;ball.x=CUEVA.x;ball.y=CUEVA.y;ball.trail.length=0;
  barrido(520,150,0.35,'sine',0.05);shake=Math.max(shake,5);
  score(3000,44,CUEVA.y-34);
  if(B.estado<2)saleVenomoth();else saleSpinda();
}
/* lanza la bola desde el fondo del carril hacia arriba, de vuelta a la mesa */
function devuelveBola(){
  ball.state='play';ball.x=CUEVA.x+4;ball.y=CUEVA.y-4;
  ball.vx=0.67*FUERZA_CUEVA*SPD;ball.vy=-0.74*FUERZA_CUEVA*SPD;ball.idle=0;
  G.bosque.expulsada=true;
}
/* al salir por la boca, la bola expulsada se frena y se desvía hacia la mesa: si
   siguiera pegada a la cúpula volvería a caer al carril y la cueva la devolvería
   una y otra vez */
function salidaCarril(){
  const B=G.bosque;
  if(!B.expulsada||ball.state!=='play')return;
  if(ball.y<CARRIL_INT[0][1]){ball.vx=SALIDA_CUEVA[0]*SPD;ball.vy=Math.max(ball.vy,-SALIDA_CUEVA[1]*SPD);B.expulsada=false;}
  else if(ball.x>CARRIL_INT[0][0]+20)B.expulsada=false;   // ya salió por otro lado
}
function expulsaCueva(){
  devuelveBola();ball.trail.length=0;
  addFx(CUEVA.x+8,CUEVA.y-8,10,'#c9b8a0',3);beep(240,.1,'square',.045);
}

/* ---------------- machamp ---------------- */
function ganchoMachamp(){
  const B=G.bosque;if(B.gancho>0)return;
  B.gancho=GANCHO_T;B.carga=G.charge;G.charging=false;
  if(GIFS['machamp-decoracion'])GIFS['machamp-decoracion'].accion();
}
function impactoGancho(){
  const B=G.bosque;
  disparaBola(B.carga);B.lanzada=true;
  shake=Math.max(shake,4+B.carga*6);
  addFx(MACHAMP.x,676,12,'#e8e6f2',4);
  beep(110,.12,'square',.06);
}

/* ---------------- venomoth y el polen ---------------- */
function saleVenomoth(){
  Object.assign(G.bosque.vm,{fase:'sale',t:0,x:CUEVA.x,y:CUEVA.y,z:0,flash:0});
  say('¡Venomoth sale de la cueva! Golpéalo',200);chime([392,523,659],80);
}
function vuelveVenomoth(){const v=G.bosque.vm;v.fase='vuelve';v.t=0;v.px=v.x;v.py=v.y;v.pz=v.z;}
function golpeVenomoth(){
  const B=G.bosque,v=B.vm;if(v.fase!=='vuela')return;
  v.fase='poliniza';v.t=0;v.px=v.x;v.py=v.y;v.pz=v.z;v.flash=14;
  v.pend=plantaFlores(B.estado===0?'roja':'azul');v.emitidas=0;v.listo=false;v.espera=0;
  score(5000,v.x,v.y-30);addFx(v.x,v.y,16,'#ffb45a',4.5);shake=Math.max(shake,6);
  beep(760,.1,'triangle',.05);
  say('¡Venomoth vuela sobre los Bounsweet soltando polen!',200);
}
function pasoVenomoth(){
  const v=G.bosque.vm;if(!v.fase)return;
  v.t++;if(v.flash>0)v.flash--;
  if(v.fase==='sale'){
    const u=Math.min(1,v.t/50),e=u*u*(3-2*u);
    v.x=lerp(CUEVA.x,110,e);v.y=lerp(CUEVA.y,250,e);v.z=10*e;
    if(u>=1){v.fase='vuela';v.t=0;v.rumbo=v.rumboObj=-0.3;v.rumboT=50;}
  } else if(v.fase==='vuela'){
    // revoloteo errático con giros suaves, como Mew en el laboratorio
    if(--v.rumboT<=0){v.rumboT=50+Math.random()*70;v.rumboObj=Math.random()*Math.PI*2;}
    if(v.x<80||v.x>396||v.y<120||v.y>470)v.rumboObj=Math.atan2(320-v.y,240-v.x);
    let d=v.rumboObj-v.rumbo;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
    v.rumbo+=clamp(d,-0.035,0.035);
    v.x=clamp(v.x+Math.cos(v.rumbo)*1.7,70,406);
    v.y=clamp(v.y+Math.sin(v.rumbo)*1.7,110,480);
    v.z=10+Math.sin(v.t/9)*3;
  } else if(v.fase==='poliniza'){
    // sube por encima de la pradera y le da vueltas soltando polen
    const CX=PRADERA.x,CY=PRADERA.y-6;
    if(v.t<=45){const u=v.t/45,e=u*u*(3-2*u);
      v.x=lerp(v.px,CX+48,e);v.y=lerp(v.py,CY,e);v.z=lerp(v.pz,50,e);}
    else{
      const k=v.t-45,a=k/40;
      v.x=CX+Math.cos(a)*48;v.y=CY+Math.sin(a)*34;v.z=50+Math.sin(v.t/11)*4;
      if(v.emitidas<v.pend.length&&k%5===0)lanzaPolen(v,v.pend[v.emitidas++]);
      if(!v.listo&&k%2===0)lanzaPolen(v,null);
      if(!v.listo&&v.emitidas>=v.pend.length&&v.pend.every(f=>f.nace>0)){v.listo=true;florecen();}
      if(v.listo&&++v.espera>40)vuelveVenomoth();
    }
  } else if(v.fase==='vuelve'){
    const u=Math.min(1,v.t/60),e=u*u*(3-2*u);
    v.x=lerp(v.px,CUEVA.x,e);v.y=lerp(v.py,CUEVA.y,e);v.z=lerp(v.pz,0,e);
    if(u>=1){v.fase=null;v.t=0;}
  }
}
/* cada mota con flor cae sobre su sitio de la pradera y la hace brotar;
   las demás solo hacen nube y se apagan en el aire */
function lanzaPolen(v,flor){
  const x0=v.x+(Math.random()-.5)*30,y0=v.y+(Math.random()-.5)*12;
  if(flor)G.bosque.polen.push({x0,y0,z0:v.z,x1:flor.x,y1:flor.y,t:0,
    dur:50+Math.random()*25,ph:Math.random()*7,flor});
  else{const a=Math.random()*7,r=10+Math.random()*50;
    G.bosque.polen.push({x0,y0,z0:v.z,x1:x0+Math.cos(a)*r,y1:y0+Math.sin(a)*r*0.6+12,t:0,
      dur:30+Math.random()*30,ph:Math.random()*7,flor:null});}
}
function posPolen(p){
  const u=p.t/p.dur;
  return {x:lerp(p.x0,p.x1,u)+Math.sin(u*Math.PI*2+p.ph)*7*(1-u),y:lerp(p.y0,p.y1,u),
          z:p.flor?p.z0*(1-u):p.z0*(1-u*0.5)};
}
function pasoPolen(){
  const P=G.bosque.polen;
  for(let i=P.length-1;i>=0;i--){const p=P[i];
    if(++p.t<p.dur)continue;
    if(p.flor){p.flor.nace=1;
      addFx(p.flor.x,p.flor.y,3,p.flor.color==='roja'?'#ff7a6a':'#8fc0ff',1.4);
      beep(880+Math.random()*520,.05,'triangle',.02);}
    P.splice(i,1);
  }
}
function plantaFlores(color){
  const B=G.bosque,nuevas=[];
  if(B.marchita>0){B.flores=[];B.marchita=0;}
  for(let intento=0;nuevas.length<FLORES_POR_PASADA&&intento<500;intento++){
    const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*0.88;
    const x=PRADERA.x+Math.cos(a)*PRADERA.rx*r,y=PRADERA.y+Math.sin(a)*PRADERA.ry*r;
    // ni escondida detrás de un Bounsweet ni pegada a otra flor
    if(BOUNSWEETS.some(b=>Math.abs(x-b.x)<20&&y>b.y-30&&y<b.y+18))continue;
    if(B.flores.concat(nuevas).some(f=>Math.hypot(x-f.x,y-f.y)<12))continue;
    nuevas.push({x,y,color,nace:0,fase:Math.random()*7,tam:0.85+Math.random()*0.35});
  }
  B.flores.push(...nuevas);
  B.flores.sort((a,b)=>a.y-b.y);   // de atrás adelante al pintarlas
  return nuevas;
}
function florecen(){
  const B=G.bosque;B.estado++;B.nivel=B.estado;
  say(B.estado===1?'¡Brotan flores rojas! Los Bounsweet puntúan x2'
                  :'¡Y ahora azules! Los Bounsweet puntúan x3 · Spinda espera en la cueva',240);
  chime(B.estado===1?[659,880,1046]:[784,1046,1319],75);shake=Math.max(shake,5);
}

/* ---------------- spinda ---------------- */
/* punto que está a la fracción u del recorrido de la polilínea r */
function sobreRuta(r,u){
  const seg=[];let L=0;
  for(let i=0;i<r.length-1;i++){const d=Math.hypot(r[i+1][0]-r[i][0],r[i+1][1]-r[i][1]);seg.push(d);L+=d;}
  let k=u*L;
  for(let i=0;i<seg.length;i++){
    if(k<=seg[i]||i===seg.length-1){const f=seg[i]?Math.min(1,k/seg[i]):1;
      return [lerp(r[i][0],r[i+1][0],f),lerp(r[i][1],r[i+1][1],f)];}
    k-=seg[i];
  }
}
function saleSpinda(){
  Object.assign(G.bosque.sp,{fase:'sale',t:0,x:SP_CUEVA[0],y:SP_CUEVA[1],z:0});
  say('¡Spinda sale de detrás de la cueva! Golpéalo para buscar pokémon',230);
  chime([523,659,784,1046],70);
}
function golpeSpinda(){
  const p=G.bosque.sp;if(p.fase!=='pasea'||G.mode)return;
  p.fase='vuelve';p.t=0;p.px=p.x;p.py=p.y;
  score(4000,p.x,p.y-30);addFx(p.x,p.y,14,'#ff9ea0',4);shake=Math.max(shake,5);
  startCatch();
}
function pasoSpinda(){
  const p=G.bosque.sp;if(!p.fase)return;p.t++;
  if(p.fase==='sale'){
    // a saltitos desde detrás de la cueva hasta el centro, por encima de la pradera
    const u=Math.min(1,p.t/120);
    [p.x,p.y]=sobreRuta([SP_CUEVA,SP_PASO,[PRADERA.x,SP_Y]],u);
    p.z=Math.abs(Math.sin(u*Math.PI*6))*10;
    if(u>=1){p.fase='pasea';p.t=0;p.z=0;}
  } else if(p.fase==='pasea'){
    // vaivén horizontal que cruza la mediatriz de la mesa; arranca hacia la izquierda
    p.x=PRADERA.x-SP_AMP*Math.sin(p.t/SP_PER*Math.PI*2);p.y=SP_Y;
    p.z=Math.abs(Math.sin(p.t/9))*3;
  } else if(p.fase==='vuelve'){
    // mareado, vuelve a esconderse detrás de la cueva
    const u=Math.min(1,p.t/100);
    [p.x,p.y]=sobreRuta([[p.px,p.py],SP_PASO,SP_CUEVA],u);
    p.z=Math.abs(Math.sin(u*Math.PI*7))*8;
    if(u>=1)p.fase=null;
  }
}

/* ---------------- Dragonite, el río y Politoed ----------------
   Dragonite da coletazos sin parar al final de su carril. La bola que llega hasta él
   sale volando a la esquina de arriba a la derecha, baja con el río, cae por la
   cascada, sigue el arroyo hasta el estanque y se hunde un segundo. Entonces asoma
   Politoed, que la saca de vuelta a la mesa; luego vuelve a asomar cada 5 s. Golpearlo
   mientras asoma hace evolucionar la bola, y se esconde hasta el próximo coletazo. */
const T_VUELO=60,T_RIO=80,T_CAIDA=26,T_ARROYO=100,T_HUNDE=60;   // frames de cada tramo del viaje
const POLITOED={x:ESTANQUE.x,y:ESTANQUE.y,alto:30,rad:18};
const POL_SUBE=18,POL_PAUSA=300;   // lo que tarda en asomar o hundirse, y la pausa entre asomadas
// pantalla -> mundo (la inversa de PX/PY): el río y la cascada van en coordenadas de pantalla
function aMundo(X,Y){const y=(Y-30)/0.945;return [240+(X-240)/PS(y),y];}
function nuevoPolitoed(){return{fase:null,t:0,dur:0,escupe:false,activo:false,cd:0,inmune:0};}
function compruebaDragonite(){
  const B=G.bosque;
  if(B.rio||ball.state!=='play'||Math.hypot(ball.x-DRAGONITE.x,ball.y-DRAGONITE.y)>DRAGONITE.alcance)return;
  B.rio={fase:'vuelo',t:0,x0:PX(ball.x,ball.y),y0:PY(ball.y)};B.draGolpe=18;
  ball.state='held';ball.vx=0;ball.vy=0;ball.trail.length=0;
  score(5000,DRAGONITE.x+40,DRAGONITE.y-24);shake=Math.max(shake,9);
  addFx(ball.x,ball.y,16,'#ffb45a',5);beep(140,.18,'sawtooth',.06);
  say('¡Coletazo de Dragonite! La bola sale volando hacia el río',200);
}
function pasoRio(){
  const R=G.bosque.rio;R.t++;
  const pon=(X,Y)=>{[ball.x,ball.y]=aMundo(X,Y);};
  if(R.fase==='vuelo'){
    // arco por encima de la mesa hasta el río, arriba a la derecha
    const u=Math.min(1,R.t/T_VUELO),fin=sobreRuta(RIO,0.08);
    pon(lerp(R.x0,fin[0],u),lerp(R.y0,fin[1],u)-Math.sin(u*Math.PI)*70);ball.rot+=0.3;
    if(u>=1){R.fase='rio';R.t=0;addFx(ball.x,ball.y,8,'#e8f8ff',2);}
  } else if(R.fase==='rio'){
    const u=Math.min(1,R.t/T_RIO),q=sobreRuta(RIO,0.08+0.92*u);
    pon(q[0],q[1]+Math.sin(R.t/4)*1.5);ball.rot+=0.25;
    if(u>=1){R.fase='caida';R.t=0;}
  } else if(R.fase==='caida'){
    const u=Math.min(1,R.t/T_CAIDA),xb=PX(POZA.x,POZA.y),yb=PY(POZA.y),c=RIO[RIO.length-1];
    pon(lerp(c[0],xb,u),lerp(c[1],yb,u*u));
    if(u>=1){R.fase='arroyo';R.t=0;addFx(POZA.x,POZA.y,12,'#e8f8ff',3);beep(300,.15,'sine',.04);}
  } else if(R.fase==='arroyo'){
    const u=Math.min(1,R.t/T_ARROYO);
    [ball.x,ball.y]=sobreRuta([[POZA.x,POZA.y]].concat(ARROYO,[[ESTANQUE.x,ESTANQUE.y]]),u);ball.rot+=0.2;
    if(u>=1){R.fase='hunde';R.t=0;addFx(ESTANQUE.x,ESTANQUE.y,14,'#bfe8ff',3);barrido(400,120,0.4,'sine',0.05);}
  } else if(R.fase==='hunde'){
    if(R.t%8===0)addFx(ESTANQUE.x+(Math.random()-.5)*10,ESTANQUE.y-4,1,'#dff6ff',1);
    if(R.t>=T_HUNDE){R.fase='espera';R.t=0;asomaPolitoed(2,true);}
  }
  // 'espera': la bola sigue en el fondo hasta que Politoed la saca
}
/* un ciclo del gif de Politoed, en frames del juego */
function vueltaPolitoed(){
  const rep=GIFS['politoed-decoracion'];
  return rep?Math.round(rep.f.reduce((a,f)=>a+f.delay,0)/(1000/60)):288;
}
function asomaPolitoed(vueltas,escupe){
  Object.assign(G.bosque.pol,{fase:'sube',t:0,dur:vueltas*vueltaPolitoed(),escupe,activo:true});
  const rep=GIFS['politoed-decoracion'];if(rep){rep.i=0;rep.acc=0;}   // el gif empieza desde el principio
  addFx(POLITOED.x,POLITOED.y,10,'#dff6ff',2.5);beep(660,.08,'triangle',.04);
}
function pasoPolitoed(){
  const P=G.bosque.pol;
  if(P.inmune>0)P.inmune--;
  if(!P.fase){if(P.activo&&--P.cd<=0)asomaPolitoed(1,false);return;}
  P.t++;
  if(P.fase==='sube'){if(P.t>=POL_SUBE){P.fase='juega';P.t=0;}}
  else if(P.fase==='juega'){
    if(P.escupe&&P.t===24)escupePolitoed();
    if(P.t>=P.dur){P.fase='baja';P.t=0;}
  } else if(P.fase==='baja'){if(P.t>=POL_SUBE){P.fase=null;P.t=0;P.cd=POL_PAUSA;}}
}
// cuánto asoma (0 bajo el agua, 1 fuera del todo)
function asomaP(){
  const P=G.bosque.pol;
  return P.fase==='juega'?1:P.fase==='sube'?P.t/POL_SUBE:P.fase==='baja'?1-P.t/POL_SUBE:0;
}
function escupePolitoed(){
  const B=G.bosque,P=B.pol;
  P.escupe=false;P.inmune=50;B.rio=null;
  // la escupe hacia la izquierda, por encima de la pradera: si saliera recta volvería
  // a caer sobre Politoed y lo golpearía sin que el jugador hiciera nada
  ball.state='play';ball.x=POLITOED.x;ball.y=POLITOED.y-16;ball.vx=-6*SPD;ball.vy=-9*SPD;
  ball.idle=0;ball.trail.length=0;
  addFx(ball.x,ball.y,14,'#bfe8ff',4);beep(880,.1,'triangle',.05);
  say('¡Politoed saca la bola del estanque! Golpéalo mientras asoma',220);
}
function golpePolitoed(){
  const P=G.bosque.pol;
  if(P.inmune>0||!P.activo)return;
  P.activo=false;
  const t0=P.fase==='sube'?POL_SUBE-P.t:0;P.fase='baja';P.t=t0;   // se hunde desde donde esté
  // la bola evoluciona: pokéball -> superball -> ultraball
  const antes=G.bola||0;if(antes<2){G.bola=antes+1;G.bolaT=0;}
  G.bolaFx=40;score(10000,POLITOED.x,POLITOED.y-34);shake=Math.max(shake,8);
  addFx(ball.x,ball.y,22,G.bola===2?'#ff6b5a':'#ffe14a',5);
  chime(G.bola===2?[880,1175,1568]:[659,880,1046],75);
  say(antes>=2?'¡Politoed! Ya llevabas una ultraball'
      :G.bola===1?'¡Politoed hace evolucionar la bola! SUPERBALL · puntos x1,5'
                 :'¡Politoed hace evolucionar la bola! ULTRABALL · puntos x2',240);
}

/* ---------------- fin de captura y bola perdida ---------------- */
function finCapturaBosque(){
  const B=G.bosque;
  B.flores.forEach((f,i)=>{if(f.nace&&i%2===0)addFx(f.x,f.y,2,f.color==='roja'?'#ff7a6a':'#8fc0ff',2);});
  if(B.flores.length)B.marchita=40;
  B.estado=0;B.nivel=0;
}
function pierdeBolaBosque(){
  const B=G.bosque,v=B.vm;
  B.cueva=0;B.gancho=0;
  // si Venomoth seguía revoloteando vuelve a la cueva sin soltar polen: esa visita no cuenta
  if(v.fase==='sale'||v.fase==='vuela')vuelveVenomoth();
  if(G.mode)finCapturaBosque();   // perder la bola en plena captura es perder el pokémon
}
function guiaBosque(){
  const B=G.bosque;
  if(B.sp.fase==='pasea')return 'Golpea a Spinda para buscar pokémon';
  if(B.vm.fase==='vuela')return 'Golpea a Venomoth para que polinice la pradera';
  if(B.vm.fase||B.sp.fase||B.cueva>0)return 'Bounsweet puntúa x'+(1+B.nivel);
  return B.estado>=2?'Mete la bola en la cueva: Spinda espera detrás':'Mete la bola en la cueva de Venomoth';
}

/* ---------------- física y ciclo ---------------- */
function golpeBounsweet(b){
  const n=G.bosque.nivel;
  b.lit=14;score(800*(1+n),b.x,b.y-30);
  addFx(b.x,b.y,12,n===2?'#7fb0ff':n===1?'#ff5a5a':'#ff9ec4',4.5);
  beep(n===2?520:n===1?440:360,.08,'triangle',.05);shake=Math.max(shake,6);
}
function physicsBosque(){
  const B=G.bosque,f=1/SUB;
  for(let s=0;s<SUB;s++){
    [F.L,F.R].forEach(fl=>{const tgt=fl.press?fl.up:fl.rest,prev=fl.a;
      fl.a+=clamp(tgt-fl.a,-0.5*SPD/SUB,0.5*SPD/SUB);fl.w=(fl.a-prev)*SUB;});
    ball.vy+=GRAV*f;
    ball.x+=ball.vx*f;ball.y+=ball.vy*f;
    for(const ch of BOSQUE_CH)
      for(let i=0;i<ch.length-1;i++)collide(ch[i][0],ch[i][1],ch[i+1][0],ch[i+1][1],7,0.42,0,null);
    for(const sl of SLINGS)
      collide(sl.a[0],sl.a[1],sl.b[0],sl.b[1],9,0.35,12.4*SPD,(x,y)=>{score(120);addFx(x,y,6,'#ffc0dc',3);beep(520,.05,'square',.04);shake=Math.max(shake,3);});
    // bounsweet: rebote muy fuerte, como los koffing
    BOUNSWEETS.forEach(b=>collide(b.x,b.y,b.x,b.y,23,0.5,9.5*SPD,()=>golpeBounsweet(b)));
    if(B.vm.fase==='vuela')collide(B.vm.x,B.vm.y,B.vm.x,B.vm.y,VM_RAD,0.5,4*SPD,()=>golpeVenomoth());
    if(B.sp.fase==='pasea')collide(B.sp.x,B.sp.y,B.sp.x,B.sp.y,SP_RAD,0.5,3.4*SPD,()=>golpeSpinda());
    if(G.mode==='captura'&&G.wild)collide(G.wild.x,G.wild.y,G.wild.x,G.wild.y,30,0.4,3.5*SPD,()=>hurtWild());
    // compuerta de la boca de Dragonite: solo frena desde dentro y a la bola que no sube.
    // Las órbitas pasan por la boca bajando (vienen de arriba a la derecha); los tiros al
    // carril, subiendo
    {const dx=ball.x-240,dy=ball.y-260,rr=Math.hypot(dx,dy);
      if(rr<224&&ball.vy>-COMPUERTA_SUBE)
        for(let i=0;i<COMPUERTA.length-1;i++)collide(COMPUERTA[i][0],COMPUERTA[i][1],COMPUERTA[i+1][0],COMPUERTA[i+1][1],7,0.42,0,null);}
    // Politoed, mientras asoma del estanque
    if(B.pol.activo&&B.pol.inmune<=0&&asomaP()>0.5)
      collide(POLITOED.x,POLITOED.y-8,POLITOED.x,POLITOED.y-8,POLITOED.rad,0.5,4*SPD,()=>golpePolitoed());
    flipperHit(F.L);flipperHit(F.R);
    const sp=Math.hypot(ball.vx,ball.vy);
    if(sp>MAXV){ball.vx*=MAXV/sp;ball.vy*=MAXV/sp;}
    ball.vx*=0.99985;ball.vy*=0.99985;
  }
  ball.rot+=ball.vx*0.11;
}
function updateBosque(){
  const B=G.bosque;
  BOUNSWEETS.forEach(b=>{if(b.lit)b.lit--;});
  if(G.saver>0)G.saver--;
  if(B.marchita>0&&--B.marchita<=0)B.flores=[];
  B.flores.forEach(f=>{if(f.nace&&f.nace<30)f.nace++;});
  pasoPolen();pasoVenomoth();pasoSpinda();pasoPolitoed();
  if(B.draGolpe>0)B.draGolpe--;
  if(G.capAnim){capturaPaso();return;}
  if(B.gancho>0&&--B.gancho===GANCHO_IMPACTO&&ball.state==='ready')impactoGancho();
  if(B.rio)pasoRio();
  else if(B.cueva>0){if(--B.cueva<=0)expulsaCueva();}
  else if(ball.state==='ready'){
    // mientras el gancho va de camino la carga ya no sube
    if(G.charging&&!B.gancho)G.charge=Math.min(1,G.charge+0.022);
    ball.y=668+G.charge*22;
  } else if(ball.state==='play'){
    physicsBosque();
    compruebaCueva();salidaCarril();compruebaDragonite();
    if(ball.state==='play'){
      ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();
      const spd=Math.hypot(ball.vx,ball.vy);
      if(ball.x>434&&ball.y>640&&spd<2.2*SPD){if(++ball.lane>25){ball.state='ready';ball.lane=0;say('Bola de vuelta con Machamp',110);}}
      else ball.lane=0;
      if(spd<0.7*SPD){if(++ball.idle>150){ball.vx+=(Math.random()-.5)*6*SPD;ball.vy-=3*SPD;ball.idle=0;shake=Math.max(shake,5);}}
      else ball.idle=0;
      if(ball.y>745){
        if(G.saver>0){say('Salvabolas activado',120);beep(700,.15,'sine',.05);newBall(true);}
        else loseBall();
      }
    }
  }
  if(G.mode){
    G.timer--;
    if(G.wild&&G.wild.flash)G.wild.flash--;
    if(G.timer<=0){say('Se escapó… las flores se marchitan',160);beep(200,.3,'sawtooth',.05);
      G.mode=null;G.wild=null;finCapturaBosque();}
  }
}

/* ---------------- dibujo del bosque ---------------- */
/* todo el fondo del bosque es fijo: se pinta una vez en una capa y luego solo se copia;
   lo único que se mueve son las gotas sobre la roca mojada de detrás del salto */
function fondoBosque(t){
  g.drawImage(capaFija('fondoBosque',pintaFondoBosque),0,0);
  gotasCascada(t);
}
function pintaFondoBosque(){
  const cielo=g.createLinearGradient(0,0,0,H);
  cielo.addColorStop(0,'#1f4d63');cielo.addColorStop(.2,'#6aa894');
  cielo.addColorStop(.3,'#2c5c3e');cielo.addColorStop(1,'#0f2618');
  g.fillStyle=cielo;g.fillRect(-20,-20,W+40,H+40);
  g.save();
  // dos filas de pinos lejanos
  for(let fila=0;fila<2;fila++){
    g.fillStyle=fila?'#1d4430':'#2f6248';
    const base=196+fila*40;
    for(let i=0;i<16;i++){
      const x=i*34-14+fila*17, h=46+((i*37+fila*11)%34);
      g.beginPath();g.moveTo(x-15,base);g.lineTo(x,base-h);g.lineTo(x+15,base);g.closePath();g.fill();
    }
    g.fillRect(-20,base,W+40,H);
  }
  // la montaña, a la izquierda: en su falda se abre la cueva de Venomoth
  const roca=g.createLinearGradient(0,0,200,0);
  roca.addColorStop(0,'#3b3946');roca.addColorStop(1,'#5e5b6b');
  g.fillStyle=roca;
  g.beginPath();g.moveTo(-20,H);g.lineTo(-20,150);g.lineTo(22,84);g.lineTo(46,52);g.lineTo(70,14);
  g.lineTo(92,40);g.lineTo(112,34);g.lineTo(146,78);g.lineTo(196,140);g.lineTo(230,200);
  g.lineTo(120,H);g.closePath();g.fill();
  g.fillStyle='rgba(20,18,30,.35)';                 // ladera en sombra
  g.beginPath();g.moveTo(70,14);g.lineTo(92,40);g.lineTo(112,34);g.lineTo(146,78);g.lineTo(196,140);
  g.lineTo(230,200);g.lineTo(120,H);g.lineTo(60,H);g.lineTo(84,120);g.closePath();g.fill();
  g.fillStyle='#eef4f8';                            // nieve en la cumbre
  g.beginPath();g.moveTo(46,52);g.lineTo(70,14);g.lineTo(92,40);g.lineTo(112,34);g.lineTo(126,52);
  g.lineTo(110,50);g.lineTo(98,60);g.lineTo(86,50);g.lineTo(74,62);g.lineTo(60,55);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=2;   // vetas de la roca
  for(let i=0;i<9;i++){g.beginPath();g.moveTo(-10+i*4,130+i*68);g.lineTo(40+i*7,112+i*70);g.stroke();}
  acantilado();
  // al pie de la mesa: matorral bajo y rocas grises agrietadas (la mesa tapa lo del centro)
  [[60,690,40,1],[140,722,36,2],[20,750,46,3],[96,664,30,4],[214,758,30,5],
   [338,722,34,6],[410,744,40,7],[268,758,30,8],[470,716,32,9]].forEach(m=>mata(m[0],m[1],m[2],m[3]));
  [[36,714,30,19,1,2],[110,744,26,15,2,1],[176,754,22,12,3,1],[14,660,18,24,4,1],
   [298,746,24,13,5,1],[372,734,30,18,6,2],[466,752,22,14,7,1]].forEach(r=>piedra(r[0],r[1],r[2],r[3],r[4],r[5]));
  g.restore();
}
/* el acantilado de la cascada, a la derecha: una pared de roca por estratos,
   con repisas iluminadas, fisuras y la roca mojada detrás del salto. Su cima es
   el propio río: el borde de arriba sigue la orilla lejana y encima ya solo hay
   cielo (coordenadas de pantalla) */
const PENA=[[336,48],[352,36],[372,26],[398,20],[426,14],[462,7],[W+20,0],[W+20,H],[446,H],
            [450,420],[438,240],[404,140],[374,86],[334,62]];
function acantilado(){
  const az=v=>{const s=Math.sin(v*12.9898)*43758.5453;return s-Math.floor(s);};
  const contorno=()=>{g.beginPath();PENA.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
  g.save();
  contorno();
  const pena=g.createLinearGradient(330,0,W,260);
  pena.addColorStop(0,'#6a6876');pena.addColorStop(.5,'#4a4855');pena.addColorStop(1,'#2e2c36');
  g.fillStyle=pena;g.fill();
  g.clip();
  // grandes facetas en sombra: la pared no es plana
  [[[360,60],[430,40],[470,170],[420,230]],[[420,230],[480,200],[480,420],[452,380]],
   [[340,40],[372,90],[396,150],[380,70]]].forEach((f,i)=>{
    g.beginPath();f.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
    g.fillStyle=i===2?'rgba(255,255,255,.06)':'rgba(10,10,20,.22)';g.fill();});
  // estratos de grosor desigual, cada uno con su tono, inclinados y ondulados
  const capa=(y0,k)=>x=>y0+Math.sin(x/23+k*1.9)*3+Math.sin(x/7+k)*0.8+(x-300)*(0.07+az(k+500)*0.05);
  let y0=64;
  for(let k=0;y0<H;k++){
    const alto=12+az(k+200)*22,f=capa(y0,k),f2=capa(y0+alto,k+1);
    const linea=(fn,dy)=>{g.beginPath();for(let x=300;x<=490;x+=8){const y=fn(x)+dy;x===300?g.moveTo(x,y):g.lineTo(x,y);}};
    // tono propio de la capa
    linea(f,0);for(let x=490;x>=300;x-=8)g.lineTo(x,f2(x));g.closePath();
    g.fillStyle=az(k+300)<0.5?'rgba(255,250,240,'+(0.03+az(k+310)*0.06)+')':'rgba(10,8,20,'+(0.06+az(k+320)*0.12)+')';g.fill();
    // sombra que cae bajo la repisa
    linea(f,0);for(let x=490;x>=300;x-=8)g.lineTo(x,f(x)+7);g.closePath();
    g.fillStyle='rgba(8,8,16,.32)';g.fill();
    // canto de la repisa: iluminado solo a tramos, donde sobresale
    g.strokeStyle='rgba(230,228,238,.28)';g.lineWidth=1.3;
    for(let x=300;x<490;x+=36){if(az(k*17+x)<0.35)continue;
      const l=14+az(k*19+x)*26;g.beginPath();
      for(let xx=x;xx<=x+l;xx+=6){const y=f(xx)-1;xx===x?g.moveTo(xx,y):g.lineTo(xx,y);}g.stroke();}
    // fisuras verticales de largura desigual, algunas cruzan varias capas
    for(let j=0;j<3;j++){
      const x=325+az(k*7+j)*160,y=f(x)+3,l=alto*(0.5+az(k*7+j+3)*1.4),dx=(az(k*3+j)-.5)*5;
      g.strokeStyle='rgba(225,225,235,.16)';g.lineWidth=0.9;
      g.beginPath();g.moveTo(x+1,y);g.lineTo(x+1+dx*0.6,y+l*0.55);g.lineTo(x+1+dx,y+l);g.stroke();
      g.strokeStyle='rgba(10,10,18,.62)';g.lineWidth=1.3;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+dx*0.6,y+l*0.55);g.lineTo(x+dx,y+l);g.stroke();
    }
    // musgo y matas en algunas repisas; de vez en cuando una enredadera que cuelga
    for(let j=0;j<2;j++){if(az(k*11+j)<0.45)continue;
      const x=330+az(k*13+j)*140,ancho=8+az(k+j)*12;
      // mata de musgo: bultitos irregulares pegados a la repisa, oscuros abajo y claros arriba
      for(let q=0;q<6;q++){const xx=x+(q/5-.5)*ancho+(az(k*9+j*3+q)-.5)*2,yy=f(xx);
        g.fillStyle=q%2?'rgba(62,118,46,.92)':'rgba(84,146,58,.92)';
        g.beginPath();g.arc(xx,yy-0.5,1.4+az(k+q+j)*1.6,0,7);g.fill();
        g.fillStyle='rgba(150,205,104,.7)';g.beginPath();g.arc(xx-0.5,yy-1.6,0.8+az(k*2+q)*0.7,0,7);g.fill();}
      // de vez en cuando cuelga una enredadera fina con hojitas
      if(az(k*5+j)>0.72){
        const vx=x+(az(k+40)-.5)*ancho*0.6,vy=f(vx),largo=alto*(0.6+az(k+41)*0.6);
        g.strokeStyle='rgba(66,120,46,.75)';g.lineWidth=0.9;g.beginPath();g.moveTo(vx,vy);
        for(let q=1;q<=4;q++)g.lineTo(vx+Math.sin(q*1.7+k)*1.6,vy+largo*q/4);g.stroke();
        g.fillStyle='rgba(110,175,72,.8)';
        for(let q=1;q<=4;q++){g.beginPath();g.ellipse(vx+Math.sin(q*1.7+k)*1.6+(q%2?1.5:-1.5),vy+largo*q/4-2,1.4,0.8,q%2?0.6:-0.6,0,7);g.fill();}
      }
    }
    y0+=alto;
  }
  // roca mojada y oscura detrás del salto, con brillos de agua
  const moja=g.createLinearGradient(326,0,384,0);
  moja.addColorStop(0,'rgba(8,16,24,0)');moja.addColorStop(.5,'rgba(8,16,24,.5)');moja.addColorStop(1,'rgba(8,16,24,0)');
  g.fillStyle=moja;g.fillRect(326,50,58,180);
  g.restore();
  // borde de la pared: canto iluminado y una franja de musgo
  g.save();g.lineJoin='round';g.lineCap='round';
  const borde=()=>{g.beginPath();g.moveTo(334,62);[[374,86],[404,140],[438,240],[450,420],[446,H]].forEach(p=>g.lineTo(p[0],p[1]));};
  borde();g.strokeStyle='rgba(20,18,26,.6)';g.lineWidth=5;g.stroke();
  borde();g.strokeStyle='rgba(200,200,212,.35)';g.lineWidth=1.6;g.stroke();
  borde();g.strokeStyle='rgba(110,175,80,.35)';g.lineWidth=2.4;g.stroke();
  g.restore();
}
/* brillos de agua que resbalan por la roca mojada de detrás del salto */
function gotasCascada(t){
  for(let i=0;i<6;i++){const ph=fr(t/90+i/6);
    g.fillStyle='rgba(190,230,250,'+(0.25*(1-ph))+')';
    g.beginPath();g.ellipse(332+azarRio(i)*46,64+ph*150,1,3,0,0,7);g.fill();}
}
/* roca gris en volumen: base plana apoyada en el suelo, cara de arriba iluminada
   (luz arriba a la izquierda), costado en sombra, vetas blancas y grietas grises */
function piedra(x,y,rx,ry,sem,grietas,osc,sinSombra){
  const azar=v=>{const s=Math.sin(sem*12.9898+v*78.233)*43758.5453;return s-Math.floor(s);};
  const n=11,pts=[];
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=0.8+0.2*azar(i);
    pts.push([x+Math.cos(a)*rx*r,y+Math.min(Math.sin(a),0.62)*ry*r]);}
  const contorno=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
  const trazo=(q,dx,dy)=>{g.beginPath();q.forEach((p,i)=>i?g.lineTo(p[0]+dx,p[1]+dy):g.moveTo(p[0]+dx,p[1]+dy));};
  g.save();g.lineJoin='round';g.lineCap='round';
  // sombra arrojada sobre el suelo, hacia abajo a la derecha
  if(!sinSombra){g.fillStyle='rgba(0,0,0,.34)';g.beginPath();g.ellipse(x+rx*0.18,y+ry*0.62,rx*1.08,ry*0.32,0,0,7);g.fill();}
  // cuerpo: el costado, en sombra
  const cuerpo=g.createLinearGradient(x,y-ry,x,y+ry*0.7);
  cuerpo.addColorStop(0,'#8c8c98');cuerpo.addColorStop(.55,'#585862');cuerpo.addColorStop(1,'#2c2c34');
  contorno();g.fillStyle=cuerpo;g.fill();
  g.save();contorno();g.clip();
  // cara de arriba: un casquete iluminado desplazado hacia la luz
  const luz=g.createRadialGradient(x-rx*0.38,y-ry*0.6,1,x-rx*0.1,y-ry*0.3,rx*1.05);
  luz.addColorStop(0,'#e2e2ea');luz.addColorStop(.5,'#a8a8b4');luz.addColorStop(1,'rgba(150,150,162,0)');
  g.fillStyle=luz;g.beginPath();g.ellipse(x-rx*0.12,y-ry*0.36,rx*0.98,ry*0.74,0,0,7);g.fill();
  // filo entre la cara de arriba y el costado
  g.strokeStyle='rgba(20,20,28,.35)';g.lineWidth=Math.max(1,rx*0.08);
  g.beginPath();g.ellipse(x-rx*0.12,y-ry*0.36,rx*0.98,ry*0.74,0,0.15,Math.PI-0.15);g.stroke();
  // oclusión en la base, donde la roca toca el suelo
  const base=g.createLinearGradient(0,y+ry*0.05,0,y+ry*0.62);
  base.addColorStop(0,'rgba(8,8,14,0)');base.addColorStop(1,'rgba(8,8,14,.5)');
  g.fillStyle=base;g.fillRect(x-rx*1.2,y,rx*2.4,ry);
  if(osc){g.fillStyle='rgba(12,14,22,'+osc+')';g.fillRect(x-rx*1.2,y-ry*1.2,rx*2.4,ry*2.4);}   // más lejos o en sombra
  // vetas blancas de cuarzo que cruzan la roca siguiendo su curva
  const nv=rx<6?0:(grietas||0)+1;
  for(let k=0;k<nv;k++){
    const y0=y-ry*(0.62-k*0.3)+azar(60+k)*ry*0.12,x0=x-rx*(0.75-azar(70+k)*0.2),x1=x+rx*(0.65+azar(80+k)*0.2);
    g.strokeStyle='rgba(242,242,250,'+(0.45+azar(90+k)*0.25)+')';g.lineWidth=Math.max(0.8,rx*0.07);
    g.beginPath();g.moveTo(x0,y0+ry*0.15);g.quadraticCurveTo(x,y0-ry*0.12,x1,y0+ry*0.25);g.stroke();
  }
  // grietas grises en zigzag, con un filo claro al lado que las hunde
  for(let k=0;k<(grietas||0);k++){
    const q=[];let cx=x+(azar(20+k)-.5)*rx*0.8,cy=y-ry*0.6+azar(30+k)*ry*0.25;q.push([cx,cy]);
    for(let j=0;j<3;j++){cx+=(azar(40+k*5+j)-.5)*rx*0.55;cy+=ry*0.34;q.push([cx,cy]);}
    trazo(q,0.9,0.6);g.strokeStyle='rgba(235,235,245,.45)';g.lineWidth=0.9;g.stroke();
    trazo(q,0,0);g.strokeStyle='rgba(72,72,82,.9)';g.lineWidth=Math.max(1.2,rx*0.07);g.stroke();
  }
  g.restore();
  contorno();g.strokeStyle='rgba(18,18,24,.8)';g.lineWidth=1.1;g.stroke();
  // canto superior izquierdo, el que da a la luz
  g.strokeStyle='rgba(250,250,255,.55)';g.lineWidth=1.3;
  trazo(pts.slice(6,10),0.8,0.8);g.stroke();
  g.restore();
}
/* mata de matorral bajo: bolas de follaje apiladas, más claras arriba */
function mata(x,y,w,sem){
  g.save();
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y+2,w*0.6,w*0.16,0,0,7);g.fill();
  const cols=['#173520','#24512b','#3a7536','#5a9a48'];
  for(let c=0;c<4;c++)for(let i=0;i<5;i++){
    const h=Math.sin(sem*7.7+i*13.1+c*3.3)*43758.5453,r=h-Math.floor(h);
    g.fillStyle=cols[c];
    g.beginPath();g.arc(x+(i-2)*w*0.19+(r-.5)*w*0.12,y-c*w*0.07-r*w*0.08,w*(0.17-c*0.028)+r*2,0,7);g.fill();
  }
  g.restore();
}
function perimetroBosque(){
  const per=[];
  for(let a=180;a>=0;a-=6)per.push([240+224*Math.cos(a*RAD),260-224*Math.sin(a*RAD)]);
  per.push([464,258],[464,700],[430,700],[312,694],[240,760],[168,694],[86,650],[16,588]);
  return per.concat([[16,258]]);
}
function seta(x,y,k){
  const s=PS(y)*k,X=PX(x,y),Y=PY(y);
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(X,Y+1,7*s,2.4*s,0,0,7);g.fill();
  g.fillStyle='#efe6d0';g.fillRect(X-2*s,Y-7*s,4*s,7*s);
  g.fillStyle='#d9483a';g.beginPath();g.ellipse(X,Y-7*s,8*s,5.5*s,0,Math.PI,0);g.fill();
  g.fillStyle='#fff';
  [[-3.5,-9],[2.5,-10],[0,-7.6]].forEach(p=>{g.beginPath();g.arc(X+p[0]*s,Y+p[1]*s,1.1*s,0,7);g.fill();});
}
function tableroBosque(t){
  g.save();
  pathChain(perimetroBosque());g.closePath();
  const suelo=g.createLinearGradient(0,PY(0),0,PY(760));
  suelo.addColorStop(0,'#1d4a2a');suelo.addColorStop(.5,'#285a2e');suelo.addColorStop(1,'#1a3a1e');
  g.fillStyle=suelo;g.fill();
  g.clip();
  // claros de luz que se cuelan entre las copas
  [[150,140,70],[330,330,90],[200,520,80]].forEach(c=>{
    const X=PX(c[0],c[1]),Y=PY(c[1]),r=c[2]*PS(c[1]);
    const l=g.createRadialGradient(X,Y,2,X,Y,r);
    l.addColorStop(0,'rgba(230,255,170,.09)');l.addColorStop(1,'rgba(230,255,170,0)');
    g.fillStyle=l;g.beginPath();g.arc(X,Y,r,0,7);g.fill();
  });
  // matas de hierba (pseudoaleatorias: siempre en el mismo sitio)
  g.lineWidth=1.4;g.lineCap='round';
  for(let i=0;i<140;i++){
    const a=Math.sin(i*78.233)*43758.5453,b=Math.sin(i*12.9898)*43758.5453;
    const x=20+(a-Math.floor(a))*440,y=40+(b-Math.floor(b))*700,s=PS(y),X=PX(x,y),Y=PY(y);
    g.strokeStyle=i%3?'rgba(150,210,110,.16)':'rgba(10,36,12,.32)';
    g.beginPath();for(let k=-1;k<=1;k++){g.moveTo(X+k*2*s,Y);g.lineTo(X+k*3.6*s,Y-6*s);}g.stroke();
  }
  // hojarasca en la parte baja, junto a los flippers
  const tierra=g.createLinearGradient(0,PY(560),0,PY(760));
  tierra.addColorStop(0,'rgba(120,84,48,0)');tierra.addColorStop(1,'rgba(120,84,48,.34)');
  g.fillStyle=tierra;g.fillRect(0,PY(560),W,PY(760)-PY(560));
  for(let i=0;i<40;i++){
    const a=Math.sin(i*39.71)*43758.5453,b=Math.sin(i*7.13)*43758.5453;
    const x=30+(a-Math.floor(a))*420,y=560+(b-Math.floor(b))*180,s=PS(y);
    g.fillStyle=['rgba(200,120,50,.35)','rgba(170,90,40,.3)','rgba(220,170,70,.3)'][i%3];
    g.beginPath();g.ellipse(PX(x,y),PY(y),4*s,2*s,i*1.3,0,7);g.fill();
  }
  // centro de la mesa: la misma circunferencia partida que en la playa
  g.globalAlpha=.08;g.strokeStyle='#eaffff';g.lineWidth=6;
  g.beginPath();g.ellipse(PX(240,430),PY(430),110*PS(430),96*PS(430)*0.9,0,0,7);g.stroke();
  g.beginPath();g.moveTo(PX(130,430),PY(430));g.lineTo(PX(350,430),PY(430));g.stroke();
  g.globalAlpha=1;
  [[44,532,1],[58,546,0.7],[414,540,0.9]].forEach(m=>seta(m[0],m[1],m[2]));
  g.restore();
}
/* el carril de la cueva, la boca al fondo y el tope del saque, todo en roca */
function rocaCueva(){
  g.save();
  // suelo del carril: tierra oscura que se hunde hacia la cueva
  pathChain(CARRIL_EXT.concat(CARRIL_INT.slice().reverse()));g.closePath();
  const X=PX(CUEVA.x,CUEVA.y),Y=PY(CUEVA.y);
  const suelo=g.createLinearGradient(0,PY(250),0,PY(366));
  suelo.addColorStop(0,'#2a2a22');suelo.addColorStop(1,'#121310');
  g.fillStyle=suelo;g.fill();
  // la boca de la cueva, al fondo
  const os=g.createRadialGradient(X,Y,1,X,Y,24);
  os.addColorStop(0,'#000');os.addColorStop(.7,'#08090b');os.addColorStop(1,'rgba(20,22,26,0)');
  g.fillStyle=os;g.beginPath();g.ellipse(X,Y,17,15,0,0,7);g.fill();
  g.restore();
  // paredes del carril: roca más baja y fina que la de los setos, para que se vea el suelo
  // la pared interior entera en roca, también el tramo que cierra la cueva por abajo
  rocaFina([[[26,214],[18,240]].concat(CARRIL_EXT),CARRIL_INT]);
  // carril de Dragonite: suelo oscuro hasta la cámara y la misma roca fina en las paredes
  g.save();pathChain(DRA_PARED);g.closePath();
  const sueloD=g.createLinearGradient(PX(50,141),0,PX(-67,94),0);
  sueloD.addColorStop(0,'#2a2a22');sueloD.addColorStop(1,'#16140f');
  g.fillStyle=sueloD;g.fill();g.restore();
  rocaFina([DRA_PARED]);
  // el tope del saque: un triángulo macizo con el verde, el brillo y el canto de las paredes
  g.save();g.lineJoin='round';g.lineCap='round';
  pathChain(DESVIO);g.closePath();
  g.shadowColor=PAL_BOSQUE.brillo;g.shadowBlur=14;
  g.fillStyle=PAL_BOSQUE.muro;g.fill();
  g.strokeStyle=PAL_BOSQUE.muro;g.lineWidth=7;g.stroke();
  g.shadowBlur=0;g.strokeStyle=PAL_BOSQUE.canto;g.lineWidth=2;g.stroke();
  g.restore();
}
/* pared de roca baja: el mismo dibujo de capas que setoStroke, a la mitad de alto y de ancho */
function rocaFina(cadenas){
  g.save();g.lineCap='round';g.lineJoin='round';
  cadenas.forEach(ch=>{
    const path=off=>{g.beginPath();
      ch.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1])+off;i?g.lineTo(X,Y):g.moveTo(X,Y);});};
    path(5);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=13;g.stroke();
    path(2);g.strokeStyle='#26262e';g.lineWidth=12;g.stroke();
    path(-3);g.strokeStyle='#3e3e48';g.lineWidth=10;g.stroke();
    path(-6);g.strokeStyle='#5c5c68';g.lineWidth=6;g.stroke();
    path(-7.5);g.strokeStyle='#8a8a96';g.lineWidth=2.2;g.stroke();
  });
  g.restore();
}
/* troncos caídos a los lados de la pradera: el mismo volumen que los setos, en madera */
function dTroncos(){
  setoStroke(TRONCOS,['#24150a','#3f2814','#5e3c1e','#7d5430','#a8784a'],0);
  g.save();
  TRONCOS.forEach(ch=>{
    // solo se ve el corte del extremo de abajo, el que mira hacia nosotros, apoyado en el suelo
    {const p=ch[ch.length-1],s=PS(p[1]),X=PX(p[0],p[1]),Y=PY(p[1])+4*s;
      g.fillStyle='#4a2e18';g.beginPath();g.ellipse(X,Y+1.5*s,10.5*s,10.5*s,0,0,7);g.fill();
      g.fillStyle='#c9995e';g.beginPath();g.ellipse(X,Y,10*s,10*s,0,0,7);g.fill();
      g.strokeStyle='#7a5430';g.lineWidth=1.3;
      [7,3.6].forEach(r=>{g.beginPath();g.ellipse(X,Y,r*s,r*s,0,0,7);g.stroke();});}
    ch.forEach((p,i)=>{if(i%3!==1)return;               // manchas de musgo
      const s=PS(p[1]);g.fillStyle='rgba(120,190,80,.75)';
      g.beginPath();g.ellipse(PX(p[0],p[1]),PY(p[1])-17,6*s,3*s,0,0,7);g.fill();});
  });
  g.restore();
}
/* la espiral de Spinda (solo el trazado; cada uno pone su color y grosor) */
function espiral(cx,cy,esc){
  g.beginPath();
  for(let k=0;k<=24;k++){const a=k/24*Math.PI*3.4,r=(0.4+k*0.24)*esc;g.lineTo(cx+Math.cos(a)*r*1.2,cy+Math.sin(a)*r);}
}
function dCueva(t){
  const B=G.bosque,v=B.vm,p=B.sp;
  const X=PX(CUEVA.x,CUEVA.y),Y=PY(CUEVA.y),s=PS(CUEVA.y);
  const libre=cuevaLibre();
  g.save();
  // ojos de Venomoth brillando en la oscuridad (parpadean de vez en cuando)
  if(libre&&B.estado<2&&fr(t/170)>0.05){
    g.fillStyle='rgba(225,215,255,.9)';
    g.beginPath();g.ellipse(X-5*s,Y-6*s,2.6*s,3.2*s,0,0,7);g.ellipse(X+4*s,Y-6*s,2.6*s,3.2*s,0,0,7);g.fill();
    g.fillStyle='#1a1020';
    g.beginPath();g.arc(X-5*s,Y-5.4*s,1.2*s,0,7);g.arc(X+4*s,Y-5.4*s,1.2*s,0,7);g.fill();
  }
  // con las flores azules la que espera dentro es Spinda: sus ojos son dos espirales
  // como la del marcador encendido (y parpadean igual que los de Venomoth)
  if(libre&&B.estado>=2&&fr(t/170)>0.05){
    g.strokeStyle='#ff8fb0';g.lineWidth=1.4*s;g.lineCap='round';
    g.shadowColor='#ff8fb0';g.shadowBlur=8;
    [[X-5*s,Y-6*s],[X+5*s,Y-6*s]].forEach(o=>{espiral(o[0],o[1],0.6*s);g.stroke();});
  }
  g.restore();
  // marcador junto a la boca: flor roja, flor azul y la espiral de Spinda
  [[318,'#ff4a4a',B.estado>=1],[344,'#5aa8ff',B.estado>=2],[370,'#ff8fb0',!!p.fase]]
  .forEach((m,i)=>{
    const s2=PS(m[0]);
    g.save();g.translate(PX(62,m[0]),PY(m[0]));g.scale(s2,s2);
    g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(0,1.5,8,5,0,0,7);g.fill();
    if(m[2]){g.shadowColor=m[1];g.shadowBlur=10;}
    const col=m[2]?m[1]:'rgba(200,230,190,.2)';
    if(i<2){
      g.fillStyle=col;
      for(let k=0;k<5;k++){const a=k*1.2566;
        g.beginPath();g.ellipse(Math.cos(a)*3.4,Math.sin(a)*2.6,2.6,2.1,a,0,7);g.fill();}
      g.shadowBlur=0;g.fillStyle=m[2]?'#ffe14a':'rgba(200,230,190,.25)';
      g.beginPath();g.arc(0,0,1.6,0,7);g.fill();
    } else {
      g.strokeStyle=col;g.lineWidth=1.8;g.lineCap='round';espiral(0,0,1);g.stroke();
    }
    g.restore();
  });
}
function dAgua(t){
  g.save();g.lineCap='round';g.lineJoin='round';
  const curso=()=>{g.beginPath();
    ARROYO.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1]);i?g.lineTo(X,Y):g.moveTo(X,Y);});};
  curso();g.strokeStyle='rgba(18,36,16,.55)';g.lineWidth=20;g.stroke();
  curso();g.strokeStyle='#2c6f94';g.lineWidth=14;g.stroke();
  curso();g.strokeStyle='rgba(120,200,235,.5)';g.lineWidth=7;g.stroke();
  [POZA,ESTANQUE].forEach((E,i)=>{
    const s=PS(E.y),X=PX(E.x,E.y),Y=PY(E.y),RX=E.rx*s,RY=E.ry*s;
    g.fillStyle='rgba(18,36,16,.6)';g.beginPath();g.ellipse(X,Y+2,RX+5,RY+4,0,0,7);g.fill();
    const ag=g.createRadialGradient(X-RX*.3,Y-RY*.4,2,X,Y,RX);
    ag.addColorStop(0,'#7fd0ec');ag.addColorStop(.6,'#2f7fa8');ag.addColorStop(1,'#1d5878');
    g.fillStyle=ag;g.beginPath();g.ellipse(X,Y,RX,RY,0,0,7);g.fill();
    g.lineWidth=1.3;                                   // ondas: rápidas en la poza, lentas en el estanque
    for(let k=0;k<3;k++){const ph=fr(t/(i?150:60)+k/3);
      g.strokeStyle='rgba(225,248,255,'+(0.5*(1-ph))+')';
      g.beginPath();g.ellipse(X,Y,RX*(0.2+ph*0.75),RY*(0.2+ph*0.75),0,0,7);g.stroke();}
  });
  // nenúfares en el estanque
  const E=ESTANQUE,s=PS(E.y);
  [[-14,4,0.4],[16,-5,2.2],[4,9,4.1]].forEach(n=>{
    const X=PX(E.x+n[0],E.y+n[1]),Y=PY(E.y+n[1]);
    g.fillStyle='#4f9a3c';g.beginPath();g.moveTo(X,Y);g.ellipse(X,Y,6*s,3.6*s,0,n[2],n[2]+5.6);g.closePath();g.fill();
  });
  g.fillStyle='#ffb0d0';g.beginPath();g.arc(PX(E.x+16,E.y-5),PY(E.y-5)-1,1.9*s,0,7);g.fill();
  g.restore();
}
/* la cascada: el río llega desde arriba a la derecha entre orillas de roca, se
   revuelve, gira hacia el borde del acantilado y se despeña; pasa por encima del
   carril del lanzador y rompe en la poza que hay dentro de la mesa.
   RIO va en coordenadas de pantalla y su último tramo baja en vertical: ahí el
   cauce queda de frente y encaja con la boca del salto. */
const RIO=[[500,20],[462,27],[426,34],[398,40],[374,45],[358,48],[351,53],[350,60]];
const azarRio=v=>{const s=Math.sin(v*12.9898)*43758.5453;return s-Math.floor(s);};
/* la geometría del río no cambia: se calcula una sola vez */
let GEO_RIO=null;
const ZONA_RIO=[300,0,180,110];   // rectángulo de pantalla que ocupan el río y sus orillas
function geoRio(){
  if(GEO_RIO)return GEO_RIO;
  const xb=PX(POZA.x,POZA.y),yb=PY(POZA.y);
  // cortes transversales del cauce con su normal: A es la orilla lejana, B la cercana
  const N=28,S=[];
  for(let i=0;i<=N;i++){
    const u=i/N,p=sobreRuta(RIO,u),a=sobreRuta(RIO,Math.max(0,u-0.03)),b=sobreRuta(RIO,Math.min(1,u+0.03));
    const dir=Math.atan2(b[1]-a[1],b[0]-a[0]);
    S.push({u,x:p[0],y:p[1],dir,nx:-Math.sin(dir),ny:Math.cos(dir),w:16-u*3});
  }
  const corte=u=>S[Math.min(N,Math.round(u*N))];
  const orilla=(s,lado,e)=>[s.x+s.nx*lado*(s.w+e),s.y+s.ny*lado*(s.w+e)];
  const banda=(e1,e2)=>{g.beginPath();
    S.forEach((s,i)=>{const p=orilla(s,1,e1);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
    for(let i=N;i>=0;i--){const p=orilla(S[i],-1,e2);g.lineTo(p[0],p[1]);}
    g.closePath();};
  return GEO_RIO={xb,yb,x0:xb-13,x1:xb+13,y0:RIO[RIO.length-1][1],N,S,corte,orilla,banda};
}
/* capas fijas del río (lecho, orillas, piedras): se pintan una vez y luego solo se copian */
function rioFondo(){
  const {S,corte,orilla,banda}=geoRio(),azar=azarRio;
  g.save();g.lineCap='round';g.lineJoin='round';
  // lecho excavado en la roca: da hondura al cauce
  banda(5,5);g.fillStyle='#17252b';g.fill();
  // agua: oscura bajo la orilla lejana, que le hace sombra, y más clara hacia la cercana
  banda(0,0);
  const agua=g.createLinearGradient(0,8,0,72);
  agua.addColorStop(0,'#173f56');agua.addColorStop(.4,'#2f7ea4');agua.addColorStop(1,'#5aa6c8');
  g.fillStyle=agua;g.fill();
  g.beginPath();S.forEach((s,i)=>{const p=orilla(s,1,-2);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
  g.strokeStyle='rgba(8,24,34,.4)';g.lineWidth=5;g.stroke();
  // orilla lejana: rocas más pequeñas y en sombra, por detrás de todo lo demás
  for(let k=0;k<12;k++){const s=corte(k/12+0.02),p=orilla(s,1,2+azar(k+300)*3);
    piedra(p[0],p[1],5+azar(k+310)*5,3.5+azar(k+320)*2.5,80+k,0,0.3);}
  g.restore();
}
function rioDelante(){
  const {N,S,corte,orilla}=geoRio(),azar=azarRio;
  g.save();g.lineCap='round';g.lineJoin='round';
  // piedras en mitad de la corriente: cojín de espuma aguas arriba y estela en V aguas abajo
  [[0.3,-0.35,6,4.2,31],[0.6,0.4,5,3.5,32]].forEach(r=>{
    const s=corte(r[0]),lat=r[1]*s.w,x=s.x+s.nx*lat,y=s.y+s.ny*lat;
    const dx=Math.cos(s.dir),dy=Math.sin(s.dir);
    g.fillStyle='rgba(240,250,255,.6)';
    g.beginPath();g.ellipse(x-dx*r[2]*0.7,y-dy*r[2]*0.7,r[2]*1.1,r[3]*1.2,s.dir,0,7);g.fill();
    g.strokeStyle='rgba(235,248,255,.5)';g.lineWidth=1.2;
    [-1,1].forEach(l=>{g.beginPath();
      g.moveTo(x+dx*r[2]+s.nx*l*r[3],y+dy*r[2]+s.ny*l*r[3]);
      g.quadraticCurveTo(x+dx*(r[2]+8)+s.nx*l*(r[3]+2),y+dy*(r[2]+8)+s.ny*l*(r[3]+2),
                         x+dx*(r[2]+16)+s.nx*l*(r[3]+6),y+dy*(r[2]+16)+s.ny*l*(r[3]+6));g.stroke();});
    piedra(x,y,r[2],r[3],r[4],0);
  });
  // orilla cercana: el frente de roca del cauce (su grosor) y dos filas de piedras encima
  g.beginPath();
  S.forEach((s,i)=>{const p=orilla(s,-1,3);i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});
  for(let i=N;i>=0;i--){const p=orilla(S[i],-1,3);g.lineTo(p[0],p[1]+11);}
  g.closePath();
  const frente=g.createLinearGradient(0,20,0,90);
  frente.addColorStop(0,'#4a4a55');frente.addColorStop(1,'#26262e');
  g.fillStyle=frente;g.fill();
  for(let k=0;k<8;k++){const s=corte(k/8+0.07),p=orilla(s,-1,12+azar(k+330)*4);
    piedra(p[0],p[1],9+azar(k+340)*6,6+azar(k+350)*3,100+k,k%2,0.1);}
  for(let k=0;k<11;k++){const s=corte(k/11+0.02),p=orilla(s,-1,4+azar(k+360)*3);
    piedra(p[0],p[1],6+azar(k+370)*6,4.5+azar(k+380)*3,120+k,k%4===0?1:0);}
  g.restore();
}
function rioPenas(){
  const {xb,y0}=geoRio();
  // dos peñas enmarcan el salto
  // la de la izquierda va arriba, pegada a la orilla, tapando el filo oscuro del cauce
  piedra(xb-12,y0-12,9.1,8.4,71,1,0,true);piedra(xb+25,y0+5,13,10,72,1,0.05);
}
/* cada frame solo se pinta lo que se mueve: la espuma, la columna y las salpicaduras */
function dCascada(t){
  const {xb,yb,x0,x1,y0,corte}=geoRio(),azar=azarRio;
  copiaCapa('rioFondo',rioFondo,ZONA_RIO[0],ZONA_RIO[1],ZONA_RIO[2],ZONA_RIO[3]);
  // corriente: estelas de espuma alineadas con el agua, más rápidas y densas hacia el salto
  for(let i=0;i<70;i++){
    const u=fr(t*(0.006+0.007*azar(i))+azar(i+50)),s=corte(u);
    const lat=(azar(i+100)*2-1)*s.w*0.8+Math.sin(t/6+i)*1.4;
    const largo=3+azar(i+110)*5+u*5,grueso=0.8+azar(i+120)*1.1;
    const al=(0.2+0.45*azar(i+130))*Math.min(1,u*6)*(0.6+0.4*Math.sin(t/4+i));
    g.fillStyle='rgba(238,250,255,'+al+')';
    g.beginPath();g.ellipse(s.x+s.nx*lat,s.y+s.ny*lat,largo,grueso,s.dir,0,7);g.fill();
  }
  // agua blanca en el último tramo: el río se acelera y se rompe antes de caer
  for(let k=0;k<16;k++){
    const u=0.8+azar(k+140)*0.2,s=corte(u),lat=(azar(k+150)*2-1)*s.w*0.85;
    g.fillStyle='rgba(245,252,255,'+(0.35+0.3*Math.sin(t/3+k*1.7))+')';
    g.beginPath();g.arc(s.x+s.nx*lat+Math.sin(t/5+k)*1.2,s.y+s.ny*lat,1.8+azar(k+160)*2.4,0,7);g.fill();
  }
  copiaCapa('rioDelante',rioDelante,ZONA_RIO[0],ZONA_RIO[1],ZONA_RIO[2],ZONA_RIO[3]);
  // caída: columna con hilos ondulantes continuos y trozos de espuma que se desploman
  g.save();g.lineCap='round';g.lineJoin='round';
  const gr=g.createLinearGradient(x0,0,x1,0);
  gr.addColorStop(0,'rgba(150,205,230,.85)');gr.addColorStop(.45,'rgba(236,250,255,.95)');gr.addColorStop(1,'rgba(140,195,225,.85)');
  g.fillStyle=gr;
  g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y0);g.lineTo(x1+2,yb);g.lineTo(x0-2,yb);g.closePath();g.fill();
  for(let i=0;i<5;i++){
    g.strokeStyle=i%2?'rgba(255,255,255,.45)':'rgba(110,170,205,.4)';g.lineWidth=1.4;
    g.beginPath();
    for(let y=y0;y<=yb;y+=6){const x=x0+4+i*(x1-x0-8)/4+Math.sin(y/13+t/5+i*1.3)*1.3+(y-y0)/(yb-y0)*(i-2)*0.8;
      y===y0?g.moveTo(x,y):g.lineTo(x,y);}
    g.stroke();
  }
  for(let i=0;i<12;i++){
    const ph=fr(t/38+azar(i+400)),y=y0+ph*ph*(yb-y0),x=x0+3+azar(i+410)*(x1-x0-6);
    g.fillStyle='rgba(255,255,255,'+(0.65*(1-ph*0.5))+')';
    g.beginPath();g.ellipse(x,y,1.6,3+ph*4,0,0,7);g.fill();
  }
  // labio: el agua se curva sobre el borde, con brillo arriba y sombra justo debajo
  g.fillStyle='rgba(80,140,180,.35)';g.beginPath();g.ellipse(xb,y0+6,13,3,0,0,7);g.fill();
  const labio=g.createLinearGradient(0,y0-4,0,y0+4);
  labio.addColorStop(0,'rgba(170,220,240,.9)');labio.addColorStop(.5,'rgba(250,254,255,1)');labio.addColorStop(1,'rgba(170,215,235,.8)');
  g.fillStyle=labio;g.beginPath();g.ellipse(xb,y0,13.5,3.6,0,0,7);g.fill();
  g.restore();
  copiaCapa('rioPenas',rioPenas,ZONA_RIO[0],ZONA_RIO[1],ZONA_RIO[2],ZONA_RIO[3]);
  for(let k=0;k<9;k++){const ph=fr(t/45+k/9);          // espuma y salpicaduras al pie
    g.fillStyle='rgba(240,252,255,'+(0.55*(1-ph))+')';
    g.beginPath();g.arc(xb+(k-4)*3.6+Math.sin(k*2.3+t/20)*2,yb-2-ph*16,2.4+ph*5,0,7);g.fill();}
}
function dPradera(t){
  const B=G.bosque,P=PRADERA,s=PS(P.y),X=PX(P.x,P.y),Y=PY(P.y),RX=P.rx*s,RY=P.ry*s*0.92;
  // el contorno no es un óvalo perfecto, como la ciénaga de la playa
  const borde=(esc,off)=>{g.beginPath();
    for(let a=0;a<=64;a++){const an=a/64*Math.PI*2;
      const rz=Math.sin(a*2.3)*0.04+Math.sin(a*0.7+1.3)*0.05;
      g.lineTo(X+Math.cos(an)*RX*(esc+rz),Y+off+Math.sin(an)*RY*(esc+rz));}
    g.closePath();};
  g.save();
  borde(1.07,4);g.fillStyle='rgba(0,0,0,.28)';g.fill();
  borde(1.05,0);g.fillStyle='#4a3a1e';g.fill();
  borde(0.98,0);
  const pasto=g.createRadialGradient(X-RX*.25,Y-RY*.3,4,X,Y,RX);
  pasto.addColorStop(0,'#a9e07c');pasto.addColorStop(.6,'#77bd50');pasto.addColorStop(1,'#4c8a36');
  g.fillStyle=pasto;g.fill();
  if(B.nivel>0&&!B.marchita){g.fillStyle=B.nivel===2?'rgba(130,160,255,.10)':'rgba(255,110,110,.09)';g.fill();}
  g.save();borde(0.98,0);g.clip();
  // briznas que se mecen con la brisa
  g.lineWidth=1.3;g.lineCap='round';
  for(let i=0;i<64;i++){
    const a=Math.sin(i*91.7)*43758.5453,b=Math.sin(i*37.1)*43758.5453;
    const an=(a-Math.floor(a))*7,rr=Math.sqrt(b-Math.floor(b))*0.95;
    const bx=X+Math.cos(an)*RX*rr,by=Y+Math.sin(an)*RY*rr,m=Math.sin(t/30+i)*1.6;
    g.strokeStyle=i%2?'rgba(40,100,30,.55)':'rgba(205,245,160,.5)';
    g.beginPath();g.moveTo(bx-2,by);g.quadraticCurveTo(bx-2,by-4,bx-2+m,by-7);
    g.moveTo(bx+2,by);g.quadraticCurveTo(bx+2,by-3,bx+2+m,by-6);g.stroke();
  }
  g.restore();
  g.strokeStyle='rgba(30,50,16,.45)';g.lineWidth=2;borde(0.98,0);g.stroke();
  g.restore();
}
function dFlores(t){
  const B=G.bosque;if(!B.flores.length)return;
  g.save();
  if(B.marchita>0)g.globalAlpha=B.marchita/40;
  for(const f of B.flores){
    if(!f.nace)continue;
    // brota con un pequeño rebote (easeOutBack) y luego se mece
    const k=Math.min(1,f.nace/18),q=k-1;
    const esc=Math.max(0.02,k<1?1+2.7*q*q*q+1.7*q*q:1)*f.tam;
    const s=PS(f.y)*esc,X=PX(f.x,f.y),Y=PY(f.y),mece=Math.sin(t/36+f.fase)*1.5*s;
    const col=f.color==='roja'?['#ff5a4a','#d42a3a']:['#6ab0ff','#3a6fe0'];
    g.strokeStyle='#3a7a30';g.lineWidth=Math.max(1,1.5*s);
    g.beginPath();g.moveTo(X,Y);g.quadraticCurveTo(X,Y-4*s,X+mece,Y-8*s);g.stroke();
    const cx=X+mece,cy=Y-9*s;
    for(let p=0;p<5;p++){const a=p*1.2566+f.fase;
      g.fillStyle=col[p%2];
      g.beginPath();g.ellipse(cx+Math.cos(a)*3.1*s,cy+Math.sin(a)*2.5*s,2.6*s,2*s,a,0,7);g.fill();}
    g.fillStyle='#ffe14a';g.beginPath();g.arc(cx,cy,1.5*s,0,7);g.fill();
  }
  g.restore();
}
/* dibujos de repuesto mientras no carguen los gifs */
function bounsweetPropio(X,Y,s){
  g.save();g.translate(X,Y);g.scale(s,s);
  g.fillStyle='#d94a8c';g.beginPath();g.ellipse(0,2,17,14,0,0,7);g.fill();
  g.fillStyle='#f2ecd8';g.beginPath();g.ellipse(0,11,13,5,0,0,7);g.fill();
  g.fillStyle='#8fd36a';
  [-0.9,0,0.9].forEach(a=>{g.save();g.translate(0,-11);g.rotate(a);
    g.beginPath();g.ellipse(0,-6,4,8,0,0,7);g.fill();g.restore();});
  ojo(g,-5,2,1.8);ojo(g,5,2,1.8);
  g.restore();
}
function venomothPropio(X,Y,s,t){
  g.save();g.translate(X,Y);g.scale(s,s);
  const al=Math.sin(t/3)*0.4;
  g.fillStyle='rgba(228,214,248,.92)';
  g.save();g.rotate(-al);g.beginPath();g.ellipse(-20,-6,20,12,-0.4,0,7);g.fill();g.restore();
  g.save();g.rotate(al);g.beginPath();g.ellipse(20,-6,20,12,0.4,0,7);g.fill();g.restore();
  g.fillStyle='#d8d0e0';g.beginPath();g.ellipse(0,6,7,11,0,0,7);g.fill();
  g.fillStyle='#9b84c4';g.beginPath();g.ellipse(0,-8,8,7,0,0,7);g.fill();
  g.strokeStyle='#9b84c4';g.lineWidth=1.6;
  g.beginPath();g.moveTo(-2,-14);g.lineTo(-6,-24);g.moveTo(2,-14);g.lineTo(6,-24);g.stroke();
  g.fillStyle='#fff';g.beginPath();g.arc(-4,-8,3,0,7);g.arc(4,-8,3,0,7);g.fill();
  g.fillStyle='#1a1418';g.beginPath();g.arc(-4,-8,1.4,0,7);g.arc(4,-8,1.4,0,7);g.fill();
  g.restore();
}
function spindaPropio(X,Y,s,t){
  g.save();g.translate(X,Y);g.scale(s,s);g.rotate(Math.sin(t/14)*0.12);
  g.fillStyle='#f2e6d0';
  g.beginPath();g.ellipse(-8,-24,5,9,-0.4,0,7);g.ellipse(8,-24,5,9,0.4,0,7);g.fill();
  g.beginPath();g.ellipse(0,6,11,12,0,0,7);g.fill();
  g.beginPath();g.ellipse(0,-10,12,10,0,0,7);g.fill();
  g.fillStyle='#e0605a';
  g.beginPath();g.arc(-6,-14,4,0,7);g.arc(7,-8,3.5,0,7);g.arc(-3,8,4,0,7);g.fill();
  g.strokeStyle='#3a2a28';g.lineWidth=1.3;
  [[-4.5,-9],[4.5,-9]].forEach(p=>{g.beginPath();
    for(let k=0;k<=14;k++){const a=k/14*Math.PI*3,r=0.3+k*0.17;g.lineTo(p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r);}
    g.stroke();});
  g.restore();
}
function machampPropio(X,Y,s,t,golpe){
  g.save();g.translate(X,Y);g.scale(s,s);g.lineCap='round';
  const piel='#8f9aa8',osc='#5f6876',alza=golpe?-12:0;
  g.fillStyle=osc;g.beginPath();g.ellipse(-8,14,6,9,0.2,0,7);g.ellipse(8,14,6,9,-0.2,0,7);g.fill();
  g.fillStyle=piel;g.beginPath();g.ellipse(0,-4,15,16,0,0,7);g.fill();
  g.fillStyle='#2a2a30';g.fillRect(-12,6,24,5);g.fillStyle='#f2c530';g.fillRect(-3,6,6,5);
  // cuatro brazos: los de arriba suben del todo en el gancho
  g.strokeStyle=piel;g.lineWidth=6;
  g.beginPath();g.moveTo(-12,-12);g.lineTo(-18,-24+alza);g.moveTo(12,-12);g.lineTo(18,-24+alza);
  g.moveTo(-13,-2);g.lineTo(-22,4);g.moveTo(13,-2);g.lineTo(22,4);g.stroke();
  g.fillStyle=piel;
  [[-18,-26+alza],[18,-26+alza],[-23,5],[23,5]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],4.5,0,7);g.fill();});
  g.beginPath();g.ellipse(0,-22,8,7,0,0,7);g.fill();
  g.fillStyle=osc;g.beginPath();g.moveTo(-5,-27);g.lineTo(0,-36);g.lineTo(5,-27);g.closePath();g.fill();
  ojo(g,-3,-23,1.6,'#c0303a');ojo(g,3,-23,1.6,'#c0303a');
  g.restore();
}
function dBounsweet(b,t){
  const s=PS(b.y),X=PX(b.x,b.y),pie=PY(b.y)+21*s;
  // al recibir la bola se aplasta y rebota
  const sq=b.lit>0?1+Math.sin(b.lit/14*Math.PI)*0.2:1;
  g.save();g.translate(X,pie);g.scale(sq,1/sq);g.translate(-X,-pie);
  if(!actorGif('bounsweet-decoracion',b.x,b.y,21)&&!actorImg('bounsweet-decoracion',b.x,b.y,21)){
    g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(X,pie,17*s,4.5*s,0,0,7);g.fill();
    bounsweetPropio(X,pie-16*s,s);
  }
  g.restore();
}
function dSpinda(t){
  const p=G.bosque.sp;if(!p.fase)return;
  const a=p.fase==='sale'?Math.min(1,p.t/20):p.fase==='vuelve'?clamp((100-p.t)/20,0,1):1;
  if(a<=0)return;
  const s=PS(p.y),X=PX(p.x,p.y),Y=PY(p.y);
  g.save();g.globalAlpha=a;
  g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(X,Y+SP_ALTO*1.5*s,15*s,4*s,0,0,7);g.fill();
  g.restore();
  if(!gifCentrado('spinda-decoracion',p.x,p.y,SP_ALTO,a,p.z)){
    g.save();g.globalAlpha=a;spindaPropio(X,Y-p.z*s,s*1.3,t);g.restore();}
  if(p.fase==='vuelve'){                     // estrellitas de mareo
    g.save();g.globalAlpha=a;g.fillStyle='#ffe14a';
    for(let k=0;k<3;k++){const an=t/8+k*2.1;
      g.beginPath();g.arc(X+Math.cos(an)*14*s,Y-p.z*s-SP_ALTO*1.4*s+Math.sin(an)*4*s,2.2*s,0,7);g.fill();}
    g.restore();
  }
}
function dVenomoth(t){
  const v=G.bosque.vm;if(!v.fase)return;
  const a=v.fase==='sale'?Math.min(1,v.t/18):v.fase==='vuelve'?clamp((60-v.t)/15,0,1):1;
  if(a<=0)return;
  const s=PS(v.y),X=PX(v.x,v.y),Y=PY(v.y),Yv=Y-v.z*s;
  g.save();g.globalAlpha=a;
  // sombra en el suelo: más pequeña y tenue cuanto más alto vuela
  const sh=1/(1+v.z/30);
  g.fillStyle='rgba(0,0,0,'+(0.3*sh)+')';
  g.beginPath();g.ellipse(X,Y+18*s,30*s*sh,7*s*sh,0,0,7);g.fill();
  if(v.fase==='poliniza'){                   // nube de polen que lo envuelve
    const gl=g.createRadialGradient(X,Yv,4,X,Yv,46*s);
    gl.addColorStop(0,'rgba(255,190,90,.32)');gl.addColorStop(1,'rgba(255,150,50,0)');
    g.fillStyle=gl;g.beginPath();g.arc(X,Yv,46*s,0,7);g.fill();
  }
  if(v.flash>0){g.globalAlpha=a*v.flash/14*0.6;g.fillStyle='#fff';
    g.beginPath();g.arc(X,Yv,34*s,0,7);g.fill();}
  g.restore();
  if(!gifCentrado('venomoth-decoracion',v.x,v.y,VM_ALTO,a,v.z)){
    g.save();g.globalAlpha=a;venomothPropio(X,Yv,s,t);g.restore();}
}
function dPolen(t){
  const P=G.bosque.polen;if(!P.length)return;
  g.save();
  for(const p of P){
    const q=posPolen(p),s=PS(q.y),X=PX(q.x,q.y),Y=PY(q.y)-q.z*s;
    const a=p.flor?1:1-p.t/p.dur;
    g.globalAlpha=0.35*a;g.fillStyle='#ffb347';g.beginPath();g.arc(X,Y,4.6*s,0,7);g.fill();
    g.globalAlpha=0.95*a;g.fillStyle=(p.t>>2)%2?'#ffd27a':'#ff9a2e';
    g.beginPath();g.arc(X,Y,1.9*s,0,7);g.fill();
  }
  g.restore();
}
function dMachamp(t){
  const B=G.bosque,M=MACHAMP,s=PS(M.y),X=PX(M.x,M.y),Y=PY(M.y);
  // roca agrietada sobre la que planta los pies
  piedra(X,Y+29*s,31*s,13*s,11,2);
  // mientras carga el gancho tiembla de la tensión
  const tiembla=G.charging&&ball.state==='ready'?Math.sin(t*1.9)*G.charge*1.6:0;
  g.save();g.translate(tiembla,0);
  if(!actorGif('machamp-decoracion',M.x,M.y,22)&&!actorImg('machamp-decoracion',M.x,M.y,22))
    machampPropio(X,Y-4*s,s,t,B.gancho>0);
  g.restore();
}
/* Dragonite en su cámara, dando coletazos; destella al golpear la bola */
function dDragonite(t){
  const B=G.bosque,D=DRAGONITE,s=PS(D.y),X=PX(D.x,D.y),Y=PY(D.y);
  g.save();
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(X+4*s,Y+14*s,20*s,5*s,0,0,7);g.fill();
  if(!gifCentrado('dragonite-decoracion',D.x+6,D.y-6,24)){
    g.save();g.translate(X,Y-6*s);g.scale(s,s);
    g.fillStyle='#f2b84a';g.beginPath();g.ellipse(0,0,13,16,0,0,7);g.fill();
    g.fillStyle='#f7e3b0';g.beginPath();g.ellipse(0,4,8,10,0,0,7);g.fill();
    g.fillStyle='#3fae9c';g.beginPath();g.ellipse(-14,-6,8,4,-0.6,0,7);g.ellipse(14,-6,8,4,0.6,0,7);g.fill();
    g.restore();
  }
  if(B.draGolpe>0){g.globalAlpha=B.draGolpe/18*0.6;g.fillStyle='#fff';
    g.beginPath();g.arc(X+4*s,Y-6*s,26*s,0,7);g.fill();}
  g.restore();
}
/* Politoed asomando del estanque: solo se ve la mitad de arriba, por encima del agua */
function dPolitoed(t){
  const P=G.bosque.pol,k=asomaP();
  if(k<=0)return;
  const s=PS(POLITOED.y),X=PX(POLITOED.x,POLITOED.y),agua=PY(POLITOED.y);
  g.save();
  g.beginPath();g.rect(0,0,W,agua);g.clip();
  const alza=-POLITOED.alto*1.5*(1-k);   // sube desde debajo del agua
  if(!gifCentrado('politoed-decoracion',POLITOED.x,POLITOED.y,POLITOED.alto,0,alza)){
    const Yc=agua-alza*s;
    g.fillStyle='#5fbf4a';g.beginPath();g.ellipse(X,Yc-14*s,13*s,12*s,0,0,7);g.fill();
    g.strokeStyle='#2f5f9f';g.lineWidth=2*s;g.beginPath();g.moveTo(X,Yc-26*s);g.quadraticCurveTo(X+6*s,Yc-34*s,X+2*s,Yc-38*s);g.stroke();
    ojo(g,X-5*s,Yc-17*s,2*s);ojo(g,X+5*s,Yc-17*s,2*s);
  }
  g.restore();
  // onda en el agua alrededor de donde asoma
  g.save();g.strokeStyle='rgba(225,248,255,'+(0.5*k)+')';g.lineWidth=1.4;
  const ph=fr(t/40);
  g.beginPath();g.ellipse(X,agua,(14+ph*10)*s,(4+ph*3)*s,0,0,7);g.stroke();
  g.restore();
}
function dibujaBosque(t){
  fondoBosque(t);
  g.drawImage(capaMesa(),0,0);
  dAgua(t);dCascada(t);dPolitoed(t);
  dDragonite(t);dCueva(t);
  dPradera(t);dFlores(t);
  BOUNSWEETS.forEach(b=>dBounsweet(b,t));
  dSpinda(t);dVenomoth(t);dPolen(t);
  if(G.capAnim)drawCaptura(t);
  else if(G.mode==='captura')drawWild(t);
}

/* ============================================================
   RENDER
   ============================================================ */
function roundRectPath(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function sombrilla(x,y,r,col){
  g.save();g.translate(x,y);
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(4,30,r*0.9,4,0,0,7);g.fill();
  g.strokeStyle='#6a4a32';g.lineWidth=3;g.lineCap='round';
  g.beginPath();g.moveTo(0,2);g.lineTo(0,29);g.stroke();
  for(let k=0;k<5;k++){
    g.fillStyle=k%2?'#f2ecd8':col;
    g.beginPath();g.moveTo(0,0);
    g.arc(0,0,r,Math.PI+k*Math.PI/5,Math.PI+(k+1)*Math.PI/5);g.closePath();g.fill();
  }
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;
  g.beginPath();g.arc(0,0,r,Math.PI,0);g.stroke();
  g.fillStyle='#6a4a32';g.beginPath();g.arc(0,-r,2.5,0,7);g.fill();
  g.restore();
}
function fondo(t){
  // cielo de atardecer
  const sky=g.createLinearGradient(0,0,0,246);
  sky.addColorStop(0,'#1a1440');sky.addColorStop(.55,'#5c2a5c');sky.addColorStop(1,'#c25a3a');
  g.fillStyle=sky;g.fillRect(-20,-20,W+40,266);
  const sol=g.createRadialGradient(240,208,4,240,208,90);
  sol.addColorStop(0,'rgba(255,220,140,.8)');sol.addColorStop(1,'rgba(255,180,90,0)');
  g.fillStyle=sol;g.beginPath();g.arc(240,208,90,0,7);g.fill();
  g.fillStyle='rgba(255,235,180,.85)';g.beginPath();g.arc(240,214,17,0,7);g.fill();
  // mar con reflejo del sol
  const mar=g.createLinearGradient(0,226,0,296);
  mar.addColorStop(0,'#3a3a7a');mar.addColorStop(1,'#2a5a7c');
  g.fillStyle=mar;g.fillRect(-20,226,W+40,70);
  g.fillStyle='rgba(255,200,130,.22)';g.fillRect(206,226,68,70);
  // olas: crestas de espuma que avanzan hacia la orilla
  g.strokeStyle='rgba(240,250,255,.5)';g.lineWidth=2;g.lineCap='round';
  for(let f=0;f<4;f++){
    const oy=234+f*15+Math.sin(t/40+f)*1.5, av=(t*(0.5+f*0.14)+f*60)%90;
    g.beginPath();
    for(let x=-40+av;x<W+20;x+=90){
      g.moveTo(x,oy);g.quadraticCurveTo(x+16,oy-5,x+32,oy);
    }
    g.stroke();
  }
  // orilla: espuma del borde y arena mojada
  const rompiente=292+Math.sin(t/50)*3;
  g.fillStyle='#9a7a5c';g.fillRect(-20,rompiente,W+40,14);
  g.strokeStyle='rgba(245,250,255,.75)';g.lineWidth=3.5;
  g.beginPath();
  for(let x=-20;x<W+20;x+=26)
    g.quadraticCurveTo(x+7,rompiente-4+Math.sin(t/22+x)*1.6,x+13,rompiente),
    g.quadraticCurveTo(x+20,rompiente+3,x+26,rompiente);
  g.stroke();
  // arena al atardecer
  const arena=g.createLinearGradient(0,300,0,H);
  arena.addColorStop(0,'#5a4026');arena.addColorStop(.5,'#3c2a1a');arena.addColorStop(1,'#221810');
  g.fillStyle=arena;g.fillRect(-20,302,W+40,H-282);
  g.fillStyle='rgba(242,216,160,.07)';
  for(let i=0;i<34;i++){
    const x=(i*127)%(W+20)-10, y=330+(i*211)%(H-360);
    g.beginPath();g.arc(x,y,1.6,0,7);g.fill();
  }
  // sombrilla plantada en la arena, a la derecha de la mesa
  sombrilla(432,278,22,'#3a8fd8');
}
/* lugia cruza el cielo de derecha a izquierda cada 5 segundos */
function dLugia(t){
  const P=300,D=210,ph=t%P;      // 5 s de ciclo, 3,5 s de vuelo
  if(ph>=D)return;
  const pr=ph/D, x=520-pr*600, y=38+Math.sin(pr*6.3)*6;
  const rep=GIFS.lugia;
  if(rep){
    const h=40*ESCALA_SPRITE, w=h*(rep.W/rep.H);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(rep.lienzo(),x-w/2,y-h/2,w,h);g.restore();return;
  }
  if(spriteListo('lugia')){
    const im=SPRITE_CACHE.lugia,h=40*ESCALA_SPRITE,w=h*(im.naturalWidth/im.naturalHeight);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(im,x-w/2,y-h/2,w,h);g.restore();return;
  }
  g.save();g.translate(x,y);
  const al=Math.sin(t/4)*0.55;
  g.fillStyle='#e8ecf2';
  g.save();g.rotate(-0.15-al);g.beginPath();g.ellipse(-6,-8,22,6,-0.5,0,7);g.fill();g.restore();
  g.save();g.rotate(0.15+al);g.beginPath();g.ellipse(-6,8,22,6,0.5,0,7);g.fill();g.restore();
  g.beginPath();g.ellipse(0,0,17,7.5,0,0,7);g.fill();
  g.beginPath();g.moveTo(14,-2);g.quadraticCurveTo(24,-8,29,-6);g.lineTo(27,-1);g.quadraticCurveTo(20,1,14,3);g.closePath();g.fill();
  g.fillStyle='#3a4a7c';
  g.beginPath();g.moveTo(-4,-6);g.lineTo(0,-10);g.lineTo(3,-6);g.closePath();
  g.moveTo(-11,-5);g.lineTo(-8,-9);g.lineTo(-5,-5);g.closePath();g.fill();
  g.fillStyle='#e8ecf2';
  g.beginPath();g.moveTo(-15,-2);g.lineTo(-26,-5);g.lineTo(-24,0);g.lineTo(-26,5);g.lineTo(-15,2);g.closePath();g.fill();
  g.fillStyle='#1a2438';g.beginPath();g.arc(26,-5,1.3,0,7);g.fill();
  g.restore();
}
/* snorlax dormido en la esquina inferior izquierda de la pantalla */
function toallaSnorlax(x,y){
  g.save();g.translate(x+10,y-16);g.rotate(-0.05);
  // sombra de la tela sobre la arena
  g.fillStyle='rgba(0,0,0,.28)';
  g.beginPath();g.ellipse(0,4,54,17,0,0,7);g.fill();
  // paño con rayas rosas y blancas
  g.save();
  roundRectPath(g,-52,-15,104,32,7);g.clip();
  for(let i=0;i<9;i++){
    g.fillStyle=i%2?'#ff9ec4':'#fff4f8';
    g.fillRect(-52,-15+i*3.6,104,3.6);
  }
  // pliegue suave en el centro
  const som=g.createLinearGradient(0,-15,0,17);
  som.addColorStop(0,'rgba(120,40,70,.18)');
  som.addColorStop(.45,'rgba(255,255,255,.12)');
  som.addColorStop(1,'rgba(120,40,70,.22)');
  g.fillStyle=som;g.fillRect(-52,-15,104,32);
  g.restore();
  g.strokeStyle='#e8709e';g.lineWidth=1.6;
  roundRectPath(g,-52,-15,104,32,7);g.stroke();
  // flecos en los dos extremos
  g.strokeStyle='#fff4f8';g.lineWidth=1.4;g.lineCap='round';
  for(let i=0;i<7;i++){const yy=-13+i*4.6;
    g.beginPath();g.moveTo(-52,yy);g.lineTo(-57,yy+1);g.stroke();
    g.beginPath();g.moveTo(52,yy);g.lineTo(57,yy+1);g.stroke();}
  g.restore();
}
function dSnorlax(t){
  const x=52,y=742,ESC=0.7;            // un 70% del tamaño original
  toallaSnorlax(x,y);
  // al recibir la bola pega un respingo: se aplasta y rebota
  const u=G.snor>0?G.snor/26:0;
  const sq=1+Math.sin(u*Math.PI)*0.16;
  g.save();g.translate(x,y);g.scale(1/sq,sq);g.translate(-x,-y);
  if(G.snor>0){
    g.fillStyle='rgba(190,232,255,'+(0.26*u)+')';
    g.beginPath();g.ellipse(x,y-22,32,26,0,0,7);g.fill();
  }
  const rep=GIFS.snorlax;
  if(rep){
    const h=96*ESCALA_SPRITE*ESC, w=h*(rep.W/rep.H);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(rep.lienzo(),x-w/2,y-h+10,w,h);g.restore();
  } else if(spriteListo('snorlax')){
    const im=SPRITE_CACHE.snorlax,h=96*ESCALA_SPRITE*ESC,w=h*(im.naturalWidth/im.naturalHeight);
    g.save();g.imageSmoothingEnabled=false;
    g.drawImage(im,x-w/2,y-h+10,w,h);g.restore();
  } else {
    g.save();g.translate(x,y);g.scale(ESC,ESC);
    g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(0,12,44,9,0,0,7);g.fill();
    const resp=1+Math.sin(t/50)*0.02;
    g.scale(resp,1/resp);
    g.fillStyle='#2f4a5c';
    g.beginPath();g.ellipse(0,-16,42,32,0,0,7);g.fill();
    g.beginPath();g.ellipse(0,-52,24,18,0,0,7);g.fill();
    g.beginPath();g.moveTo(-16,-64);g.lineTo(-10,-76);g.lineTo(-4,-64);g.closePath();
    g.moveTo(16,-64);g.lineTo(10,-76);g.lineTo(4,-64);g.closePath();g.fill();
    g.fillStyle='#f2e6cc';
    g.beginPath();g.ellipse(0,-10,30,24,0,0,7);g.fill();
    g.beginPath();g.ellipse(0,-48,17,11,0,0,7);g.fill();
    g.fillStyle='#2f4a5c';
    g.beginPath();g.ellipse(-34,8,11,8,-.4,0,7);g.ellipse(34,8,11,8,.4,0,7);g.fill();
    g.fillStyle='#f2e6cc';
    g.beginPath();g.ellipse(-34,7,7,5,-.4,0,7);g.ellipse(34,7,7,5,.4,0,7);g.fill();
    g.strokeStyle='#1a2830';g.lineWidth=2;g.lineCap='round';
    if(G.snor>0){                       // despierto: ojos abiertos y boca de susto
      g.fillStyle='#1a2830';
      g.beginPath();g.ellipse(-7,-53,3,3.6,0,0,7);g.ellipse(7,-53,3,3.6,0,0,7);g.fill();
      g.beginPath();g.ellipse(0,-43,4,3,0,0,7);g.fill();
    } else {
      g.beginPath();g.moveTo(-10,-52);g.lineTo(-4,-52);g.moveTo(4,-52);g.lineTo(10,-52);g.stroke();
      g.beginPath();g.moveTo(-3,-44);g.lineTo(3,-44);g.stroke();
    }
    g.restore();
    if(G.snor<=0){
      const zf=fr(t/120);
      g.fillStyle='rgba(240,246,255,'+(0.7-zf*0.6)+')';
      g.font='700 '+(9+zf*6)+'px system-ui';g.textAlign='center';
      g.fillText('z',x+30+zf*13,y-62-zf*19);
    }
  }
  g.restore();
}
function tablero(t){
  // superficie: contorno exterior proyectado y relleno con degradado
  const per=[];
  for(let a=180;a>=0;a-=6)per.push([240+224*Math.cos(a*RAD),260-224*Math.sin(a*RAD)]);
  per.push([464,258],[464,700],[430,700],[312,694],[240,760],[168,694],[86,650],[16,588],[16,258]);
  g.save();
  pathChain(per);g.closePath();
  const fill=g.createLinearGradient(0,PY(0),0,PY(760));
  fill.addColorStop(0,'#0c4652');fill.addColorStop(.5,'#0d5a58');fill.addColorStop(1,'#0a3a44');
  g.fillStyle=fill;g.fill();
  g.clip();
  // banda de arena inferior y motivo central
  const sand=g.createLinearGradient(0,PY(560),0,PY(760));
  sand.addColorStop(0,'rgba(238,212,150,0)');sand.addColorStop(1,'rgba(238,212,150,.3)');
  g.fillStyle=sand;g.fillRect(0,PY(560),W,PY(760)-PY(560));
  g.globalAlpha=.08;g.strokeStyle='#eaffff';g.lineWidth=6;
  g.beginPath();g.ellipse(PX(240,430),PY(430),110*PS(430),96*PS(430)*0.9,0,0,7);g.stroke();
  g.beginPath();g.moveTo(PX(130,430),PY(430));g.lineTo(PX(350,430),PY(430));g.stroke();
  g.globalAlpha=.16;g.strokeStyle='#bff7ff';g.lineWidth=2.5;
  for(let i=0;i<5;i++){g.beginPath();
    for(let x=30;x<=450;x+=12){const y=330+i*84+Math.sin((x+t*1.05+i*70)/48)*6;
      g.lineTo(PX(x,y),PY(y));}g.stroke();}
  g.globalAlpha=1;
  g.restore();
}
function paredes(){paredesDe(CHAINS,SLINGS,ch=>ARBUSTOS_CH.includes(ch)||
  ch===CARRIL.ext||ch===CARRIL.int||ch===CARRIL.tapa);}
/* colores de muros y tirachinas: el neón turquesa de la playa o el musgo del bosque */
const PAL_ALOLA={brillo:'rgba(56,224,198,.55)',muro:'#79ead9',canto:'rgba(255,255,255,.35)',
  lado:'rgba(4,26,32,.55)',sling:'#ffd27a'};
const PAL_BOSQUE={brillo:'rgba(150,220,100,.5)',muro:'#a8dc84',canto:'rgba(255,255,230,.4)',
  lado:'rgba(12,30,10,.6)',sling:'#ff9ec4'};
function paredesDe(CHAINS,SLINGS,fuera,pal){
  pal=pal||PAL_ALOLA;
  g.lineCap='round';g.lineJoin='round';
  const esArbusto=ch=>fuera?fuera(ch):false;
  g.shadowColor=pal.brillo;g.shadowBlur=14;
  g.strokeStyle=pal.muro;g.lineWidth=12;
  CHAINS.forEach(ch=>{if(esArbusto(ch))return;pathChain(ch);g.stroke();});
  g.shadowBlur=0;
  g.strokeStyle=pal.canto;g.lineWidth=3;
  CHAINS.forEach(ch=>{if(esArbusto(ch))return;pathChain(ch);g.stroke();});
  // altura ficticia: réplica desplazada hacia abajo, más oscura (lado del muro)
  g.strokeStyle=pal.lado;g.lineWidth=12;
  CHAINS.forEach(ch=>{if(esArbusto(ch))return;g.beginPath();
    ch.forEach((p,i)=>{const X=PX(p[0],p[1]),Y=PY(p[1])+5;i?g.lineTo(X,Y):g.moveTo(X,Y);});
    g.stroke();});
  g.globalCompositeOperation='destination-over';
  g.globalCompositeOperation='source-over';
  SLINGS.forEach(s=>{
    g.lineCap='round';
    const ax=PX(s.a[0],s.a[1]),ay=PY(s.a[1]),bx=PX(s.b[0],s.b[1]),by=PY(s.b[1]);
    g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=18;
    g.beginPath();g.moveTo(ax,ay+3);g.lineTo(bx,by+3);g.stroke();
    g.strokeStyle=pal.sling;g.lineWidth=15;
    g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
    g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=4;
    g.beginPath();g.moveTo(ax,ay-3);g.lineTo(bx,by-3);g.stroke();
  });
}
function boton(b,pulsado,color){
  const s=PS(b.y),X=PX(b.x,b.y),Y=PY(b.y);
  g.save();g.translate(X,Y);g.scale(s,s);
  g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(0,4,13,6,0,0,7);g.fill();
  g.fillStyle='#2a3540';g.beginPath();g.ellipse(0,2,12,7,0,0,7);g.fill();
  const alza=pulsado?1:4;
  const gr=g.createLinearGradient(0,-alza-8,0,2);
  gr.addColorStop(0,pulsado?'#7fe8c8':color);gr.addColorStop(1,pulsado?'#2a8f78':'#8a3a30');
  g.fillStyle=gr;
  g.beginPath();g.ellipse(0,-alza,10,6,0,0,7);g.fill();
  g.fillStyle='rgba(255,255,255,.5)';
  g.beginPath();g.ellipse(-3,-alza-2,3.5,1.8,0,0,7);g.fill();
  if(!pulsado){g.strokeStyle='rgba(255,255,255,'+(0.4+Math.sin(G.tick/9)*0.25)+')';
    g.lineWidth=2;g.beginPath();g.ellipse(0,-alza,13,8,0,0,7);g.stroke();}
  g.restore();
}
function drawWild(t){
  const w=G.wild;if(!w)return;
  const s=PS(w.y),X=PX(w.x,w.y),Y=PY(w.y);
  const pulse=1+Math.sin(t/12)*.05;
  g.strokeStyle='rgba(255,107,91,.8)';g.lineWidth=3;
  g.beginPath();g.ellipse(X,Y,34*pulse*s,30*pulse*s,0,0,7);g.stroke();
  g.fillStyle='rgba(255,107,91,.12)';g.beginPath();g.ellipse(X,Y,34*pulse*s,30*pulse*s,0,0,7);g.fill();
  if(w.flash){g.globalAlpha=w.flash/12;g.fillStyle='#fff';g.beginPath();g.arc(X,Y,32*s,0,7);g.fill();g.globalAlpha=1;}
  pintarCapturable(g,w.sp.k,X,Y,54*s,t,true);
  for(let i=0;i<w.max;i++){
    g.fillStyle=i<w.hp?'#ff6b5b':'rgba(255,255,255,.2)';
    g.beginPath();g.arc(X-14*s+i*14*s,Y-44*s,4.5*s,0,7);g.fill();
  }
  g.fillStyle='rgba(255,255,255,.85)';g.font='700 '+Math.round(11*s)+'px system-ui';g.textAlign='center';
  g.fillText(w.sp.n.toUpperCase(),X,Y+48*s);
}
function drawCaptura(t){
  const a=G.capAnim;if(!a)return;
  const s=PS(a.y), X1=PX(a.x,a.y), Y1=PY(a.y);
  const X0=PX(ball.x,ball.y), Y0=PY(ball.y);
  const ph=a.t;
  // fase 1: rayo rojo desde la pokéball
  if(ph<30){
    const k=Math.min(1,ph/7);
    g.save();
    g.strokeStyle='rgba(255,60,40,'+(0.8*k)+')';g.lineWidth=4.5+Math.sin(t/2)*1.5;
    g.shadowColor='rgba(255,80,50,.9)';g.shadowBlur=14;g.lineCap='round';
    g.beginPath();g.moveTo(X0,Y0);g.lineTo(X1,Y1);g.stroke();
    g.shadowBlur=0;g.lineWidth=1.8;g.strokeStyle='rgba(255,225,205,'+(0.9*k)+')';
    g.beginPath();g.moveTo(X0,Y0);g.lineTo(X1,Y1);g.stroke();
    g.restore();
  }
  // fase 2-3: escala, arrastre hacia la bola y desvanecimiento
  let esc=1,dx=0,dy=0,alpha=1;
  if(ph>=30&&ph<50){const u=(ph-30)/20;esc=1-u*0.15;}
  else if(ph>=50){const u=Math.min(1,(ph-50)/30);
    esc=0.85*(1-u);dx=(X0-X1)*u;dy=(Y0-Y1)*u;alpha=1-u*0.75;}
  if(esc>0.03){
    g.save();g.globalAlpha=Math.max(0,alpha);
    g.translate(X1+dx,Y1+dy);g.scale(esc,esc);g.translate(-X1,-Y1);
    if(a.mew){if(!gifCentrado('mew-volando',a.x,a.y,MEW_ALTO))
        mewPropio(g,X1,Y1,PS(a.y)*(MEW_ALTO/26),'vuela',t);}
    else pintarCapturable(g,a.sp.k,X1,Y1,54*s,t,true);
    g.restore();g.globalAlpha=1;
  }
  // luz roja envolvente durante toda la secuencia
  const rag=ph<30?Math.min(1,ph/30)*0.55:ph<50?0.55+((ph-30)/20)*0.45:Math.max(0,1-((ph-50)/32)*0.85);
  const rr=Math.max(6,(40+Math.sin(t/3)*4)*s*(ph>=50?esc+0.3:1));
  const gl=g.createRadialGradient(X1+dx,Y1+dy,2,X1+dx,Y1+dy,rr);
  gl.addColorStop(0,'rgba(255,130,95,'+(0.6*rag)+')');
  gl.addColorStop(.6,'rgba(232,69,58,'+(0.42*rag)+')');
  gl.addColorStop(1,'rgba(232,69,58,0)');
  g.fillStyle=gl;g.beginPath();g.arc(X1+dx,Y1+dy,rr,0,7);g.fill();
  // destello final sobre la pokéball
  if(ph>=76){const u=(ph-76)/6;
    g.fillStyle='rgba(255,240,220,'+(0.7*(1-u))+')';
    g.beginPath();g.arc(X0,Y0,10+u*16,0,7);g.fill();}
}
function drawTable(){
  const t=G.tick;
  g.save();
  if(shake>0.4)g.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  if(G.escena==='mew')dibujaMew(t);
  else if(G.escena==='pista')dibujaPista(t);
  else if(G.escena==='bosque')dibujaBosque(t);
  else dibujaAlola(t);
  dFlippers();
  dComun(t);
  g.restore();
}
/* La mesa (suelo, carril, muros y setos) no cambia de un frame a otro, pero es
   con diferencia lo más caro de pintar: sombras difuminadas en cada muro y seis
   trazos por cada tramo de seto. Se dibuja una sola vez en un lienzo aparte y
   a partir de ahí solo se copia. */
const CAPA={};
/* lo mismo para cualquier otra pieza fija: fn se pinta una sola vez en un lienzo
   del tamaño de la mesa y a partir de ahí se copia */
function capaFija(k,fn){
  if(CAPA[k])return CAPA[k];
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const prev=g;g=c.getContext('2d');fn();g=prev;
  return CAPA[k]=c;
}
/* igual, pero solo con el rectángulo (x,y,w,h) que ocupa la pieza: copiar un
   lienzo pequeño en cada frame es mucho más barato que uno del tamaño de la mesa */
function copiaCapa(k,fn,x,y,w,h){
  let c=CAPA[k];
  if(!c){
    c=document.createElement('canvas');c.width=w;c.height=h;
    const prev=g;g=c.getContext('2d');g.translate(-x,-y);fn();g=prev;
    CAPA[k]=c;
  }
  g.drawImage(c,x,y);
}
function capaMesa(){
  const k=G.escena;
  if(CAPA[k])return CAPA[k];              // una vez por mesa, no por cambio de escena
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const prev=g;g=c.getContext('2d');
  if(k==='mew'){tableroMew(0);paredesDe(MEW_CH,MEW_SLINGS);}
  else if(k==='pista'){tableroPista(0);paredesDe(PISTA_CH,PISTA_SLINGS);}
  else if(k==='bosque'){tableroBosque(0);paredesDe(BOSQUE_PINTA,SLINGS,null,PAL_BOSQUE);rocaCueva();dTroncos();}
  else{tablero(0);dCarril(0);dCarrilSnorlax(0);paredes();drawArbustos(0);}
  g=prev;
  return CAPA[k]=c;
}
/* valla de madera que cierra la boca del carril del bunneary */
function dValla(t){
  if(!G.valla&&G.vallaFx<=0)return;
  const V=VALLA,s=PS(V.y),Y=PY(V.y);
  const X0=PX(V.x0,V.y),X1=PX(V.x1,V.y),alto=30*s;
  g.save();
  if(!G.valla){                       // al saltar por los aires se desvanece hacia arriba
    const u=G.vallaFx/34;
    g.globalAlpha=u;g.translate(0,-(1-u)*16);
  }
  // sombra en la arena
  g.fillStyle='rgba(0,0,0,.34)';
  g.beginPath();g.ellipse((X0+X1)/2,Y+5*s,(X1-X0)/2+4,5*s,0,0,7);g.fill();
  // dos tablas horizontales
  const tabla=(dy,h)=>{
    const gr=g.createLinearGradient(0,Y-dy-h,0,Y-dy);
    gr.addColorStop(0,'#b07c46');gr.addColorStop(.5,'#8a5a2e');gr.addColorStop(1,'#6b4423');
    g.fillStyle=gr;g.fillRect(X0-3,Y-dy-h,X1-X0+6,h);
    g.strokeStyle='rgba(52,30,14,.7)';g.lineWidth=1.4;
    g.strokeRect(X0-3,Y-dy-h,X1-X0+6,h);
    // veta de la madera
    g.strokeStyle='rgba(58,34,16,.28)';g.lineWidth=1;
    for(let i=0;i<5;i++){
      const yy=Y-dy-h+h*(0.25+0.16*i%1)-((i*3)%4);
      g.beginPath();
      for(let x=X0;x<=X1;x+=9)g.lineTo(x,yy+Math.sin((x+i*13)/11)*0.9);
      g.stroke();
    }
  };
  tabla(alto*0.62,alto*0.30);
  tabla(alto*0.16,alto*0.30);
  // postes verticales con la punta en pico
  [X0,(X0+X1)/2,X1].forEach(px=>{
    const w=7*s;
    g.fillStyle='#7a4e28';
    g.beginPath();
    g.moveTo(px-w/2,Y+2);g.lineTo(px-w/2,Y-alto+5*s);g.lineTo(px,Y-alto);
    g.lineTo(px+w/2,Y-alto+5*s);g.lineTo(px+w/2,Y+2);g.closePath();g.fill();
    g.strokeStyle='rgba(48,28,12,.75)';g.lineWidth=1.3;g.stroke();
    g.fillStyle='rgba(255,225,180,.18)';g.fillRect(px-w/2+1,Y-alto+6*s,1.6,alto-7*s);
  });
  g.restore();
}
function dibujaAlola(t){
  fondo(t);dLugia(t);
  g.drawImage(capaMesa(),0,0);
  dSnorlax(t);
  dOrbitaPista(t);dOrbita(t);
  dBunneary(t);
  dValla(t);
  dCienaga(t);
  KOFFINGS.forEach((k,i)=>dKoffing(k,i,t));
  boton(FEN.btn,G.fen.boton,'#e8453a');
  boton(STAR.btn,G.star.boton,'#e8453a');
  dFennekin(t);dStarmie(t);dExeggutor(t);dFlechasCarril(t);
  dHoyo(t);
  if(G.capAnim)drawCaptura(t);
  else if(G.mode==='captura')drawWild(t);
}
function dFlippers(){
  [F.L,F.R].forEach(f=>{
    const s=PS(f.y);
    const ax=PX(f.x,f.y),ay=PY(f.y);
    const wx=f.x+Math.cos(f.a)*f.len, wy=f.y+Math.sin(f.a)*f.len;
    const bx=PX(wx,wy),by=PY(wy);
    g.lineCap='round';
    g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=18*s;
    g.beginPath();g.moveTo(ax,ay+3);g.lineTo(bx,by+3);g.stroke();
    const gr=g.createLinearGradient(ax,ay,bx,by);
    gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#ffd27a');
    g.strokeStyle=gr;g.lineWidth=15*s;
    g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;
    g.beginPath();g.moveTo(ax,ay-3*s);g.lineTo(bx,by-3*s);g.stroke();
    g.fillStyle='#0b1a22';g.beginPath();g.arc(ax,ay,4.5*s,0,7);g.fill();
  });
}
function dComun(t){
  if(G.escena==='alola'){dChandelure(t);dEmolga(t);}
  else if(G.escena==='bosque')dMachamp(t);
  // bola (dentro de la cueva de Venomoth no se ve)
  const R=G.escena==='bosque'?G.bosque.rio:null;
  const oculta=G.escena==='bosque'&&(G.bosque.cueva>0||(R&&((R.fase==='hunde'&&R.t>12)||R.fase==='espera')));
  if(!oculta){
  if(ball.state!=='held'){
    ball.trail.forEach((p,i)=>{
      g.globalAlpha=i/ball.trail.length*0.35;
      g.fillStyle='#dff6ff';g.beginPath();g.arc(PX(p.x,p.y),PY(p.y),ball.r*PS(p.y)*(i/ball.trail.length),0,7);g.fill();});
    g.globalAlpha=1;
  }
  const s=PS(ball.y),X=PX(ball.x,ball.y),Y=PY(ball.y);
  if(!G.tragado){g.fillStyle='rgba(0,0,0,.35)';
    g.beginPath();g.ellipse(X+2,Y+4*s,ball.r*s,ball.r*s*0.5,0,0,7);g.fill();}
  if(G.escena==='mew'&&G.mew&&G.mew.congelado>0)haloPsiquico(X,Y,ball.r*s*4.2,t,1);
  if(G.fenGhost>0){
    const gl=g.createRadialGradient(X,Y,2,X,Y,ball.r*s*3.2);
    gl.addColorStop(0,'rgba(255,220,120,.85)');gl.addColorStop(.5,'rgba(255,138,58,.5)');gl.addColorStop(1,'rgba(255,80,30,0)');
    g.fillStyle=gl;g.beginPath();g.arc(X,Y,ball.r*s*3.2,0,7);g.fill();
  }
  // pokéball (encoge mientras la pokébola gigante se la traga)
  const r=ball.r*s*(G.tragado?Math.max(0.05,1-G.tragado.t/54):1);
  g.save();g.translate(X,Y);g.rotate(ball.rot);
  const tipo=G.bola||0;
  g.fillStyle=tipo===2?'#2b2b33':tipo===1?'#3f7fd6':'#e8453a';
  g.beginPath();g.arc(0,0,r,Math.PI,0);g.fill();
  g.fillStyle='#f2ecd8';g.beginPath();g.arc(0,0,r,0,Math.PI);g.fill();
  if(tipo===1){                       // superball: dos marcas rojas en la tapa
    g.fillStyle='#e8453a';
    g.beginPath();g.moveTo(-r*0.72,-r*0.12);g.lineTo(-r*0.3,-r*0.72);
    g.lineTo(-r*0.06,-r*0.5);g.lineTo(-r*0.44,-r*0.04);g.closePath();g.fill();
    g.beginPath();g.moveTo(r*0.72,-r*0.12);g.lineTo(r*0.3,-r*0.72);
    g.lineTo(r*0.06,-r*0.5);g.lineTo(r*0.44,-r*0.04);g.closePath();g.fill();
  } else if(tipo===2){                // ultraball: las dos franjas amarillas
    g.fillStyle='#f2c530';
    g.fillRect(-r*0.62,-r*0.95,r*0.3,r*0.95);
    g.fillRect(r*0.32,-r*0.95,r*0.3,r*0.95);
  }
  g.strokeStyle='#2a2430';g.lineWidth=Math.max(1.4,r*0.24);
  g.beginPath();g.moveTo(-r,0);g.lineTo(r,0);g.stroke();
  g.fillStyle='#2a2430';g.beginPath();g.arc(0,0,r*0.36,0,7);g.fill();
  g.fillStyle='#f2ecd8';g.beginPath();g.arc(0,0,r*0.2,0,7);g.fill();
  g.strokeStyle='rgba(42,36,48,.9)';g.lineWidth=Math.max(1,r*0.12);
  g.beginPath();g.arc(0,0,r,0,7);g.stroke();
  g.restore();
  g.fillStyle='rgba(255,255,255,.55)';
  g.beginPath();g.ellipse(X-r*0.38,Y-r*0.42,r*0.3,r*0.18,-0.6,0,7);g.fill();
  }
  // partículas y textos
  fx.forEach(p=>{g.globalAlpha=p.life;g.fillStyle=p.color;
    g.beginPath();g.arc(PX(p.x,p.y),PY(p.y),p.size*PS(p.y),0,7);g.fill();});
  g.globalAlpha=1;
  g.textAlign='center';g.font='700 15px "Avenir Next",system-ui,sans-serif';
  texts.forEach(tx=>{g.globalAlpha=Math.min(1,tx.life*1.6);g.fillStyle=tx.color;
    g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;
    const X2=PX(tx.x,tx.y),Y2=PY(tx.y);
    g.strokeText(tx.txt,X2,Y2);g.fillText(tx.txt,X2,Y2);});
  g.globalAlpha=1;
  if(G.escena==='mew')hudMew(t);
  if(G.escena==='pista')hudPista(t);
  if((G.escena==='alola'||G.escena==='bosque')&&G.saver>0&&ball.state==='play'){
    g.strokeStyle='rgba(120,255,220,'+(0.35+Math.sin(t/6)*0.2)+')';g.lineWidth=5;
    g.beginPath();g.moveTo(PX(180,745),PY(745));g.lineTo(PX(300,745),PY(745));g.stroke();
  }
  if(G.paused){
    g.fillStyle='rgba(3,12,19,.72)';g.fillRect(0,0,W,H);
    g.fillStyle='#fff';g.font='800 26px system-ui';g.fillText('Pausa',240,370);
    g.font='500 14px system-ui';g.fillStyle='#9fbcc8';g.fillText('Pulsa P para continuar',240,398);
  }
}

/* ============================================================
   HUD / PANTALLAS
   ============================================================ */
const HUD_ANT={};
function ponHUD(id,v){
  if(HUD_ANT[id]===v)return;HUD_ANT[id]=v;
  $(id).firstElementChild.nextElementSibling.textContent=v;
}
function updateHUD(){
  // escribir en el DOM cada frame obliga al navegador a recalcular estilos:
  // solo se toca lo que de verdad ha cambiado
  ponHUD('score',G.score.toLocaleString('es'));
  ponHUD('balls',String(G.balls));
  ponHUD('mult','x'+G.mult);
  ponHUD('dexn',String(G.dex.size));
  const bar=$('bannerBar'),txt=$('bannerTxt');
  let w='0%',m;
  if(G.mode){
    w=(G.timer/G.timerMax*100)+'%';
    m=(G.msgT>0?G.msg:'MODO CAPTURA · '+Math.ceil(G.timer/60)+'s');
  }else{
    m=G.msgT>0?G.msg:(G.state==='play'?(G.escena==='bosque'?guiaBosque():'Golpea a Bunneary para buscar pokémon'):'Pulsa Jugar para empezar');
  }
  if(HUD_ANT.bar!==w){HUD_ANT.bar=w;bar.style.width=w;}
  if(HUD_ANT.txt!==m){HUD_ANT.txt=m;txt.textContent=m;}
}
function fillDex(grid){
  grid.innerHTML='';
  if(!G.order.length){
    const p=document.createElement('p');p.className='empty';
    p.textContent='Todavía no has registrado ninguna especie. Golpea a Bunneary (playa) o a Spinda (bosque) para llamar a un pokémon salvaje.';
    grid.appendChild(p);return;
  }
  G.order.forEach(k=>{
    const sp=SPECIES[k]||{k,n:nombreBonito(k)};
    const d=document.createElement('div');d.className='mon';
    const c=document.createElement('canvas');c.width=c.height=104;
    pintarCapturable(c.getContext('2d'),k,52,54,80,0,false);
    const sm=document.createElement('small');sm.textContent=sp.n;
    d.appendChild(c);d.appendChild(sm);grid.appendChild(d);
  });
}
function openDex(){
  if(G.state==='menu')return;
  G.paused=true;
  $('dexTxt').textContent=G.dex.size+' de '+totalDex()+' especies registradas en esta partida.';
  fillDex($('dexGrid'));$('dex').classList.remove('hidden');
}
function closeDex(){$('dex').classList.add('hidden');G.paused=false;}

/* ============================================================
   ENTRADA
   ============================================================ */
function launch(){
  if(ball.state!=='ready')return;
  // en el bosque la bola sale cuando el gancho de Machamp llega arriba, no al soltar
  if(G.escena==='bosque'){ganchoMachamp();return;}
  disparaBola(G.charge);
  G.chanFuego=26;
}
function disparaBola(carga){
  ball.state='play';
  ball.vy=-(18.5+carga*7.5)*SPD;ball.vx=(Math.random()-.5)*0.6;
  score(Math.round(400+carga*600),447,630);
  beep(320+carga*300,.14,'square',.05);
  G.charge=0;G.charging=false;
}
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  // e.repeat: mantener la tecla no debe disparar la acción especial una y otra vez
  if(k==='arrowleft'||k==='a'){
    if(!F.L.press&&!e.repeat)llamaFennekin();
    F.L.press=true;e.preventDefault();}
  if(k==='arrowright'||k==='d'){
    if(!F.R.press&&!e.repeat)giroStarmie();
    F.R.press=true;e.preventDefault();}
  if(k===' '||k==='arrowdown'){if(ball.state==='ready')G.charging=true;e.preventDefault();}
  if(k==='tab'){e.preventDefault();$('dex').classList.contains('hidden')?openDex():closeDex();}
  if(k==='p'&&G.state==='play'&&$('dex').classList.contains('hidden'))G.paused=!G.paused;
  if(k==='m'){sound=!sound;say(sound?'Sonido activado':'Sonido silenciado',90);}
});
addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(k==='arrowleft'||k==='a')F.L.press=false;
  if(k==='arrowright'||k==='d')F.R.press=false;
  if(k===' '||k==='arrowdown')launch();
});
const stage=$('stage');
const touches={};
function pointerAt(e){const r=cv.getBoundingClientRect();return (e.clientX-r.left)/r.width;}
stage.addEventListener('pointerdown',e=>{
  if(G.state!=='play'||!$('dex').classList.contains('hidden')||G.paused)return;
  const x=pointerAt(e);
  if(ball.state==='ready'){G.charging=true;touches[e.pointerId]='launch';}
  else if(x<0.5){F.L.press=true;llamaFennekin();touches[e.pointerId]='L';}
  else {F.R.press=true;giroStarmie();touches[e.pointerId]='R';}
  e.preventDefault();
});
function release(e){
  const w=touches[e.pointerId];
  if(w==='L')F.L.press=false;
  if(w==='R')F.R.press=false;
  if(w==='launch')launch();
  delete touches[e.pointerId];
}
stage.addEventListener('pointerup',release);
stage.addEventListener('pointercancel',release);
$('jugar').onclick=()=>startGame();
$('jugarBosque').onclick=()=>startGame('bosque');
$('practica').onclick=()=>startGame('mew');
$('practicaPista').onclick=()=>startGame('pista');
$('verInfo').onclick=()=>{$('menu').classList.add('hidden');$('info').classList.remove('hidden');};
$('cerrarInfo').onclick=()=>{$('info').classList.add('hidden');$('menu').classList.remove('hidden');};
// otra partida en la misma mesa
$('again').onclick=()=>startGame(G.mesa==='bosque'?'bosque':undefined);
$('toMenu').onclick=()=>{$('over').classList.add('hidden');$('info').classList.add('hidden');
  $('menu').classList.remove('hidden');G.state='menu';};
$('dexClose').onclick=closeDex;
$('btnPausa').onclick=()=>{if(G.state==='play'&&$('dex').classList.contains('hidden'))G.paused=!G.paused;};
$('btnDex').onclick=()=>{$('dex').classList.contains('hidden')?openDex():closeDex();};
$('btnMenu').onclick=()=>{$('over').classList.add('hidden');$('dex').classList.add('hidden');$('info').classList.add('hidden');
  $('menu').classList.remove('hidden');G.state='menu';G.paused=false;};
$('dexn').onclick=openDex;

function loop(){update();drawTable();requestAnimationFrame(loop);}
updateHUD();loop();
})();

