// Original micro-surface texture. Never photographic or a constructor-specific scan.
import * as THREE from 'three';
export function carbonFinish() {
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d');
 for(let y=0;y<64;y+=4)for(let x=0;x<64;x+=4){
  const warp=(Math.floor(x/8)+Math.floor(y/8))%2===0;
  ctx.fillStyle=warp?'#32383c':'#20262b';ctx.fillRect(x,y,4,4);
  ctx.fillStyle=warp?'#484e51':'#343b40';ctx.fillRect(x,y,warp?3:1,warp?1:3);
 }
 const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(16,16);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshPhysicalMaterial({color:'#545b60',map,roughness:.5,metalness:.22,clearcoat:.15,clearcoatRoughness:.4,side:THREE.DoubleSide});
}
