// Original micro-surface texture. Never photographic or a constructor-specific scan.
import * as THREE from 'three';
export function carbonFinish() {
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d');
 for(let y=0;y<64;y+=4)for(let x=0;x<64;x+=4){
  const warp=(Math.floor(x/8)+Math.floor(y/8))%2===0;
  ctx.fillStyle=warp?'#30343a':'#292d32';ctx.fillRect(x,y,4,4);
  ctx.fillStyle=warp?'#383c41':'#303439';ctx.fillRect(x,y,warp?3:1,warp?1:3);
 }
 const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(48,48);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshPhysicalMaterial({color:'#92989f',map,bumpMap:map,bumpScale:.00018,roughness:.43,metalness:.20,clearcoat:.24,clearcoatRoughness:.28,side:THREE.DoubleSide});
}

// Deterministic micro grain on rubber; no photograph is used as a texture.
export function tyreFinish() {
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d'),image=ctx.createImageData(64,64);let seed=731;
 for(let i=0;i<image.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=115+(seed>>>27);image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}
 ctx.putImageData(image,0,0);
 const bump=new THREE.CanvasTexture(c);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(22,3);
 return new THREE.MeshPhysicalMaterial({color:'#202124',roughness:.72,metalness:0,bumpMap:bump,bumpScale:.00028,clearcoat:.06,clearcoatRoughness:.7});
}
