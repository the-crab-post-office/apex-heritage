// Visual-only graphics pass. Never changes contact heights, track widths or physics.
import * as THREE from 'three';
import { roadPoint } from './road-surface.js';
import { pointSegmentDistance, inside } from './scenery.js';
export const CIRCUIT_LIGHT = {
 BE:{sky:'#b9ced8',ground:'#546545',sun:'#fff2df',strength:2.25,fog:.00034},
 MC:{sky:'#b9d3dd',ground:'#74736a',sun:'#ffedcf',strength:2.45,fog:.00030},
 IT:{sky:'#c8d4d8',ground:'#626546',sun:'#fff1d8',strength:2.30,fog:.00043},
 GB:{sky:'#bacbd3',ground:'#64705b',sun:'#fff5e6',strength:2.05,fog:.00040},
 JP:{sky:'#bdd2de',ground:'#586c4c',sun:'#fff2dc',strength:2.20,fog:.00040},
 BR:{sky:'#bdd2de',ground:'#5d6950',sun:'#ffebce',strength:2.40,fog:.00042},
 DE:{sky:'#bccdd6',ground:'#59674a',sun:'#fff2df',strength:2.20,fog:.00040},
 CA:{sky:'#bfd2df',ground:'#586e54',sun:'#fff1db',strength:2.30,fog:.00033},
 AE:{sky:'#d9cbb8',ground:'#958061',sun:'#ffe1af',strength:2.45,fog:.00048},
 NL:{sky:'#c6d6de',ground:'#8c8564',sun:'#fff0d7',strength:2.35,fog:.00033},
 AZ:{sky:'#ced7da',ground:'#8c826e',sun:'#ffe9c8',strength:2.40,fog:.00037},
};
export function lightingFor(code) { return CIRCUIT_LIGHT[code] || CIRCUIT_LIGHT.IT; }
export function detailPlan(track, era=3) {
 const n=track.points.length, items=[];
 // Curvature selects actual braking approaches, rather than arbitrary decals.
 for(let i=0;i<n;i+=4) {
  const a=track.points[(i-3+n)%n], b=track.points[i], c=track.points[(i+3)%n];
  const u=[b[0]-a[0],b[1]-a[1]], v=[c[0]-b[0],c[1]-b[1]];
  const angle=Math.abs(Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]));
  if(angle>.07 && angle<1.8 && (items.length===0 || i-items.at(-1).i>16)) items.push({i,angle});
 }
 return {era, corners:items.slice(0,35),street:['MC','AZ'].includes(track.code), spacing:era===0?95:65};
}
function geometry(vertices) {
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
export function buildTrackFinish(world) {
 const {track:t,config}=world,n=t.points.length,wet=config.weather==='wet',plan=detailPlan(t,config.era);
 const group=new THREE.Group();group.name='graphics-2026-track-finish';world.scene.add(group);
 const rubber=[],paint=[],metal=[];
 function quad(out,i,j,lo,hi,lift=.014) {
  const a=roadPoint(t,(i+n)%n,lo,lift),b=roadPoint(t,(i+n)%n,hi,lift),c=roadPoint(t,(j+n)%n,lo,lift),d=roadPoint(t,(j+n)%n,hi,lift);
  out.push(...a,...c,...b,...b,...c,...d);
 }
 // Broken-in racing groove: four thin strips, feathered by varying widths.
 if(config.era>=3) for(let i=0;i<n;i++) {
  const q=Math.sin(i*.071)*t.width*.065;
  for(const side of [-1,1]) quad(rubber,i,i+1,q+side*.79-.12,q+side*.79+.12,.012);
 }
 // Braking streaks taper into corner entries; all vertices inherit banking.
 for(const corner of plan.corners) for(let k=2;k<9;k++) {
  const i=(corner.i-k+n)%n,w=.025+(9-k)*.009;
  for(const side of [-1,1])quad(rubber,i,i+1,side*.78-w,side*.78+w,.016);
 }
 // Expansion joints and drain grates confined to the outside of street roads.
 if(plan.street) for(let i=0;i<n;i+=8) {
  for(const side of [-1,1]) {
   const edge=side*(t.width/2-.48);
   for(let k=0;k<3;k++)quad(metal,i+k,i+k+1,edge-.09,edge+.09,.018);
  }
 }
 // Sparse original asphalt repair seams, avoiding a repetitive full-road grid.
 for(let i=31;i<n;i+=97)quad(rubber,i,i+1,-t.width*.30,t.width*.30,.010);
 // Standing-start box corners, visual only. Use sample distances, not uniform indices.
 let travelled=0,slot=0;
 for(let i=n-1;i>Math.max(0,n-110)&&slot<20;i--) {
  const a=t.points[i],b=t.points[(i+1)%n];travelled+=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(travelled<8)continue;travelled=0;
  const x=(slot%2?1:-1)*Math.min(t.width*.24,3.2);
  quad(paint,i,i+1,x-1.0,x-.93,.024);quad(paint,i,i+1,x+.93,x+1.0,.024);
  slot++;
 }
 function add(v,color,opacity,name,roughness=1) {
  const m=new THREE.MeshStandardMaterial({color,roughness,transparent:opacity<1,opacity,depthWrite:opacity===1,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry(v),m);mesh.name=name;mesh.receiveShadow=true;mesh.renderOrder=2;group.add(mesh);
 }
 add(rubber,'#24292c',wet?.12:.18,'bank-conforming-rubber-and-repairs');
 add(paint,'#dfdfd3',.72,'standing-grid-paint');
 if(metal.length)add(metal,'#495358',.70,'street-drainage-grates',.6);
 // Batched roadside delineator posts, no new colliders. Full-loop and pit exclusion.
 const positions=[];let distance=0;
 for(let i=0;i<n;i++) {
  const a=t.points[i],b=t.points[(i+1)%n];distance+=Math.hypot(a[0]-b[0],a[1]-b[1]);
  if(distance<plan.spacing)continue;distance=0;
  for(const side of [-1,1]) {
   const p=roadPoint(t,i,side*(t.width/2+5.5),.32);
   if(!world.clearance.circleClear(p[0],p[2],.25))continue;
   if(world.pitClearance&&!world.pitClearance.circleClear(p[0],p[2],.25))continue;
   if(world.sceneryAudit.buildings.some(b=>inside([p[0],p[2]],b.footprint)||b.footprint.some((a,i)=>pointSegmentDistance([p[0],p[2]],a,b.footprint[(i+1)%b.footprint.length])<.5)))continue;
   // Avoid placing posts in a road crossing elsewhere on the closed loop.
   if(t.points.some((a,j)=>pointSegmentDistance([p[0],p[2]],a,t.points[(j+1)%n])<t.width/2+3))continue;
   positions.push([p[0],world.height(p[0],p[2])+.38,p[2]]);
  }
 }
 if(positions.length) {
  const geo=new THREE.BoxGeometry(.14,.74,.14),mat=new THREE.MeshStandardMaterial({color:'#e3e2d5',roughness:.83});
  const posts=new THREE.InstancedMesh(geo,mat,positions.length),matrix=new THREE.Matrix4();
  positions.forEach((p,i)=>posts.setMatrixAt(i,matrix.makeTranslation(...p)));
  posts.name='batched-roadside-delineators';posts.castShadow=config.quality==='high';group.add(posts);
 }
 world.finishAudit={track:t.name,era:config.era,bankConforming:true,collisionChanges:false,corners:plan.corners.length,posts:positions.length,drawCalls:group.children.length,streetDrainage:plan.street};
 return group;
}
