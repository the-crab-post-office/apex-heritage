import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Core from '../web/wasm/apex.js';
import { paintedTeam, liveriesFor, specialLiveries } from '../web/season-liveries.js';
import { detailPlan, lightingFor, buildTrackFinish } from '../web/track-finish.js';
import { gaugeTelemetry } from '../web/driving-hud.js';
import { ENGINE_PROFILES } from '../web/audio/engine-dsp.js';
const read=p=>JSON.parse(fs.readFileSync(p));
const roster=read('data/roster.json'),teams=roster.eras[5].teams,tracks=read('data/tracks.json');
await Core.default({module_or_path:fs.readFileSync('web/wasm/apex_bg.wasm')});
test('2026 is additive, complete and separate from the 22 paint choices',()=>{
 assert.equal(roster.eras[5].year,'2026');assert.equal(teams.length,11);assert.equal(specialLiveries.length,22);
 assert.equal(new Set(teams.map(t=>t.id)).size,11);assert.ok(teams.some(t=>t.id==='2026-audi'));assert.ok(teams.some(t=>t.id==='2026-cadillac'));
 for(const t of teams){
  assert.equal(paintedTeam(t,'not-a-real-livery'),t);
  for(const l of liveriesFor(t)){
   const paint=paintedTeam(t,l.id);assert.equal(paint.constructor_id,t.id);assert.equal(paint.id,l.id);
   for(const key of ['power','grip','brake','engine','number'])assert.equal(paint[key],t[key]);
   assert.ok(l.source.startsWith('https://'));assert.ok(fs.statSync(`web/assets/liveries/${l.id}.png`).size>1000);
  }
 }
 assert.equal(paintedTeam(teams[0],'2026-ferrari-austin'),teams[0]);
});
test('released 2026 WASM has its own finite spec, contacts, all teams, all tracks, dry/wet and pit capability',()=>{
 for(const wet of [false,true])for(let track=0;track<13;track++)for(let team=0;team<11;team++){
  const sim=new Core.Simulation(track,5,team,wet,true);
  try{
   const spec=JSON.parse(sim.spec_json());assert.equal(spec.mass,770);assert.equal(spec.gears,8);assert.ok(Math.abs(spec.aero-3.4)<1e-5);
   for(let step=0;step<12;step++)sim.step(1,0,.05,1/120);
   const s=JSON.parse(sim.state_json());for(const k of ['x','z','speed','rpm','steering'])assert.ok(Number.isFinite(s[k]),`${track}/${team}/${k}`);
   const corners=JSON.parse(sim.corner_geometry_json());assert.equal(corners.year,2026);assert.match(corners.label,/substitute/);
  } finally{sim.free();}
 }
});
test('2026 geometry is independently authored, compact, bounded and covered-wheel, not a 2023 repaint',()=>{
 const shapes=read('data/car-shapes.json'),l=shapes.layouts['5'];assert.equal(l.front-l.rear,3.4);assert.equal(l.front_width,.28);assert.equal(l.rear_width,.375);
 const names=shapes.models['5'].flatMap(b=>b.components);
 for(const name of ['2026 low tapered nose','2026 sculpted undercut sidepod','2026 recessed radiator mouth','2026 aero-section wishbone','front aerodynamic wheel cover','brake rotor cooling slot'])assert.ok(names.includes(name),name);
 assert.ok(!names.includes('2021 bargeboard cascade'));assert.notDeepEqual(shapes.models['5'],shapes.models['3']);
 for(const b of shapes.models['5']){assert.ok(b.indices.every(i=>i>=0&&i<b.positions.length));assert.ok(b.positions.flat().every(Number.isFinite));}
});
test('all thirteen circuits get bounded visual detail; geometry uses banked road coordinates',()=>{
 assert.equal(tracks.length,13);
 for(const t of tracks){
  const plan=detailPlan(t,5);assert.ok(plan.corners.length>0&&plan.corners.length<=35,t.name);assert.equal(plan.street,['MC','AZ'].includes(t.code));
  assert.ok(lightingFor(t.code).strength>1.5);
 }
 const code=buildTrackFinish.toString();assert.ok(code.includes('roadPoint'));assert.ok(code.includes('circleClear'));assert.ok(code.includes('InstancedMesh'));
});
test('2026 audio has a procedural six-cylinder profile and no fabricated DRS signal',()=>{
 assert.equal(ENGINE_PROFILES[5].cylinders,6);assert.match(ENGINE_PROFILES[5].name,/2026.*procedural/);
 assert.equal(gaugeTelemetry({rpm:9000,speed:60,drs_active:true},5).drsActive,false);
 assert.equal(gaugeTelemetry({rpm:9000,speed:60},5).drsLabel,'NO DRS');
});

test('production thirteen-circuit proof matches source bytes and independently measured old pit baselines',()=>{
 const report=read('data/graphics-2026-validation.json'),baseline=read('data/graphics-2026-baseline.json');
 const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(report.tracks.length,13);assert.equal(report.cars,11);assert.equal(report.specials,22);
 assert.equal(report.wasm_sha256,sha('web/wasm/apex_bg.wasm'));
 for(const [p,hash]of Object.entries(report.inputs))assert.equal(sha(p),hash,p);
 for(const [p,hash]of Object.entries(baseline.unchanged_inputs))assert.equal(sha(p),hash,p);
 for(const r of report.tracks){
  assert.equal(r.finish.collisionChanges,false);assert.ok(r.finish.drawCalls<=4);
  for(const key of ['missingRoad','terrainIntrusions','overlayIntrusions','centerErrors'])assert.equal(r.road[key],0,r.name);
  assert.equal(r.pit.intrusions,0);assert.equal(r.pit.missing,baseline.tracks.find(t=>t.track===r.name)?.pit.missing||0);
 }
});
