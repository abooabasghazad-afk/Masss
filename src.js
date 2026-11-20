import './style.css';
import * as T from 'three';
import * as C from 'cannon-es';
const $=id=>document.getElementById(id), game=$('game');
const scene=new T.Scene();scene.fog=new T.FogExp2(0xe6a083,.014);
const camera=new T.OrthographicCamera();
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;game.prepend(renderer.domElement);
const canvas=renderer.domElement;
function resize(){const w=game.clientWidth,h=game.clientHeight,a=w/h,s=Math.max(20,25/a);camera.left=-s*a/2;camera.right=s*a/2;camera.top=s/2;camera.bottom=-s/2;camera.position.set(3,10,30);camera.lookAt(0,3,0);camera.updateProjectionMatrix();renderer.setSize(w,h);}
new ResizeObserver(resize).observe(game);resize();
scene.add(new T.HemisphereLight(0xffecd1,0xa46773,2));const light=new T.DirectionalLight(0xffd2a3,3);light.position.set(-9,16,8);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-20,right:20,top:15,bottom:-15,far:65});light.shadow.normalBias=.035;scene.add(light);
const sky=new T.Mesh(new T.PlaneGeometry(300,180),new T.ShaderMaterial({depthWrite:false,uniforms:{},vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 v; void main(){vec2 p=v;vec3 col=mix(vec3(1.,.74,.53),vec3(.55,.33,.49),smoothstep(.44,.68,p.y));float d=length((p-vec2(.47,.55))*vec2(1.67,1.));col=mix(col,vec3(1.,.77,.48),.35*exp(-d*29.));col=mix(col,vec3(1.,.86,.61),1.-smoothstep(.022,.023,d));gl_FragColor=vec4(col,1.);}` }));sky.position.set(0,3,-55);sky.renderOrder=-1;scene.add(sky);
const mat=color=>new T.MeshStandardMaterial({color,roughness:.88});
function mesh(geo,color,x,y,z,parent=scene){const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const box=(w,h,d,c,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
const ball=(r,c,x,y,z,p)=>mesh(new T.SphereGeometry(r,24,16),c,x,y,z,p);
let seed=123;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let layer=0;layer<3;layer++)for(let j=-6;j<7;j++){const g=mesh(new T.CylinderGeometry(1.2+rand()*1.5,4+rand()*3,5+rand()*8,5),[0xa76879,0xb87577,0xbc806b][layer],j*6+rand()*3,-2+rand()*2,-39+layer*8);g.rotation.y=rand()*6;}
for(let j=0;j<15;j++){const m=ball(1,0xffc7a9,(rand()-.5)*75,8+rand()*6,-26-rand()*5);m.scale.set(2+rand()*4,.12+rand()*.15,.55);m.castShadow=false;}
box(120,1,60,0xb97754,0,-1.3,-12);box(28,1.25,9,0x945838,0,-.64,0);box(28.25,.22,9.2,0xc8975b,0,-.11,0);
for(let j=0;j<95;j++){const x=(rand()-.5)*28,z=(rand()-.5)*8.9;if(Math.abs(z)<1.8&&rand()<.95)continue;const m=mesh(new T.DodecahedronGeometry(.07+rand()*.22),j%3?0xa4714b:0xddae75,x,.015,z);m.scale.y=.47;}
function cactus(x,z,s){const g=new T.Group();scene.add(g);g.position.set(x,0,z);g.scale.setScalar(s);mesh(new T.CapsuleGeometry(.17,1.25,5,9),0x667d56,0,.78,0,g);for(const side of [-1,1]){const a=mesh(new T.CapsuleGeometry(.1,.45,4,8),0x788b5a,side*.26,.67+(side+1)*.13,0,g);a.rotation.z=-side*.85;}}
[[-12,-2,1.3],[-10,3,.7],[-5,-3,.9],[0,-3.4,.7],[11,-2,1.35],[12,3,.9],[3,3.5,.65]].forEach(a=>cactus(...a));
const anchor=new T.Vector3(-8.5,2.55,0);const fork=new T.Group();scene.add(fork);fork.position.x=anchor.x;box(1.55,.19,1.15,0x77533e,0,.095,0,fork);box(.38,1.65,.36,0x844728,0,.95,0,fork);
function rod(a,b,r,c,p=scene){const m=mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),10),c,0,0,0,p);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
const tips=[new T.Vector3(anchor.x-.45,2.78,.35),new T.Vector3(anchor.x+.47,2.78,-.3)];for(const v of tips){rod(new T.Vector3(anchor.x,1.35,0),v,.17,0x9c582c);ball(.18,0xbf7541,v.x,v.y,v.z);}
const straps=tips.map(()=>box(.09,1,.11,0x502c2b,0,0,0));
function bird(){const g=new T.Group();sphereFace(g,.48,0xe93f39);const belly=ball(.33,0xffdabe,0,-.18,.24,g);belly.scale.set(1,.73,.63);const beak=mesh(new T.ConeGeometry(.16,.32,4),0xffac42,.12,-.03,.51,g);beak.rotation.x=Math.PI/2;for(let i=0;i<2;i++){const crest=ball(.12,0xb6192b,-.15-i*.12,.44,.01,g);crest.scale.y=1.8;crest.rotation.z=.35;}eyes(g,.38);return g;}
function sphereFace(g,r,c){ball(r,c,0,0,0,g);}
function eyes(g,z){for(const x of [-.17,.17]){ball(.135,0xfff5d9,x,.13,z,g);ball(.057,0x251c2d,x+.035,.13,z+.112,g);const brow=box(.24,.063,.06,0x49262a,x,.245,z+.07,g);brow.rotation.z=x<0?-.27:.27;}}
function pig(){const g=new T.Group();sphereFace(g,.46,0x8cbe4c);for(const x of [-.29,.29]){ball(.14,0x86ac44,x,.36,0,g);ball(.07,0x597839,x,.39,.099,g);}eyes(g,.34);const nose=ball(.22,0xb2d66c,0,-.09,.4,g);nose.scale.set(1,.76,.6);for(const x of [-.075,.075])ball(.045,0x4f7334,x,-.08,.525,g);return g;}
const world=new C.World({gravity:new C.Vec3(0,-13,0),allowSleep:true});world.solver.iterations=16;world.defaultContactMaterial.friction=.55;world.defaultContactMaterial.restitution=.12;
const floor=new C.Body({mass:0,shape:new C.Box(new C.Vec3(14,.5,4.5)),position:new C.Vec3(0,-.5,0)});world.addBody(floor);
let entities=[],queue=[],current,drag=null,pull=new T.Vector3(),stage=1,total=0,score=0,shots=4,remaining=0,time=0,ended=false,sound=false,ctx,advance=false;
const path=new T.Group();scene.add(path);const dots=Array.from({length:23},()=>{const m=new T.Mesh(new T.SphereGeometry(.08,8,6),new T.MeshBasicMaterial({color:0xffefd1}));path.add(m);return m;});path.visible=false;
const num=n=>n.toLocaleString('fa-IR');
function hud(){$('level').textContent=num(stage).padStart(2,'۰');$('score').textContent=num(total+score);$('ammo').textContent='● '.repeat(shots).trim()||'—';}
function tone(freq,vol=.1){if(!sound||!ctx)return;const a=ctx.createOscillator(),b=ctx.createGain();a.type='triangle';a.frequency.setValueAtTime(freq,ctx.currentTime);a.frequency.exponentialRampToValueAtTime(freq/2,ctx.currentTime+.17);b.gain.setValueAtTime(vol,ctx.currentTime);b.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.23);a.connect(b).connect(ctx.destination);a.start();a.stop(ctx.currentTime+.24);}
function add(view,shape,mass,x,y,z,kind){scene.add(view);view.position.set(x,y,z);const body=new C.Body({mass,shape,position:new C.Vec3(x,y,z),linearDamping:.07,angularDamping:.18});world.addBody(body);const e={view,body,kind};entities.push(e);return e;}
function timber(w,h,d,x,y,z,c){const v=new T.Group();box(w,h,d,c,0,0,0,v);for(const s of [-1,1]){const along=w>=h;box(along?.11:w+.015,along?h+.015:.11,d+.02,0xa4663c,along?s*(w/2-.12):0,along?0:s*(h/2-.12),0,v);}add(v,new C.Box(new C.Vec3(w/2,h/2,d/2)),w*h*d*.8,x,y,z,'wood');}
function target(x,y,z){const e=add(pig(),new C.Sphere(.46),.8,x,y,z,'pig');remaining++;e.body.addEventListener('collide',ev=>{const hit=ev.body;const impact=Math.abs(ev.contact.getImpactVelocityAlongNormal());if((hit.isBird&&impact>1.1)||impact>4.5)e.hit=true;});}
function clearView(v){scene.remove(v);v.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
function reset(){for(const e of entities){world.removeBody(e.body);clearView(e.view);}for(const v of queue)clearView(v);if(current)clearView(current);entities=[];queue=[];current=null;remaining=0;shots=4;score=0;time=0;ended=false;advance=false;drag=null;path.visible=false;$('result').hidden=true;
const wood=0xc8874a, cap=0xe0a460;
for(const x of [3.55,7.8]){for(const dx of [-1.22,1.22])timber(.37,2.35,1.5,x+dx,1.175,0,wood);timber(3.25,.32,1.65,x,2.51,0,cap);target(x,.47,0);}
for(const x of [4.9,6.45])timber(.31,1.85,1.18,x,3.595,0,wood);timber(2.85,.32,1.52,5.68,4.68,0,cap);target(5.68,5.31,0);
if(stage%3!==1){for(const x of [2.48,4.58])timber(.28,1.55,1.3,x,3.445,0,wood);timber(2.37,.27,1.55,3.55,4.355,0,cap);target(3.55,4.97,0);}
if(stage%3===0)target(9.95,.47,0);
for(let i=0;i<3;i++){const v=bird();v.scale.setScalar(.8);v.position.set(-9.65-i*.88,.39,.72);scene.add(v);queue.push(v);}load();hud();}
function load(){current=bird();current.position.copy(anchor);scene.add(current);}
function bands(){straps.forEach((m,i)=>{const b=current?.position||anchor,a=tips[i],delta=b.clone().sub(a);m.position.copy(a).lerp(b,.5);m.scale.y=delta.length();m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());});}
const ray=new T.Raycaster(), plane=new T.Plane(new T.Vector3(0,0,1),0);
function point(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);return ray.ray.intersectPlane(plane,new T.Vector3());}
const velocity=()=>pull.clone().multiplyScalar(-8.3);
canvas.addEventListener('pointerdown',e=>{if(!current||ended||drag||e.button!==0)return;const p=point(e);if(!p||p.distanceTo(anchor)>1.1)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,start:p};pull.set(0,0,0);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const p=point(e);if(!p)return;pull.copy(p).sub(drag.start);pull.x=Math.min(.15,pull.x);pull.y=Math.max(-2.1,pull.y);pull.clampLength(0,3.3);current.position.copy(anchor).add(pull);const v=velocity();path.visible=pull.length()>.2;dots.forEach((d,i)=>{const t=(i+1)*.058;d.position.copy(current.position).addScaledVector(v,t);d.position.y-=6.5*t*t;d.visible=d.position.y>.12;d.scale.setScalar(1-i*.028);});});
function release(e,fire){if(drag?.id!==e.pointerId)return;drag=null;path.visible=false;if(!fire||pull.length()<.24){current.position.copy(anchor);return;}const {x,y,z}=current.position;const projectile=add(current,new C.Sphere(.48),2.5,x,y,z,'bird');projectile.body.isBird=true;const v=velocity();projectile.body.velocity.set(v.x,v.y,0);current=null;shots--;time=4;hud();tone(270);}
canvas.addEventListener('pointerup',e=>release(e,true));canvas.addEventListener('pointercancel',e=>release(e,false));canvas.addEventListener('lostpointercapture',e=>release(e,false));
function finish(win){ended=true;advance=win;$('message').textContent=win?'قلعه فرو ریخت!':'پرنده‌ها تمام شدند!';$('again').textContent=win?'مرحلهٔ بعد ←':'تلاش دوباره';$('result').hidden=false;tone(win?720:165,.14);}
$('again').onclick=()=>{if(advance){stage++;total+=score;}reset();};$('reset').onclick=reset;addEventListener('keydown',e=>{if(e.code==='KeyR'&&!e.repeat)reset();});$('sound').setAttribute('aria-pressed','false');$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'قطع صدا':'فعال کردن صدا');if(sound){ctx??=new AudioContext();ctx.resume();tone(510);}};
reset();let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;world.step(1/120,dt,8);for(let i=entities.length-1;i>=0;i--){const e=entities[i];e.view.position.copy(e.body.position);e.view.quaternion.copy(e.body.quaternion);if(e.hit||e.body.position.y<-7){if(e.kind==='pig'){remaining--;score+=500;hud();tone(480);}world.removeBody(e.body);clearView(e.view);entities.splice(i,1);}}
if(!ended){if(!remaining)finish(true);else if(!current){time-=dt;if(time<=0){if(shots){const v=queue.shift();if(v)clearView(v);load();}else finish(false);}}}bands();renderer.render(scene,camera);});
