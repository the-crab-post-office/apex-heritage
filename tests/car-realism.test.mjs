import fs from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {variantPoint} from '../web/car-variants.js';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const reference=read('data/car-realism-reference.json'),shapes=read('data/car-shapes.json');
test('user year assignments are explicit; older models and physics/track/HUD source remain unchanged',()=>{
 assert.deepEqual(reference.references.map(r=>r.year),[2026,2026,2026,2023,2023,2023,2026,2023,2021,2021]);
 for(const [era,hash]of Object.entries(reference.unchanged_older_models))assert.equal(sha(JSON.stringify(shapes.models[era])),hash,era);
 for(const [path,hash]of Object.entries(reference.unchanged_physics_and_track_inputs))assert.equal(sha(fs.readFileSync(path)),hash,path);
});
test('all three modern bodies include sculpted coamings, genuine recessed ducts and finite bounded batches',()=>{
 for(const era of [3,4,5]){
  const batches=shapes.models[era],names=batches.flatMap(b=>b.components);
  assert.ok(names.includes('sculpted cockpit coaming'));
  assert.ok(names.some(n=>n.includes('recessed duct walls')));
  assert.ok(names.includes('camera T bar aerofoil'));
  assert.ok(batches.some(b=>b.material==='tyre_rubber'));
  assert.equal(batches.some(b=>b.material==='wheel_cover'),era!==4);
  for(const b of batches){assert.ok(b.positions.length<10000);assert.ok(b.indices.length<=32768);assert.ok(b.positions.flat().every(Number.isFinite));assert.ok(b.indices.every(i=>i>=0&&i<b.positions.length));}
 }
});
test('new pod contours move inset ducts and conformal decals identically, never the wheels or contact points',()=>{
 const p=[.74,.59,-.4];
 for(const id of ['2023-ferrari','2023-mercedes','2023-red-bull','2021-red-bull']){
  const pod=variantPoint(id,'pods',p);
  for(const mat of ['decals','pod_carbon','pod_shadow','pod_metal'])assert.deepEqual(variantPoint(id,mat,p),pod);
  for(const mat of ['rim','wheel_cover','tyre_rubber'])assert.deepEqual(variantPoint(id,mat,p),p);
 }
 assert.ok(variantPoint('2023-mercedes','pods',p)[0]<variantPoint('2023-ferrari','pods',p)[0]);
});
test('modern production render report contains authentic before/after bytes and all 31 teams',()=>{
 const report=read('data/car-realism-captures.json'),html=fs.readFileSync('web/public/car-realism.html','utf8');
 const images=[...html.matchAll(/src="data:image\/jpeg;base64,([^"]+)"/g)].map(m=>Buffer.from(m[1],'base64'));
 assert.equal(report.version,'0.18.0-preview.1');assert.equal(report.before_version,'0.17.0-preview.1');assert.equal(report.teams,31);assert.equal(report.captures.length,34);assert.equal(images.length,6);
 assert.deepEqual(report.errors,[]);assert.equal(new Set(report.captures.map(c=>c.id)).size,31);
 for(const c of report.captures){assert.equal(c.ready,'true');assert.ok(c.geometries<65);assert.ok(c.textures<8);assert.ok(c.triangles>20000&&c.triangles<100000);}
 for(const c of report.report_images)assert.ok(images.some(b=>sha(b)===c.sha256),c.id);
 for(const [p,hash]of Object.entries(report.inputs))assert.equal(sha(fs.readFileSync(p)),hash,p);
});
