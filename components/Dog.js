import { CapsuleGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape, SphereGeometry } from "three"

// Lego, mon Jack Russell : tout blanc, une seule tache feu autour de l'œil gauche.
// Il est couché dans son panier carré aux angles arrondis, tout vert, les pattes avant allongées. En mètres, l'origine au sol au centre du panier, la tête vers +x.

const COLORS = { white: "#f7f4ec", tan: "#c17a3a", dark: "#1a1412", pink: "#d98a8a", basket: "#4f8a3c", cushion: "#6fb35a" }

function ball(material, [x, y, z], [sx, sy, sz], r = 1) {
  const mesh = new Mesh(new SphereGeometry(r, 18, 14), material)
  mesh.position.set(x, y, z)
  mesh.scale.set(sx, sy, sz)
  return mesh
}

// Patte ou corps : une capsule couchée le long de x
function capsule(material, radius, length, [x, y, z]) {
  const mesh = new Mesh(new CapsuleGeometry(radius, length, 6, 12), material)
  mesh.rotation.z = Math.PI / 2
  mesh.position.set(x, y, z)
  return mesh
}

// Un carré de côté `size` aux coins arrondis de rayon `r`, centré
function roundedSquare(size, r) {
  const shape = new Shape()
  const h = size / 2
  shape.moveTo(-h + r, -h)
  shape.lineTo(h - r, -h)
  shape.quadraticCurveTo(h, -h, h, -h + r)
  shape.lineTo(h, h - r)
  shape.quadraticCurveTo(h, h, h - r, h)
  shape.lineTo(-h + r, h)
  shape.quadraticCurveTo(-h, h, -h, h - r)
  shape.lineTo(-h, -h + r)
  shape.quadraticCurveTo(-h, -h, -h + r, -h)
  return shape
}

// Une forme extrudée vers le haut, aux arêtes adoucies : posée au sol, de hauteur `height + 2 * bevel`
function flat(shape, height, bevel, material) {
  const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 4, curveSegments: 8 })
  const mesh = new Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = bevel
  return mesh
}

export function makeDog() {
  const m = Object.fromEntries(Object.entries(COLORS).map(([k, color]) => [k, new MeshStandardMaterial({ color, roughness: 0.85 })]))
  const root = new Group()

  // Le panier carré aux angles arrondis, tout vert : un rebord rembourré, le fond et un coussin bombé
  const S = 0.64, rim = 0.05
  const ring = roundedSquare(S, 0.13)
  ring.holes.push(roundedSquare(S - 2 * rim, 0.07))
  root.add(flat(ring, 0.035, 0.02, m.basket))
  root.add(flat(roundedSquare(S - rim, 0.1), 0.01, 0.01, m.basket))
  const cushion = flat(roundedSquare(S - 2 * rim, 0.07), 0.015, 0.02, m.cushion)
  cushion.position.y = 0.012
  root.add(cushion)

  const dog = new Group()
  dog.position.set(-0.06, 0.06, 0)
  root.add(dog)

  // Corps fin et allongé, poitrail un peu relevé
  const body = new Group()
  dog.add(body)
  const trunk = capsule(m.white, 0.06, 0.2, [-0.02, 0.07, 0])
  trunk.scale.set(1, 1, 0.95)
  body.add(trunk)
  body.add(ball(m.white, [0.09, 0.085, 0], [0.065, 0.07, 0.06])) // poitrail
  // Cuisses arrière repliées sur le côté
  for (const side of [-1, 1]) body.add(ball(m.white, [-0.1, 0.055, side * 0.05], [0.07, 0.05, 0.035]))
  // Pattes avant allongées devant lui, pattes arrière ramenées sous le ventre
  for (const side of [-1, 1]) {
    dog.add(capsule(m.white, 0.018, 0.12, [0.17, 0.018, side * 0.035]))
    dog.add(ball(m.white, [0.245, 0.016, side * 0.035], [0.024, 0.016, 0.02]))
    dog.add(capsule(m.white, 0.017, 0.07, [-0.05, 0.016, side * 0.065]))
  }

  // Tête : blanche, la tache feu autour de l'œil gauche, museau allongé, truffe noire
  const head = new Group()
  head.position.set(0.16, 0.16, 0)
  dog.add(head)
  head.add(ball(m.white, [0, 0, 0], [0.055, 0.05, 0.05])) // crâne
  head.add(ball(m.white, [0.052, -0.016, 0], [0.042, 0.026, 0.03])) // museau
  head.add(ball(m.dark, [0.093, -0.01, 0], [0.011, 0.009, 0.012])) // truffe
  head.add(ball(m.tan, [0.02, 0.02, 0.028], [0.026, 0.024, 0.02])) // la tache, autour de l'œil (qui dépasse devant)
  const eyes = []
  for (const side of [-1, 1]) {
    // Oreilles blanches repliées vers l'avant
    const ear = new Mesh(new ConeGeometry(0.022, 0.045, 3), m.white)
    ear.position.set(0.006, 0.04, side * 0.04)
    ear.rotation.set(side * 0.9, 0, -2.4)
    head.add(ear)
    const eye = ball(m.dark, [0.044, 0.016, side * 0.036], [0.008, 0.008, 0.008])
    head.add(eye)
    eyes.push(eye)
  }
  const tongue = ball(m.pink, [0.062, -0.04, 0], [0.012, 0.004, 0.01])
  head.add(tongue)

  // Queue courte et droite, qui remue
  const tail = new Group()
  tail.position.set(-0.15, 0.09, 0)
  dog.add(tail)
  const stub = new Mesh(new CylinderGeometry(0.01, 0.017, 0.08, 8), m.white)
  stub.position.y = 0.04
  tail.add(stub)

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true
  })
  return { root, dog, body, head, eyes, tail, tongue }
}

// Endormi, la tête posée sur les pattes ; `awake` (0 à 1) relève la tête, ouvre les yeux, sort la langue et fait remuer la queue.
// `look` (ou null) : quand on le survole, il regarde le visiteur ; `yaw` et `pitch` en radians, `amount` de 0 à 1.
// Il penche alors la tête sur le côté, comme un chien curieux.
export function animateDog(lego, time, awake, look = null) {
  lego.body.scale.y = 1 + Math.sin(time * 1.6) * 0.04 * (1 - awake)
  lego.head.position.set(0.16 + (1 - awake) * 0.04, 0.075 + awake * 0.085, 0)
  const seen = look?.amount ?? 0
  const wander = awake * Math.sin(time * 0.9) * 0.35
  lego.head.rotation.z = (1 - awake) * -0.15 + awake * 0.15 + seen * (look?.pitch ?? 0)
  lego.head.rotation.y = wander + seen * ((look?.yaw ?? 0) - wander)
  lego.head.rotation.x = seen * (0.35 + Math.sin(time * 1.3) * 0.08)
  for (const eye of lego.eyes) eye.scale.y = 0.0015 + awake * 0.0065
  lego.tongue.visible = awake > 0.5
  lego.tail.rotation.z = -1.1 + awake * 0.7
  lego.tail.rotation.x = Math.sin(time * (2 + awake * 16)) * (0.12 + awake * 0.5)
}
