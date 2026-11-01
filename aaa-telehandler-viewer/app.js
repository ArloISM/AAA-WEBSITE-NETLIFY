import * as THREE from 'three';
import { OrbitControls } from './vendor/addons/OrbitControls.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/DRACOLoader.js';
import { buildBoomEnd, PIN } from './boom-end.js';

/* ── Attachment data ──────────────────────────────────────────────
   Wording for the Romastor heads and Rotator is the AAA homepage copy.
   Ranges come from the homepage specs and the keyframes in the source
   .blend, see README. `wrap` = continuous rotation, `pitch` = shown as
   up / down. Positive pitch is nose-down. Each scene's TELEHANDLER TILT
   empty is baked at one point, which moves onto the boom's tilt pin. `mount`
   corrects a scene whose empty misses its hitch (metres, x forward-negative,
   y up). */
const ATTACHMENTS = [
  { id: 'romastor-360', name: 'Romastor 360°', spec: 'Continuous Pan',
    desc: 'Continuous 360° panning rotation for versatile rigging — smoothly repositioning frames, scrims and lighting around the set.',
    mount: [0, 0],
    funcs: [{ key: 'pan', label: 'Pan', min: -180, max: 180, wrap: true }] },
  { id: 'romastor-pan-tilt', name: 'Romastor Pan & Tilt', spec: '360° · 70° Tilt',
    desc: '360° pan with up to 70° tilt — versatile rigging for positioning frames, scrims and loads at almost any angle.',
    // this scene's empty sits above and behind the hook throat; the other three sit on it
    mount: [-0.077, 0.21],
    // the model's coordinates, not the scene's pivot: follows Romastor's Tilt 5.0T drawing, with
    // the hinge high on the frame's front corner and the ram driving a lug below it
    hinge: [-5.737, 4.888],
    ram: { a: [-5.0597, 4.6868], b: [-5.7015, 4.5676], barrel: 'Cube_037', rod: '109_004', rigid: 'Cube_034' },
    funcs: [{ key: 'pan', label: 'Pan', min: -180, max: 180, wrap: true },
            { key: 'tilt', label: 'Tilt', min: -70, max: 0, pitch: true, flip: true }] },
  { id: 'romastor-3d', name: 'Romastor 3D', spec: 'Dual Axis · Full Sphere',
    desc: 'Dual-axis full-sphere movement — maximum rigging versatility for frames, scrims and suspended loads in any orientation.',
    mount: [0, 0],
    funcs: [{ key: 'axis1', label: 'Axis 1 · Pan', min: -180, max: 180, wrap: true },
            { key: 'axis2', label: 'Axis 2 · Roll', min: -180, max: 180, wrap: true }] },
  { id: 'rotator', name: 'Rotator', spec: '360° Vertical',
    desc: 'Continuous 360° vertical rotation in either direction — versatile, safe positioning of rigging loads, frames and scrims.',
    mount: [0, 0],
    funcs: [{ key: 'rotate', label: 'Rotate', min: -180, max: 180, wrap: true }] },
];
const BOOM = { key: 'boom', label: 'Tilt', min: -31, max: 41, pitch: true };

const $ = (id) => document.getElementById(id);
const DEG = Math.PI / 180;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const qs = new URLSearchParams(location.search);

/* ── Scene ────────────────────────────────────────────────────── */
const canvas = $('gl');
const stage = $('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });   // transparent: the page behind is the backdrop
} catch {
  stage.insertAdjacentHTML('beforeend', '<p class="err">This 3D view needs WebGL, which is not available in this browser.</p>');
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
/* What the metal reflects: the AAA home page. Colours are sampled from its hero image:
   mostly teal-blue from above and behind, orange lower down, a touch of the buttons' red,
   and long cream softboxes whose streaks keep black parts from going to black. */
function pageEnvironment() {
  const env = new THREE.Scene();
  const glow = (hex, power) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide });
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), glow(0x1c2a31, 1)));
  const panel = (w, h, hex, power, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow(hex, power));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(34, 8, 0xf5f1ea, 10, 0, 24, 8);       // long overhead softbox
  panel(6, 26, 0xf5f1ea, 7, -26, 4, 14);      // tall strip, camera left
  panel(5, 22, 0xf5f1ea, 5, 24, 6, -18);    // kicker behind
  panel(44, 18, 0x3b7f92, 3.2, -4, 12, -28);  // teal sky behind
  panel(16, 28, 0x3b7f92, 2.6, 30, 3, 8);     // and at the boom side
  panel(32, 10, 0xc8703a, 2.4, 4, -22, 14);   // orange from below
  panel(6, 6, 0xea1f27, 1.2, -18, -16, 18);   // a small accent of the buttons' red
  return pmrem.fromScene(env, 0.03).texture;
}
scene.environment = pageEnvironment();
scene.environmentIntensity = 1;

const key = new THREE.DirectionalLight(0xfff4e6, 2.1);
key.position.set(-14, 20, 12);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 50 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
// rim lights that travel with the camera, so the head's far edges always catch light
// against the dark page as it orbits or the head moves
const rim = new THREE.DirectionalLight(0xfff1e4, 2.4);
const blueRim = new THREE.DirectionalLight(0x5fa8bd, 1.5);
const fill = new THREE.DirectionalLight(0xe0935c, 0.8);        // soft orange, low from the viewer's side, so the undersides of black parts still read
scene.add(rim, rim.target, blueRim, blueRim.target, fill, fill.target, key.target);
const _cam = new THREE.Vector3(), _side = new THREE.Vector3();
function updateRims() {
  _cam.subVectors(HEAD, camera.position).setY(0).normalize();    // pointing away from the viewer
  _side.set(-_cam.z, 0, _cam.x);
  rim.target.position.copy(HEAD);
  blueRim.target.position.copy(HEAD);
  rim.position.copy(HEAD).addScaledVector(_cam, 10).addScaledVector(_side, -6).setY(HEAD.y + 7);
  blueRim.position.copy(HEAD).addScaledVector(_cam, 8).addScaledVector(_side, 8).setY(HEAD.y - 4);
  fill.target.position.copy(HEAD);
  fill.position.copy(HEAD).addScaledVector(_cam, -10).addScaledVector(_side, 4).setY(HEAD.y - 2);
}

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = Math.PI - 0.02;   // no floor now, so the underside can be seen too
controls.minDistance = 3;
controls.maxDistance = 14;
controls.enablePan = false;

/* ── Materials: the .blend's procedural shaders don't survive glTF, so rebuild by class ── */
const std = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const MATS = {
  aa_black: std(0x1c1d21, 0.3, 0.38),
  aa_rubber: std(0x0d0d0d, 0, 0.9),
  aa_alu: std(0xaeb1b5, 1, 0.42),
  aa_steel: std(0x8f9297, 1, 0.34),
  aa_brass: std(0xb08d4a, 1, 0.38),
  aa_blue: std(0x24418f, 0.3, 0.45),
  aa_red: std(0xb31b24, 0.2, 0.45),
};
function dress(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const n = o.material.name;
    if (MATS[n]) o.material = MATS[n];
  });
}

/* Everything but the attachment and truss is context only: one 10% ghost. A depth-only pass first, so the
   ghost shows its nearest surface instead of every inner face stacked up. Both
   passes run after the opaque head, so the head still shows through. */
const GHOST_OPACITY = 0.1;
const ghostDepth = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const ghostSkin = new THREE.MeshStandardMaterial({ color: 0xea1f27, metalness: 0, roughness: 0.6, transparent: true, opacity: GHOST_OPACITY, depthWrite: false });
// fine edges on the boom end, because modelled detail barely reads in a 10% surface alone
const EDGE_OPACITY = 0.3;
const edgeMat = new THREE.LineBasicMaterial({ color: 0xea1f27, transparent: true, opacity: EDGE_OPACITY, depthWrite: false });
function outlined(o) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), edgeMat);
  lines.renderOrder = 3;
  o.add(lines);
  return o;
}
function ghostMesh(o, skin) {
  const depth = new THREE.Mesh(o.geometry, ghostDepth);
  depth.renderOrder = 1;
  o.add(depth);
  o.material = skin;
  o.renderOrder = 2;
  return o;
}
function ghost(root) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    if (o.material.name === 'tele_head') { o.removeFromParent(); continue; }  // the head is the hitch carriage now
    ghostMesh(o, ghostSkin);
  }
}

/* ── Rig helpers: every part is baked in one assembly frame; a joint is T(p) R(axis, a) T(-p) ── */
const _t = new THREE.Matrix4(), _r = new THREE.Matrix4(), _b = new THREE.Matrix4();
function setJoint(group, pivot, axis, deg) {
  _t.makeTranslation(pivot.x, pivot.y, pivot.z);
  _r.makeRotationAxis(axis, deg * DEG);
  _b.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
  group.matrix.copy(_t).multiply(_r).multiply(_b);
  group.matrixWorldNeedsUpdate = true;
}
function manualGroup(name) {
  const g = new THREE.Group();
  g.name = name;
  g.matrixAutoUpdate = false;
  return g;
}

/* arc showing the travel of the joint being driven */
const arcMat = new THREE.MeshBasicMaterial({ color: 0xea1f27, transparent: true, opacity: 0, depthTest: false, fog: false });
function makeArc(pivot, axis, radius, fn) {
  const span = (fn.max - fn.min) * DEG;
  const geo = new THREE.TorusGeometry(radius, radius * 0.008, 8, Math.max(24, Math.round(span * 24)), span);
  const m = new THREE.Mesh(geo, arcMat);
  const refDir = Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(-1, 0, 0);
  const u = refDir.clone().addScaledVector(axis, -refDir.dot(axis)).normalize();
  const v = axis.clone().cross(u);
  m.matrixAutoUpdate = false;
  m.matrix.makeBasis(u, v, axis).premultiply(new THREE.Matrix4().makeRotationAxis(axis, fn.min * DEG)).setPosition(pivot);
  m.renderOrder = 10;
  m.visible = false;
  return m;
}

/* ── Rig ── */
const boomGroup = manualGroup('boom');
scene.add(boomGroup);
let HEAD = new THREE.Vector3(), BOOM_AXIS = new THREE.Vector3(0, 0, 1), boomArc = null;
const BAKED = new THREE.Vector3();                         // where the export puts each scene's tilt empty
const BOOM_Z = -0.605;                                     // boom centreline
const RAM = { barrel: 0.5, rod: 0.55 };
const ram = { barrel: null, rod: null, clevis: null, ear: null, anchor: null };
const nose = new THREE.Group();
scene.add(nose);
const ghosted = (geo) => ghostMesh(new THREE.Mesh(geo), ghostSkin);
function buildNose() {
  const end = buildBoomEnd(BOOM_Z);
  nose.add(outlined(ghosted(end.fixed)));
  boomGroup.add(outlined(ghosted(end.carriage)));   // swings with the tilt, carrying the head
  ram.ear = end.ear;
  ram.anchor = end.anchor;
  ram.barrel = ghosted(new THREE.CylinderGeometry(0.06, 0.06, RAM.barrel, 24).translate(0, RAM.barrel / 2, 0));
  ram.rod = ghosted(new THREE.CylinderGeometry(0.032, 0.032, RAM.rod, 20).translate(0, RAM.rod / 2, 0));
  ram.clevis = ghosted(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 20).rotateX(Math.PI / 2));
  nose.add(ram.barrel, ram.rod, ram.clevis);
}
const _ear = new THREE.Vector3(), _dir = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _rev = new THREE.Vector3();
function updateRam() {
  if (!ram.barrel) return;
  const a = boom.cur * DEG, c = Math.cos(a), n = Math.sin(a);   // the lug swings with the tilt
  _ear.set(HEAD.x + ram.ear.x * c - ram.ear.y * n, HEAD.y + ram.ear.x * n + ram.ear.y * c, BOOM_Z);
  _dir.subVectors(_ear, ram.anchor).normalize();
  ram.barrel.position.copy(ram.anchor);
  ram.barrel.quaternion.setFromUnitVectors(_up, _dir);
  ram.rod.position.copy(_ear);
  ram.rod.quaternion.setFromUnitVectors(_up, _rev.copy(_dir).negate());
  ram.clevis.position.copy(_ear);
}

const manager = new THREE.LoadingManager();
const draco = new DRACOLoader(manager).setDecoderPath('vendor/draco/');
const gltf = new GLTFLoader(manager).setDRACOLoader(draco);
manager.onProgress = (_u, done, total) => { $('loaderBar').style.width = `${Math.round((done / total) * 100)}%`; };

let manifest;
const built = new Map();

function buildAttachment(cfg, glb) {
  const m = manifest[cfg.id];
  const holder = new THREE.Group();          // mount offset + swap animation
  holder.name = cfg.id;
  const nodeOf = (group) => glb.scene.getObjectByName(m.nodes.find((n) => n.group === group)?.node);
  // carry the baked tilt empty to the nose pin, centred under the boom
  holder.position.set(HEAD.x - BAKED.x + cfg.mount[0], HEAD.y - BAKED.y + cfg.mount[1], BOOM_Z - m.funcs[0].pivot[2]);
  holder.userData.home = holder.position.clone();
  const fixed = new THREE.Group();
  holder.add(fixed);
  const joints = {};
  const parentOf = { fixed };
  for (const f of m.funcs) {
    const g = manualGroup(f.key);
    const def = cfg.funcs.find((x) => x.key === f.key);
    joints[f.key] = { group: g, pivot: new THREE.Vector3().fromArray(f.pivot), axis: new THREE.Vector3().fromArray(f.axis).normalize(), def, cur: 0, target: 0 };
    parentOf[f.key] = g;
  }
  for (const f of m.funcs) (f.parent ? joints[f.parent].group : fixed).add(joints[f.key].group);

  for (const n of m.nodes) {
    if (!n.group.startsWith('drv:')) parentOf[n.group].add(glb.scene.getObjectByName(n.node));
  }
  // hydraulic ram: pin A stays on the pan frame, pin B rides on the tilting frame, and barrel and rod aim at each other
  let driven = null;
  if (m.driven) {
    const joint = joints[m.driven.driver];
    const parts = {};
    for (const key of m.driven.parts) {
      const obj = nodeOf(m.nodes.find((n) => n.group.startsWith('drv:') && n.group.replace('drv:', '').replace(/[. ]/g, '_') === key).group);
      const g = manualGroup(key);
      g.add(obj);
      joint.group.parent.add(g);
      parts[key] = g;
    }
    // how far barrel and rod each reach along the ram, so they can be kept overlapping
    const { a: pa, b: pb } = cfg.ram;
    const len = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
    const dx = (pa[0] - pb[0]) / len, dy = (pa[1] - pb[1]) / len;
    const reach = (key, ox, oy, sign) => {
      let most = 0;
      parts[key].traverse((o) => {
        if (!o.isMesh) return;
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) most = Math.max(most, sign * ((p.getX(i) - ox) * dx + (p.getY(i) - oy) * dy));
      });
      return most;
    };
    driven = { joint, ram: cfg.ram, parts, barrelLen: reach(cfg.ram.barrel, pb[0], pb[1], 1), rodLen: reach(cfg.ram.rod, pa[0], pa[1], -1) };
  }
  if (cfg.hinge) {
    joints.tilt.pivot.setX(cfg.hinge[0]).setY(cfg.hinge[1]);
    addHingeLugs(joints.pan.group, joints.tilt.pivot, cfg.hinge);
  }
  dress(holder);
  // arcs live in the joint's parent so they lean with the boom but don't spin with their own head
  for (const k in joints) {
    const j = joints[k];
    j.arc = makeArc(j.pivot, j.axis, 1.5, j.def);
    j.group.parent.add(j.arc);
  }
  const last = joints[m.funcs[m.funcs.length - 1].key].group;
  // the view orbits the middle of the whole attachment, head and truss together
  const box = new THREE.Box3();
  holder.traverse((o) => {
    if (o.isMesh && o.material !== arcMat) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().translate(o.position)); }
  });
  const centre = box.getCenter(new THREE.Vector3()).add(holder.position);
  return { cfg, holder, joints, driven, last, centre };
}

// the pan arm stops short of the hinge, so lugs carry it up to the pin
const LUG = [[0.257, -0.128], [0.077, -0.188], [-0.063, -0.028], [-0.023, 0.062], [0.057, 0.062]];
function addHingeLugs(host, pivot, hinge) {
  const shape = new THREE.Shape(LUG.map(([x, y]) => new THREE.Vector2(hinge[0] + x, hinge[1] + y)));
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.024, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 });
  const zCyl = (r, len) => new THREE.CylinderGeometry(r, r, len, 28).rotateX(Math.PI / 2);
  const add = (geo, mat, z, x = 0, y = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    m.position.set(x, y, z);
    host.add(m);
  };
  for (const side of [-1, 1]) {
    add(plate, MATS.aa_black, pivot.z + side * 0.405 - 0.012);
    add(zCyl(0.07, 0.03), MATS.aa_black, pivot.z + side * 0.42, pivot.x, pivot.y);
    add(zCyl(0.035, 0.02), MATS.aa_steel, pivot.z + side * 0.44, pivot.x, pivot.y);
  }
  add(zCyl(0.03, 0.84), MATS.aa_steel, pivot.z, pivot.x, pivot.y);
}

const _rot = new THREE.Matrix4(), _toA = new THREE.Matrix4(), _toB = new THREE.Matrix4();
const _stretch = new THREE.Matrix4(), _aim = new THREE.Matrix4(), _aimBack = new THREE.Matrix4(), _sx = new THREE.Matrix4();
function aroundPin(m, x, y, deg, tx = x, ty = y) {
  _rot.makeRotationZ(deg * DEG);
  _toA.makeTranslation(tx, ty, 0);
  _toB.makeTranslation(-x, -y, 0);
  m.copy(_toA).multiply(_rot).multiply(_toB);
}
function updateDriven(d) {
  const { ram, parts, joint } = d;
  const a = joint.cur * joint.axis.z;
  const c = Math.cos(a * DEG), n = Math.sin(a * DEG);
  const px = joint.pivot.x, py = joint.pivot.y;
  const bx = ram.b[0] - px, by = ram.b[1] - py;
  const nx = px + bx * c - by * n, ny = py + bx * n + by * c;   // pin B after the tilt
  const aim0 = Math.atan2(ram.a[1] - ram.b[1], ram.a[0] - ram.b[0]);
  const aim = Math.atan2(ram.a[1] - ny, ram.a[0] - nx);
  const turn = (aim - aim0) / DEG;
  aroundPin(parts[ram.barrel].matrix, ram.b[0], ram.b[1], turn, nx, ny);
  // this hinge needs more stroke than the modelled ram has, so the barrel telescopes to keep hold of the rod
  const length = Math.hypot(ram.a[0] - nx, ram.a[1] - ny);
  const f = Math.max(1, (length - d.rodLen + 0.05) / d.barrelLen);
  if (f > 1) {
    _aim.makeRotationZ(aim0);
    _aimBack.makeRotationZ(-aim0);
    _sx.makeScale(f, 1, 1);
    _stretch.makeTranslation(ram.b[0], ram.b[1], 0).multiply(_aim).multiply(_sx).multiply(_aimBack).multiply(_toA.makeTranslation(-ram.b[0], -ram.b[1], 0));
    parts[ram.barrel].matrix.multiply(_stretch);
  }
  aroundPin(parts[ram.rod].matrix, ram.a[0], ram.a[1], turn);
  aroundPin(parts[ram.rigid].matrix, px, py, a);
  for (const k in parts) parts[k].matrixWorldNeedsUpdate = true;
}

/* ── State ── */
let current = null;
let index = 0;
const boom = { cur: 0, target: 0, def: BOOM };
let needsRender = true;
function invalidate() { needsRender = true; }

/* ── UI ── */
function fmt(def, v) {
  const r = Math.round(v);
  if (def.pitch) return r === 0 ? '0°' : `${Math.abs(r)}° ${r < 0 ? 'up' : 'down'}`;
  return `${r}°`;
}
function makeControl(def, get, set) {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const id = `c-${def.key}`;
  // `flip` runs the slider the other way, so 0° up can sit on the left
  const sign = def.flip ? -1 : 1;
  const lo = Math.min(def.min * sign, def.max * sign), hi = Math.max(def.min * sign, def.max * sign);
  wrap.innerHTML = `<div class="row"><label for="${id}">${def.label}</label><output for="${id}"></output></div>
    <input id="${id}" type="range" min="${lo}" max="${hi}" step="1" value="${get() * sign}">`;
  const input = wrap.querySelector('input'), out = wrap.querySelector('output');
  const paint = (v) => {
    input.value = Math.round(v * sign);
    input.style.setProperty('--pct', `${((v * sign - lo) / (hi - lo)) * 100}%`);
    out.textContent = fmt(def, v);
    input.setAttribute('aria-valuetext', fmt(def, v));
  };
  input.addEventListener('input', () => { stopDemo(); set(+input.value * sign); paint(+input.value * sign); showArc(def.key); });
  paint(get());
  return { el: wrap, paint, def };
}
const list = $('list');
ATTACHMENTS.forEach((a, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'item';
  b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span>${a.name}</span>`;
  b.addEventListener('click', () => { stopDemo(); select(i); });
  list.appendChild(b);
});

let funcControls = [];
const boomCtl = makeControl(BOOM, () => boom.target, (v) => { boom.target = v; invalidate(); });
$('boomSlot').appendChild(boomCtl.el);

function renderFuncs() {
  const box = $('funcs');
  box.replaceChildren();
  funcControls = current.cfg.funcs.filter((def) => !def.hidden).map((def) => {
    const j = current.joints[def.key];
    const c = makeControl(def, () => j.target, (v) => { j.target = v; invalidate(); });
    box.appendChild(c.el);
    return c;
  });
}
function renderInfo(i) {
  const a = ATTACHMENTS[i];
  $('idx').textContent = String(i + 1).padStart(2, '0');
  $('name').textContent = a.name;
  $('spec').textContent = a.spec;
  $('desc').textContent = a.desc;
  [...list.children].forEach((el, n) => {
    if (n === i) { el.setAttribute('aria-current', 'true'); el.scrollIntoView?.({ block: 'nearest', inline: 'center' }); }
    else el.removeAttribute('aria-current');
  });
}

/* ── Arc feedback ── */
let arcOn = null, arcUntil = 0;
function showArc(key) {
  if (arcOn) arcOn.visible = false;
  arcOn = key === 'boom' ? boomArc : current?.joints[key]?.arc;
  if (arcOn) { arcOn.visible = true; arcUntil = performance.now() + 1400; }
  invalidate();
}

/* ── Selecting / loading ── */
async function loadAttachment(i) {
  const cfg = ATTACHMENTS[i];
  if (built.has(cfg.id)) return built.get(cfg.id);
  const p = gltf.loadAsync(`assets/${cfg.id}.glb`).then((glb) => buildAttachment(cfg, glb));
  built.set(cfg.id, p);
  p.catch(() => built.delete(cfg.id));
  return p;
}
let swap = null, token = 0;
async function select(i) {
  index = (i + ATTACHMENTS.length) % ATTACHMENTS.length;
  renderInfo(index);
  const mine = ++token;
  const loader = $('loader');
  $('loaderText').textContent = `Loading ${ATTACHMENTS[index].name}`;
  loader.classList.remove('done');
  let next;
  try {
    next = await loadAttachment(index);
  } catch (e) {
    console.error(e);
    $('loaderText').textContent = `Could not load ${ATTACHMENTS[index].name}`;
    return;
  }
  if (mine !== token) return;
  loader.classList.add('done');
  if (swap) { swap.t0 = -1e9; runSwap(performance.now()); }   // finish any swap still running
  const prev = current;
  if (prev === next) return;
  current = next;
  for (const k in next.joints) applyJoint(next.joints[k]);
  if (next.driven) updateDriven(next.driven);
  boomGroup.add(next.holder);
  updateRam();
  focusOn(next, !prev);
  renderFuncs();
  updateAttitude();
  if (reduced || !prev) {
    if (prev) boomGroup.remove(prev.holder);
    next.holder.position.copy(next.holder.userData.home);
    next.holder.scale.setScalar(1);
  } else {
    swap = { prev, next, t0: performance.now(), dur: 560 };
  }
  invalidate();
  scheduleWarm();
}
function applyJoint(j) { setJoint(j.group, j.pivot, j.axis, j.cur); }

function scheduleWarm() {
  const n = (index + 1) % ATTACHMENTS.length;
  (window.requestIdleCallback || setTimeout)(() => loadAttachment(n).catch(() => {}));
}

const OFF = new THREE.Vector3(-1.2, -0.9, 0);
function runSwap(now) {
  const { prev, next, t0, dur } = swap;
  const t = Math.min(1, (now - t0) / dur);
  const out = Math.min(1, t * 2), inn = Math.max(0, t * 2 - 1);
  const ease = (x) => x * x * (3 - 2 * x);
  prev.holder.position.copy(prev.holder.userData.home).addScaledVector(OFF, ease(out));
  prev.holder.visible = out < 1;
  next.holder.visible = inn > 0;
  next.holder.position.copy(next.holder.userData.home).addScaledVector(OFF, 1 - ease(inn));
  if (t >= 1) {
    boomGroup.remove(prev.holder);
    prev.holder.visible = true;
    prev.holder.position.copy(prev.holder.userData.home);
    next.holder.visible = true;
    next.holder.position.copy(next.holder.userData.home);
    swap = null;
  }
  needsRender = true;
}

/* ── Camera: centred on the attachment, keeping its angle as heads change ── */
const VIEW = new THREE.Vector3(-4.3, 3.6, 5.2);    // default offset from the attachment's centre
const focus = new THREE.Vector3(-6.2, 4.5, -0.6);
const _focusStep = new THREE.Vector3(), _focusNext = new THREE.Vector3();
let focusAnim = null, camAnim = null;
function frameHead() {
  // pull back on narrow stages so the 3 m truss stays in frame
  const pull = Math.max(1, 1 / (stage.clientWidth / stage.clientHeight));
  controls.target.copy(focus);
  camera.position.copy(focus).addScaledVector(VIEW, pull);
  controls.update();
  invalidate();
}
function moveFocus(to) {
  _focusStep.subVectors(to, focus);
  camera.position.add(_focusStep);
  controls.target.add(_focusStep);
  focus.copy(to);
  invalidate();
}
function focusOn(next, instant) {
  if (instant || reduced) { focusAnim = null; moveFocus(next.centre); return; }
  focusAnim = { from: focus.clone(), to: next.centre, t0: performance.now(), dur: 560 };
}

/* ── World View: rotates with the scene. Drag it to orbit, tap a side to view from there ── */
const POLE = 0.02;
const SIDES = [
  { key: 'F', label: 'Front', dir: [-1, 0, 0], main: true },
  { key: 'B', label: 'Back', dir: [1, 0, 0] },
  { key: 'T', label: 'Top', dir: [0, 1, 0] },
  { key: 'U', label: 'Underneath', dir: [0, -1, 0] },
  { key: 'L', label: 'Left', dir: [0, 0, 1] },
  { key: 'R', label: 'Right', dir: [0, 0, -1] },
];
const gizmo = $('gizmo');
const _off = new THREE.Vector3(), _sph = new THREE.Spherical(), _axis = new THREE.Vector3(), _invQ = new THREE.Quaternion();
const lines = gizmo.querySelector('svg');
for (const side of SIDES) {
  side.vec = new THREE.Vector3(...side.dir);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `gz${side.main ? ' main' : ''}`;
  b.textContent = side.key;
  b.setAttribute('aria-label', `${side.label} view`);
  b.title = side.label;
  b.addEventListener('click', () => { if (!gizmoDrag.moved) { stopDemo(); snapTo(side.vec); } });
  gizmo.appendChild(b);
  side.el = b;
  side.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  side.line.setAttribute('x1', 48);
  side.line.setAttribute('y1', 48);
  lines.appendChild(side.line);
}
function updateGizmo() {
  _invQ.copy(camera.quaternion).invert();
  for (const side of SIDES) {
    _axis.copy(side.vec).applyQuaternion(_invQ);
    const x = 48 + _axis.x * 34, y = 48 - _axis.y * 34;
    side.el.style.transform = `translate(${x - 13}px,${y - 13}px) scale(${0.78 + (_axis.z + 1) * 0.11})`;
    side.el.style.zIndex = Math.round((_axis.z + 1) * 10);
    side.el.style.opacity = 0.45 + (_axis.z + 1) * 0.275;
    side.line.setAttribute('x2', x);
    side.line.setAttribute('y2', y);
    side.line.style.opacity = _axis.z >= 0 ? 0.5 : 0.18;
  }
}
function setOrbit(theta, phi) {
  _off.subVectors(camera.position, controls.target);
  _sph.setFromVector3(_off);
  _sph.theta = theta;
  _sph.phi = THREE.MathUtils.clamp(phi, POLE, Math.PI - POLE);
  camera.position.copy(controls.target).add(_off.setFromSpherical(_sph));
  controls.update();
  invalidate();
}
function snapTo(vec) {
  _sph.setFromVector3(_off.subVectors(camera.position, controls.target));
  const from = { theta: _sph.theta, phi: _sph.phi };
  _sph.setFromVector3(_off.copy(vec));
  // straight up or down has no heading of its own, so keep the current one
  const theta = Math.abs(vec.y) / vec.length() > 0.9 ? from.theta : _sph.theta;
  const shortest = ((theta - from.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  camAnim = { from, dTheta: shortest, dPhi: THREE.MathUtils.clamp(_sph.phi, POLE, Math.PI - POLE) - from.phi, t0: performance.now(), dur: reduced ? 0 : 700 };
  invalidate();
}
const gizmoDrag = { on: false, moved: false, x: 0, y: 0 };
gizmo.addEventListener('pointerdown', (e) => {
  Object.assign(gizmoDrag, { on: true, moved: false, x: e.clientX, y: e.clientY });
  camAnim = null;
});
addEventListener('pointermove', (e) => {
  if (!gizmoDrag.on) return;
  const dx = e.clientX - gizmoDrag.x, dy = e.clientY - gizmoDrag.y;
  if (!gizmoDrag.moved && Math.hypot(dx, dy) < 4) return;
  gizmoDrag.moved = true;
  gizmoDrag.x = e.clientX;
  gizmoDrag.y = e.clientY;
  stopDemo();
  _sph.setFromVector3(_off.subVectors(camera.position, controls.target));
  setOrbit(_sph.theta - dx * 0.012, _sph.phi - dy * 0.012);
});
addEventListener('pointerup', () => { gizmoDrag.on = false; });
addEventListener('pointercancel', () => { gizmoDrag.on = false; });
controls.addEventListener('start', () => { camAnim = null; });
controls.addEventListener('change', () => { updateRims(); updateGizmo(); invalidate(); });

/* ── Demo ── */
const demoBtn = $('demo');
let demo = !reduced && !qs.has('nodemo');
function paintDemo() {
  demoBtn.setAttribute('aria-pressed', String(demo));
  demoBtn.textContent = demo ? 'Stop demo' : 'Run demo';
  demoBtn.className = `btn ${demo ? 'btn-ghost' : 'btn-primary'}`;
}
function stopDemo() { if (demo) { demo = false; paintDemo(); } }
demoBtn.addEventListener('click', () => {
  demo = !demo;
  if (demo) { demoT = 0; demoLast = performance.now(); }
  paintDemo();
});
let demoT = 0, demoLast = performance.now();
const STEP = 3.6;      // seconds per movement
function demoTick(now) {
  const dt = Math.min(0.1, (now - demoLast) / 1000);
  demoLast = now;
  if (!current || swap) return;
  demoT += dt;
  const defs = [...current.cfg.funcs.filter((d) => !d.hidden).map((d) => ({ d, j: current.joints[d.key] })), { d: BOOM, j: boom }];
  const sweep = demoT / STEP;
  const active = Math.floor(sweep);
  if (active >= defs.length + 1) {
    demoT = 0;
    defs.forEach(({ j }) => { j.target = 0; });
    select(index + 1);
    return;
  }
  if (active < defs.length) {
    const { d, j } = defs[active];
    const u = Math.sin((sweep - active) * Math.PI * 2);
    const hi = d.wrap ? 110 : d.max * 0.85, lo = d.wrap ? -110 : d.min * 0.85;
    // boom stays tilted for the combined pass; head movements return to centre
    if (d === BOOM) j.target = u >= 0 ? hi * u : lo * -u;
    else j.target = u >= 0 ? hi * u : lo * -u;
    if (active !== demoArc) { demoArc = active; showArc(d.key); }
  } else {
    // combined: everything moving together at once, which is the whole point of the boom tilt
    const u = (sweep - active) * Math.PI * 2;
    defs.forEach(({ d, j }, i) => {
      const hi = d.wrap ? 70 : d.max * 0.6, lo = d.wrap ? -70 : d.min * 0.6;
      const s = Math.sin(u + i * 0.9);
      j.target = s >= 0 ? hi * s : lo * -s;
    });
    demoArc = -1;
  }
  arcUntil = Math.max(arcUntil, active < defs.length ? now + 300 : 0);
  if (funcControls.length) {
    funcControls.forEach((c) => c.paint(current.joints[c.def.key].target));
    boomCtl.paint(boom.target);
  }
  needsRender = true;
}
let demoArc = -1;
paintDemo();

/* ── Controls ── */
$('prev').addEventListener('click', () => { stopDemo(); select(index - 1); });
$('next').addEventListener('click', () => { stopDemo(); select(index + 1); });
$('reset').addEventListener('click', () => {
  stopDemo();
  snapTo(VIEW);
  boom.target = 0;
  boomCtl.paint(0);
  if (current) {
    for (const k in current.joints) current.joints[k].target = 0;
    funcControls.forEach((c) => c.paint(0));
  }
  invalidate();
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === 'ArrowRight') { stopDemo(); select(index + 1); }
  if (e.key === 'ArrowLeft') { stopDemo(); select(index - 1); }
});
canvas.addEventListener('pointerdown', stopDemo);

/* ── Truss attitude readout ── */
const _wq = new THREE.Quaternion(), _long = new THREE.Vector3(), _fwd = new THREE.Vector3();
let attShown = '';
function updateAttitude() {
  if (!current) return;
  current.last.updateWorldMatrix(true, false);
  current.last.getWorldQuaternion(_wq);
  _long.set(0, 0, 1).applyQuaternion(_wq);
  _fwd.set(-1, 0, 0).applyQuaternion(_wq);
  const pitch = Math.asin(THREE.MathUtils.clamp(_fwd.y, -1, 1)) / DEG;
  const roll = Math.asin(THREE.MathUtils.clamp(_long.y, -1, 1)) / DEG;
  const heading = Math.atan2(_fwd.z, -_fwd.x) / DEG;
  const key = `${pitch.toFixed(0)}|${roll.toFixed(0)}|${heading.toFixed(0)}`;
  if (key === attShown) return;
  attShown = key;
  $('attPitch').textContent = `${Math.round(pitch)}°`;
  $('attRoll').textContent = `${Math.round(roll)}°`;
  $('attHead').textContent = `${Math.round(heading)}°`;
}

/* ── Loop ── */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // narrow screens need a wider lens to hold the 3 m truss
  camera.fov = camera.aspect < 1.1 ? 42 : 32;
  camera.updateProjectionMatrix();
  invalidate();
}
new ResizeObserver(resize).observe(stage);

function ease(j, k) {
  const d = j.target - j.cur;
  if (Math.abs(d) < 0.01) { if (j.cur !== j.target) { j.cur = j.target; return true; } return false; }
  j.cur += d * k;
  return true;
}
let lastFrame = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (demo) demoTick(now);
  const k = reduced ? 1 : 1 - Math.exp(-dt * 9);
  let moved = false;
  if (ease(boom, k)) { setJoint(boomGroup, HEAD, BOOM_AXIS, boom.cur); updateRam(); moved = true; }
  if (current) {
    for (const key in current.joints) {
      const j = current.joints[key];
      if (ease(j, k)) { applyJoint(j); moved = true; }
    }
    if (current.driven && moved) updateDriven(current.driven);
  }
  if (moved) { updateAttitude(); needsRender = true; }
  if (swap) runSwap(now);
  if (focusAnim) {
    const t = Math.min(1, (now - focusAnim.t0) / focusAnim.dur);
    moveFocus(_focusNext.lerpVectors(focusAnim.from, focusAnim.to, t * t * (3 - 2 * t)));
    if (t >= 1) focusAnim = null;
  }
  if (camAnim) {
    const t = camAnim.dur ? Math.min(1, (now - camAnim.t0) / camAnim.dur) : 1;
    const e = t * t * (3 - 2 * t);
    setOrbit(camAnim.from.theta + camAnim.dTheta * e, camAnim.from.phi + camAnim.dPhi * e);
    if (t >= 1) camAnim = null;
  }
  if (controls.update()) needsRender = true;
  if (arcOn) {
    const remain = arcUntil - now;
    const op = THREE.MathUtils.clamp(remain / 400, 0, 0.9);
    if (arcMat.opacity !== op) { arcMat.opacity = op; needsRender = true; }
    if (remain <= 0) { arcOn.visible = false; arcOn = null; }
  }
  if (needsRender) {
    needsRender = false;
    renderer.render(scene, camera);
  }
}

/* ── Boot ── */
async function boot() {
  try {
    const [tele, man] = await Promise.all([
      fetch('assets/telehandler.json').then((r) => r.json()),
      fetch('assets/attachments.json').then((r) => r.json()),
    ]);
    manifest = man;
    BAKED.fromArray(tele.head);
    HEAD.set(PIN[0], PIN[1], BOOM_Z);
    const glb = await gltf.loadAsync('assets/telehandler.glb');
    ghost(glb.scene);
    scene.add(glb.scene);
    buildNose();
    boomArc = makeArc(HEAD, BOOM_AXIS, 1.6, BOOM);
    scene.add(boomArc);
    setJoint(boomGroup, HEAD, BOOM_AXIS, 0);
    frameHead();
    updateGizmo();
    key.target.position.copy(HEAD);
    key.position.copy(HEAD).add(new THREE.Vector3(-8, 14, 12));
    updateRims();
    resize();
    const start = Math.max(0, ATTACHMENTS.findIndex((a) => a.id === qs.get('a')));
    await select(start);
    updateAttitude();
    invalidate();
  } catch (e) {
    console.error(e);
    $('loaderText').textContent = 'Could not load the 3D model.';
  }
}
requestAnimationFrame(frame);
boot();

/* for embedding and testing */
window.aaaViewer = {
  ATTACHMENTS,
  select: (i) => select(i),
  stopDemo,
  setBoom: (v) => { boom.target = v; boom.cur = v; setJoint(boomGroup, HEAD, BOOM_AXIS, v); updateRam(); boomCtl.paint(v); updateAttitude(); invalidate(); },
  setFunc: (key, v) => {
    const j = current.joints[key];
    j.target = v; j.cur = v; applyJoint(j);
    if (current.driven) updateDriven(current.driven);
    funcControls.forEach((c) => { if (c.def.key === key) c.paint(v); });
    updateAttitude();
    invalidate();
  },
  setMount: (x, y, z) => { current.holder.position.set(x, y, z); current.holder.userData.home.copy(current.holder.position); invalidate(); },
  camera, controls, scene, boomGroup, nose,
  current: () => current,
};
