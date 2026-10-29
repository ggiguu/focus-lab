import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

export const FACE_Y = 1.55;
export function cameraSettings(s,width,height){return {fov:THREE.MathUtils.radToDeg(2*Math.atan(s.sensor*height/(2*width*s.focal))),focus:Math.hypot(s.distance,FACE_Y-s.height),pitch:Math.atan2(FACE_Y-s.height,s.distance)};}

// Pose actual skinned geometry. Each upper/lower arm is rotated in world space,
// then converted back to its parent's local space; no flat photo participates.
export function preparePerson(model){
 model.updateMatrixWorld(true);
 const boneByName=name=>model.getObjectByName(name)||model.getObjectByName(name.replaceAll(':',''));
 function lowerArm(name,childName,direction){const bone=boneByName(name),child=boneByName(childName);if(!bone||!child)return;model.updateMatrixWorld(true);const p=bone.getWorldPosition(new THREE.Vector3()),q=child.getWorldPosition(new THREE.Vector3()),delta=new THREE.Quaternion().setFromUnitVectors(q.sub(p).normalize(),new THREE.Vector3(...direction).normalize()),world=bone.getWorldQuaternion(new THREE.Quaternion());world.premultiply(delta);const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.copy(parent.multiply(world));model.updateMatrixWorld(true);}
 lowerArm('mixamorig:LeftArm','mixamorig:LeftForeArm',[.12,-1,.02]);lowerArm('mixamorig:RightArm','mixamorig:RightForeArm',[-.12,-1,.02]);lowerArm('mixamorig:LeftForeArm','mixamorig:LeftHand',[.025,-1,.03]);lowerArm('mixamorig:RightForeArm','mixamorig:RightHand',[-.025,-1,.03]);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());model.scale.multiplyScalar(1.7/size.y);model.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z).multiplyScalar(1.7/size.y));model.updateMatrixWorld(true);
 // Register the real head's center to the same face height used by the side view.
 const head=boneByName('mixamorig:Head'),top=boneByName('mixamorig:HeadTop_End');let headPoint=new THREE.Vector3(0,1.55,.05);if(head&&top){headPoint=head.getWorldPosition(new THREE.Vector3()).lerp(top.getWorldPosition(new THREE.Vector3()),.47);const scale=FACE_Y/headPoint.y;model.scale.multiplyScalar(scale);model.position.multiplyScalar(scale);headPoint.multiplyScalar(scale);model.position.x-=headPoint.x;model.position.z-=headPoint.z+.055;}
 model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 // Lock onto the actual front facial surface, rather than a point inside the skull.
 const faceRay=new THREE.Raycaster(new THREE.Vector3(0,FACE_Y,5),new THREE.Vector3(0,0,-1)),faceHit=faceRay.intersectObject(model,true)[0];if(faceHit){model.position.z-=faceHit.point.z;model.updateMatrixWorld(true);}
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(o.material){o.material.roughness=Math.max(.6,o.material.roughness??.8);o.material.metalness=0;}}});return model;
}

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
const fragment=`
precision highp float;
uniform sampler2D colorMap;uniform sampler2D depthMap;
uniform float cameraNear,cameraFar,focusDistance,focalMm,aperture,sensorMm,aspectRatio;
varying vec2 vUv;
float eyeDepth(float d){float ndc=d*2.0-1.0;return (2.0*cameraNear*cameraFar)/(cameraFar+cameraNear-ndc*(cameraFar-cameraNear));}
float radiusAt(float z){float s=focusDistance*1000.0;float d=z*1000.0;float diameter=focalMm*focalMm*abs(d-s)/(aperture*d*max(s-focalMm,1.0));return min(.045,diameter/sensorMm*.5);}
void main(){float centerZ=eyeDepth(texture2D(depthMap,vUv).r);float r=radiusAt(centerZ);vec3 total=texture2D(colorMap,vUv).rgb;float weights=1.0;
 for(int i=0;i<32;i++){float k=float(i)+.5;float a=k*2.39996323;vec2 disk=vec2(cos(a),sin(a))*sqrt(k/32.0);vec2 uv=clamp(vUv+disk*vec2(r,r*aspectRatio),vec2(.001),vec2(.999));float sampleZ=eyeDepth(texture2D(depthMap,uv).r);float sampleR=radiusAt(sampleZ);float weight=1.0;if(sampleZ<centerZ-.08&&sampleR<r*.7)weight=.04;total+=texture2D(colorMap,uv).rgb*weight;weights+=weight;}
 gl_FragColor=vec4(total/weights,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function park(scene){
 scene.background=new THREE.Color('#c5d9dd');scene.fog=new THREE.Fog('#b7c8b5',28,90);
 const hemi=new THREE.HemisphereLight(0xe4efff,0x77705c,2);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffedda,3.2);key.position.set(-3.5,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:28});key.shadow.bias=-.0003;key.shadow.normalBias=.025;scene.add(key);
 const fill=new THREE.DirectionalLight(0xd8e9ff,.8);fill.position.set(5,3,-1);scene.add(fill);
 const grass=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x66875a,roughness:1}));grass.rotation.x=-Math.PI/2;grass.position.y=-.025;grass.receiveShadow=true;scene.add(grass);
 const path=new THREE.Mesh(new THREE.PlaneGeometry(3.4,160),new THREE.MeshStandardMaterial({color:0xc5bca8,roughness:.95}));path.rotation.x=-Math.PI/2;path.position.y=-.012;path.receiveShadow=true;scene.add(path);
 const lineMat=new THREE.MeshStandardMaterial({color:0x9d998b,roughness:1});for(let z=-50;z<28;z+=1.3){const seam=new THREE.Mesh(new THREE.BoxGeometry(3.4,.003,.014),lineMat);seam.position.set(0,-.008,z);scene.add(seam);}
 const layers={};for(const name of ['flowers','bench','trees','cafe','skyline']){layers[name]=new THREE.Group();layers[name].name='depth-'+name;scene.add(layers[name]);}
 const materials={wood:new THREE.MeshStandardMaterial({color:0x916c47,roughness:.85}),bark:new THREE.MeshStandardMaterial({color:0x69523e,roughness:1}),stone:new THREE.MeshStandardMaterial({color:0xb3a28b,roughness:1}),brick:new THREE.MeshStandardMaterial({color:0xab7257,roughness:.95}),dark:new THREE.MeshStandardMaterial({color:0x46564b,roughness:.75}),glass:new THREE.MeshStandardMaterial({color:0x80a9b3,metalness:.15,roughness:.25})};
 function box(group,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 // Near: raised beds, flowers and low hedges; the center walkway stays clear.
 for(const side of [-1,1]){const x=side*1.85;box(layers.flowers,.65,.35,2.2,x,.175,0,materials.stone);box(layers.flowers,.56,.06,2.1,x,.38,0,new THREE.MeshStandardMaterial({color:0x58452e,roughness:1}));for(let i=0;i<12;i++){const z=-.95+i*.17,fx=x+(i%3-1)*.14;const stem=new THREE.Mesh(new THREE.CylinderGeometry(.008,.012,.3,5),new THREE.MeshStandardMaterial({color:0x466a36}));stem.position.set(fx,.55,z);layers.flowers.add(stem);const bloom=new THREE.Mesh(new THREE.SphereGeometry(.065,10,7),new THREE.MeshStandardMaterial({color:[0xefb3ac,0xf7deb0,0xb59aca][i%3],roughness:.8}));bloom.scale.y=.55;bloom.position.set(fx,.72,z);layers.flowers.add(bloom);}}
 // Middle: detailed slatted benches and a small directional sign.
 for(const side of [-1,1]){const x=side*2.6;for(let i=0;i<4;i++)box(layers.bench,1.7,.055,.11,x,.48,-.22+i*.14,materials.wood);for(let i=0;i<3;i++)box(layers.bench,1.7,.11,.055,x,.7+i*.14,-.32,materials.wood);for(const dx of [-.65,.65])box(layers.bench,.07,.48,.45,x+dx,.24,0,materials.dark);}
 box(layers.bench,.055,1.55,.055,1.85,.775,1,materials.dark);box(layers.bench,.6,.25,.06,1.85,1.4,1,materials.wood);
 // Farther: staggered tree rows, trunks and layered canopies, garden lamps.
 const leafGeo=new THREE.SphereGeometry(1,16,11);for(let i=0;i<16;i++){const x=(i%2?1:-1)*(2.5+(i%3)*.65),z=-Math.floor(i/2)*2.5,h=3.1+(i%4)*.28;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.10,.18,h,10),materials.bark);trunk.position.set(x,h/2,z);trunk.castShadow=true;layers.trees.add(trunk);for(let k=0;k<3;k++){const leaf=new THREE.Mesh(leafGeo,new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.24+(i%4)*.017,.25,.29+(k%3)*.035),roughness:1}));leaf.position.set(x+(k-1)*.6,h+.25+(k%2)*.6,z+(k-1)*.25);leaf.scale.set(1.05,1.4,1.0);leaf.castShadow=true;layers.trees.add(leaf);}}
 const lampMat=new THREE.MeshStandardMaterial({color:0xffe2a8,emissive:0xffd394,emissiveIntensity:1.7});for(let i=0;i<6;i++){const x=(i%2?1:-1)*2.05,z=-Math.floor(i/2)*4;box(layers.trees,.055,2.25,.055,x,1.125,z,materials.dark);const globe=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),lampMat);globe.position.set(x,2.3,z);layers.trees.add(globe);}
 // Far distance: cafe with windows, pitched roof, awning and terrace furniture.
 box(layers.cafe,8,4.1,3.2,0,2.05,-1.6,materials.brick);box(layers.cafe,8.4,.22,3.6,0,4.2,-1.6,materials.dark);for(const x of [-2.8,-.95,.95,2.8]){box(layers.cafe,1.25,1.65,.06,x,1.55,.03,materials.glass);box(layers.cafe,1.38,.08,.14,x,.7,.06,materials.stone);box(layers.cafe,1.25,.8,.06,x,3.15,.03,materials.glass);box(layers.cafe,.045,1.65,.1,x,1.55,.06,materials.dark);}
 box(layers.cafe,8.3,.14,1.3,0,2.65,.6,new THREE.MeshStandardMaterial({color:0xd4c6a4,roughness:.9}));for(const x of [-3.3,3.3]){box(layers.cafe,.1,2.6,.1,x,1.3,1,materials.dark);const top=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.07,20),materials.wood);top.position.set(x,.74,2);layers.cafe.add(top);box(layers.cafe,.06,.7,.06,x,.35,2,materials.dark);}
 // Horizon: soft varied silhouettes behind the cafe at a separate depth.
 for(let i=0;i<11;i++){const mat=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.25,.12,.44+(i%3)*.05),roughness:1});const mound=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),mat);mound.position.set((i-5)*5,1.5,-(i%3)*3);mound.scale.set(5.5,4+(i%4),3.4);layers.skyline.add(mound);}
 const controller={layers,setDistance(gap){const distances=backgroundDistances(gap);for(const [name,group]of Object.entries(layers))group.position.z=-distances[name];return distances;}};controller.setDistance(8);return controller;
}

export function backgroundDistances(gap){return {flowers:Math.max(.4,gap*.35),bench:gap,trees:gap*1.9+2,cafe:gap*3.2+4,skyline:gap*4.5+12};}

function install(){
 const scene=new THREE.Scene(),background=park(scene),views=new Map(),pending=new Map();let model=null,loadError=null,scheduled=false;
 const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),uniforms={colorMap:{value:null},depthMap:{value:null},cameraNear:{value:.02},cameraFar:{value:180},focusDistance:{value:6},focalMm:{value:50},aperture:{value:1.8},sensorMm:{value:36},aspectRatio:{value:1}};
 const postMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms,depthTest:false,depthWrite:false});postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial));
 function error(el,message){el.querySelector('.cropnote').textContent=message;const box=el.querySelector('.error');box.querySelector('span').textContent=message;box.classList.add('show');}
 function createView(el){const canvas=el.querySelector('.scene-canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const camera=new THREE.PerspectiveCamera(40,1,.02,180),target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);const v={renderer,camera,target,w:0,h:0};views.set(el,v);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();error(el,'3D 그래픽 연결이 끊겼습니다. 페이지를 새로고침해 주세요.');});return v;}
 function draw(el,s){if(!el.classList.contains('layered')||!el.clientWidth||!el.clientHeight)return;if(loadError){error(el,loadError);return;}if(!model){el.querySelector('.cropnote').textContent='3D 인물 모델을 불러오는 중…';return;}try{const v=views.get(el)||createView(el),w=el.clientWidth,h=el.clientHeight,setting=cameraSettings(s,w,h);if(v.w!==w||v.h!==h){v.renderer.setSize(w,h,false);const size=v.renderer.getDrawingBufferSize(new THREE.Vector2());v.target.setSize(size.x,size.y);v.w=w;v.h=h;}
 background.setDistance(s.background);v.camera.aspect=w/h;v.camera.fov=setting.fov;v.camera.position.set(0,s.height,s.distance);v.camera.lookAt(0,FACE_Y,0);v.camera.updateProjectionMatrix();v.camera.updateMatrixWorld();v.renderer.setRenderTarget(v.target);v.renderer.render(scene,v.camera);uniforms.colorMap.value=v.target.texture;uniforms.depthMap.value=v.target.depthTexture;uniforms.focusDistance.value=setting.focus;uniforms.focalMm.value=s.focal;uniforms.aperture.value=s.aperture;uniforms.sensorMm.value=s.sensor;uniforms.aspectRatio.value=w/h;v.renderer.setRenderTarget(null);v.renderer.render(postScene,postCamera);el.querySelector('.error').classList.remove('show');el.querySelector('.cropnote').textContent='실제 3D 인물 · 얼굴 추적 · '+(setting.pitch>=0?'위로 ':'아래로 ')+Math.abs(THREE.MathUtils.radToDeg(setting.pitch)).toFixed(1)+'°';}catch(e){console.error('Focus Lab 3D',e);error(el,'이 기기에서 3D 장면을 표시할 수 없습니다. WebGL이 지원되는 브라우저에서 열어주세요.');}}
 function render(el,s){pending.set(el,{...s});if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;for(const [view,settings]of pending)draw(view,settings);pending.clear();});}}
 window.Focus3D={render,depths:backgroundDistances};new GLTFLoader().load('assets/person-3d.glb',gltf=>{try{model=preparePerson(gltf.scene);scene.add(model);window.__focusLab3DReady?.();}catch(e){console.error(e);loadError='3D 인물 초기화에 실패했습니다. 새로고침해 주세요.';window.__focusLab3DReady?.();}},undefined,e=>{console.error(e);loadError='3D 인물 파일을 불러오지 못했습니다. 네트워크 연결 후 새로고침해 주세요.';window.__focusLab3DReady?.();});window.__focusLab3DReady?.();
}
if(typeof window!=='undefined')install();
