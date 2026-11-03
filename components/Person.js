import { CapsuleGeometry, BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three"

// Moi, assis au bureau : un personnage simple fait de formes de base, en mètres,
// l'origine au sol sous les hanches et le regard vers +z.
// Cheveux bruns courts, blazer bleu marine, chemise blanche, pantalon gris, chaussures marron.

const COLORS = {
  skin: "#e0ac87",
  hair: "#3b2417",
  blazer: "#1f2a48",
  shirt: "#f1efe9",
  trousers: "#3a3c46",
  shoes: "#4a2c1c",
  eyes: "#1a1412",
}

const UP = new Vector3(0, 1, 0)

// Cylindre tendu entre deux points
function limb(from, to, radius, material) {
  const dir = to.clone().sub(from)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, dir.length(), 10), material)
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  return mesh
}

export function makePerson() {
  // Matériaux propres à chaque personnage : son opacité varie quand il apparaît dans une pièce
  const m = Object.fromEntries(
    Object.entries(COLORS).map(([k, color]) => [k, new MeshStandardMaterial({ color, roughness: k === "shoes" ? 0.5 : 0.8, transparent: true })]),
  )
  const root = new Group()

  // Jambes : cuisses à plat sur l'assise, tibias vers le sol
  for (const side of [-1, 1]) {
    const hip = new Vector3(side * 0.09, 0.5, 0.02)
    const knee = new Vector3(side * 0.1, 0.5, 0.44)
    const ankle = new Vector3(side * 0.1, 0.07, 0.48)
    root.add(limb(hip, knee, 0.075, m.trousers), limb(knee, ankle, 0.058, m.trousers))
    const shoe = new Mesh(new BoxGeometry(0.1, 0.07, 0.24), m.shoes)
    shoe.position.set(side * 0.1, 0.035, 0.54)
    root.add(shoe)
  }

  // Buste, un peu penché vers l'écran
  const torso = new Group()
  torso.position.set(0, 0.5, 0)
  torso.rotation.x = 0.12
  root.add(torso)
  const body = new Mesh(new CapsuleGeometry(0.16, 0.3, 4, 12), m.blazer)
  body.scale.set(1, 1, 0.65)
  body.position.y = 0.3
  torso.add(body)
  const collar = new Mesh(new BoxGeometry(0.1, 0.16, 0.02), m.shirt)
  collar.position.set(0, 0.5, 0.1)
  collar.rotation.x = -0.15
  torso.add(collar)
  torso.add(limb(new Vector3(0, 0.55, 0), new Vector3(0, 0.66, 0.01), 0.045, m.skin))

  // Tête : elle suit l'écran et tourne de temps en temps
  const head = new Group()
  head.position.set(0, 0.76, 0.02)
  torso.add(head)
  const skull = new Mesh(new SphereGeometry(0.1, 20, 16), m.skin)
  skull.scale.set(0.92, 1.1, 1)
  head.add(skull)
  // Coupe courte classique : une calotte qui couvre le dessus et l'arrière, front dégagé
  const hair = new Mesh(new SphereGeometry(0.106, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), m.hair)
  hair.scale.set(0.95, 1.1, 1.04)
  hair.position.set(0, 0.012, -0.006)
  hair.rotation.x = -0.38
  head.add(hair)
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.011, 8, 6), m.eyes)
    eye.position.set(side * 0.034, 0.012, 0.094)
    head.add(eye)
  }

  // Bras : l'épaule, puis l'avant-bras qui tape au clavier
  const forearms = []
  for (const side of [-1, 1]) {
    const shoulder = new Vector3(side * 0.2, 0.47, 0)
    const elbow = new Vector3(side * 0.22, 0.26, 0.14)
    torso.add(limb(shoulder, elbow, 0.05, m.blazer))
    const forearm = new Group()
    forearm.position.copy(elbow)
    torso.add(forearm)
    const wrist = new Vector3(-side * 0.07, 0.02, 0.27)
    forearm.add(limb(new Vector3(), wrist, 0.042, m.blazer))
    const hand = new Mesh(new SphereGeometry(0.04, 10, 8), m.skin)
    hand.scale.set(1, 0.6, 1.3)
    hand.position.copy(wrist).add(new Vector3(0, 0, 0.04))
    forearm.add(hand)
    forearms.push(forearm)
  }

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true
  })

  return { root, parts: { torso, head, forearms }, materials: Object.values(m) }
}

// Petits gestes en boucle : respiration, frappe au clavier, regard qui se promène
export function animatePerson({ parts }, time, phase) {
  const t = time + phase
  parts.torso.rotation.x = 0.12 + Math.sin(t * 1.4) * 0.012
  parts.forearms.forEach((f, i) => {
    f.rotation.x = Math.max(0, Math.sin(t * 7 + i * 2.1)) * -0.07
  })
  parts.head.rotation.y = Math.sin(t * 0.35) * 0.3 + Math.sin(t * 0.13) * 0.15
  parts.head.rotation.x = 0.08 + Math.sin(t * 0.27) * 0.06
}

export function setOpacity(person, opacity) {
  person.root.visible = opacity > 0.02
  for (const material of person.materials) material.opacity = opacity
}
