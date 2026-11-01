import * as THREE from 'three';
import { mergeGeometries } from './vendor/utils/BufferGeometryUtils.js';

/* The boom end, modelled from the Manitou, Merlo and Romastor reference photos.
   Side-on coordinates are x, y in the viewer's world; the width runs along z,
   centred on the boom. `fixed` stays with the boom. `carriage` is pinned at the
   arm's foot and swings with the tilt, carrying the head. */
export const PIN = [-5.85, 4.62];

const WIDTH = 0.28;                                  // of the box section, narrower than the boom it slides inside
const BOOM_ANGLE = Math.atan2(0.418, -0.908);        // from x towards the boom's outward direction

const OUTLINE = [
  [-4.753, 5.383], [-4.844, 5.425],   // top of the section, starting inside the boom
  [-5.568, 5.759], [-5.715, 5.686],   // chamfered elbow
  [-5.954, 4.656], [-5.775, 4.584],   // arm foot, either side of the pin
  [-5.566, 5.317],                    // inner corner
  [-5.011, 5.062], [-4.92, 5.02],     // underside, back inside the boom
];
const HOLES = [[-5.63, 5.53, 0.06, 0.085], [-5.715, 5.19, 0.05, 0.075]];   // access ovals: x, y, rx, ry
const EXTENSION_PLATE = [[-4.951, 5.43], [-5.515, 5.69], [-5.54, 5.42], [-5.448, 5.307], [-5.021, 5.111]];
const ARM_PLATE = [[-5.905, 4.74], [-5.76, 4.74], [-5.664, 5.08], [-5.826, 5.08]];
// the carriage outline relative to the pin
const CARRIAGE = [[-0.14, 0.08], [0.12, 0.1], [0.38, 0.03], [0.38, -0.08], [0.12, -0.16], [0.06, -0.34], [-0.08, -0.34], [-0.14, -0.1]];

const flat = (g) => (g.index ? g.toNonIndexed() : g);
const at = (g, x, y, z, rot = 0) => flat(g).applyMatrix4(new THREE.Matrix4().makeRotationZ(rot).setPosition(x, y, z));
const zCyl = (r, len, seg = 24) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);

function plate(points, depth, z, holes = [], bevel = 0) {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p)));
  for (const [x, y, rx, ry] of holes) {
    const h = new THREE.Path();
    h.absellipse(x, y, rx, ry, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const opts = bevel
    ? { depth: depth - bevel * 2, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 20 }
    : { depth, bevelEnabled: false, curveSegments: 20 };
  return flat(new THREE.ExtrudeGeometry(shape, opts).translate(0, 0, z - depth / 2 + bevel));
}
function hose(points, r = 0.014) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return flat(new THREE.TubeGeometry(curve, 28, r, 8));
}
// a row of bolt heads on both side faces, from a to b
function bolts(out, z, a, b, n) {
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    for (const side of [-1, 1]) out.push(at(zCyl(0.016, 0.02, 10), x, y, z + side * (WIDTH / 2 + 0.018)));
  }
}

export function buildBoomEnd(z) {
  const [px, py] = PIN;
  const fixed = [];

  // the box section: straight extension, chamfered elbow, drop arm
  fixed.push(plate(OUTLINE, WIDTH, z, HOLES, 0.012));

  // raised side plates, bolted on
  for (const side of [-1, 1]) {
    fixed.push(plate(EXTENSION_PLATE, 0.012, z + side * (WIDTH / 2 + 0.006)));
    fixed.push(plate(ARM_PLATE, 0.012, z + side * (WIDTH / 2 + 0.006)));
  }
  bolts(fixed, z, [-5.009, 5.424], [-5.509, 5.654], 6);
  bolts(fixed, z, [-5.055, 5.159], [-5.363, 5.301], 4);
  bolts(fixed, z, [-5.885, 4.77], [-5.815, 5.05], 4);
  bolts(fixed, z, [-5.775, 4.77], [-5.68, 5.05], 4);

  // telescopic stage collars around the boom
  fixed.push(at(new THREE.BoxGeometry(0.09, 0.6, 0.6), -4.911, 5.28, z, BOOM_ANGLE));
  fixed.push(at(new THREE.BoxGeometry(0.06, 0.58, 0.58), -4.339, 5.016, z, BOOM_ANGLE));
  for (const side of [-1, 1]) {
    fixed.push(at(new THREE.BoxGeometry(0.22, 0.12, 0.02), -4.62, 5.15, z + side * 0.27, BOOM_ANGLE));   // wear pad
  }

  // work lamp on the elbow chamfer
  const chamfer = Math.atan2(5.759 - 5.686, -5.568 + 5.715);
  fixed.push(at(new THREE.BoxGeometry(0.15, 0.05, 0.2), -5.655, 5.75, z, chamfer));
  fixed.push(at(new THREE.BoxGeometry(0.11, 0.02, 0.15), -5.67, 5.779, z, chamfer));

  // hose carrier arching over the elbow
  fixed.push(hose([[-5.25, 5.65, z - 0.05], [-5.45, 5.82, z - 0.05], [-5.72, 5.87, z - 0.05], [-5.86, 5.63, z - 0.05], [-5.87, 5.35, z - 0.05]], 0.024));

  // coupler block on the arm with its hoses, on the viewer's side
  const fz = z + WIDTH / 2 + 0.03;
  const inner = z + WIDTH / 2 - 0.05;
  fixed.push(at(new THREE.BoxGeometry(0.18, 0.05, 0.03), -5.77, 4.99, fz, 0.2));
  for (const dx of [-0.06, -0.02, 0.02, 0.06]) fixed.push(at(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 10), -5.77 + dx, 4.945 + dx * 0.2, fz));
  fixed.push(hose([[-5.8, 5.02, fz], [-5.81, 5.11, fz + 0.03], [-5.75, 5.2, fz], [-5.72, 5.19, inner]]));
  fixed.push(hose([[-5.74, 5.03, fz], [-5.72, 5.1, fz + 0.03], [-5.69, 5.17, fz], [-5.71, 5.19, inner]]));

  // the pin's boss at the arm foot, and the pin itself
  fixed.push(at(zCyl(0.1, WIDTH, 32), px, py, z));
  fixed.push(at(zCyl(0.045, 0.68), px, py, z));

  // the carriage: two cheeks outside the arm, tied by plates and cross pins
  const points = CARRIAGE.map(([x, y]) => [px + x, py + y]);
  const carriage = [];
  for (const side of [-1, 1]) {
    const cheek = WIDTH / 2 + 0.03;
    carriage.push(plate(points, 0.03, z + side * cheek, [], 0.004));
    carriage.push(at(zCyl(0.13, 0.03, 32), px, py, z + side * (cheek + 0.03)));    // bush
    carriage.push(at(zCyl(0.07, 0.016, 24), px, py, z + side * (cheek + 0.053)));  // retaining cap
    carriage.push(at(zCyl(0.03, 0.016, 16), px + 0.3, py - 0.02, z + side * (cheek + 0.025)));
  }
  carriage.push(at(new THREE.BoxGeometry(0.05, 0.17, WIDTH + 0.06), px - 0.125, py - 0.01, z, -0.1));      // front plate
  carriage.push(at(new THREE.BoxGeometry(0.2, 0.06, WIDTH + 0.06), px + 0.22, py - 0.09, z, 0.2));         // rear tie
  carriage.push(at(zCyl(0.03, 0.6), px, py - 0.3, z));                                             // lock pin
  carriage.push(at(zCyl(0.035, WIDTH + 0.1), px + 0.3, py - 0.02, z));                                     // ram lug pin

  return {
    fixed: mergeGeometries(fixed),
    carriage: mergeGeometries(carriage),
    // ram: anchored inside the box, rod drives the carriage's rear lug
    ear: new THREE.Vector2(0.3, -0.02),
    anchor: new THREE.Vector3(px + 0.42, py + 0.75, z),
  };
}
