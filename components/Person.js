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

// Cheveux ondulés : une seule coque lisse autour du crâne, avec du volume sur le dessus,
// des ondulations douces et un bord irrégulier (frange sur le front, court au-dessus des oreilles, plus long à la nuque)
function hair(material) {
  const geometry = new SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.72)
  const pos = geometry.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const around = Math.atan2(v.x, v.z) // 0 : le front
    const front = Math.cos(around)
    // Limite des cheveux, en angle depuis le sommet du crâne
    const fringe = Math.exp(-(((around - 0.35) / 0.4) ** 2)) * 0.07 * Math.PI // mèche qui tombe sur le front
    const line = Math.PI * (0.5 - 0.13 * front) + fringe + Math.sin(around * 9) * 0.025 * Math.PI
    const polar = Math.min(Math.acos(clamp(v.y)), line)
    const wave = Math.sin(around * 7 + polar * 9) * 0.035 + Math.sin(around * 13 - polar * 5) * 0.015
    const r = 0.104 * (1 + wave + Math.cos(polar) * 0.14)
    pos.setXYZ(i, Math.sin(polar) * Math.sin(around) * r, Math.cos(polar) * r, Math.sin(polar) * Math.cos(around) * r)
  }
  geometry.computeVertexNormals()
  const mesh = new Mesh(geometry, material)
  mesh.scale.set(0.95, 1.1, 1.02) // suit la forme de la tête
  mesh.position.set(0, 0.006, -0.004)
  return mesh
}

const clamp = (x) => Math.max(-1, Math.min(1, x))

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

  // Bras : manche courte noire, puis le sous-pull blanc jusqu'au poignet.
  // L'épaule est un pivot (pour faire coucou), le coude aussi (pour taper au clavier).
  const arms = []
  for (const side of [-1, 1]) {
    const shoulder = new Group()
    shoulder.position.set(side * 0.2, 0.47, 0)
    torso.add(shoulder)
    const sleeveEnd = new Vector3(side * 0.01, -0.1, 0.06)
    const elbow = new Vector3(side * 0.02, -0.21, 0.14)
    shoulder.add(limb(new Vector3(), sleeveEnd, 0.062, m.tee), limb(sleeveEnd, elbow, 0.048, m.sleeves))
    const forearm = new Group()
    forearm.position.copy(elbow)
    shoulder.add(forearm)
    const wrist = new Vector3(-side * 0.07, 0.02, 0.27)
    forearm.add(limb(new Vector3(), wrist, 0.044, m.sleeves, 0.04))
    const hand = part(new SphereGeometry(0.04, 10, 8), m.skin, [wrist.x, wrist.y, wrist.z + 0.04], [1, 0.6, 1.3])
    forearm.add(hand)
    arms.push({ side, shoulder, forearm, hand })
  }

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true
  })

  // Position de la tête au repos, dans le repère du personnage : point de départ du regard
  const headRest = new Vector3(0, 0.5 + 0.77, 0.02 + 0.77 * Math.sin(0.12))
  // `reach` : inclinaison des avant-bras au repos, réglée pour que les mains se posent sur le clavier
  return { root, parts: { torso, head, arms, headRest, reach: 0 }, materials: Object.values(m) }
}

// Petits gestes en boucle : respiration, frappe au clavier, regard qui se promène
// De temps en temps, il se retourne vers le visiteur : quelques secondes toutes les 25 secondes
const GLANCE = { every: 25, start: 6, hold: 3, ease: 0.9 }
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const toCamera = new Vector3()

// Petits gestes en boucle : respiration, frappe au clavier, regard qui se promène, coup d'œil à la caméra.
// `attention` (survol) et `wave` (clic) vont de 0 à 1 : il regarde le visiteur, et lui fait coucou.
export function animatePerson({ root, parts }, time, phase, camera, { attention = 0, wave = 0 } = {}) {
  const t = time + phase
  const c = time % GLANCE.every
  const cycle = smooth(GLANCE.start, GLANCE.start + GLANCE.ease, c) - smooth(GLANCE.start + GLANCE.hold, GLANCE.start + GLANCE.hold + GLANCE.ease, c)
  const glance = camera ? Math.max(cycle, attention, wave) : 0

  // Direction de la caméra vue depuis la tête, dans le repère du personnage
  let yaw = 0, pitch = 0
  if (glance > 0) {
    root.worldToLocal(toCamera.copy(camera)).sub(parts.headRest)
    yaw = Math.atan2(toCamera.x, toCamera.z)
    pitch = -Math.atan2(toCamera.y, Math.hypot(toCamera.x, toCamera.z))
  }
  // Le buste pivote un peu, la tête fait le reste (jusqu'à un tour d'épaule)
  const twist = Math.max(-0.5, Math.min(0.5, yaw * 0.3))
  const turn = Math.max(-1.4, Math.min(1.4, yaw - twist))

  parts.torso.rotation.x = 0.12 + Math.sin(t * 1.4) * 0.012
  parts.torso.rotation.y = twist * glance
  // Il fait coucou avec le bras du côté de la caméra
  const waving = yaw >= 0 ? 1 : -1
  parts.arms.forEach(({ side, shoulder, forearm }, i) => {
    const w = side === waving ? wave : 0
    forearm.rotation.x = parts.reach * (1 - w) + Math.max(0, Math.sin(t * 7 + i * 2.1)) * -0.07 * (1 - glance) - 1.3 * w
    shoulder.rotation.z = side * (2.2 + Math.sin(time * 9) * 0.25) * w
  })
  const idleYaw = Math.sin(t * 0.35) * 0.3 + Math.sin(t * 0.13) * 0.15
  const idlePitch = 0.08 + Math.sin(t * 0.27) * 0.06
  parts.head.rotation.y = idleYaw + (turn - idleYaw) * glance
  parts.head.rotation.x = idlePitch + (Math.max(-0.5, Math.min(0.3, pitch)) - idlePitch) * glance
}

export function setOpacity(person, opacity) {
  person.root.visible = opacity > 0.02
  for (const material of person.materials) material.opacity = opacity
}
