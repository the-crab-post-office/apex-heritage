import {chromium} from 'playwright';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const roster=JSON.parse(fs.readFileSync('data/roster.json'));
const dir=process.env.CAPTURE_DIR||'artifacts/023-cars';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:750}});page.setDefaultTimeout(180000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.APEX_URL||'http://127.0.0.1:5192/');
 await page.waitForFunction(()=>window.__showroom?.container.dataset.ready==='true');
 await page.evaluate(()=>{const s=window.__showroom;cancelAnimationFrame(s.animation);s.inView=false;s.controls.autoRotate=false;});
 const version=await page.evaluate(async()=> (await (await fetch('./version.json')).json()).version);
 const selected=process.env.QUICK ? [[5,2],[3,1],[4,1]] : [5,3,4].flatMap(e=>roster.eras[e].teams.map((_,i)=>[e,i]));
 const captures=[];
 for(const [era,team]of selected){
  const id=roster.eras[era].teams[team].id;
  for(const view of(process.env.QUICK?['hero']:((era===5&&team===2)||(era===3&&team===1)||(era===4&&team===1))?['hero','side']:['hero'])){
   const r=await page.evaluate(async({era,team,view})=>{
    const s=window.__showroom;await s.select(era,team);s.car.rotation.set(0,0,0);s.car.position.set(0,0,0);s.renderer.setPixelRatio(1);s.renderer.setSize(1100,650,false);s.renderer.setClearColor('#b8c0c5',1);s.scene.background=null;s.camera.aspect=1100/650;s.camera.zoom=1;s.camera.fov=30;
    s.camera.position.set(...(view==='side'?[8.6,1.65,.01]:[5.3,2.7,6.9]));s.camera.lookAt(0,.48,0);s.camera.updateProjectionMatrix();s.renderer.render(s.scene,s.camera);
    return {image:s.renderer.domElement.toDataURL('image/jpeg',.84).split(',')[1],ready:s.container.dataset.ready,geometries:s.renderer.info.memory.geometries,textures:s.renderer.info.memory.textures,calls:s.renderer.info.render.calls,triangles:s.renderer.info.render.triangles};
   },{era,team,view});
   if(r.ready!=='true')throw Error('Atlas '+id);
   const path=`${dir}/${id}-${view}.jpg`,bytes=Buffer.from(r.image,'base64');fs.writeFileSync(path,bytes);delete r.image;captures.push({id,era,view,path,sha256:createHash('sha256').update(bytes).digest('hex'),...r});console.log('Captured',id,view,r.triangles,'triangles',r.textures,'textures');
  }
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 const inputs=['data/car-shapes.json','data/car-variants.json','web/reference-car.js','web/livery.js','web/car-finish.js','web/showroom.js','web/car-variants.js'];
 fs.writeFileSync(`${dir}/captures.json`,JSON.stringify({url:process.env.APEX_URL||'http://127.0.0.1:5192/',version,source_commit:process.env.SOURCE_COMMIT||null,inputs:Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(process.env.SOURCE_COMMIT?execFileSync('git',['show',`${process.env.SOURCE_COMMIT}:${p}`],{maxBuffer:20000000}):fs.readFileSync(p)).digest('hex')])),errors,captures},null,2));
}finally{await browser.close();}
