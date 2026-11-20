import * as T from './vendor/three.module.min.js';

// Rigid weights keep the original low-poly pieces intact while allowing heads,
// paws, eyes and ears to move independently. Only the three local pets need rigs.
export const PET_BONES = Object.freeze({ body:0, head:1, armL:2, armR:3, footL:4, footR:5, tail:6, eyeL:7, eyeR:8, earL:9, earR:10, trunk:11 });
const bindPositions = [[0,.75,0],[0,1.53,.07],[-.46,.78,.17],[.46,.78,.17],[-.37,.23,.18],[.37,.23,.18],[0,.7,-.5],[-.26,.04,.495],[.26,.04,.495],[-.3,.67,-.05],[.3,.67,-.05],[0,-.28,.58]];
const mix = T.MathUtils.lerp;
const smooth = (a,b,x) => { const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };

function makeRig(material) {
  const root=new T.Bone(), bones=bindPositions.map(p=>{const b=new T.Bone();b.position.set(...p);return b;});
  bones.forEach((bone,i)=>(i>=7?bones[PET_BONES.head]:root).add(bone));
  const mesh=new T.SkinnedMesh(new T.BufferGeometry(),material);mesh.add(root);mesh.updateMatrixWorld(true);
  mesh.bind(new T.Skeleton(bones));mesh.frustumCulled=false;mesh.visible=false;
  return {mesh,bones,sleep:0,eat:0,seen:false,species:null};
}

export function createPetAnimator(material,{reducedMotion=false}={}) {
  const group=new T.Group(),rigs=Array.from({length:3},()=>makeRig(material));
  rigs.forEach((r,i)=>{r.mesh.castShadow=i===0;group.add(r.mesh);});
  const propMaterial=new T.MeshLambertMaterial({vertexColors:true});
  function painted(geometry,hex){const c=new T.Color(hex),colors=[];for(let i=0;i<geometry.attributes.position.count;i++)colors.push(c.r,c.g,c.b);geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));return geometry;}
  function merge(parts){
    const pos=[],norm=[],colors=[];
    for(const [g,c,p,s] of parts){const geometry=g.index?g.toNonIndexed():g;geometry.scale(...s);geometry.translate(...p);painted(geometry,c);pos.push(...geometry.attributes.position.array);norm.push(...geometry.attributes.normal.array);colors.push(...geometry.attributes.color.array);geometry.dispose();if(geometry!==g)g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
  }
  const profile=[[0,0],[.29,0],[.44,.12],[.45,.23],[.38,.23],[.35,.15],[0,.15]].map(p=>new T.Vector2(...p));
  const bowl=new T.Mesh(painted(new T.LatheGeometry(profile,12),'#dfc291'),propMaterial);
  const berryParts=Array.from({length:7},(_,i)=>{const a=i*Math.PI/3;return [new T.IcosahedronGeometry(1,0),i%2?'#9b79b4':'#78659f',[i?Math.cos(a)*.22:0,i?.21:.31,i?Math.sin(a)*.22:0],[.13,.12,.13]];});
  const mealParts=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return [new T.OctahedronGeometry(1),i%2?'#a9bf69':'#7eaa67',[Math.cos(a)*.2,.23,Math.sin(a)*.2],[.19,.09,.16]];});
  for(const x of [-.14,.15])mealParts.push([new T.IcosahedronGeometry(1,0),'#dc8d72',[x,.31,.06],[.09,.08,.09]]);
  const foods={berries:merge(berryParts),meal:merge(mealParts)};
  const bites={berries:painted(new T.IcosahedronGeometry(1,0),'#a184bd'),meal:painted(new T.OctahedronGeometry(1),'#a3be70')};
  const food=new T.Mesh(foods.berries,propMaterial),bite=new T.Mesh(bites.berries,propMaterial);
  const plate=new T.Group();plate.add(bowl,food);plate.visible=false;group.add(plate,bite);bite.visible=false;
  const zShape=new T.Shape();zShape.moveTo(-.13,.17);for(const p of [[.13,.17],[.13,.1],[-.035,-.1],[.13,-.1],[.13,-.17],[-.13,-.17],[-.13,-.1],[.035,.1],[-.13,.1]])zShape.lineTo(...p);zShape.closePath();
  const sleepMarks=new T.InstancedMesh(new T.ShapeGeometry(zShape),new T.MeshBasicMaterial({color:'#fff6da',transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide}),9);
  sleepMarks.count=0;sleepMarks.frustumCulled=false;group.add(sleepMarks);
  const dummy=new T.Object3D(),mouth=new T.Vector3();let zCount=0;
  function beginFrame(){zCount=0;plate.visible=false;bite.visible=false;for(const rig of rigs)rig.seen=false;}
  function pose({slot,geometry,species,x,z,heading,ground,scale,action,foodKind,elapsed,seconds,dt,camera}) {
    const rig=rigs[slot];if(!rig)return false;
    rig.seen=true;
    const sleeping=action==='sit',eating=slot===0&&action==='feed';
    if(rig.species!==species){rig.sleep=0;rig.eat=0;rig.species=species;}
    const blend=reducedMotion?1:1-Math.exp(-dt*8);
    rig.sleep=mix(rig.sleep,sleeping?1:0,blend);rig.eat=mix(rig.eat,eating?1:0,blend);
    if(rig.sleep<.002&&!sleeping)rig.sleep=0;if(rig.eat<.002&&!eating)rig.eat=0;
    rig.mesh.visible=rig.sleep>0||rig.eat>0;
    if(!rig.mesh.visible)return false;
    const {mesh,bones}=rig,s=rig.sleep,e=rig.eat;
    if(!mesh.geometry.attributes.position)mesh.geometry.dispose();
    mesh.geometry=geometry;mesh.position.set(x,ground,z);mesh.rotation.set(0,heading,0);mesh.scale.setScalar(scale);
    bones.forEach((b,i)=>{b.position.set(...bindPositions[i]);b.rotation.set(0,0,0);b.scale.setScalar(1);});
    const breath=reducedMotion?0:Math.sin(seconds*2.1+slot*.7)*.012*s;
    const phase=reducedMotion?.55:(Math.max(0,elapsed)*.95)%1;
    const lift=reducedMotion?1:smooth(.06,.36,phase)*(1-smooth(.76,1,phase));
    const chew=reducedMotion?0:Math.sin(elapsed*20)*.025*lift*e;
    const body=bones[PET_BONES.body],head=bones[PET_BONES.head];
    body.position.set(0,mix(.75-.05*e,.49,s)+breath,mix(.08*e,-.3,s));body.rotation.x=mix(.07*e,Math.PI/2,s);body.scale.y=1+breath;
    head.position.set(0,mix(1.53-.2*e,.62,s)+breath,mix(.07+.2*e,.67,s));head.rotation.x=mix((.13+(1-lift)*.3)*e+chew,-.08,s);
    for(const [side,armIndex,footIndex,eyeIndex,earIndex] of [[-1,2,4,7,9],[1,3,5,8,10]]){
      const arm=bones[armIndex],foot=bones[footIndex];
      arm.position.set(side*mix(.46-.16*e,.42,s),mix(.78+e*(mix(.45,1.12,lift)-.78),.2,s),mix(.17+e*(mix(1.03,.71,lift)-.17),.87,s));
      arm.rotation.x=mix(-.8*e,Math.PI/2,s);arm.rotation.z=side*.12*(1-s);
      foot.position.set(side*mix(.37,.4,s),mix(.23,.18,s),mix(.18,-.78,s));foot.rotation.x=-.18*s;foot.scale.y=mix(1,.75,s);
      bones[eyeIndex].scale.y=mix(1-.25*lift*e,.08,s);
      if(species==='bunny')bones[earIndex].rotation.x=-.8*s+chew*.35;
    }
    bones[PET_BONES.tail].position.set(0,mix(.7,.47,s),mix(-.5,-1.03,s));
    if(species==='elephant')bones[PET_BONES.trunk].rotation.x=-.9*s-.4*lift*e;
    mesh.updateMatrixWorld(true);
    if(eating){
      plate.visible=true;plate.position.set(x+Math.sin(heading)*1.16,ground+.015,z+Math.cos(heading)*1.16);plate.rotation.y=heading;
      food.geometry=foods[foodKind]||foods.berries;const portion=reducedMotion?1:Math.max(.12,1-elapsed/4);food.scale.setScalar(.35+.65*portion);
      bite.geometry=bites[foodKind]||bites.berries;
      bite.visible=reducedMotion||phase>.33&&phase<.78;
      mouth.set(0,-.23,.63);head.localToWorld(mouth);bite.position.copy(mouth);
      bite.scale.setScalar(reducedMotion?.1:.13*(1-smooth(.36,.78,phase)));
      bite.material=propMaterial;
    }
    if(s>.15){
      for(let i=0;i<(reducedMotion?1:3);i++){
        const drift=reducedMotion?0:(seconds*.35+i/3)%1;
        dummy.position.set(x+Math.cos(heading)*.65*scale,ground+(1.3+drift*.7)*scale,z-Math.sin(heading)*.65*scale);
        dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(scale*(.65+drift*.4)*s);dummy.updateMatrix();sleepMarks.setMatrixAt(zCount++,dummy.matrix);
      }
    }
    return true;
  }
  function endFrame(){for(const r of rigs)if(!r.seen){r.mesh.visible=false;r.sleep=0;r.eat=0;}sleepMarks.count=zCount;sleepMarks.instanceMatrix.needsUpdate=true;}
  function snapshot(){return {foodVisible:plate.visible,foodKind:food.geometry===foods.meal?'meal':'berries',foodPortion:food.scale.x,biteVisible:bite.visible,sleepMarks:zCount,reducedMotion,
    pets:rigs.map(r=>{if(r.mesh.visible)r.mesh.computeBoundingBox();return {visible:r.mesh.visible,species:r.species,sleep:r.sleep,eat:r.eat,headY:r.bones[1].position.y,bodyTilt:r.bones[0].rotation.x,eyes:r.bones[7].scale.y,pawY:r.bones[2].position.y,minY:r.mesh.visible?r.mesh.boundingBox.min.y:null};})};}
  return {group,beginFrame,pose,endFrame,snapshot,dispose(){for(const r of rigs)r.mesh.skeleton.dispose();for(const geometry of [...Object.values(foods),...Object.values(bites)])geometry.dispose();}};
}
