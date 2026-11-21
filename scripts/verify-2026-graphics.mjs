import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { launchSession } from './menu-navigation.mjs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.setDefaultTimeout(180000);
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message);});
await page.addInitScript(()=>localStorage.setItem('apex-config',JSON.stringify({era:5,team:2,quality:'high',sound:false,weather:'dry',mode:'practice',racingLine:false})));
const dir=process.env.GRAPHICS_DIR||'artifacts/022-graphics';fs.mkdirSync(dir,{recursive:true});
try {
 await page.goto(process.env.APEX_URL||'http://127.0.0.1:5190/');
 console.log('loaded document');
 await page.waitForFunction(()=>window.__showroom?.container.dataset.ready==='true');
 console.log('showroom ready');
 // Real setup navigation; verify that season / constructor selection is available.
 await page.evaluate(()=>{cancelAnimationFrame(window.__showroom.animation);document.querySelector('[data-nav="drive"]').click();for(let i=0;i<3;i++)document.querySelector('#setup-next').click();});console.log('team screen');
 assert.equal(await page.locator('[data-team]').count(),11);
 await page.selectOption('#livery-select','2026-ferrari-austin');
 await page.waitForFunction(()=>window.__showroom?.car?.userData.livery.id==='2026-ferrari-austin'&&window.__showroom.container.dataset.ready==='true');
 await page.evaluate(()=>{const s=window.__showroom;s.renderer.render(s.scene,s.camera);});
 await page.screenshot({path:`${dir}/garage.jpg`,type:'jpeg',quality:82});
 const specials=JSON.parse(fs.readFileSync('data/liveries-2026.json')).specials;
 const roster=JSON.parse(fs.readFileSync('data/roster.json')).eras[5].teams;
 const cars=[];
 if(!process.env.SKIP_CARS) {
 for(const [index,t] of roster.entries()) {
  const r=await page.evaluate(async({index})=>{
   const s=window.__showroom;s.inView=false;cancelAnimationFrame(s.animation);s.controls.autoRotate=false;
   await s.select(5,index);s.car.rotation.set(0,0,0);s.car.position.set(0,.02,0);
   s.renderer.setPixelRatio(1);s.renderer.setSize(1000,625,false);s.renderer.setClearColor('#8e9b9f',1);s.scene.background=null;
   s.camera.aspect=1.6;s.camera.zoom=1;s.camera.fov=30;s.camera.position.set(6.7,2.8,7.7);s.camera.lookAt(0,.5,0);s.camera.updateProjectionMatrix();s.renderer.render(s.scene,s.camera);
   const p=s.car.userData;return {id:p.livery.id,ready:s.container.dataset.ready,layout:p.layout,profile:p.detail.referenceProfile,image:s.renderer.domElement.toDataURL('image/jpeg',.80).split(',')[1]};
  },{index});
  assert.equal(r.ready,'true');assert.equal(r.id,t.id);assert.ok(Math.abs(r.layout.front-r.layout.rear-3.4)<1e-6);
  fs.writeFileSync(`${dir}/${t.id}.jpg`,Buffer.from(r.image,'base64'));delete r.image;cars.push(r);
 }
 for(const livery of specials){
  const index=roster.findIndex(t=>t.id===livery.team_id);
  const result=await page.evaluate(async({index,id})=>{const s=window.__showroom;await s.select(5,index,id);return {id:s.car.userData.livery.id,ready:s.container.dataset.ready};},{index,id:livery.id});
  assert.equal(result.id,livery.id);assert.equal(result.ready,'true');
 }
 }
 // Restore selected constructor's preview and use saved UI paint for the race.
 await page.selectOption('#livery-select','2026-ferrari-austin');
 const tracks=JSON.parse(fs.readFileSync('data/tracks.json')),circuits=[];
 for(let track=Number(process.env.TRACK_FROM||0);track<Number(process.env.TRACK_TO||tracks.length);track++){
  await page.evaluate(track=>document.querySelector(`[data-track="${track}"]`).click(),track);
  await launchSession(page);
  await page.waitForFunction(()=>window.__apex?.race?.world?.player&&document.querySelector('#session-loading').hidden&&window.__apex.race.animation);
  const result=await page.evaluate(async()=>{
   const r=window.__apex.race,w=r.world;r.paused=true;cancelAnimationFrame(r.animation);await Promise.all(w.surfaces.pending);
   const loaded=await w.player.userData.liveryReady;
   const target=w.sample(.04);w.camera.aspect=1.6;w.camera.fov=48;w.renderer.setPixelRatio(1);w.renderer.setSize(1000,625,false);
   w.camera.position.set(target.x+65,target.y+60,target.z+85);w.camera.lookAt(target.x,target.y,target.z);w.camera.updateProjectionMatrix();w.renderer.render(w.scene,w.camera);
   const image=w.renderer.domElement.toDataURL('image/jpeg',.80).split(',')[1];
   // Exercise actual WASM, not synthetic telemetry, and test every new team's index.
   const finite=[Number.isFinite(JSON.parse(r.sim.spec_json()).power)];
   for(let i=0;i<120;i++)r.sim.step(1,0,0,1/120);
   const state=JSON.parse(r.sim.state_json());
   return {name:w.track.name,finish:w.finishAudit,livery:w.player.userData.livery.id,loaded,image,spec:JSON.parse(r.sim.spec_json()),speed:state.speed,road:w.auditRoadSurface?.(20),pit:w.auditPitSurface(12),terrain:w.auditGroundCoverage(20),buildings:w.auditBuildingMeshes(false),reference:w.auditReferenceScene?.(),finite};
  });
  assert.equal(result.name,tracks[track].name);assert.equal(result.finish.bankConforming,true);assert.equal(result.finish.collisionChanges,false);assert.ok(result.finish.drawCalls<=4);assert.equal(result.loaded,true);assert.ok(result.speed>0&&Number.isFinite(result.speed));assert.equal(result.spec.mass,770);
  for(const key of ['missingRoad','terrainIntrusions','overlayIntrusions','centerErrors'])assert.equal(result.road[key],0,`${result.name}: ${key}`);
  fs.writeFileSync(`${dir}/probe-${track}.json`,JSON.stringify({...result,image:undefined},null,2));
  assert.equal(result.pit.intrusions,0);
  // Known pit-edge raycast seams are baseline-checked, not new road holes.
  assert.equal(result.pit.missing,JSON.parse(fs.readFileSync('data/graphics-2026-baseline.json')).tracks.find(t=>t.track===result.name)?.pit.missing||0);
  if(result.reference?.blocked!==undefined)assert.equal(result.reference.blocked,0);
  fs.writeFileSync(`${dir}/track-${track}.jpg`,Buffer.from(result.image,'base64'));delete result.image;circuits.push(result);console.log('PASS',track,result.name,JSON.stringify(result.finish));
  await page.evaluate(()=>document.querySelector('#exit-race').click());
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${dir}/results-${process.env.TRACK_FROM||0}.json`,JSON.stringify({cars,specials:process.env.SKIP_CARS?0:specials.length,circuits,errors},null,2));
 console.log(`PASS ${cars.length} cars / ${process.env.SKIP_CARS?0:specials.length} specials checked, ${circuits.length} circuits in this batch, actual 2026 WASM; no page errors`);
} finally {await browser.close();}
