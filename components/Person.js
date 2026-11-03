import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three"

// Moi, assis au bureau, d'après mon Bitmoji : cheveux bruns ondulés, moustache et bouc,
// t-shirt noir imprimé sur un sous-pull blanc, jean large délavé, mocassins noirs.
// Fait de formes de base, en mètres, l'origine au sol sous les hanches et le regard vers +z.

const COLORS = {
  skin: "#f0c6a2",
  hair: "#33221a",
  tee: "#141416",
  print: "#a9dcea",
  sleeves: "#f3f2ee",
  jeans: "#35514f",
  shoes: "#0f0f10",
  white: "#ffffff",
  iris: "#3f6fb5",
  mouth: "#7a2e2a",
}

const UP = new Vector3(0, 1, 0)

// Cylindre tendu entre deux points (rayons différents aux deux bouts pour un jean évasé)
function limb(from, to, radiusFrom, material, radiusTo = radiusFrom) {
  const dir = to.clone().sub(from)
  const mesh = new Mesh(new CylinderGeometry(radiusTo, radiusFrom, dir.length(), 12), material)
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  return mesh
}

function part(geometry, material, [x, y, z], scale) {
  const mesh = new Mesh(geometry, material)
  mesh.position.set(x, y, z)
  if (scale) mesh.scale.set(...scale)
  return mesh
}

// Cheveux ondulés : une calotte collée au crâne, couverte de mèches rondes posées à sa surface.
// Le visage reste dégagé, sauf une frange qui tombe sur le haut du front.
function hair(material) {
  const group = new Group()
  const cap = new Mesh(new SphereGeometry(0.104, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), material)
  cap.scale.set(0.95, 1.12, 1.03)
  cap.position.set(0, 0.012, -0.004)
  cap.rotation.x = -0.25
  group.add(cap)
  const curl = new SphereGeometry(1, 10, 8)
  const surface = (polar, around, d) =>
    [Math.sin(polar) * Math.sin(around) * d * 0.95, Math.cos(polar) * d * 1.12 + 0.01, Math.sin(polar) * Math.cos(around) * d - 0.005]
  // Couronnes de mèches, de l'arrière vers le front ; pas de mèches sur le visage ni sur les oreilles
  for (const [polar, count, r] of [[0.15, 3, 0.04], [0.55, 9, 0.038], [0.95, 12, 0.036], [1.35, 10, 0.034]]) {
    for (let i = 0; i < count; i++) {
      const around = (i / count) * Math.PI * 2 + polar
      const front = Math.cos(around)
      if (polar > 0.9 && front > 0.35) continue // le front et les yeux
      if (polar > 1.2 && Math.abs(Math.sin(around)) > 0.8) continue // les oreilles
      group.add(part(curl, material, surface(polar, around, 0.1), [r, r * 0.8, r]))
    }
  }
  // Frange ondulée sur le haut du front
  for (const [x, y, r] of [[-0.045, 0.06, 0.03], [-0.012, 0.068, 0.032], [0.022, 0.064, 0.03], [0.052, 0.054, 0.026]]) {
    group.add(part(curl, material, [x, y, 0.082], [r, r * 0.7, r * 0.75]))
  }
  return group
}

function face(m) {
  const group = new Group()
  for (const side of [-1, 1]) {
    // Yeux : blanc, iris bleu
    group.add(part(new SphereGeometry(0.016, 10, 8), m.white, [side * 0.036, 0.016, 0.088], [1.2, 0.9, 0.6]))
    group.add(part(new SphereGeometry(0.009, 8, 6), m.iris, [side * 0.036, 0.015, 0.097]))
    // Sourcils épais
    const brow = part(new BoxGeometry(0.038, 0.009, 0.01), m.hair, [side * 0.037, 0.043, 0.094])
    brow.rotation.z = side * -0.12
    group.add(brow)
    // Oreilles
    group.add(part(new SphereGeometry(0.022, 8, 6), m.skin, [side * 0.094, 0.0, 0.0], [0.5, 1, 0.8]))
  }
  group.add(part(new SphereGeometry(0.014, 8, 6), m.skin, [0, -0.008, 0.103], [1, 1, 1.2])) // nez
  // Grand sourire : un arc de dents blanches
  const smile = new Mesh(new TorusGeometry(0.022, 0.007, 6, 14, Math.PI), m.white)
  smile.position.set(0, -0.04, 0.088)
  smile.rotation.z = Math.PI
  smile.scale.set(1, 0.7, 0.6)
  group.add(smile)
  // Moustache fine et bouc pointu, collés au visage
  for (const side of [-1, 1]) {
    const tache = part(new BoxGeometry(0.03, 0.007, 0.008), m.hair, [side * 0.016, -0.03, 0.094])
    tache.rotation.z = side * 0.25
    group.add(tache)
  }
  const goatee = new Mesh(new ConeGeometry(0.02, 0.045, 8), m.hair)
  goatee.position.set(0, -0.098, 0.066)
  goatee.rotation.x = Math.PI + 0.25
  group.add(goatee)
  group.add(part(new SphereGeometry(0.022, 10, 8), m.hair, [0, -0.08, 0.075], [1, 0.8, 0.6]))
  return group
}

export function makePerson() {
  // Matériaux propres à chaque personnage : son opacité varie quand il apparaît dans une pièce
  const m = Object.fromEntries(
    Object.entries(COLORS).map(([k, color]) => [k, new MeshStandardMaterial({ color, roughness: k === "shoes" ? 0.4 : 0.8, transparent: true })]),
  )
  const root = new Group()

  // Jambes : jean large, un peu évasé, et mocassins
  for (const side of [-1, 1]) {
    const hip = new Vector3(side * 0.095, 0.5, 0.02)
    const knee = new Vector3(side * 0.11, 0.5, 0.44)
    const ankle = new Vector3(side * 0.115, 0.06, 0.5)
    root.add(limb(hip, knee, 0.088, m.jeans, 0.082), limb(knee, ankle, 0.075, m.jeans, 0.085))
    root.add(part(new BoxGeometry(0.1, 0.06, 0.24), m.shoes, [side * 0.115, 0.03, 0.55]))
    root.add(part(new SphereGeometry(0.05, 10, 8), m.shoes, [side * 0.115, 0.035, 0.66], [1, 0.6, 1]))
  }

  // Buste, un peu penché vers l'écran : t-shirt noir avec son imprimé
  const torso = new Group()
  torso.position.set(0, 0.5, 0)
  torso.rotation.x = 0.12
  root.add(torso)
  torso.add(part(new CapsuleGeometry(0.16, 0.3, 4, 12), m.tee, [0, 0.3, 0], [1, 1, 0.65]))
  torso.add(part(new BoxGeometry(0.15, 0.04, 0.01), m.print, [0, 0.38, 0.105]))
  torso.add(part(new BoxGeometry(0.11, 0.008, 0.01), m.print, [0, 0.35, 0.105]))
  torso.add(limb(new Vector3(0, 0.54, 0), new Vector3(0, 0.66, 0.01), 0.045, m.skin))

  // Tête, un peu grosse comme sur un Bitmoji : elle suit l'écran et tourne de temps en temps
  const head = new Group()
  head.position.set(0, 0.77, 0.02)
  head.scale.setScalar(1.12)
  torso.add(head)
  head.add(part(new SphereGeometry(0.1, 20, 16), m.skin, [0, 0, 0], [0.92, 1.1, 1]))
  head.add(hair(m.hair), face(m))

  // Bras : manche courte noire, puis le sous-pull blanc jusqu'au poignet
  const forearms = []
  for (const side of [-1, 1]) {
    const shoulder = new Vector3(side * 0.2, 0.47, 0)
    const sleeveEnd = new Vector3(side * 0.21, 0.37, 0.06)
    const elbow = new Vector3(side * 0.22, 0.26, 0.14)
    torso.add(limb(shoulder, sleeveEnd, 0.062, m.tee), limb(sleeveEnd, elbow, 0.048, m.sleeves))
    const forearm = new Group()
    forearm.position.copy(elbow)
    torso.add(forearm)
    const wrist = new Vector3(-side * 0.07, 0.02, 0.27)
    forearm.add(limb(new Vector3(), wrist, 0.044, m.sleeves, 0.04))
    forearm.add(part(new SphereGeometry(0.04, 10, 8), m.skin, [wrist.x, wrist.y, wrist.z + 0.04], [1, 0.6, 1.3]))
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
