import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from "three"

// Lego, mon Jack Russell : blanc, taches feu sur la tête et le dos, collier rouge avec sa médaille.
// Il dort roulé en boule dans son panier. En mètres, l'origine au sol au centre du panier, la tête vers +x.

const COLORS = { white: "#f4f0e6", tan: "#b8733a", dark: "#1a1412", collar: "#c0392b", gold: "#ffd36a", basket: "#8a5a2b", cushion: "#2e3a7a" }

function ball(material, [x, y, z], [sx, sy, sz], r = 1) {
  const mesh = new Mesh(new SphereGeometry(r, 16, 12), material)
  mesh.position.set(x, y, z)
  mesh.scale.set(sx, sy, sz)
  return mesh
}

export function makeDog() {
  const m = Object.fromEntries(Object.entries(COLORS).map(([k, color]) => [k, new MeshStandardMaterial({ color, roughness: k === "gold" ? 0.3 : 0.85, metalness: k === "gold" ? 0.8 : 0 })]))
  const root = new Group()

  // Le panier en osier et son coussin
  const basket = new Mesh(new TorusGeometry(0.27, 0.06, 10, 28), m.basket)
  basket.rotation.x = Math.PI / 2
  basket.position.y = 0.06
  root.add(basket)
  const cushion = new Mesh(new CylinderGeometry(0.26, 0.26, 0.05, 28), m.cushion)
  cushion.position.y = 0.03
  root.add(cushion)

  const dog = new Group()
  dog.position.y = 0.04
  root.add(dog)

  // Corps roulé, avec la grande tache feu sur le dos
  const body = ball(m.white, [0, 0.11, 0], [0.2, 0.1, 0.14])
  dog.add(body)
  dog.add(ball(m.tan, [-0.06, 0.16, -0.02], [0.09, 0.05, 0.08]))
  // Pattes avant allongées devant le museau
  for (const side of [-1, 1]) dog.add(ball(m.white, [0.17, 0.035, side * 0.035 + 0.03], [0.07, 0.025, 0.025]))

  // Tête : blanche, oreilles et masque feu, museau allongé, truffe noire
  const head = new Group()
  head.position.set(0.15, 0.08, 0.05)
  dog.add(head)
  head.add(ball(m.white, [0, 0, 0], [0.065, 0.058, 0.06]))
  head.add(ball(m.tan, [-0.012, 0.018, 0], [0.058, 0.045, 0.062])) // masque feu sur le haut de la tête
  head.add(ball(m.white, [0.055, -0.018, 0], [0.045, 0.028, 0.032])) // museau
  head.add(ball(m.dark, [0.098, -0.012, 0], [0.012, 0.01, 0.013])) // truffe
  const eyes = []
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(0.026, 0.05, 3), m.tan)
    ear.position.set(0.01, 0.035, side * 0.048)
    ear.rotation.set(side * 0.9, 0, -2.4) // oreilles repliées vers l'avant
    head.add(ear)
    const eye = ball(m.dark, [0.045, 0.012, side * 0.03], [0.009, 0.002, 0.009]) // fermés : une fente
    head.add(eye)
    eyes.push(eye)
  }
  // Collier rouge et sa médaille dorée
  const collar = new Mesh(new TorusGeometry(0.05, 0.009, 6, 18), m.collar)
  collar.position.set(-0.03, -0.02, 0)
  collar.rotation.y = Math.PI / 2
  head.add(collar)
  head.add(ball(m.gold, [-0.005, -0.065, 0], [0.012, 0.012, 0.004]))

  // Queue courte, blanche au bout feu, qui remue
  const tail = new Group()
  tail.position.set(-0.19, 0.13, -0.03)
  dog.add(tail)
  const stub = new Mesh(new CylinderGeometry(0.012, 0.02, 0.09, 8), m.white)
  stub.position.y = 0.045
  tail.add(stub)

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true
  })
  return { root, dog, body, head, eyes, tail }
}

// Respiration et queue qui bat doucement ; `awake` (0 à 1) relève la tête, ouvre les yeux et fait remuer la queue
export function animateDog(lego, time, awake) {
  lego.body.scale.y = 0.1 * (1 + Math.sin(time * 1.6) * 0.05 * (1 - awake))
  lego.head.position.y = 0.08 + awake * 0.08
  lego.head.rotation.z = awake * 0.3
  lego.head.rotation.y = awake * Math.sin(time * 0.9) * 0.35
  for (const eye of lego.eyes) eye.scale.y = 0.002 + awake * 0.008
  lego.tail.rotation.z = -0.9 + awake * 0.6
  lego.tail.rotation.x = Math.sin(time * (2 + awake * 16)) * (0.15 + awake * 0.5)
}
