import {chromium} from 'playwright';
import fs from 'node:fs';
const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage();
p.setDefaultTimeout(180000);
try{
 await p.addInitScript(track=>localStorage.setItem('apex-config',JSON.stringify({era:3,team:0,track,quality:'low',sound:false,mode:'practice',weather:'dry'})),Number(process.env.BASELINE_TRACK||11));
 await p.goto(process.env.APEX_URL);
 await p.waitForFunction(()=>window.__showroom?.container.dataset.ready==='true');
 await p.evaluate(()=>{cancelAnimationFrame(window.__showroom.animation);document.querySelector('[data-nav=drive]').click();for(let i=0;i<3;i++)document.querySelector('#setup-next').click();document.querySelector('#start-race').click();});
 await p.waitForFunction(()=>window.__apex?.race?.world&&document.querySelector('#session-loading').hidden&&window.__apex.race.animation);
 const r=await p.evaluate(()=>{const r=window.__apex.race;cancelAnimationFrame(r.animation);r.paused=true;return {version:document.querySelector('meta[name=apex-build]').content,pit:r.world.auditPitSurface(12),road:r.world.auditRoadSurface(20)};});
 console.log(JSON.stringify(r));fs.writeFileSync(`artifacts/022-graphics/pit-baseline-${process.env.BASELINE_TRACK||11}.json`,JSON.stringify(r,null,2));
}finally{await b.close();}
