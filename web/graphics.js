import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
const rnd=(seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296})(73191);
const boxGeo=new THREE.BoxGeometry(1,1,1), cylGeo=new THREE.CylinderGeometry(1,1,1,20),sphereGeo=new THREE.SphereGeometry(1,16,12);
const material=(color,roughness=.6,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export function makeCar(era=2,color='#e53c2f'){
 const car=new THREE.Group();const paint=material(color,.28,.42),black=material('#111612',.75,.13),carbon=material('#161c1b',.55,.4),silver=material('#788481',.3,.82),white=material('#e3e4d9',.45,.08),gold=material('#e3b649',.45,.25),helmet=material('#f0e5c6',.28,.28);
 const box=(x,y,z,w,h,d,m)=>{const a=new THREE.Mesh(boxGeo,m);a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=true;a.receiveShadow=true;car.add(a);return a};
 const sphere=(x,y,z,w,h,d,m)=>{const a=new THREE.Mesh(sphereGeo,m);a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=true;car.add(a);return a};
 const rod=(a,b,r,m)=>{a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),m);c.position.copy(a).add(b).multiplyScalar(.5);c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());c.castShadow=true;car.add(c);return c};
 // Every car points +Z. Distinct proportions and aero packages per era.
 const modern=era===3,classic=era===0,turbo=era===1;const length=modern?5.25:classic?3.65:4.55;
 sphere(0,.55,-.25,classic?.36:.44,.35,length*.34,paint);
 if(!classic){box(0,.18,-.1,1.55,.09,3.1,carbon);sphere(-.63,.45,-.48,.45,.32,1.04,paint);sphere(.63,.45,-.48,.45,.32,1.04,paint);box(0,.52,1.03,.37,.25,2.1,paint);sphere(0,.48,1.80,.19,.14,.5,paint);}
 else {sphere(0,.45,1.18,.31,.30,.94,paint);box(0,.7,-1.08,.45,.25,1.1,silver);for(let x of [-.24,.24]){for(let z=-1.2;z<-.4;z+=.15){rod([x,.75,z],[x*1.45,1.,z],.045,silver)}}box(0,.14,-.1,.7,.08,3.2,carbon);}
 // Cockpit, seat, driver, visor and steering wheel.
 sphere(0,.85,.10,.29,.15,.48,black);sphere(0,.89,-.03,.21,.22,.26,black);sphere(0,1.02,.10,.185,.21,.20,helmet);sphere(0,1.04,.235,.17,.075,.055,black);
 const steering=new THREE.Mesh(new THREE.TorusGeometry(.17,.03,6,16),carbon);steering.position.set(0,.86,.45);steering.rotation.x=-.55;car.add(steering);
 if(!classic){sphere(0,.92,-.71,.24,.49,.73,paint);box(0,1.35,-.65,.22,.17,.22,black);box(0,1.40,-.65,.13,.1,.14,carbon);}
 if(modern){const halo=new THREE.Mesh(new THREE.TorusGeometry(.38,.035,7,24,Math.PI),carbon);halo.rotation.x=Math.PI/2;halo.position.set(0,1.10,.12);car.add(halo);rod([0,.67,.64],[0,1.10,.51],.035,carbon);rod([-.35,1.1,.1],[-.34,.8,-.35],.035,carbon);rod([.35,1.1,.1],[.34,.8,-.35],.035,carbon);}
 // Suspension rods and four detailed slick tyres.
 const wheels=[];const front=classic?1.12:1.43,rear=classic?-1.10:-1.44;const track=classic?.82:1.02;
 for(let side of [-1,1])for(let z of [front,rear]){
  const wheel=new THREE.Group();wheel.position.set(side*track,.35,z);const radius=classic?.34:modern?.38:.35;const width=classic?.24:z===rear?.44:.34;
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,32,1),black);tire.rotation.z=Math.PI/2;tire.castShadow=true;wheel.add(tire);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(radius*.54,radius*.54,width+.015,16),silver);rim.rotation.z=Math.PI/2;wheel.add(rim);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.18,radius*.18,width+.035,10),carbon);hub.rotation.z=Math.PI/2;wheel.add(hub);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*.82,.009,4,32),classic?silver:gold);ring.rotation.y=Math.PI/2;ring.position.x=side*width*.51;wheel.add(ring);
  if(era===2){for(let v of [-.1,0,.1]){const groove=new THREE.Mesh(new THREE.TorusGeometry(radius+.002,.006,3,32),carbon);groove.rotation.y=Math.PI/2;groove.position.x=v;wheel.add(groove)}}
  car.add(wheel);wheels.push({mesh:wheel,front:z===front});
  for(let y of [.28,.55]){rod([side*.27,y,z-.33],[side*track,.35,z],.018,carbon);rod([side*.27,y,z+.33],[side*track,.35,z],.018,carbon)}
 }
 if(!classic){
  const fwz=length*.49;box(0,.19,fwz,modern?2.05:1.9,.055,.64,carbon);
  for(let i=0;i<3;i++){let flap=box(0,.21+i*.045,fwz-.14+i*.14,1.85,.04,.16,paint);flap.rotation.x=-.13;}
  for(let side of [-1,1]){box(side*.98,.32,fwz,.055,.31,.68,paint);box(side*.82,.93,-length*.43,.055,.70,.7,paint);rod([side*.45,.20,-1.40],[side*.45,1.12,-length*.43],.026,carbon)}
  box(0,1.25,-length*.43,1.68,.07,.55,paint);box(0,1.12,-length*.43+.08,1.65,.06,.39,carbon);
  if(turbo){box(0,.62,1.1,.44,.055,2.1,white);box(0,.50,-.60,1.45,.08,.38,white)}
  if(era===2){box(0,.68,1.16,.15,.015,1.5,white);box(0,1.30,-1.93,.80,.015,.22,white)}
  for(let side of [-1,1]){box(side*.70,.69,-.46,.34,.035,.80,carbon);if(modern){box(side*.78,.24,-.25,.035,.13,2.6,carbon);}}
 }
 if(classic){box(0,.76,.92,.14,.035,1.35,gold)}
 car.userData.wheels=wheels;car.userData.materials=[paint,black,carbon,silver,white,gold,helmet];return car;
}
function texture(kind){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');let image=ctx.createImageData(256,256);for(let i=0;i<image.data.length;i+=4){let n=rnd();if(kind==='road'){let a=57+n*29;image.data[i]=a;image.data[i+1]=a+1;image.data[i+2]=a+2;}else{image.data[i]=61+n*32;image.data[i+1]=76+n*39;image.data[i+2]=36+n*23;}image.data[i+3]=255}ctx.putImageData(image,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t}
export class World{
 constructor(canvas,track,config){this.track=track;this.config=config;this.scene=new THREE.Scene();const wet=config.weather==='wet';this.scene.background=new THREE.Color(wet?'#8c9f9d':'#b0c5bd');this.scene.fog=new THREE.FogExp2(wet?'#8c9f9d':'#aebfb1',wet?.0014:.00065);
 this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,config.quality==='high'?1.7:1.));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=config.quality==='high';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=wet?.9:1.15;this.camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.15,11000);
 this.scene.add(new THREE.HemisphereLight(wet?'#bdced6':'#d4e3e6','#5d6545',wet?2:2.8));this.sun=new THREE.DirectionalLight(wet?'#d4dfe1':'#fff0d2',wet?1.1:3.8);this.sun.position.set(100,180,130);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-90,right:90,top:90,bottom:-90,near:1,far:500});this.sun.shadow.bias=-.0002;this.sun.shadow.normalBias=.1;this.scene.add(this.sun);this.scene.add(this.sun.target);
 if(!wet){const sky=new Sky();sky.scale.setScalar(10000);const u=sky.material.uniforms;u.turbidity.value=6;u.rayleigh.value=1.5;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.8;u.sunPosition.value.set(.55,.3,.4);this.scene.add(sky)}
 this.buildTrack();this.buildScenery();this.player=makeCar(config.era,config.color);this.scene.add(this.player);this.ai=[];this.cameraMode=0;this.cameraInitialized=false;this.rain=null;if(wet)this.buildRain();this.resize=()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight)};window.addEventListener('resize',this.resize);
 }
 height(x,z){let a=this.track.elevation;return Math.sin(x*.0018)*a+Math.cos(z*.0021)*a*.6;}
 sample(u){const p=this.track.points,n=p.length;u=((u%1)+1)%1;let f=u*n,i=Math.floor(f),a=p[i],b=p[(i+1)%n],v=f-i;const x=a[0]*(1-v)+b[0]*v,z=a[1]*(1-v)+b[1]*v;return {x,z,y:this.height(x,z)+.07,yaw:Math.atan2(b[0]-a[0],b[1]-a[1])}}
 strip(offset,width,mat,height=.03){const p=this.track.points,n=p.length,positions=[],uvs=[],indices=[];let distance=0;for(let i=0;i<=n;i++){let j=i%n,a=p[j],prev=p[(j+n-1)%n],next=p[(j+1)%n];let dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz);let rx=dz/len,rz=-dx/len;if(i>0)distance+=Math.hypot(a[0]-p[(i-1)%n][0],a[1]-p[(i-1)%n][1]);for(let side of [-1,1]){let x=a[0]+rx*(offset+width/2*side),z=a[1]+rz*(offset+width/2*side);positions.push(x,this.height(x,z)+height,z);uvs.push(side===-1?0:1,distance/12)}if(i<n){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;this.scene.add(m);return m;}
 buildTrack(){const roadTexture=texture('road');const grassTexture=texture('grass');grassTexture.repeat.set(280,280);const groundMat=material('#869061',1,0);groundMat.map=grassTexture;
 const terrain=new THREE.PlaneGeometry(14000,14000,140,140);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++){pos.setY(i,this.height(pos.getX(i),pos.getZ(i))-.25)}terrain.computeVertexNormals();const ground=new THREE.Mesh(terrain,groundMat);ground.receiveShadow=true;this.scene.add(ground);
 const wet=this.config.weather==='wet';const roadMat=material(wet?'#535b59':'#7e827d',wet?.23:.94,wet?.25:.03);roadMat.map=roadTexture;roadMat.side=THREE.DoubleSide;this.strip(0,this.track.width,roadMat,.05);
 this.strip(0,this.track.width+4,material('#8c9270',1,0),.01);
 const w=this.track.width/2;const lineMat=material('#e6e6cd',.8,0);for(let side of [-1,1])this.strip(side*(w-.18),.14,lineMat,.065);
 // Alternating red and cream curbs, continuous guardrails and fence poles.
 const curbMat=[material('#d74836',.85,.05),material('#e2d7b3',.9,.02)];const railMat=material('#8d9991',.48,.7);const matrix=new THREE.Object3D();const n=this.track.points.length;const counts=Math.ceil(n/2)*2;
 const rails=new THREE.InstancedMesh(boxGeo,railMat,n*2),curbs=new THREE.InstancedMesh(boxGeo,curbMat[0],n*2);const c=new THREE.Color();let ri=0,ci=0;
 for(let i=0;i<n;i++){let a=this.track.points[i],b=this.track.points[(i+1)%n];let dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),rx=dz/len,rz=-dx/len;for(let side of [-1,1]){
 let cx=(a[0]+b[0])/2+rx*side*(w+.42),cz=(a[1]+b[1])/2+rz*side*(w+.42);matrix.position.set(cx,this.height(cx,cz)+.08,cz);matrix.rotation.set(0,Math.atan2(dx,dz),0);matrix.scale.set(.8,.10,len+.1);matrix.updateMatrix();curbs.setMatrixAt(ci,matrix.matrix);c.set(i%2?'#ded8bd':'#b94330');curbs.setColorAt(ci++,c);
 let x=cx+rx*side*5,z=cz+rz*side*5;matrix.position.set(x,this.height(x,z)+.8,z);matrix.scale.set(.12,.64,len+.05);matrix.updateMatrix();rails.setMatrixAt(ri++,matrix.matrix);
 }}rails.castShadow=true;curbs.receiveShadow=true;this.scene.add(rails,curbs);
 // Start line and a pit wall near the map's starting point.
 const start=this.sample(0);const lineGroup=new THREE.Group();lineGroup.position.set(start.x,start.y+.05,start.z);lineGroup.rotation.y=start.yaw;
 for(let x=-w;x<w;x+=.5)for(let z=-.5;z<.5;z+=.5){let q=new THREE.Mesh(boxGeo,material((Math.round((x+w)*2)+Math.round((z+.5)*2))%2?'#1e2421':'#dcded2'));q.position.set(x+.25,0,z+.25);q.scale.set(.5,.025,.5);lineGroup.add(q)}this.scene.add(lineGroup);
 const gantry=new THREE.Group();gantry.position.set(start.x,start.y,start.z);gantry.rotation.y=start.yaw;const metal=material('#3a423d',.4,.6);const obj=(x,y,z,w,h,d,m)=>{const a=new THREE.Mesh(boxGeo,m);a.position.set(x,y,z);a.scale.set(w,h,d);a.castShadow=true;gantry.add(a);};for(let x of [-w-2,w+2])obj(x,4,0,.3,8,.3,metal);obj(0,7.9,0,this.track.width+4,.9,.6,metal);
 const banner=document.createElement('canvas');banner.width=1024;banner.height=128;const ctx=banner.getContext('2d');ctx.fillStyle='#18211a';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#eae8d7';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.fillText('APEX / HERITAGE',512,82);const bm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(banner),side:THREE.DoubleSide});let panel=new THREE.Mesh(new THREE.PlaneGeometry(this.track.width+2,1.4),bm);panel.position.set(0,7.7,-.4);gantry.add(panel);this.scene.add(gantry);
 }
 buildScenery(){const p=this.track.points,n=p.length,forest=this.track.biome==='forest'||this.track.biome==='park';const count=this.config.quality==='high'?(forest?1500:700):350;const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.35,1,5),material('#6b6047',1),count);const leaf=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,7,1),material('#354b2f',1),count*2);const matrix=new THREE.Object3D(),c=new THREE.Color();
 for(let i=0;i<count;i++){let idx=Math.floor(rnd()*n),a=p[idx],b=p[(idx+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);let side=rnd()<.5?-1:1;let offset=side*(this.track.width/2+18+rnd()*260);let x=a[0]+dz/len*offset+(rnd()-.5)*30,z=a[1]-dx/len*offset+(rnd()-.5)*30;
 // Avoid planting trees on other nearby parts of the track.
 let tooClose=false;for(let j=0;j<n;j+=5)if(Math.hypot(p[j][0]-x,p[j][1]-z)<this.track.width/2+13){tooClose=true;break;}
 if(tooClose){x+=side*400;z+=250;}let y=this.height(x,z),h=5+rnd()*12;matrix.position.set(x,y+h*.24,z);matrix.scale.set(1,h*.5,1);matrix.updateMatrix();trunk.setMatrixAt(i,matrix.matrix);
 for(let j=0;j<2;j++){matrix.position.set(x,y+h*(j?.72:.48),z);matrix.scale.set(h*(j?.25:.35),h*.7,h*(j?.25:.35));matrix.rotation.y=rnd()*6;matrix.updateMatrix();leaf.setMatrixAt(i*2+j,matrix.matrix);c.setHSL(.22+rnd()*.07,.2+rnd()*.20,.11+rnd()*.13);leaf.setColorAt(i*2+j,c)}}trunk.castShadow=true;leaf.castShadow=true;leaf.receiveShadow=true;this.scene.add(trunk,leaf);
 const buildingMat=material('#92998c',.8,.05),roofMat=material('#303d39',.6,.3),glassMat=material('#35515b',.25,.5);const start=this.sample(.005);const pit=new THREE.Group();pit.position.set(start.x,start.y,start.z);pit.rotation.y=start.yaw;
 const build=(x,y,z,w,h,d,m)=>{let o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;pit.add(o);return o};
 for(let i=0;i<12;i++){let z=i*11-65;build(-32,4.5,z,17,9,10.5,buildingMat);build(-32,9.3,z,19,.55,11,roofMat);build(-23.4,3,z,.12,4.7,8,roofMat);build(-23.35,7.3,z,.1,2,9,glassMat);}
 // A long grandstand with individual colored seat rows.
 for(let i=0;i<8;i++){build(34+i*.9,1+i*.65,10,1.2,.5,110,material(i%3===0?'#b06b4c':'#b8bfab'));}build(39,8.7,10,16,.4,116,roofMat);for(let z of [-40,0,50])build(44,4.5,z,.4,9,.4,roofMat);this.scene.add(pit);
 // Circuit-dependent architectural cues, not replicas of real buildings.
 if(['coast','city','island','japan'].includes(this.track.biome)){for(let i=0;i<60;i++){const idx=Math.floor(rnd()*n),a=p[idx],offset=60+rnd()*240;let x=a[0]+offset*(rnd()<.5?-1:1),z=a[1]+offset*(rnd()<.5?-1:1),h=8+rnd()*45;const b=new THREE.Mesh(boxGeo,material(['#b5b09c','#d0c6b2','#9b9f94'][i%3]));b.position.set(x,this.height(x,z)+h/2,z);b.scale.set(12+rnd()*20,h,12+rnd()*20);b.castShadow=true;this.scene.add(b)}}
 // Braking-distance boards every few hundred metres.
 const signCanvas=document.createElement('canvas');signCanvas.width=128;signCanvas.height=128;const ctx=signCanvas.getContext('2d');ctx.fillStyle='#dddcc7';ctx.fillRect(0,0,128,128);ctx.fillStyle='#1e2822';ctx.font='bold 55px Arial';ctx.textAlign='center';ctx.fillText('100',64,85);const sm=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(signCanvas),side:THREE.DoubleSide});
 for(let i=30;i<n;i+=75){const a=this.sample(i/n);const board=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),sm);board.position.set(a.x+Math.cos(a.yaw)*(this.track.width/2+5),a.y+2.2,a.z-Math.sin(a.yaw)*(this.track.width/2+5));board.rotation.y=a.yaw+Math.PI;this.scene.add(board)}
 }
 buildRain(){const count=2000,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(rnd()-.5)*100;pos[i*3+1]=rnd()*60;pos[i*3+2]=(rnd()-.5)*100;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));this.rain=new THREE.Points(g,new THREE.PointsMaterial({color:'#d2dfdf',size:.09,transparent:true,opacity:.6}));this.scene.add(this.rain)}
 addAI(era,color){const c=makeCar(era,color);this.scene.add(c);this.ai.push(c);return c;}
 update(state,dt){const p=this.player;const y=this.height(state.x,state.z)+.10;p.position.set(state.x,y,state.z);p.rotation.y=state.yaw;const f=new THREE.Vector3(Math.sin(state.yaw),0,Math.cos(state.yaw));const nextY=this.height(state.x+f.x*3,state.z+f.z*3);p.rotation.x=(y-.1-nextY)/3;p.rotation.z=-state.steering*Math.min(state.speed/50,.8)*.035;
 for(const w of p.userData.wheels){w.mesh.rotation.x+=state.speed*dt/.35;if(w.front)w.mesh.rotation.y=state.steering*.22;}
 let cameraPos,target;const center=p.position.clone();if(this.cameraMode===0){cameraPos=center.clone().addScaledVector(f,-8.6).add(new THREE.Vector3(0,3.7,0));target=center.clone().addScaledVector(f,10).add(new THREE.Vector3(0,1,0));}else if(this.cameraMode===1){cameraPos=center.clone().addScaledVector(f,.25).add(new THREE.Vector3(0,1.45,0));target=center.clone().addScaledVector(f,28).add(new THREE.Vector3(0,1.15,0));}else{cameraPos=center.clone().addScaledVector(f,-15).add(new THREE.Vector3(0,9,0));target=center.clone().addScaledVector(f,10);}
 if(!this.cameraInitialized||this.cameraMode===1){this.camera.position.copy(cameraPos);this.cameraInitialized=true}else this.camera.position.lerp(cameraPos,1-Math.exp(-dt*7));this.camera.lookAt(target);let fov=58+Math.min(state.speed/110,1)*10;if(Math.abs(this.camera.fov-fov)>.1){this.camera.fov=fov;this.camera.updateProjectionMatrix()}
 this.sun.position.copy(center).add(new THREE.Vector3(100,180,130));this.sun.target.position.copy(center);
 if(this.rain){this.rain.position.copy(center);const a=this.rain.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-dt*32;if(y<0)y=60;a.setY(i,y)}a.needsUpdate=true;}
 this.renderer.render(this.scene,this.camera);
 }
 dispose(){window.removeEventListener('resize',this.resize);const gs=new Set(),ms=new Set(),ts=new Set();this.scene.traverse(o=>{if(o.geometry&&!([boxGeo,cylGeo,sphereGeo].includes(o.geometry)))gs.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v)}}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());this.renderer.dispose();this.scene.clear();}
}
