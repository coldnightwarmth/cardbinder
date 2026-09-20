import * as THREE from 'three';
import { ritualPose } from './showroom-ritual.mjs?v=2';

export function createShowroomColumns({room,camera,renderer,bridge,resume=()=>{}}) {
  const columns=[],ray=new THREE.Raycaster();
  const marble=new THREE.MeshStandardMaterial({color:0xf4f2ed,roughness:.55,metalness:.02});
  // Low classical plinths: square foot and abacus, rounded base and capital.
  const profile=[[.29,0],[.29,.045],[.255,.055],[.255,.085],[.235,.105],[.21,.12],
    [.195,.15],[.18,.19],[.174,.57],[.19,.60],[.215,.62],[.235,.635],[.235,.67],[.26,.685],[.275,.72]];
  const shaft=new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),48);
  const foot=new THREE.BoxGeometry(.65,.06,.65),cap=new THREE.BoxGeometry(.68,.06,.68);
  for(const [i,x] of [-3.1,0,3.1].entries()) {
    const group=new THREE.Group();group.position.set(x,0,-10.7);group.name=`display-column-${i+1}`;
    group.add(new THREE.Mesh(shaft,marble));
    const base=new THREE.Mesh(foot,marble);base.position.y=.03;group.add(base);
    const top=new THREE.Mesh(cap,marble);top.position.y=.75;group.add(top);
    room.add(group);columns.push({group,x,z:-10.7,card:null,display:null});
  }
  const ritualButton=new THREE.Group();ritualButton.name='ritual-button';
  ritualButton.position.set(-6.72,1.3,-8.4);room.add(ritualButton);
  const bezel=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.055,40),
    new THREE.MeshStandardMaterial({color:0x34383c,metalness:.65,roughness:.35}));
  bezel.rotation.z=-Math.PI/2;ritualButton.add(bezel);
  const buttonCap=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.07,40),
    new THREE.MeshStandardMaterial({color:0xc91e23,roughness:.35}));
  buttonCap.rotation.z=-Math.PI/2;buttonCap.position.x=.045;ritualButton.add(buttonCap);
  const lampBezel=new THREE.Mesh(new THREE.CylinderGeometry(.062,.062,.035,32),bezel.material);
  lampBezel.rotation.z=-Math.PI/2;lampBezel.position.set(.015,0,.32);ritualButton.add(lampBezel);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.045,24,12),
    new THREE.MeshBasicMaterial({color:0x080908,toneMapped:false}));
  lamp.position.set(.04,0,.32);ritualButton.add(lamp);
  const ritualTarget={ritual:true};
  const buttonBounds=new THREE.Box3(new THREE.Vector3(-6.75,1.1,-8.6),new THREE.Vector3(-6.55,1.5,-8.2));
  let ritual=null;
  function syncRitualButton() {
    const count=columns.filter(column=>column.card).length;
    lamp.material.color.setHex(count===3?0x37e66a:count?0xffc533:0x080908);
    buttonCap.position.x=ritual ? .012 : .045;
  }
  function startRitual() {
    if(ritual || selecting || columns.some(column=>!column.card || !column.display))return false;
    ritual={startedAt:performance.now(),cards:columns.map(column=>({column,
      position:column.display.group.position.clone(),scale:column.display.group.scale.clone()}))};
    highlight.visible=shadow.visible=false;syncRitualButton();return true;
  }
  const highlight=new THREE.Box3Helper(new THREE.Box3(),0xffdd8c);highlight.visible=false;room.add(highlight);
  const shadow=new THREE.Box3Helper(highlight.box,0x000000);
  shadow.material.dispose();
  shadow.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{resolution:{value:new THREE.Vector2(1,1)}},
    vertexShader:`uniform vec2 resolution;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.xy+=vec2(1.,-1.)/resolution*2.*gl_Position.w;}`,
    fragmentShader:`void main(){gl_FragColor=vec4(.035,.03,.025,.3);}`});
  shadow.renderOrder=99;highlight.renderOrder=100;highlight.material.depthWrite=false;
  shadow.visible=false;room.add(shadow);
  let hovered=null,hand=null,selecting=false;
  function pick(pointer) {
    if(selecting || ritual)return null;
    camera.updateMatrixWorld();ray.setFromCamera(pointer,camera);
    let found=null,nearest=Infinity;
    if(columns.every(column=>column.card)) {
      const hit=ray.ray.intersectBox(buttonBounds,new THREE.Vector3());
      if(hit && hit.distanceTo(camera.position)<2.7){found=ritualTarget;nearest=hit.distanceTo(camera.position);}
    }
    for(const column of columns) {
      if(Math.hypot(camera.position.x-column.x,camera.position.z-column.z)>2.7)continue;
      if(!column.card && !hand?.cards.length)continue;
      const bounds=new THREE.Box3(new THREE.Vector3(column.x-.4,0,column.z-.4),new THREE.Vector3(column.x+.4,2.05,column.z+.4));
      const hit=ray.ray.intersectBox(bounds,new THREE.Vector3());
      if(hit && hit.distanceTo(camera.position)<nearest){nearest=hit.distanceTo(camera.position);found=column;}
    }
    return found;
  }
  function update(now,pointer,enabled) {
    if(ritual) {
      const pose=ritualPose((now-ritual.startedAt)/1000);
      if(pose.done) {
        const keys=ritual.cards.map(({column})=>column.card.key);
        for(const {column} of ritual.cards) {
          room.remove(column.display.group);column.display.dispose();column.display=null;column.card=null;
        }
        ritual=null;hand.returnToBinders(keys);
      } else for(const entry of ritual.cards) {
        const group=entry.column.display.group;
        group.position.copy(entry.position);group.position.y+=pose.rise;
        group.scale.copy(entry.scale).multiplyScalar(pose.scale);
      }
    }
    syncRitualButton();
    for(const column of columns)if(column.display) {
      if(!ritual)column.display.group.position.y=1.43+Math.sin(now*.0012)*.055;
      column.display.group.rotation.set(-.16,(now-(column.startedAt || now))*.00022,0,'YXZ');
      column.display.update(now*.001,camera);
    }
    hovered=enabled?pick(pointer):null;
    highlight.visible=shadow.visible=!!hovered;
    renderer.getDrawingBufferSize?.(shadow.material.uniforms.resolution.value);
    if(hovered?.ritual)highlight.box.copy(buttonBounds);
    else if(hovered) {
      highlight.box.min.set(hovered.x-.43,.83,hovered.z-.43);
      highlight.box.max.set(hovered.x+.43,2.03,hovered.z+.43);
    }
    return hovered;
  }
  function activate(column=hovered) {
    if(!column || selecting || ritual || !hand)return false;
    if(column.ritual)return startRitual();
    if(column.card) {
      hand.restore(column.card.key);room.remove(column.display.group);column.display.dispose();column.display=null;column.card=null;syncRitualButton();
      return true;
    }
    if(!hand.cards.length)return false;
    selecting=true;highlight.visible=shadow.visible=false;
    hand.choose(async card=>{
      const display=await bridge.createDisplayCard(card.index);
      if(display.group.userData.individualCardModelRoot) {
        display.group.traverse(object=>{
          for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
            if(!material?.isMeshStandardMaterial)continue;
            material.envMap=room.userData.cardEnvironment;
            material.envMapIntensity=1;
            material.envMapRotation.set(0,THREE.MathUtils.degToRad(121),0);
            material.needsUpdate=true;
          }
        });
      }
      display.group.position.set(column.x,1.43,column.z);display.group.rotation.x=-.16;
      display.group.visible=false;room.add(display.group);
      try {
        await renderer.compileAsync(room,camera);
        // Upload textures before the flight so the reveal is ready.
        display.group.traverse(object=>{for(const mat of (Array.isArray(object.material)?object.material:[object.material])) {
          if(!mat)continue;for(const value of Object.values(mat))if(value?.isTexture)renderer.initTexture(value);
          for(const uniform of Object.values(mat.uniforms || {}))if(uniform.value?.isTexture)renderer.initTexture(uniform.value);
        }});
        display.group.visible=false;
        const point=new THREE.Vector3(column.x,1.43,column.z).project(camera);
        const distance=camera.position.distanceTo(new THREE.Vector3(column.x,1.43,column.z));
        const height=innerHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance);
        return {rect:{left:(point.x*.5+.5)*innerWidth-height*.36,top:(.5-point.y*.5)*innerHeight-height/2,width:height*.72,height},
          commit(){display.group.visible=true;column.card=card;column.display=display;column.startedAt=performance.now();selecting=false;syncRitualButton();},
          cancel(){room.remove(display.group);display.dispose();selecting=false;}};
      } catch(error){room.remove(display.group);display.dispose();throw error;}
    },()=>{selecting=false;},resume);
    return true;
  }
  return {columns,ritualButton,update,pick,activate,get ritualActive(){return !!ritual;},setHand(value){hand=value;},get selecting(){return selecting;},
    canWalk(x,z){return !columns.some(column=>Math.abs(x-column.x)<.53&&Math.abs(z-column.z)<.53);}};
}
