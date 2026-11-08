//! Lightweight native renderer using exactly the same Rust simulation as the browser.
use apex_heritage::{tracks, Simulation};
use macroquad::prelude::*;
fn conf()->Conf{Conf{window_title:"APEX / HERITAGE — Native".into(),window_width:1440,window_height:900,high_dpi:true,..Default::default()}}
fn car(p:Vec3,yaw:f32,color:Color){
 let f=vec3(yaw.sin(),0.,yaw.cos());let r=vec3(yaw.cos(),0.,-yaw.sin());
 draw_cube(p+vec3(0.,0.48,0.),vec3(1.3,0.55,3.6),None,color);
 draw_cube(p+f*2.0+vec3(0.,0.24,0.),vec3(2.5,0.12,0.55),None,color);
 draw_cube(p-f*1.8+vec3(0.,0.95,0.),vec3(2.2,0.12,0.55),None,color);
 draw_sphere(p+vec3(0.,1.,0.),0.28,None,WHITE);
 for x in [-1.,1.]{for z in [-1.25,1.25]{draw_cube(p+r*x+f*z+vec3(0.,0.36,0.),vec3(0.48,0.72,0.72),None,Color::from_rgba(18,19,20,255));}}
}
#[macroquad::main(conf)]
async fn main(){
 let circuits=tracks();let mut ti=0usize;let mut era=2usize;let mut team=0usize;let mut wet=false;let mut assist=true;let mut menu=true;let mut paused=false;let mut sim=Simulation::new(ti,era,team,wet,assist);let mut accumulator=0.;
 loop{
 if is_key_pressed(KeyCode::Escape){if !menu{paused=!paused;}}
 if menu{
  if is_key_pressed(KeyCode::Right){ti=(ti+1)%10;}if is_key_pressed(KeyCode::Left){ti=(ti+9)%10;}
  if is_key_pressed(KeyCode::E){era=(era+1)%4;}if is_key_pressed(KeyCode::T){team=(team+1)%4;}
  if is_key_pressed(KeyCode::W){wet=!wet;}if is_key_pressed(KeyCode::A){assist=!assist;}
  if is_key_pressed(KeyCode::Enter){sim=Simulation::new(ti,era,team,wet,assist);menu=false;paused=false;}
 }
 if !menu && !paused{
  if is_key_pressed(KeyCode::R){sim.recover();}if is_key_pressed(KeyCode::M){menu=true;}
  let throttle=if is_key_down(KeyCode::W)||is_key_down(KeyCode::Up){1.}else{0.};
  let brake=if is_key_down(KeyCode::S)||is_key_down(KeyCode::Down)||is_key_down(KeyCode::Space){1.}else{0.};
  let steer=(if is_key_down(KeyCode::A)||is_key_down(KeyCode::Left){1.}else{0.})-(if is_key_down(KeyCode::D)||is_key_down(KeyCode::Right){1.}else{0.});
  accumulator+=get_frame_time().min(0.1);while accumulator>=1./120.{sim.step(throttle,brake,steer,1./120.);accumulator-=1./120.;}
 }
 clear_background(if wet{Color::from_rgba(100,117,126,255)}else{Color::from_rgba(162,193,208,255)});
 let s=sim.state();let p=vec3(s.x,0.,s.z);let f=vec3(s.yaw.sin(),0.,s.yaw.cos());
 set_camera(&Camera3D{position:p-f*10.+vec3(0.,5.,0.),target:p+f*12.+vec3(0.,0.7,0.),up:vec3(0.,1.,0.),fovy:58.,z_far:12000.,..Default::default()});
 draw_plane(vec3(0.,-0.12,0.),vec2(10000.,10000.),None,Color::from_rgba(57,78,45,255));
 let t=&circuits[ti];let n=t.points.len();
 for i in 0..n{let a=t.points[i];let b=t.points[(i+1)%n];if (a[0]-s.x).hypot(a[1]-s.z)>700.{continue;}
  let dx=b[0]-a[0];let dz=b[1]-a[1];let len=dx.hypot(dz);let r=vec3(dz/len,0.,-dx/len)*t.width*0.5;let av=vec3(a[0],0.,a[1]);let bv=vec3(b[0],0.,b[1]);
  let vertices=vec![Vertex::new2(av-r,vec2(0.,0.),Color::from_rgba(48,50,52,255)),Vertex::new2(av+r,vec2(1.,0.),Color::from_rgba(48,50,52,255)),Vertex::new2(bv-r,vec2(0.,1.),Color::from_rgba(48,50,52,255)),Vertex::new2(bv+r,vec2(1.,1.),Color::from_rgba(48,50,52,255))];
  draw_mesh(&Mesh{vertices,indices:vec![0,1,2,2,1,3],texture:None});
  if i%3==0{let c=if i%6==0{RED}else{WHITE};draw_cube(av-r*1.04,vec3(0.5,0.06,2.),None,c);draw_cube(av+r*1.04,vec3(0.5,0.06,2.),None,c);}
  if i%20==0{let tree=av+r*4.;draw_cube(tree+vec3(0.,2.,0.),vec3(0.7,4.,0.7),None,BROWN);draw_sphere(tree+vec3(0.,5.,0.),3.,None,DARKGREEN);}
 }
 car(p,s.yaw,[RED,ORANGE,BLUE,GREEN][team]);set_default_camera();
 if menu{
  draw_rectangle(0.,0.,screen_width(),screen_height(),Color::new(0.025,0.03,0.035,0.94));
  draw_text("APEX / HERITAGE",70.,100.,56.,WHITE);draw_text("THE HISTORY OF SPEED. IN YOUR HANDS.",72.,145.,22.,ORANGE);
  draw_text(&format!("<  {}  >",t.name),72.,245.,42.,WHITE);
  draw_text(&format!("[E] ERA: {}     [T] TEAM: {}",["1967 / NO WINGS","1988 / TURBO","2004 / V10","2023 / HYBRID"][era],team+1),72.,315.,26.,WHITE);
  draw_text(&format!("[W] WET: {}     [A] ASSISTS: {}",wet,assist),72.,365.,26.,WHITE);
  draw_text("ARROWS: SELECT CIRCUIT     ENTER: DRIVE",72.,445.,26.,ORANGE);
  draw_text("WASD / ARROWS: DRIVE   SPACE: BRAKE   R: RECOVER   ESC: PAUSE   M: MENU",72.,515.,19.,GRAY);
  draw_text("Native prototype / original assets / map-derived layouts / unofficial",72.,screen_height()-50.,18.,GRAY);
 }else{
  draw_rectangle(20.,20.,470.,95.,Color::new(0.,0.,0.,0.7));draw_text(&format!("{}   LAP {}",t.name,s.lap),40.,54.,25.,WHITE);
  draw_text(&format!("{:03} km/h   G{}   {:02}:{:05.2}",s.speed*3.6,s.gear,(s.lap_time/60.) as u32,s.lap_time%60.),40.,93.,32.,ORANGE);
  draw_text("WASD / arrows  •  Space brake  •  R recover  •  Esc pause  •  M menu",25.,screen_height()-25.,20.,WHITE);
  if s.offtrack{draw_text("OFF TRACK",screen_width()/2.-90.,80.,30.,ORANGE);}
  if paused{draw_rectangle(0.,0.,screen_width(),screen_height(),Color::new(0.,0.,0.,0.6));draw_text("PAUSED — ESC TO RESUME",screen_width()/2.-220.,screen_height()/2.,38.,WHITE);if is_key_pressed(KeyCode::M){menu=true;paused=false;}}
 }
 next_frame().await
 }
}
