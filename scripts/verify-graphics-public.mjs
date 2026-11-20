import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const url=process.env.APEX_URL||'https://the-crab-post-office.github.io/apex-heritage/';
const expected=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(180000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
try{
 await page.addInitScript(()=>localStorage.setItem('apex-config',JSON.stringify({era:5,team:2,track:2,livery:'2026-ferrari-austin',quality:'low',sound:false,mode:'practice',weather:'dry',racingLine:false})));
 await page.goto(url+'?graphics=017');
 await page.waitForFunction(()=>window.__showroom?.container.dataset.ready==='true');
 const remote=await page.evaluate(async()=>{
  const read=async p=>{const r=await fetch(p+'?proof='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Missing '+p);return r.json();};
  return {deployment:await read('./deployment.json'),version:await read('./version.json'),roster:await read('./licenses/roster.json'),liveries:await read('./licenses/liveries-2026.json')};
 });
 assert.equal(remote.version.version,'0.17.0-preview.1');assert.equal(remote.deployment.source_commit,expected);assert.equal(remote.roster.eras[5].teams.length,11);assert.equal(remote.liveries.specials.length,22);
 await page.evaluate(()=>{cancelAnimationFrame(window.__showroom.animation);document.querySelector('[data-nav=drive]').click();for(let i=0;i<3;i++)document.querySelector('#setup-next').click();document.querySelector('#start-race').click();});
 await page.waitForFunction(()=>window.__apex?.race?.world?.player&&document.querySelector('#session-loading').hidden&&window.__apex.race.animation);
 const actual=await page.evaluate(()=>{
  const r=window.__apex.race;cancelAnimationFrame(r.animation);r.paused=true;r.countdown=-1;
  for(let i=0;i<600;i++)r.sim.step(1,0,0,1/120);
  r.state=JSON.parse(r.sim.state_json());r.world.update(r.state,1/60);r.updateHud(performance.now());document.querySelector('#start-lights').hidden=true;
  return {era:r.config.era,team:r.config.team,livery:r.world.player.userData.livery.id,spec:JSON.parse(r.sim.spec_json()),speed:r.state.speed,rpm:r.state.rpm,gear:r.state.gear,finish:r.world.finishAudit,drs:document.querySelector('#hud-drs').textContent,build:document.querySelector('#hud-build').textContent};
 });
 assert.equal(actual.era,5);assert.equal(actual.spec.mass,770);assert.equal(actual.livery,'2026-ferrari-austin');assert.ok(actual.speed>10&&Number.isFinite(actual.rpm));assert.equal(actual.drs,'NO DRS');assert.deepEqual(errors,[]);
 await page.screenshot({path:'artifacts/022-public-driving.jpg',type:'jpeg',quality:82});
 fs.writeFileSync('artifacts/022-public-results.json',JSON.stringify({url,source_commit:expected,version:remote.version,teams:11,specials:22,actual,errors,note:'600 actual released-WASM fixed steps, not a completed player-driven lap.'},null,2));
 console.log('PASS public 0.17.0, matching source deployment, full 2026 roster, 22 specials, actual sixth-era WASM, selected Austin paint and HUD; no page errors');
}finally{await browser.close();}
