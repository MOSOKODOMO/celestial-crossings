import * as T from './vendor/three.module.min.js';
import { PET_BONES, createPetAnimator } from './world-pet-animation.js';
const W = window.WorldCore;
const dummy = new T.Object3D();
const colour = value => new T.Color(value);
const sphere = () => new T.SphereGeometry(1, 8, 6);
const ico = () => new T.IcosahedronGeometry(1, 1);
const cube = () => new T.BoxGeometry(1, 1, 1);
const cyl = () => new T.CylinderGeometry(1, 1, 1, 8);
let seed = 771;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// Merge vertex-coloured parts into one draw. Geometry is shared across all pets of a species.
function combine(parts) {
  const positions = [], normals = [], colors = [], skinIndices = [], skinWeights = [];
  const skinned = parts.some(p => p[5] !== undefined);
  for (const [geometry, hex, pos = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], bone = 0] of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    dummy.position.set(...pos); dummy.scale.set(...scale); dummy.rotation.set(...rotation); dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    const c = colour(hex), p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      if(skinned){skinIndices.push(bone,0,0,0);skinWeights.push(1,0,0,0);}
      // A small underside tint acts as baked ambient occlusion.
      const shade = n.getY(i) < -.1 ? .96 : 1;
      const previous = g.getAttribute('color');
      colors.push(c.r * shade * (previous?.getX(i) ?? 1), c.g * shade * (previous?.getY(i) ?? 1), c.b * shade * (previous?.getZ(i) ?? 1));
    }
    g.dispose(); geometry.dispose();
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  if(skinned){g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));}
  g.computeBoundingSphere();
  return g;
}
export function heightAt(x, z) {
  // A level pond edge and pavilion, with soft hills elsewhere.
  const flatten = 1 - Math.exp(-((x - 94) ** 2 / 310 + (z - 52) ** 2 / 150));
  const hill = .35 + .55 * Math.sin(x * .09) * Math.cos(z * .11) + .23 * Math.sin(z * .26 + x * .05);
  return hill * flatten;
}
// One softly rounded crown with painted, gently scalloped colour bands.
// Smooth normals keep the silhouette soft without adding layered shells.
function canopyGeometry() {
  const g = new T.SphereGeometry(1, 16, 8);
  const p = g.getAttribute('position'), bandHeights = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const r = 1 + .035 * Math.sin(a * 3) + .025 * Math.cos(a * 5);
    bandHeights.push(y);
    p.setXYZ(i, x * r + .06 * y, y + Math.sin(a * 5) * .055 * (1 - y * y), z * r);
  }
  g.setAttribute('bandHeight', new T.Float32BufferAttribute(bandHeights, 1));
  g.computeVertexNormals();
  const painted = g.toNonIndexed(), positions = painted.getAttribute('position'), colors = [];
  const palette = ['#748f76', '#8fa369', '#a8bb70', '#c0ce83'].map(colour);
  for (let i = 0; i < positions.count; i += 3) {
    const heights = painted.getAttribute('bandHeight');
    // Choose a whole latitude strip, so the paint follows the rounded crown
    // instead of producing sharp, disconnected triangular patches.
    const band = Math.max(heights.getX(i), heights.getX(i + 1), heights.getX(i + 2));
    const c = palette[band < -.3 ? 0 : band < .4 ? 1 : band < .8 ? 2 : 3];
    for (let j = 0; j < 3; j++) colors.push(c.r, c.g, c.b);
  }
  painted.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  painted.deleteAttribute('bandHeight');
  g.dispose(); return painted;
}
function petGeometry(species) {
  if (species === 'star') {
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .34 : .75; const x = Math.cos(a) * r, y = Math.sin(a) * r + 1; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
    shape.closePath();
    return combine([[new T.ExtrudeGeometry(shape, { depth: .25, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .08, bevelThickness: .06 }), '#ffdf85'], ...[-.19, .19].map(x => [sphere(), '#384d41', [x, 1.08, .37], [.055, .085, .045]])]);
  }
  const fur = { bunny: '#fff0d6', tiger: '#eab15c', kitten: '#f4d18a', capybara: '#be916a', elephant: '#b6bdcb', deer: '#c9a077' }[species];
  const parts = [];let bone=PET_BONES.body;
  const ball = (c, p, s, r) => parts.push([sphere(), c, p, s, r, bone]);
  ball(fur, [0, .75, 0], [.53, .63, .45]);
  ball('#fff3d9', [0, .73, .35], [.37, .43, .15]);
  bone=PET_BONES.head;ball(fur, [0, 1.53, .07], [.66, .6, .56]);
  for (const x of [-1, 1]) {
    bone=x<0?PET_BONES.footL:PET_BONES.footR;
    ball(fur, [x * .37, .23, .18], [.23, .22, .3]);
    bone=x<0?PET_BONES.armL:PET_BONES.armR;
    ball(fur, [x * .46, .78, .17], [.19, .3, .19], [0, 0, x * .2]);
    bone=x<0?PET_BONES.eyeL:PET_BONES.eyeR;
    ball('#263a34', [x * .26, 1.57, .565], [.105, .14, .055]);
    ball('#ffffff', [x * .26 - .024, 1.62, .61], [.035, .044, .02]);
    bone=PET_BONES.head;ball('#e4a197', [x * .43, 1.35, .49], [.115, .065, .035]);
    if (species === 'bunny') {
      bone=x<0?PET_BONES.earL:PET_BONES.earR;
      ball(fur, [x * .3, 2.2, .02], [.18, .65, .2], [0, 0, -x * .12]);
      ball('#e7b4af', [x * .32, 2.29, .195], [.075, .38, .023], [0, 0, -x * .12]);
    } else if (species === 'elephant') {
      ball(fur, [x * .69, 1.5, -.02], [.41, .49, .17]);
      ball('#d6b1b2', [x * .75, 1.51, .12], [.23, .3, .025]);
    } else if (species === 'kitten') {
      parts.push([new T.ConeGeometry(1, 1, 4), fur, [x * .43, 2.05, .03], [.27, .53, .24], [0, 0, -x * .2],bone]);
      parts.push([new T.ConeGeometry(1, 1, 4), '#deaa96', [x * .43, 2.05, .19], [.14, .28, .045], [0, 0, -x * .2],bone]);
    } else {
      ball(fur, [x * .48, 1.99, 0], species === 'deer' ? [.2, .38, .16] : [.23, .24, .17], [0, 0, -x * .45]);
      ball('#dfb4a0', [x * .49, 2.02, .14], species === 'deer' ? [.09, .22, .025] : [.12, .12, .025]);
    }
  }
  bone=PET_BONES.head;
  ball('#fff0da', [0, 1.32, .51], species === 'capybara' ? [.38, .24, .22] : [.23, .15, .14]);
  ball('#705e52', [0, 1.41, .66], [.075, .05, .05]);
  if (species === 'elephant') {
    bone=PET_BONES.trunk;
    ball(fur, [0, 1.06, .68], [.18, .42, .17], [.25, 0, 0]);
    ball(fur, [0, .8, .81], [.19, .15, .2]);
  }
  bone=PET_BONES.head;
  if (species === 'bunny') {bone=PET_BONES.tail;ball('#fffaf0', [0, .7, -.5], [.24, .24, .24]);bone=PET_BONES.head;}
  if (species === 'tiger') for (const x of [-1, 1]) for (let i = 0; i < 2; i++) ball('#8c6646', [x * (.53 - i * .01), 1.62 - i * .17, .4], [.16, .042, .038], [0, 0, x * .3]);
  bone=PET_BONES.body;if (species === 'deer') for (const x of [-.27, .27]) ball('#fff1d2', [x, .94, -.38], [.09, .1, .035]);
  bone=PET_BONES.tail;if (species !== 'bunny' && species !== 'elephant') ball(fur, [.1, .58, -.5], [.15, .17, .38], [.6, 0, 0]);
  // Tiny celestial charm, independent of rarity.
  parts.push([new T.OctahedronGeometry(.12), '#e7bd60', [0, 1.02, .51],[1,1,1],[0,0,0],PET_BONES.head]);
  return combine(parts);
}

export function createScene(canvas, { performanceMode = false, reducedMotion = false } = {}) {
  seed = 771;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = colour('#afe1f1'); scene.fog = new T.Fog('#d6e8cd', 32, 130);
  const camera = new T.PerspectiveCamera(48, 1, .1, 180);
  const hemi = new T.HemisphereLight('#fffbed', '#bdcda1', 2.65); scene.add(hemi);
  const sun = new T.DirectionalLight('#fff4dc', .95); sun.position.set(-25, 55, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; sun.shadow.camera.near = 1; sun.shadow.camera.far = 100; sun.shadow.bias = -.001;
  scene.add(sun, sun.target);
  const material = new T.MeshLambertMaterial({ vertexColors: true });
  const staticParts = [], treeParts = [], grassParts = [];
  const add = (g, c, p, s, r) => staticParts.push([g, c, p, s, r]);
  const ground = new T.PlaneGeometry(180, 140, 70, 48); ground.rotateX(-Math.PI / 2); ground.translate(60, 0, 40);
  const gp = ground.getAttribute('position'), gc = [];
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, heightAt(x, z));
    const c = colour('#9bc874').lerp(colour('#b4d584'), .4 + .25 * Math.sin(x * .13) * Math.cos(z * .16)); gc.push(c.r, c.g, c.b);
  }
  ground.setAttribute('color', new T.Float32BufferAttribute(gc, 3)); ground.computeVertexNormals();
  const terrain = new T.Mesh(ground, material); terrain.receiveShadow = true; scene.add(terrain);
  const pathPoints = [];
  function ribbon(points, width, color) {
    const curve = new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, 0, z)));
    for(let i=0;i<=100;i++){const p=curve.getPoint(i/100);pathPoints.push([p.x,p.z,(width+.13)**2]);}
    const v = [], n = 80;
    for (let i = 0; i < n; i++) {
      const corners = [];
      for (const t of [i / n, (i + 1) / n]) {
        const p = curve.getPoint(t), tangent = curve.getTangent(t);
        for (const sign of [-1, 1]) { const x = p.x + tangent.z * width * sign, z = p.z - tangent.x * width * sign; corners.push([x, heightAt(x, z) + .13, z]); }
      }
      for (const j of [0, 2, 1, 1, 2, 3]) v.push(...corners[j]);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); add(g, color);
  }
  ribbon([[60, 76], [58, 58], [60, 44], [60, 23]], 1.8, '#dec59a');
  ribbon([[10, 57], [32, 51], [58, 58], [76, 54], [83, 51]], 1.3, '#dfc79e');
  ribbon([[60, 31], [45, 35], [34, 27], [14, 22]], .85, '#dbc59b');
  // Clouds: merged, warm white clusters.
  for (let i = 0; i < 12; i++) { const x = random() * 170 - 25, z = random() * 110 - 40; for (let j = 0; j < 3; j++) add(ico(), '#fffdf0', [x + j * 4, 23 + j % 2, z], [5, 1.1 + j * .1, 2.4]); }
  treeParts.push([canopyGeometry(), '#ffffff', [0, 4.55, 0], [2.75, 2.4, 2.55]]);
  treeParts.push([new T.CylinderGeometry(.23, .48, 3.8, 7), '#a78a70', [0, 1.75, 0]]);
  const treeGeo = combine(treeParts), treeLocations = W.trees.map(o => [o.x / 20, o.y / 20, .8 + o.r / 95]);
  for (let i = 0; i < 50; i++) { const edge = i % 4, u = random(); treeLocations.push(edge < 2 ? [u * 140 - 10, edge ? 86 + random() * 15 : -6 - random() * 18, 1 + random() * .8] : [edge === 2 ? -6 - random() * 16 : 127 + random() * 15, u * 96 - 8, 1 + random() * .8]); }
  function instances(geo, mat, locations) {
    const mesh = new T.InstancedMesh(geo, mat, locations.length);
    locations.forEach(([x, z, s = 1, y], i) => { dummy.position.set(x, y ?? heightAt(x, z), z); dummy.rotation.set(0, i * 2.399, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.computeBoundingSphere(); scene.add(mesh); return mesh;
  }
  instances(treeGeo, material, treeLocations);
  // Edge hills and an actual fence outline the collision boundary.
  for (let i = 0; i < 38; i++) { const a = i / 38 * Math.PI * 2; add(new T.SphereGeometry(1, 10, 6), i % 2 ? '#a7b985' : '#c1ca99', [60 + Math.sin(a) * 82, 0, 40 + Math.cos(a) * 63], [12 + random() * 9, 5 + random() * 6, 10 + random() * 6]); }
  const fenceParts = [[cube(), '#ad8b5e', [0, .6, 0], [.24, 1.2, .23]], [cube(), '#b99968', [1, .45, 0], [2, .15, .12]], [cube(), '#c1a376', [1, .94, 0], [2, .17, .15]]];
  const fenceGeo = combine(fenceParts), fence = [];
  for (let x = 1; x < 119; x += 2) for (const z of [.7, 79.3]) fence.push([x, z]);
  for (let z = 1; z < 79; z += 2) for (const x of [.7, 119.3]) fence.push([x, z]);
  const fences = instances(fenceGeo, material, fence);
  fence.forEach(([x,z],i)=>{dummy.position.set(x,heightAt(x,z),z);dummy.scale.setScalar(1);dummy.rotation.set(0,x<1||x>119?Math.PI/2:0,0);dummy.updateMatrix();fences.setMatrixAt(i,dummy.matrix);});
  // Garden fences have a welcoming opening onto the path.
  for (let x = 9; x <= 39; x += 2) for (const z of [49, 74]) { if (z === 49 && x > 27 && x < 35) continue; add(cube(), '#b49365', [x, heightAt(x,z)+.65,z],[.2,1.3,.2]); if(x<39)for(const y of [.45,1])add(cube(),'#c6aa7d',[x+1,heightAt(x,z)+y,z],[2,.14,.12]); }
  const bushes = [];
  for (const o of W.trees) bushes.push([o.x / 20 + 2.5, o.y / 20 + 1, .6]);
  instances(combine([[sphere(),'#9bb870',[0,.65,0],[1.8,1.2,1.4]],[sphere(),'#b7ca7e',[.7,1,0],[1,1,.9]]]),material,bushes);
  for (const o of W.rocks) add(ico(),'#b7b39a',[o.x/20,heightAt(o.x/20,o.y/20)+.35,o.y/20],[o.r/20,.7,o.r/24]);
  // Quiet wooden benches.
  function bench(x,z,rot=0) {
    const parts=[]; const b=(p,s,c='#b59565')=>parts.push([cube(),c,p,s]);
    for(const y of [.65,.92])b([0,y,-.38],[2.8,.2,.15]);
    for(const z0 of [-.28,0,.28])b([0,.48,z0],[2.8,.12,.22],'#cfb78b');
    for(const x0 of [-1,1]){b([x0,.25,0],[.16,.5,.7],'#846b48');b([x0,.68,-.42],[.14,1.1,.13],'#846b48');}
    add(combine(parts),'#ffffff',[x,heightAt(x,z),z],[1,1,1],[0,rot,0]);
  }
  bench(52,52,.4); bench(66,34,-.5); bench(78,61,-.8);
  // Crescent arch at the meadow: a shape with an inset crescent opening.
  const crescent = new T.Shape();
  crescent.absarc(0,0,2.4,Math.PI*.28,Math.PI*1.72,false);
  crescent.absarc(.85,0,2.02,Math.PI*1.64,Math.PI*.36,true); crescent.closePath();
  add(new T.ExtrudeGeometry(crescent,{depth:.3,bevelEnabled:false}),'#dcb466',[72,3.2+heightAt(72,45),45],[1,1,1],[0,-.3,.1]);
  add(cube(),'#ac956a',[67,heightAt(67,48)+.18,48],[4,.35,2]);
  // Pavilion: open timber sala, layered terracotta roofs, golden chofa-like tips.
  const px=60,pz=14,base=heightAt(px,pz)+.25;
  add(cube(),'#c6b38d',[px,base,pz],[15,.6,11]); add(cube(),'#b99a6b',[px,base+.4,pz],[14,.25,10]);
  for(let i=0;i<4;i++)add(cube(),'#c7b58f',[px,base-.05-i*.13,20+i*.65],[6,.3,.75]);
  for(const x of [-6,6])for(const z of [-4,4]){add(cyl(),'#996f43',[px+x,base+2.5,pz+z],[.24,4.4,.24]);add(cube(),'#c4a46a',[px+x,base+4.65,pz+z],[.5,.3,.5]);}
  for(let level=0;level<3;level++){
    const width=17-level*4,depth=12-level*2.7,y=base+4.65+level*1.25;
    const roof=new T.ConeGeometry(1,1,4,1,false);roof.rotateY(Math.PI/4);
    add(roof,level===1?'#9f664d':'#b97e53',[px,y,pz],[width*.72,2.4,depth*.72]);
    for(const x of [-1,1])add(new T.ConeGeometry(.17,1.8,5),'#e2c172',[px+x*(width*.5-.4),y+.35,pz],[1,1,1],[0,0,-x*.5]);
  }
  add(new T.ConeGeometry(.24,2.1,6),'#f0cb73',[px,base+9,pz]);
  add(cyl(),'#b18754',[px,base+.85,pz+3.1],[1.1,.55,1.1]);add(new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2),'#d6bc7c',[px,base+1.15,pz+3.1],[1.2,.35,1.2]);
  add(new T.CylinderGeometry(.32,.55,.7,10),'#d8ba6c',[px,base+3.7,pz+4],[1,1,1]);
  const candleLocations=[];
  for(const x of [-2,-1.4,1.4,2]){const h=Math.abs(x)===2?.42:.65;add(cyl(),'#f1dfb1',[px+x,base+.5+h/2,pz+3.7],[.12,h,.12]);candleLocations.push([px+x,pz+3.7,.1,base+.5+h+.12]);}
  const candleFlames=instances(new T.OctahedronGeometry(1),new T.MeshBasicMaterial({color:'#ffe1a3'}),candleLocations);
  // One soft radial-gradient texture is shared by lantern halos, fireflies and the moon glow.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
  {const g=glowCanvas.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.22,'rgba(255,244,214,.75)');r.addColorStop(.55,'rgba(255,214,140,.22)');r.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}
  const glowTexture=new T.CanvasTexture(glowCanvas);glowTexture.colorSpace=T.SRGBColorSpace;
  const lanternGeo=combine([[cyl(),'#9e7a50',[0,1.3,0],[.09,2.6,.09]],[cube(),'#a88a5a',[.35,2.55,0],[.85,.12,.12]],[new T.SphereGeometry(1,8,5),'#f1cc82',[.7,2.05,0],[.34,.48,.34]],[cyl(),'#af8150',[.7,1.56,0],[.12,.12,.12]]]);
  instances(lanternGeo,material,W.lanterns.map(o=>[o.x/20,o.y/20]));
  const lanternGlow=instances(new T.SphereGeometry(1,8,5),new T.MeshBasicMaterial({color:'#ffd88a'}),W.lanterns.map((o,i)=>[o.x/20+.7*Math.cos(i*2.399),o.y/20-.7*Math.sin(i*2.399),1,heightAt(o.x/20,o.y/20)+2.05]));
  W.lanterns.forEach((o,i)=>{dummy.position.set(o.x/20+.7*Math.cos(i*2.399),heightAt(o.x/20,o.y/20)+2.05,o.y/20-.7*Math.sin(i*2.399));dummy.rotation.set(0,0,0);dummy.scale.set(.345,.485,.345);dummy.updateMatrix();lanternGlow.setMatrixAt(i,dummy.matrix);});
  // Night halos around every lantern and pavilion candle: a single additive point draw.
  const haloPositions=[];
  W.lanterns.forEach((o,i)=>{const x=o.x/20+.7*Math.cos(i*2.399),z=o.y/20-.7*Math.sin(i*2.399);haloPositions.push(x,heightAt(o.x/20,o.y/20)+2.05,z);});
  for(const c of candleLocations)haloPositions.push(c[0],c[3],c[1]);
  const haloGeo=new T.BufferGeometry();haloGeo.setAttribute('position',new T.Float32BufferAttribute(haloPositions,3));
  const haloMat=new T.PointsMaterial({map:glowTexture,color:'#ffc46e',size:3.4,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
  const lanternHalos=new T.Points(haloGeo,haloMat);lanternHalos.visible=false;scene.add(lanternHalos);
  // Pond: low-cost animated stylised water, without a reflection pass.
  const waterMaterial = new T.MeshLambertMaterial({color:'#7cbfc0',transparent:false});
  const water = new T.Mesh(new T.CircleGeometry(1,60),waterMaterial);water.rotation.x=-Math.PI/2;water.scale.set(15,9.5,1);water.position.set(94,.075,52);scene.add(water);
  const pondBank = new T.Mesh(new T.RingGeometry(.98,1.055,60),new T.MeshLambertMaterial({color:'#d9ce9b',side:T.DoubleSide}));pondBank.rotation.x=-Math.PI/2;pondBank.scale.set(15,9.5,1);pondBank.position.set(94,.09,52);scene.add(pondBank);
  const ripples=[];
  for(let i=0;i<26;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.83,x=94+Math.cos(a)*r*15,z=52+Math.sin(a)*r*9.5;add(new T.CircleGeometry(.55+random()*.35,9),'#86a967',[x,.12,z],[1,1,1],[-Math.PI/2,0,0]);if(i%2===0){for(let p=0;p<5;p++){const a=p/5*Math.PI*2;add(new T.IcosahedronGeometry(1,0),'#e8b3bb',[x+Math.cos(a)*.18,.23,z+Math.sin(a)*.18],[.22,.14,.17]);}add(new T.OctahedronGeometry(1),'#f2dc8d',[x,.29,z],[.13,.11,.13]);}ripples.push([x,z]);}
  const waterShader={value:0};
  waterMaterial.onBeforeCompile=s=>{s.uniforms.uWorldTime=waterShader;s.vertexShader='uniform float uWorldTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += sin(position.x * 18.0 + uWorldTime * 0.5) * 0.008;');};
  // A pier stops at the bank; walking onto the water remains blocked by WorldCore.
  for(let i=0;i<9;i++)add(cube(),'#c2a170',[77+i*.5,heightAt(78,52)+.22,52],[.45,.18,3.3]);
  // Five fanned blades fill each clump. Painted root-to-tip colours avoid the
  // dark alternating faces of crossed, directly-lit triangles (no alpha overdraw).
  for(let i=0;i<5;i++){
    const a=i*2.399,h=.33+(i%3)*.07,bend=i%2?.13:-.11;
    const blade=new T.BufferGeometry();
    blade.setAttribute('position',new T.Float32BufferAttribute([-.075,0,0,.075,0,0,bend,h,.04],3));blade.computeVertexNormals();
    const root=colour('#9bc66d'),tip=colour(['#c6df8e','#b7d980','#d1e79a'][i%3]);
    blade.setAttribute('color',new T.Float32BufferAttribute([...root.toArray(),...root.toArray(),...tip.toArray()],3));
    grassParts.push([blade,'#ffffff',[Math.cos(a)*.19,0,Math.sin(a)*.19],[1,1,1],[0,a,0]]);
  }
  const grassMat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,toneMapped:false});const grassTime={value:0};
  grassMat.onBeforeCompile=s=>{s.uniforms.uWorldTime=grassTime;s.vertexShader='uniform float uWorldTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(uWorldTime * 1.1 + instanceMatrix[3].x * 0.7) * position.y * 0.16;');};
  const grassLocations=[];
  for(let i=0;i<11000;i++){const x=i<7000?random()*119:42+random()*35,z=i<7000?random()*79:38+random()*29;if(W.blocked(x*20,z*20,0)||pathPoints.some(p=>(x-p[0])**2+(z-p[1])**2<p[2]))continue;grassLocations.push([x,z,.85+random()*.65]);}
  const grass=instances(combine(grassParts),grassMat,grassLocations);
  const flowers=[];
  for(const bed of W.flowerBeds)for(let i=0;i<16;i++){const a=random()*Math.PI*2,r=random()*bed.r/20,x=bed.x/20+Math.sin(a)*r,z=bed.y/20+Math.cos(a)*r;flowers.push([x,z,.65+random()*.4]);}
  for(let i=0;i<48;i++){const x=48+random()*7,z=47+random()*10;flowers.push([x,z,.5+random()*.35]);}
  const flowerGeo=combine([[new T.CylinderGeometry(1,1,1,4,1,true),'#7da465',[0,.22,0],[.025,.45,.025]],...Array.from({length:5},(_,i)=>[new T.OctahedronGeometry(1),i%2?'#fff5d6':'#f9e6ba',[Math.sin(i*1.256)*.14,.5,Math.cos(i*1.256)*.14],[.16,.06,.16]]),[new T.OctahedronGeometry(1),'#e4b864',[0,.55,0],[.1,.06,.1]]]);
  instances(flowerGeo,material,flowers);
  // Mushrooms in the grove.
  for(let i=0;i<16;i++){const x=8+random()*25,z=8+random()*25;add(cyl(),'#ece1bd',[x,heightAt(x,z)+.2,z],[.11,.4,.11]);add(new T.SphereGeometry(1,8,4,0,Math.PI*2,0,Math.PI/2),'#c38d73',[x,heightAt(x,z)+.4,z],[.4,.23,.4]);}
  const scenery=new T.Mesh(combine(staticParts),material);scenery.receiveShadow=true;scene.add(scenery);
  // Fireflies and stars share a single point-cloud draw.
  const firePositions=[];for(let i=0;i<100;i++)firePositions.push(5+random()*34,1+random()*4,6+random()*34);
  const fireGeo=new T.BufferGeometry();fireGeo.setAttribute('position',new T.Float32BufferAttribute(firePositions,3));
  const fireflies=new T.Points(fireGeo,new T.PointsMaterial({map:glowTexture,color:'#ffe08a',size:.55,transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending}));scene.add(fireflies);
  // Night sky: stars and moon live on a dome that follows the camera and ignores fog,
  // so they are always visible at night without extra geometry far away.
  const sky=new T.Group();scene.add(sky);
  const starsGeo=new T.BufferGeometry();const stars=[];
  for(let i=0;i<260;i++){const a=random()*Math.PI*2,e=.12+random()*1.1,r=150;stars.push(Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r);}
  starsGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));
  const skyStars=new T.Points(starsGeo,new T.PointsMaterial({color:'#fff1d2',size:2.2,sizeAttenuation:false,fog:false,transparent:true,opacity:0,depthWrite:false}));sky.add(skyStars);
  const moon=new T.Mesh(new T.SphereGeometry(5.5,20,12),new T.MeshBasicMaterial({color:'#fff2d0',fog:false,transparent:true,opacity:0}));
  const moonGlow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:'#ffe2a6',fog:false,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));moonGlow.scale.set(46,46,1);
  moon.position.set(-62,24,-128);moonGlow.position.copy(moon.position);sky.add(moon,moonGlow);
  // Animated actors are instanced per species, including followers and distant LODs.
  const actorMat=new T.MeshLambertMaterial({vertexColors:true}),models=new Map(),batches=new Map();
  for(const species of ['star',...Object.values(W.species)]){const g=petGeometry(species);models.set(species,g);const b=new T.InstancedMesh(g,actorMat,128);b.count=0;b.frustumCulled=false;b.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(b);batches.set(species,b);}
  const lodGeo=combine([[new T.SphereGeometry(1,8,4),'#f8e9c3',[0,.8,0],[.55,.7,.55]]]);const lodBatch=new T.InstancedMesh(lodGeo,actorMat,128);lodBatch.count=0;lodBatch.frustumCulled=false;scene.add(lodBatch);
  const self=new T.Mesh(models.get('star'),actorMat);self.castShadow=true;scene.add(self);
  const petAnimator=createPetAnimator(actorMat,{reducedMotion});scene.add(petAnimator.group);
  const shadowMat=new T.MeshBasicMaterial({color:'#647654',transparent:true,opacity:.1,depthWrite:false});
  const shadows=new T.InstancedMesh(new T.CircleGeometry(.68,16),shadowMat,128);shadows.frustumCulled=false;scene.add(shadows);
  const auraGeo=new T.RingGeometry(.76,.86,28);auraGeo.rotateX(-Math.PI/2);
  const auraMat=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide});
  const auras=new T.InstancedMesh(auraGeo,auraMat,128);auras.frustumCulled=false;scene.add(auras);
  const sparks=new T.InstancedMesh(new T.OctahedronGeometry(.085),new T.MeshBasicMaterial({color:'#ffffff'}),512);sparks.frustumCulled=false;scene.add(sparks);
  const transient=new T.Group();scene.add(transient);const effects=[];
  const offeredLotuses=new Map();
  let scale=performanceMode?.75:1, yaw=.2,pitch=.24,night=0,low=performanceMode,timeMode='auto',lastTarget=new T.Vector3(W.WORLD.spawn.x/20,0,W.WORLD.spawn.y/20);
  const target=new T.Vector3(),projected=new T.Vector3();const daySky=colour('#afe1f1'),nightSky=colour('#182334'),dayFog=colour('#d6e8cd'),nightFog=colour('#202c3e');
  const cameraOffset=new T.Vector3();
  function resize(){renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)*scale);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  function setPerformance(value){low=value;scale=value?.75:1;grass.count=Math.round(grassLocations.length*(value?.33:1));sun.castShadow=!value;resize();}
  function heart(){const s=new T.Shape();s.moveTo(0,-.1);s.bezierCurveTo(-.3,.08,-.14,.28,0,.13);s.bezierCurveTo(.14,.28,.3,.08,0,-.1);return new T.ShapeGeometry(s,4);}
  function addEffect(kind,x,z){if(effects.length>=12){const old=effects.shift();transient.remove(old.mesh);old.mesh.geometry.dispose();}const parts=kind==='release'?[[cyl(),'#ffe1a0',[0,0,0],[.32,.55,.32]],[cube(),'#a57b44',[0,-.3,0],[.5,.07,.5]]]:Array.from({length:7},(_,i)=>[kind==='pat'?heart():new T.OctahedronGeometry(.07),kind==='feed'?'#d5b27d':kind==='pat'?'#eaa4b3':'#f4d278',[Math.sin(i)*.65,.1*i,Math.cos(i)*.65]]);const m=new T.Mesh(combine(parts),material);m.position.set(x,heightAt(x,z)+1.4,z);m.rotation.y=yaw;transient.add(m);effects.push({mesh:m,kind,start:performance.now()});}
  function lotus(id,x,z,expires){if(offeredLotuses.has(id)||offeredLotuses.size>=80)return;const parts=Array.from({length:6},(_,i)=>[new T.OctahedronGeometry(1),'#efd19c',[Math.sin(i*Math.PI/3)*.33,0,Math.cos(i*Math.PI/3)*.33],[.3,.2,.3]]);parts.push([new T.IcosahedronGeometry(1,0),'#fff2bc',[0,.15,0],[.22,.2,.22]]);const m=new T.Mesh(combine(parts),material);m.position.set(x,.22,z);scene.add(m);offeredLotuses.set(id,{mesh:m,expires});}
  function render(actors, me, seconds, dt) {
    const cycle=(Math.sin(seconds/100-Math.PI/2)+1)/2;
    const desired=timeMode==='night'?1:timeMode==='day'?0:Math.max(0,(cycle-.35)/.65);
    night+= (desired-night)*Math.min(1,dt*2);
    scene.background.copy(daySky).lerp(nightSky,night);scene.fog.color.copy(dayFog).lerp(nightFog,night);hemi.intensity=2.65-night*1.85;sun.intensity=.95-night*.7;
    grassMat.color.setRGB(1-night*.81,1-night*.76,1-night*.68);
    sun.color.set(night>.6?'#afc4ed':'#fff4dc');
    const nightGlow=Math.max(0,Math.min(1,(night-.25)/.6));sky.visible=nightGlow>0;skyStars.material.opacity=nightGlow*.95;moon.material.opacity=nightGlow;moonGlow.material.opacity=nightGlow*.55;
    lanternHalos.visible=nightGlow>0;haloMat.opacity=nightGlow*(low?.7:1);skyStars.visible=night>.3;fireflies.visible=night>.4&&!low&&!reducedMotion;lanternGlow.visible=night>.3;candleFlames.visible=night>.3||(me.action==='pray'&&me.actionUntil>performance.now());
    grassTime.value=reducedMotion||low?0:seconds;waterShader.value=reducedMotion?0:seconds;
    document.body.dataset.night=night>.6?'true':'false';
    petAnimator.beginFrame();
    const counts=new Map([...batches.keys()].map(k=>[k,0]));let shadowCount=0,auraCount=0,sparkCount=0,lodCount=0,detailCount=0;
    // Local pet is first so its shadow and detail are retained under crowded conditions.
    const ordered=[me,...actors.filter(a=>a!==me).sort((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y))];
    for(const actor of ordered){
      const draw=(card,x,z,heading,isSelf=false,small=false,slot=-1)=>{
        if(shadowCount>=128)return;
        const species=W.parseCard(card)?.species||'star';const ground=heightAt(x,z);const idle=reducedMotion?0:Math.sin(seconds*2+actor.phase)*.025;const walking=actor.moving&&!reducedMotion?Math.abs(Math.sin(seconds*10+actor.phase))*.12:0;
        const action=actor.actionUntil>performance.now()&&(!small||actor.action==='sit')?actor.action:null;
        const hop=action==='hop'&&!reducedMotion?Math.abs(Math.sin(seconds*7))*.65:0;
        const s=small?.7:1;
        const posed=slot>=0&&species!=='star'&&petAnimator.pose({slot,geometry:models.get(species),species,x,z,heading,ground,scale:s,action,foodKind:actor.food,elapsed:(performance.now()-(actor.actionStarted||0))/1000,seconds,dt,camera});
        dummy.position.set(x,ground+idle+walking+hop,z);dummy.rotation.set(action==='pray'?.25:0,heading,action==='wave'&&!reducedMotion?Math.sin(seconds*8)*.13:0);dummy.scale.setScalar(s);dummy.updateMatrix();
        if(isSelf){self.visible=!posed;self.geometry=models.get(species);self.position.copy(dummy.position);self.rotation.copy(dummy.rotation);self.scale.copy(dummy.scale);}
        else if(posed){detailCount++;}
        else if(detailCount<8&&Math.hypot(x-me.x/20,z-me.y/20)<40){const b=batches.get(species);b.setMatrixAt(counts.get(species),dummy.matrix);counts.set(species,counts.get(species)+1);detailCount++;}
        else{lodBatch.setMatrixAt(lodCount++,dummy.matrix);}
        dummy.position.set(x,ground+.045,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(s*1.05,s*.8,1);dummy.updateMatrix();shadows.setMatrixAt(shadowCount++,dummy.matrix);
        const rank=W.parseCard(card)?.rank||'C';
        if(rank!=='C'||actor.glow){const c=colour(actor.glow?'#f7d17b':{R:'#e6eef1',S:'#bd9aee',SR:'#e88c9b',SSR:'#f8d47e'}[rank]);dummy.position.set(x,ground+.08,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(s);dummy.updateMatrix();auras.setMatrixAt(auraCount,dummy.matrix);auras.setColorAt(auraCount++,c);const n=rank==='SSR'?3:1;for(let i=0;i<n&&sparkCount<512;i++){const a=(reducedMotion?0:seconds)*.8+i*Math.PI*2/n;dummy.position.set(x+Math.sin(a)*s,ground+1+Math.cos(a*2)*.35,z+Math.cos(a)*s);dummy.scale.setScalar(rank==='SSR'?1.3:.8);dummy.updateMatrix();sparks.setMatrixAt(sparkCount,dummy.matrix);sparks.setColorAt(sparkCount++,c);}}
      };
      const x=actor.x/20,z=actor.y/20;draw(actor.pet,x,z,actor.dir||0,actor===me,false,actor===me?0:-1);
      (actor.followers||[]).forEach((card,i)=>{// A gentle V behind the lead, about one body-width apart so pets never overlap.
const dist=2.15+i*.55,side=(i===0?-1:1)*1.15,h=actor.dir||0;const desiredX=x-Math.sin(h)*dist+Math.cos(h)*side,desiredZ=z-Math.cos(h)*dist-Math.sin(h)*side;actor.trail ||= [];actor.trail[i] ||= {x:desiredX,z:desiredZ};const p=actor.trail[i];if(!(actor.action==='sit'&&actor.actionUntil>performance.now())){p.x+=(desiredX-p.x)*Math.min(1,dt*4);p.z+=(desiredZ-p.z)*Math.min(1,dt*4);}if(!W.blocked(p.x*20,p.z*20,8))draw(card,p.x,p.z,actor.dir||0,false,true,actor===me?i+1:-1);});
    }
    petAnimator.endFrame();
    for(const [species,b]of batches){b.count=counts.get(species);b.instanceMatrix.needsUpdate=true;}
    lodBatch.count=lodCount;lodBatch.instanceMatrix.needsUpdate=true;shadows.count=shadowCount;shadows.instanceMatrix.needsUpdate=true;auras.count=auraCount;auras.instanceMatrix.needsUpdate=true;if(auras.instanceColor)auras.instanceColor.needsUpdate=true;sparks.count=sparkCount;sparks.instanceMatrix.needsUpdate=true;if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;
    target.set(me.x/20,heightAt(me.x/20,me.y/20)+1.35,me.y/20);
    lastTarget.lerp(target,reducedMotion?1:1-Math.exp(-dt*8));
    const distance=innerWidth<760?10:10.5;cameraOffset.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.position.copy(lastTarget).add(cameraOffset);camera.position.y=Math.max(camera.position.y,heightAt(camera.position.x,camera.position.z)+1.2);camera.lookAt(lastTarget);
    sky.position.copy(camera.position);
    sun.position.set(target.x-22,target.y+40,target.z+22);sun.target.position.copy(target);sun.target.updateMatrixWorld();
    for(let i=effects.length-1;i>=0;i--){const e=effects[i],age=(performance.now()-e.start)/1000;e.mesh.position.y+=dt*(e.kind==='release'?1.1:.6);e.mesh.rotation.y+=dt*.3;if(age>(e.kind==='release'?8:2)){transient.remove(e.mesh);e.mesh.geometry.dispose();effects.splice(i,1);}}
    for(const [id,l]of offeredLotuses){if(l.expires<Date.now()){scene.remove(l.mesh);l.mesh.geometry.dispose();offeredLotuses.delete(id);}else if(!reducedMotion)l.mesh.position.y=.22+Math.sin(seconds+ l.mesh.position.x)*.035;}
    renderer.render(scene,camera);
    return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderScale:scale,night:night>.6};
  }
  function project(x,z,y=3){projected.set(x,heightAt(x,z)+y,z).project(camera);return {x:(projected.x*.5+.5)*innerWidth,y:(-.5*projected.y+.5)*innerHeight,visible:projected.z<1&&projected.z>-1&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.3};}
  function orbit(dx,dy){yaw-=dx*.006;pitch=Math.max(.1,Math.min(.8,pitch+dy*.003));}
  setPerformance(performanceMode);resize();window.addEventListener('resize',resize);
  return {render,project,orbit,addEffect,lotus,setPerformance,get yaw(){return yaw;},setTime(value){timeMode=value;},setScale(value){scale=Math.max(.6,Math.min(low?.75:1,value));resize();},get scale(){return scale;},get animation(){return petAnimator.snapshot();},get metrics(){return {drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderScale:scale};},dispose(){window.removeEventListener('resize',resize);petAnimator.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});renderer.dispose();}};
}
