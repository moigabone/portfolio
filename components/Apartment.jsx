"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Html, useGLTF, useScroll } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  MathUtils,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Sphere,
  Vector3,
} from "three"
import { SECTIONS, NB_SECTIONS } from "./Sections"
import { animatePerson, makePerson, setOpacity } from "./Person"
import { animateDog, makeDog } from "./Dog"
import {
  BOOKS,
  bookTexture,
  cloudTexture,
  earthTexture,
  fourierTexture,
  makeBackpack,
  makeClock,
  makeEarth,
  makeGamingPC,
  makeGarland,
  makeHeadset,
  makeLavaLamp,
  makeMug,
  makeNotebook,
  makeSchoolPC,
  makeSwitch,
} from "./Decor"
import { drawScreens, installScreens, screenContents } from "./Screens"
import { scrollToSection } from "./Elevator"
import { DAYLIGHT_SPEED } from "./theme"

const MODEL_URL = "/models/appart.glb"
const MODEL_ROTATION = -Math.PI / 3

// Réglages de la caméra
const VIEW_DIRECTION = new Vector3(0, 0.35, 1).normalize() // vue de face, légèrement en plongée
const OVERVIEW_ZOOM = 0.75 // vue d'ensemble : l'immeuble entier est cadré
const ROOM_ZOOM = 0.68 // < 1 : la caméra se rapproche de chaque pièce
const SIDE_SHIFT = 0.28 // décalage de la pièce à l'opposé de la carte de texte (0 : centrée)
const MOBILE_ROOM_ZOOM = 0.8 // sur téléphone, la pièce n'a que le haut de l'écran : on la cadre en entier
const PARALLAX = 0.08 // amplitude du mouvement de caméra qui suit la souris
const ORBIT = { angle: 0.12, period: 40 } // la caméra va et vient autour de l'immeuble (radians, secondes par aller-retour)

// Mouvement des pièces au scroll, en rayons de pièce
const SPREAD = 0.3 // les étages s'écartent quand on entre dans une pièce
const PULL = 0.3 // la pièce visitée avance vers la caméra, les autres reculent
const FLOAT = 0.02 // chaque pièce flotte doucement

// Renforce les couleurs d'origine du modèle (1 = couleurs de Blender)
const SATURATION = 1.4

// Nuit : les écrans s'allument, une lampe chaude éclaire chaque pièce
const SCREEN_MATERIAL = "Material.004" // la dalle des écrans, dans les trois pièces
const ROOMS = ["chambre", "classe", "bureau"] // de bas en haut
const LAMP = { color: "#ffb46b", intensity: 6, reach: 1.7 } // reach : portée, en rayons de pièce

// Repérés dans le modèle : matériau et nombre de sommets de chaque objet
const POSTER = { room: "chambre", material: "Matériau.027", vertices: 12 } // devient une bannière brodée
const BEDSIDE_LAMP = { room: "chambre", material: "Matériau.027", vertices: 691 } // l'abat-jour s'allume
const PLANTS = { material: "Matériau.022", vertices: 560 } // les feuilles se balancent
const GLOBE = { material: "Matériau.008", vertices: 582 } // tourne, plus vite au survol
const ECRITEL_LOGO = { material: "unnamed", vertices: 4 } // l'affiche du bureau : un clic mène à l'alternance
const CHAIRS = {
  chambre: { material: "Matériau.041", vertices: 3311, scale: 1.2 }, // la chaise de la chambre est petite : on le grandit un peu
  classe: { material: "Matériau.015", vertices: 328 },
  bureau: { material: "Matériau.041", vertices: 3311 },
}
const DESK_HEIGHT = 0.75 // en mètres : sert à mettre le personnage à l'échelle de chaque pièce
// Les claviers, glissés sous les mains du personnage (la salle de classe a ses deux claviers dans un seul objet)
const KEYBOARDS = {
  chambre: { material: "", vertices: 14341 },
  classe: { material: "", vertices: 28682 },
  bureau: { material: "", vertices: 14341 },
}
const FOREARM = 0.31 // en mètres, du coude au creux de la main

// Lego, mon chien : son panier est avancé vers le visiteur depuis le centre de la chambre, la tête vers lui
const DOG = { forward: 0.9, scale: 1, facing: -Math.PI / 2.4, awakeSeconds: 4, phrase: "Wouf ! Moi, c'est Lego." }

// Décor ajouté, placé par rapport à la chaise de chaque pièce (en mètres) :
// `ahead` vers l'écran, `aside` sur le côté du personnage
const MUG = { ahead: 0.42, aside: 0.32 }
const SWITCH = { ahead: 0.5, aside: 0.8 }
const BACKPACK = { ahead: -0.05, aside: 0.5 }
const GARLAND = { above: 0.12, overhang: 0.15, sag: 0.12 } // au-dessus de la fenêtre de la chambre
const LAVA_LAMP = { ahead: 0.8, aside: -0.75 } // au bout du bureau de la chambre
const HEADSET = { ahead: 0.62, aside: 1.02 } // sur son support, entre le PC et l'écran
const NOTEBOOK = { ahead: 0.36, aside: 0.5, lift: 0.012, size: 0.7 } // entre les deux postes, au bord de la table ; format A5, posé sur le plateau (un peu au-dessus de l'estimation)
// Les tours du modèle, remplacées par des versions détaillées de la même taille
const TOWER = { material: "Matériau.041", vertices: 820 } // le PC de la chambre devient un PC gamer
const TOWER_GLASS = { material: "PC_Glass", vertices: 4 } // sa vitre d'origine
const SCHOOL_TOWERS = [
  { material: "Matériau.041", vertices: 822 },
  { material: "Matériau.041", vertices: 820 },
]
// Les six livres de l'étagère de la chambre, dans l'ordre de BOOKS
const SHELF_BOOKS = [
  { material: "Matériau.022", vertices: 284 },
  { material: "Matériau.018", vertices: 280 },
  { material: "Matériau.017", vertices: 284 },
  { material: "Material", vertices: 285 },
  { material: "Matériau.015", vertices: 285 },
  { material: "Matériau.021", vertices: 283 },
]
const BOARD_INSET = { width: 0.9, height: 0.84 } // part du tableau couverte par les formules (le cadre reste visible)
const WINDOW = { material: "Matériau.017", vertices: 1439 } // la fenêtre de la chambre
const WHITEBOARD = { material: "Matériau.047", vertices: 830 } // le tableau de la classe, sous lequel on accroche l'horloge

// Au survol, ces objets s'illuminent et une étiquette dit où ils mènent
const LABELS = { banner: "Mes sites ↗", ecritel: "Mon alternance ↓", dog: "Lego" }

// Interactions : ce que dit le personnage quand on clique sur lui, selon la pièce
const PHRASES = {
  chambre: "Le soir, je code mes propres projets : ce portfolio, le Codex, la Veille…",
  classe: "4e année à l'ESIEA, majeure cybersécurité. Diplôme en 2028 !",
  bureau: "Chez Ecritel, je construis des clusters de firewalls pour les clients.",
}
const BUBBLE_SECONDS = 4
const WAVE_SECONDS = 3
const PICK_DEPTH = 4 // objets les plus proches examinés sous la souris

// Arrivée : les pièces tombent du ciel l'une après l'autre (secondes, hauteur en rayons de pièce)
const INTRO = { delay: 0.9, stagger: 0.3, duration: 1.3, height: 2.5 }

const sphereOf = (object) => new Box3().setFromObject(object).getBoundingSphere(new Sphere())
const findMesh = (root, { material, vertices }) => {
  let found = null
  root.traverse((c) => {
    if (!found && c.isMesh && c.material.name === material && c.geometry.attributes.position.count === vertices) found = c
  })
  return found
}

function bannerTexture() {
  const w = 256, h = 346
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext("2d")
  // Tissu bleu nuit à queue d'aronde, bordé d'or
  const cloth = (inset) => {
    g.beginPath()
    g.moveTo(inset, 18 + inset)
    g.lineTo(w - inset, 18 + inset)
    g.lineTo(w - inset, h - inset)
    g.lineTo(w / 2, h - 60 + inset * 0.6)
    g.lineTo(inset, h - inset)
    g.closePath()
  }
  cloth(14)
  g.fillStyle = "#c9a35a"
  g.fill()
  cloth(22)
  g.fillStyle = "#1a1d6a"
  g.fill()
  // Tringle
  g.fillStyle = "#3a2416"
  g.fillRect(4, 8, w - 8, 14)
  // Épée dorée et deux étoiles
  g.fillStyle = "#ffd36a"
  g.fillRect(w / 2 - 5, 70, 10, 150)
  g.beginPath()
  g.moveTo(w / 2 - 5, 220)
  g.lineTo(w / 2 + 5, 220)
  g.lineTo(w / 2, 246)
  g.fill()
  g.fillRect(w / 2 - 34, 92, 68, 10)
  g.beginPath()
  g.arc(w / 2, 62, 10, 0, Math.PI * 2)
  g.fill()
  const star = (x, y, r) => {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      const d = i % 2 ? r * 0.45 : r
      g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    }
    g.fill()
  }
  star(70, 160, 14)
  star(w - 70, 160, 14)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// Remplace l'affiche par une bannière de la même taille, accrochée par le haut pour pouvoir onduler
function hangBanner(room) {
  const poster = findMesh(room, POSTER)
  if (!poster) return null
  poster.geometry.computeBoundingBox()
  const box = poster.geometry.boundingBox
  const size = box.getSize(new Vector3())
  const geometry = new PlaneGeometry(size.x, size.y)
  geometry.translate(0, -size.y / 2, 0)
  const banner = new Mesh(
    geometry,
    new MeshStandardMaterial({ map: bannerTexture(), transparent: true, alphaTest: 0.5, roughness: 0.85, side: DoubleSide }),
  )
  banner.position.set((box.min.x + box.max.x) / 2, box.max.y, box.max.z + 0.004).applyMatrix4(poster.matrix)
  banner.castShadow = true
  poster.parent.add(banner)
  poster.visible = false
  return banner
}

// Place un objet sur un pivot, au bas de sa boîte (plante qui se balance dans son pot)
// ou en son centre (globe qui tourne sur lui-même)
function pivotAt(mesh, where) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const pivot = new Object3D()
  const y = where === "base" ? box.min.y : (box.min.y + box.max.y) / 2
  pivot.position.set((box.min.x + box.max.x) / 2, y, (box.min.z + box.max.z) / 2).applyMatrix4(mesh.matrix)
  mesh.parent.add(pivot)
  pivot.updateMatrixWorld(true)
  pivot.attach(mesh)
  return pivot
}

// Points de toutes les dalles d'écran d'une pièce, dans le repère du monde
function screenPoints(room) {
  const points = []
  room.traverse((c) => {
    if (!c.isMesh || c.material.name !== SCREEN_MATERIAL) return
    const pos = c.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) points.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(c.matrixWorld))
  })
  return points
}

// Repères d'une pièce, pris sur sa chaise et l'écran le plus proche (dans le repère du monde) :
// le sol, le dessus du bureau, l'échelle (unités par mètre), la direction de l'écran et le côté
function measure(room, chairSpec) {
  const chair = findMesh(room, chairSpec)
  const screens = screenPoints(room)
  if (!chair || !screens.length) return null
  const seat = new Box3().setFromObject(chair)
  const center = seat.getCenter(new Vector3())
  const flat = (v) => new Vector3(v.x, 0, v.z)
  const nearest = screens.reduce((a, b) => (flat(a).distanceTo(flat(center)) < flat(b).distanceTo(flat(center)) ? a : b))
  const screen = screens.filter((p) => p.distanceTo(nearest) < 0.6)
  const screenCenter = screen.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(screen.length)
  // Le bas des écrans repose sur le bureau : de quoi en déduire l'échelle de la pièce
  const deskTop = Math.min(...screen.map((p) => p.y)) - 0.15
  const facing = flat(screenCenter).sub(flat(center)).normalize()
  return {
    center,
    floor: seat.min.y,
    deskTop,
    scale: (deskTop - seat.min.y) / DESK_HEIGHT,
    facing,
    side: new Vector3().crossVectors(WORLD_UP, facing),
    yaw: Math.atan2(facing.x, facing.z),
  }
}

// Pose un objet (fait en mètres) dans la pièce, à `ahead` / `aside` mètres de la chaise, à la hauteur `y`
function place(room, m, object, { ahead, aside }, y) {
  object.scale.setScalar(m.scale)
  object.position.copy(m.center).addScaledVector(m.facing, ahead * m.scale).addScaledVector(m.side, aside * m.scale)
  object.position.y = y
  object.rotation.y = m.yaw
  object.updateMatrixWorld(true)
  room.attach(object)
}

// Assoit le personnage sur la chaise de la pièce, tourné vers l'écran le plus proche
function seatPerson(room, m, bonus = 1) {
  const person = makePerson()
  const scale = m.scale * bonus
  person.root.scale.setScalar(scale)
  // Agrandi, il garde les hanches sur l'assise : ses pieds passent sous le tapis
  const sink = (scale - m.scale) * 0.5
  person.root.position.set(m.center.x, m.floor - sink, m.center.z).addScaledVector(m.facing, -0.06 * scale)
  person.root.rotation.y = m.yaw
  person.root.updateMatrixWorld(true)
  room.attach(person.root)
  return person
}

// Repère d'un objet plat accroché au mur (tableau, fenêtre) : son centre, la normale vers la pièce, sa largeur et sa hauteur
function wallFrame(mesh, roomCenter) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const size = box.getSize(new Vector3())
  const thin = ["x", "y", "z"].reduce((a, b) => (size[a] < size[b] ? a : b))
  const normal = new Vector3()
  normal[thin] = 1
  normal.transformDirection(mesh.matrixWorld)
  const center = box.getCenter(new Vector3()).applyMatrix4(mesh.matrixWorld)
  if (normal.dot(roomCenter.clone().sub(center)) < 0) normal.negate()
  const right = new Vector3().crossVectors(WORLD_UP, normal).normalize()
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) =>
    new Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).applyMatrix4(mesh.matrixWorld).sub(center),
  )
  const extent = (axis) => Math.max(...corners.map((c) => Math.abs(c.dot(axis)))) * 2
  return { center, normal, right, width: extent(right), height: extent(WORLD_UP), depth: extent(normal) }
}

// Glisse le clavier du poste sous les mains du personnage, puis incline ses avant-bras pour que les paumes touchent les touches
function fitKeyboard(room, m, person, spec) {
  const keyboard = findMesh(room, spec)
  if (!keyboard) return
  person.root.updateMatrixWorld(true)
  keyboard.updateMatrixWorld(true)
  const hands = person.parts.arms.map((arm) => arm.hand.getWorldPosition(new Vector3()))
  const palms = hands[0].clone().lerp(hands[1], 0.5)
  // L'objet contient le clavier et la souris (deux claviers en classe) : on range ses sommets proches des mains
  // par tranches de 2 cm sur le côté, et le plus gros bloc de tranches contiguës est le clavier
  const pos = keyboard.geometry.attributes.position
  const bins = new Map()
  for (let i = 0; i < pos.count; i++) {
    const v = new Vector3().fromBufferAttribute(pos, i).applyMatrix4(keyboard.matrixWorld)
    if (Math.hypot(v.x - palms.x, v.z - palms.z) > 0.6 * m.scale) continue
    const bin = Math.round(v.clone().sub(m.center).dot(m.side) / (0.02 * m.scale))
    if (!bins.has(bin)) bins.set(bin, [])
    bins.get(bin).push(v)
  }
  let keys = [], run = []
  for (const bin of [...bins.keys()].sort((p, q) => p - q)) {
    if (run.length && !bins.has(bin - 1)) run = []
    run = run.concat(bins.get(bin))
    if (run.length > keys.length) keys = run
  }
  if (!keys.length) return
  const center = new Box3().setFromPoints(keys).getCenter(new Vector3())
  const top = Math.max(...keys.map((v) => v.y))
  const shift = palms.clone().addScaledVector(m.facing, 0.05 * m.scale).sub(center).setY(0)
  keyboard.position.copy(keyboard.parent.worldToLocal(keyboard.getWorldPosition(new Vector3()).add(shift)))
  const scale = person.root.getWorldScale(new Vector3()).y
  const drop = (palms.y - 0.024 * scale - top) / scale
  person.parts.reach = Math.asin(MathUtils.clamp(drop / FOREARM, -0.5, 0.5))
}

// Emprise d'un objet du modèle dans le repère de la chaise (en mètres), pour le remplacer par un objet fait main
function footprint(mesh, m) {
  const pos = mesh.geometry.attributes.position
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    const at = [v.clone().sub(m.center).dot(m.facing), v.clone().sub(m.center).dot(m.side), v.y]
    at.forEach((x, k) => {
      lo[k] = Math.min(lo[k], x)
      hi[k] = Math.max(hi[k], x)
    })
  }
  return {
    spot: { ahead: (lo[0] + hi[0]) / 2 / m.scale, aside: (lo[1] + hi[1]) / 2 / m.scale },
    depth: (hi[0] - lo[0]) / m.scale,
    width: (hi[1] - lo[1]) / m.scale,
    height: (hi[2] - lo[2]) / m.scale,
    bottom: lo[2],
  }
}

// Colle une tranche illustrée sur la face d'un livre tournée vers la pièce
function dressBook(mesh, book, roomCenter) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3())
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
  const normals = new Matrix3().getNormalMatrix(mesh.matrixWorld)
  const world = axes.map((axis) => axis.clone().applyMatrix3(normals).normalize())
  const inward = roomCenter.clone().sub(center.clone().applyMatrix4(mesh.matrixWorld)).setY(0)
  const up = [0, 1, 2].reduce((p, q) => (Math.abs(world[p].y) > Math.abs(world[q].y) ? p : q))
  const [p, q] = [0, 1, 2].filter((k) => k !== up)
  const face = Math.abs(world[p].dot(inward)) > Math.abs(world[q].dot(inward)) ? p : q
  const across = face === p ? q : p
  const N = axes[face].clone().multiplyScalar(Math.sign(world[face].dot(inward)) || 1)
  const Y = axes[up].clone().multiplyScalar(Math.sign(world[up].y) || 1)
  const X = new Vector3().crossVectors(Y, N)
  const width = size.getComponent(across), height = size.getComponent(up)
  const spine = new Mesh(new PlaneGeometry(width * 0.96, height * 0.96), new MeshStandardMaterial({ map: bookTexture(book, width / height), roughness: 0.8 }))
  spine.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(X, Y, N))
  spine.position.copy(center).addScaledVector(N, size.getComponent(face) * 0.51)
  mesh.add(spine)
}

// Poussière dorée qui flotte dans la pièce
function makeDust(room, count = 36) {
  const box = new Box3().setFromObject(room)
  const size = box.getSize(new Vector3())
  const base = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    base[i * 3] = box.min.x + size.x * (0.15 + Math.random() * 0.7)
    base[i * 3 + 1] = box.min.y + size.y * (0.1 + Math.random() * 0.7)
    base[i * 3 + 2] = box.min.z + size.z * (0.15 + Math.random() * 0.7)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(base.slice(), 3))
  const dust = new Points(
    geometry,
    new PointsMaterial({ color: "#ffd36a", size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending }),
  )
  dust.raycast = () => {} // la poussière ne doit pas capter les clics
  room.attach(dust)
  // Positions de départ dans le repère de la pièce, autour desquelles chaque grain dérive
  dust.updateMatrixWorld(true)
  const inv = room.matrixWorld.clone().invert()
  const local = new Vector3()
  for (let i = 0; i < count; i++) {
    local.fromArray(base, i * 3).applyMatrix4(inv).toArray(base, i * 3)
  }
  dust.position.set(0, 0, 0)
  dust.rotation.set(0, 0, 0)
  dust.scale.set(1, 1, 1)
  geometry.attributes.position.array.set(base)
  return { points: dust, base, amplitude: 0.06 / room.getWorldScale(new Vector3()).x }
}

function animateDust({ points, base, amplitude }, time) {
  const pos = points.geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const k = i * 1.7
    pos.setXYZ(
      i,
      base[i * 3] + Math.sin(time * 0.3 + k) * amplitude,
      base[i * 3 + 1] + Math.sin(time * 0.22 + k * 1.3) * amplitude * 1.5,
      base[i * 3 + 2] + Math.cos(time * 0.27 + k) * amplitude,
    )
  }
  pos.needsUpdate = true
}

// Position et cible de la caméra pour cadrer une sphère, du côté opposé à la carte de texte
function frame(shot, sphere, camera, size, axes, out) {
  const isMobile = size.width < 768
  const aspect = size.width / size.height
  const vFov = MathUtils.degToRad(camera.fov)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  // La carte occupe la moitié de l'écran (à côté sur ordinateur, en dessous sur mobile)
  const fitFov = isMobile ? Math.min(vFov / 2, hFov) : Math.min(vFov, hFov / 2)
  const zoom = isMobile && shot.room >= 0 ? MOBILE_ROOM_ZOOM : shot.zoom
  const distance = (sphere.radius / Math.sin(fitFov / 2)) * zoom

  out.target.copy(sphere.center)
  if (isMobile) {
    out.target.addScaledVector(axes.up, -0.5 * distance * Math.tan(vFov / 2))
  } else {
    out.target.addScaledVector(axes.right, (shot.right ? SIDE_SHIFT : -SIDE_SHIFT) * distance * Math.tan(hFov / 2))
  }
  out.position.copy(out.target).addScaledVector(axes.view, distance)
  out.distance = distance
  return out
}

const makeView = () => ({ target: new Vector3(), position: new Vector3(), distance: 0 })
const WORLD_UP = new Vector3(0, 1, 0)
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3
const pulse = (dt, length) => MathUtils.smoothstep(dt, 0, 0.4) - MathUtils.smoothstep(dt, length - 0.6, length)

// L'objet cliquable touché : on remonte jusqu'au parent qui porte l'action
const actionOf = (object) => {
  for (let o = object; o; o = o.parent) if (o.userData.action) return o.userData.action
  return null
}

// `day` est une ref vers le thème choisi (voir Experience)
export default function Apartment({ reducedMotion = false, day }) {
  const scroll = useScroll()
  const { camera, size, pointer, clock, gl } = useThree()
  const { scene } = useGLTF(MODEL_URL)
  const [bubble, setBubble] = useState(null)
  const anchor = useRef()
  const state = useRef({
    a: makeView(),
    b: makeView(),
    lookAt: new Vector3(),
    parallax: { x: 0, y: 0 },
    axes: { view: new Vector3(), right: new Vector3(), up: new Vector3() },
    spheres: ROOMS.map(() => new Sphere()),
    overview: new Sphere(),
    offset: new Vector3(),
    scale: new Vector3(),
    introStart: null,
    daylight: day.current ? 1 : 0,
    hover: null,
    attention: ROOMS.map(() => 0),
    waves: ROOMS.map(() => -99),
    dogWake: -99,
    globeSpin: 0,
    glow: { banner: 0, ecritel: 0 },
    box: new Box3(),
  })
  const [label, setLabel] = useState(null)
  const labelAnchor = useRef()

  // Prépare le modèle une seule fois : centrage, ombres, couleurs, décor animé, personnage et Lego
  const world = useMemo(() => {
    // useGLTF garde la scène en cache : on ne la prépare qu'une fois, même si le composant remonte
    if (!scene.userData.world) {
      scene.rotation.set(0, MODEL_ROTATION, 0)
      scene.position.set(0, 0, 0)
      scene.updateMatrixWorld(true)
      scene.position.sub(new Box3().setFromObject(scene).getCenter(new Vector3()))
      scene.updateMatrixWorld(true)

      scene.traverse((child) => {
        if (!child.isMesh) return
        child.castShadow = true
        child.receiveShadow = true
        const material = child.material
        if (material.userData.graded) return
        const hsl = {}
        material.color.getHSL(hsl)
        material.color.setHSL(hsl.h, Math.min(1, hsl.s * SATURATION), hsl.l)
        material.userData.graded = true
      })

      const rooms = ROOMS.map((name) => {
        const object = scene.getObjectByName(name)
        const sphere = sphereOf(object)
        const lamp = new PointLight(LAMP.color, LAMP.intensity, sphere.radius * LAMP.reach, 2)
        lamp.position.copy(sphere.center).add(new Vector3(0, sphere.radius * 0.1, sphere.radius * 0.15))
        object.attach(lamp)
        return { name, object, sphere, lamp, base: object.position.clone(), dust: makeDust(object) }
      })
      const [chambre, classe, bureau] = rooms.map((r) => r.object)

      // Les repères et le personnage d'abord : ils se calent sur les écrans, qui changent de matériau juste après
      const measures = rooms.map((r) => measure(r.object, CHAIRS[r.name]))
      const people = rooms.map((r, k) => {
        if (!measures[k]) return null
        const person = seatPerson(r.object, measures[k], CHAIRS[r.name].scale)
        person.root.userData.action = { type: "person", room: k }
        fitKeyboard(r.object, measures[k], person, KEYBOARDS[r.name])
        return person
      })

      // Écrans vivants
      const images = ["codex", "veille", "carte"].map((name) => Object.assign(new Image(), { src: `/screens/${name}.jpg` }))
      const contents = screenContents(images)
      const screens = rooms.flatMap((r) => installScreens(r.object, r.sphere.center, contents[r.name], SCREEN_MATERIAL))

      // L'abat-jour de la chambre s'allume, avec sa propre petite lumière
      let bedside = null
      const shade = findMesh(chambre, BEDSIDE_LAMP)
      if (shade) {
        shade.material = shade.material.clone()
        shade.material.emissive.set("#ffb46b")
        const glow = new PointLight("#ffb46b", 1.5, 2.5, 2)
        glow.position.copy(new Box3().setFromObject(shade).getCenter(new Vector3()))
        chambre.attach(glow)
        bedside = { material: shade.material, light: glow }
      }

      const plants = rooms.map((r) => findMesh(r.object, PLANTS)).filter(Boolean).map((m) => pivotAt(m, "base"))
      // Les globes gris deviennent des Terres qui tournent
      const earthMap = earthTexture(), clouds = cloudTexture()
      const globes = rooms
        .map((r) => [r.object, findMesh(r.object, GLOBE)])
        .filter(([, m]) => m)
        .map(([room, m]) => {
          const box = new Box3().setFromObject(m)
          const size = box.getSize(new Vector3())
          const earth = makeEarth(Math.min(size.x, size.y, size.z) / 2, earthMap, clouds)
          earth.root.position.copy(box.getCenter(new Vector3()))
          earth.root.updateMatrixWorld(true)
          room.attach(earth.root)
          earth.spinner.userData.action = { type: "globe" }
          m.visible = false
          return earth.spinner
        })

      // Ce qui mène ailleurs : s'illumine au survol (la texture elle-même brille)
      const glowing = (mesh, type) => {
        if (!mesh) return null
        mesh.material = mesh.material.clone()
        mesh.material.emissiveMap = mesh.material.map
        mesh.material.emissive?.set("#ffffff")
        mesh.material.emissiveIntensity = 0
        mesh.userData.action = { type, object: mesh }
        return mesh
      }
      const logo = glowing(findMesh(bureau, ECRITEL_LOGO), "ecritel")
      const banner = glowing(hangBanner(chambre), "banner")

      // Lego dort dans son panier, au milieu de la chambre, côté visiteur
      const lego = makeDog()
      const spot = new Box3()
        .setFromObject(chambre)
        .getCenter(new Vector3())
        .add(new Vector3(VIEW_DIRECTION.x, 0, VIEW_DIRECTION.z).normalize().multiplyScalar(DOG.forward))
      if (measures[0]) {
        lego.root.position.set(spot.x, measures[0].floor, spot.z)
        lego.root.scale.setScalar(measures[0].scale * DOG.scale)
      }
      lego.root.rotation.y = DOG.facing
      lego.root.userData.action = { type: "dog", object: lego.root }
      lego.root.updateMatrixWorld(true)
      chambre.attach(lego.root)

      // Décor ajouté : guirlande au-dessus de la fenêtre de la chambre, horloge en classe, sac, mug, switch
      const decor = []
      const windowMesh = findMesh(chambre, WINDOW)
      if (windowMesh) {
        const w = wallFrame(windowMesh, rooms[0].sphere.center)
        const s = measures[0]?.scale ?? 1
        const top = w.center.clone().addScaledVector(WORLD_UP, w.height / 2 + GARLAND.above * s).addScaledVector(w.normal, w.depth / 2 + 0.05 * s)
        const half = w.right.clone().multiplyScalar(w.width / 2 + GARLAND.overhang * s)
        const garland = makeGarland(top.clone().sub(half), top.clone().add(half), GARLAND.sag * s, s)
        chambre.attach(garland.root)
        decor.push(garland)
      }
      const board = findMesh(classe, WHITEBOARD)
      if (board && measures[1]) {
        const w = wallFrame(board, rooms[1].sphere.center)
        const clock = makeClock()
        clock.root.scale.setScalar(measures[1].scale)
        clock.root.position.copy(w.center).addScaledVector(WORLD_UP, w.height / 2 + 0.24 * measures[1].scale).addScaledVector(w.normal, w.depth / 2 + 0.01)
        clock.root.lookAt(clock.root.position.clone().add(w.normal))
        clock.root.updateMatrixWorld(true)
        classe.attach(clock.root)
        decor.push(clock)
      }
      // Le tableau : séries et transformée de Fourier
      if (board) {
        const w = wallFrame(board, rooms[1].sphere.center)
        const width = w.width * BOARD_INSET.width, height = w.height * BOARD_INSET.height
        const formulas = new Mesh(new PlaneGeometry(width, height), new MeshStandardMaterial({ map: fourierTexture(width / height), roughness: 0.6 }))
        formulas.position.copy(w.center).addScaledVector(w.normal, w.depth / 2 + 0.004)
        formulas.lookAt(formulas.position.clone().add(w.normal))
        formulas.updateMatrixWorld(true)
        classe.attach(formulas)
      }
      // Les livres de l'étagère de la chambre
      SHELF_BOOKS.forEach((spec, k) => {
        const mesh = findMesh(chambre, spec)
        if (mesh) dressBook(mesh, BOOKS[k], rooms[0].sphere.center)
      })
      // Le PC de la chambre devient un PC gamer, ceux de la classe des PC d'école détaillés
      const tower = findMesh(chambre, TOWER)
      if (tower && measures[0]) {
        const f = footprint(tower, measures[0])
        const pc = makeGamingPC(f.width, f.depth, f.height, measures[0].scale)
        place(chambre, measures[0], pc.root, f.spot, f.bottom)
        tower.visible = false
        const glass = findMesh(chambre, TOWER_GLASS)
        if (glass) glass.visible = false
        decor.push(pc)
      }
      for (const spec of SCHOOL_TOWERS) {
        const mesh = findMesh(classe, spec)
        if (!mesh || !measures[1]) continue
        const f = footprint(mesh, measures[1])
        const pc = makeSchoolPC(f.width, f.depth, f.height)
        place(classe, measures[1], pc.root, f.spot, f.bottom)
        mesh.visible = false
        decor.push(pc)
      }
      if (measures[0]) {
        const headset = makeHeadset()
        place(chambre, measures[0], headset.root, HEADSET, measures[0].deskTop)
        decor.push(headset)
      }
      if (measures[1]) {
        const notebook = makeNotebook()
        place(classe, measures[1], notebook.root, NOTEBOOK, measures[1].deskTop + NOTEBOOK.lift * measures[1].scale)
        notebook.root.scale.multiplyScalar(NOTEBOOK.size)
        decor.push(notebook)
      }
      if (measures[0]) {
        const lava = makeLavaLamp(measures[0].scale)
        place(chambre, measures[0], lava.root, LAVA_LAMP, measures[0].deskTop)
        decor.push(lava)
      }
      if (measures[1]) {
        const backpack = makeBackpack()
        place(classe, measures[1], backpack.root, BACKPACK, measures[1].floor)
        decor.push(backpack)
      }
      if (measures[2]) {
        const mug = makeMug()
        place(bureau, measures[2], mug.root, MUG, measures[2].deskTop)
        const netSwitch = makeSwitch()
        place(bureau, measures[2], netSwitch.root, SWITCH, measures[2].deskTop)
        decor.push(mug, netSwitch)
      }

      scene.userData.world = { rooms, people, screens, bedside, plants, globes, banner, logo, lego, decor, overview: sphereOf(scene) }
    }

    const { rooms, overview } = scene.userData.world
    // Pour chaque section : la pièce visitée (ou aucune) et où se trouve le personnage
    const shots = SECTIONS.map((s) => {
      const room = ROOMS.indexOf(s.room)
      return {
        room,
        zoom: s.room ? ROOM_ZOOM : OVERVIEW_ZOOM,
        right: s.right,
        // En vue d'ensemble, le personnage est au bureau, en haut de l'immeuble
        person: room >= 0 ? room : ROOMS.indexOf("bureau"),
      }
    })
    // Direction de la caméra, exprimée dans le repère de l'immeuble (qui est tourné)
    const towardCamera = new Vector3(VIEW_DIRECTION.x, 0, VIEW_DIRECTION.z).normalize().applyAxisAngle(WORLD_UP, -MODEL_ROTATION)
    return { ...scene.userData.world, rooms, overview, shots, towardCamera }
  }, [scene])

  // La bulle disparaît après quelques secondes
  useEffect(() => {
    if (!bubble) return
    const timer = setTimeout(() => setBubble(null), BUBBLE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [bubble])
  useEffect(() => () => void (document.body.style.cursor = ""), [])

  // Survol et clics sur la scène ; on ignore ce qui se passe au-dessus des cartes de texte et des boutons
  // R3F appelle le gestionnaire pour chaque objet traversé : on ne traite que le premier passage.
  // Parmi les objets les plus proches, le premier cliquable gagne (la chaise ne cache pas le personnage).
  const pick = (e) => {
    e.stopPropagation()
    if (e.nativeEvent.target?.closest?.("[data-card], nav, button, a")) return null
    for (const hit of e.intersections.slice(0, PICK_DEPTH)) {
      const action = actionOf(hit.object)
      if (action) return action
    }
    return null
  }
  const hoverOn = (action) => {
    state.current.hover = action
    document.body.style.cursor = action ? "pointer" : ""
    // L'étiquette ne change que quand on passe d'un objet à un autre (pas de rendu React à chaque mouvement)
    const text = action && LABELS[action.type]
    setLabel((current) => (current?.object === action?.object && current?.text === text ? current : text ? { text, object: action.object } : null))
  }
  const onPointerMove = (e) => hoverOn(pick(e))
  const onPointerLeave = () => hoverOn(null)
  const onClick = (e) => {
    const action = pick(e)
    if (!action) return
    const now = clock.elapsedTime
    const s = state.current
    if (action.type === "person") {
      s.waves[action.room] = now
      setBubble({ text: PHRASES[ROOMS[action.room]], target: "person", room: action.room, at: now })
    } else if (action.type === "dog") {
      s.dogWake = now
      setBubble({ text: DOG.phrase, target: "dog", at: now })
    } else if (action.type === "globe") {
      s.globeSpin = 1
    } else if (action.type === "banner") {
      window.open("https://links.gabin-clavier.fr", "_blank", "noopener")
    } else if (action.type === "ecritel") {
      scrollToSection(scroll.el, "alternance")
    }
  }

  useFrame((_, delta) => {
    const s = state.current
    const now = clock.elapsedTime
    const time = reducedMotion ? 0 : now
    const { rooms, shots, people } = world

    // Nuit ou jour : la scène glisse doucement d'un réglage à l'autre
    const goal = day.current ? 1 : 0
    s.daylight = reducedMotion ? goal : MathUtils.damp(s.daylight, goal, DAYLIGHT_SPEED, delta)
    const night = 1 - s.daylight

    // Arrivée : les pièces tombent du ciel l'une après l'autre, une fois l'écran de chargement parti
    s.introStart ??= now + INTRO.delay

    // Position entre deux sections, adoucie pour marquer une pause sur chaque pièce
    const position = scroll.offset * (NB_SECTIONS - 1)
    const i = Math.min(Math.floor(position), NB_SECTIONS - 2)
    const t = MathUtils.smootherstep(position - i, 0, 1)
    const from = shots[i], to = shots[i + 1]
    const weight = (pick) => (k) => MathUtils.lerp(pick(from) === k ? 1 : 0, pick(to) === k ? 1 : 0, t)
    const focus = weight((shot) => shot.room)
    const presence = weight((shot) => shot.person)
    const spread = MathUtils.lerp(from.room >= 0 ? 1 : 0, to.room >= 0 ? 1 : 0, t)

    // Les étages s'écartent, la pièce visitée avance, et chacune flotte doucement
    rooms.forEach((room, k) => {
      const r = room.sphere.radius
      const lift = (k - 1) * spread * SPREAD * r
      const pull = (focus(k) - spread * 0.5) * PULL * r
      s.offset.copy(world.towardCamera).multiplyScalar(pull)
      s.offset.y += lift
      // Sphère de cadrage : sans le flottement ni la chute, pour que la caméra reste posée
      s.spheres[k].center.copy(room.sphere.center).add(s.offset.clone().applyAxisAngle(WORLD_UP, MODEL_ROTATION))
      s.spheres[k].radius = r
      s.offset.y += Math.sin(time * 0.5 + k * 2.1) * FLOAT * r
      if (!reducedMotion) s.offset.y += (1 - ease((now - s.introStart - k * INTRO.stagger) / INTRO.duration)) * INTRO.height * r
      room.object.position.copy(room.base).add(s.offset)
      room.lamp.intensity = LAMP.intensity * (0.15 + 0.85 * night)
    })
    s.overview.center.copy(world.overview.center)
    s.overview.radius = world.overview.radius * (1 + spread * SPREAD * 0.5)

    // Caméra : un lent mouvement de va-et-vient autour de l'immeuble
    const orbit = Math.sin((time / ORBIT.period) * Math.PI * 2) * ORBIT.angle
    s.axes.view.copy(VIEW_DIRECTION).applyAxisAngle(WORLD_UP, orbit)
    s.axes.right.crossVectors(s.axes.view.clone().negate(), WORLD_UP).normalize()
    s.axes.up.crossVectors(s.axes.right, s.axes.view.clone().negate()).normalize()

    const sphereFor = (shot) => (shot.room >= 0 ? s.spheres[shot.room] : s.overview)
    const a = frame(from, sphereFor(from), camera, size, s.axes, s.a)
    const b = frame(to, sphereFor(to), camera, size, s.axes, s.b)
    camera.position.lerpVectors(a.position, b.position, t)
    s.lookAt.lerpVectors(a.target, b.target, t)

    // Léger décalage de la caméra qui suit la souris
    if (!reducedMotion) {
      s.parallax.x = MathUtils.damp(s.parallax.x, pointer.x, 3, delta)
      s.parallax.y = MathUtils.damp(s.parallax.y, pointer.y, 3, delta)
      const amount = MathUtils.lerp(a.distance, b.distance, t) * PARALLAX
      camera.position.addScaledVector(s.axes.right, s.parallax.x * amount).addScaledVector(s.axes.up, s.parallax.y * amount)
    }
    camera.lookAt(s.lookAt)

    // Le personnage apparaît dans la pièce visitée ; survolé, il regarde le visiteur ; cliqué, il fait coucou
    people.forEach((person, k) => {
      if (!person) return
      setOpacity(person, MathUtils.smoothstep(presence(k), 0.15, 0.85))
      const hovered = s.hover?.type === "person" && s.hover.room === k
      s.attention[k] = MathUtils.damp(s.attention[k], hovered ? 1 : 0, 4, delta)
      const wave = reducedMotion ? 0 : pulse(now - s.waves[k], WAVE_SECONDS)
      if (person.root.visible) animatePerson(person, time, k * 3.7, reducedMotion ? null : camera.position, { attention: s.attention[k], wave })
    })

    // Lego se réveille quand on clique dessus, quand on le survole, ou quand le personnage de la chambre se retourne
    const turned = Math.max(s.attention[0], pulse(now - s.waves[0], WAVE_SECONDS))
    const petted = s.hover?.type === "dog" ? 0.8 : 0
    animateDog(world.lego, time, reducedMotion ? 0 : Math.max(pulse(now - s.dogWake, DOG.awakeSeconds), turned * 0.6, petted))

    // Bulle au-dessus du personnage ou de Lego
    if (bubble && anchor.current) {
      const target = bubble.target === "dog" ? world.lego.head : people[bubble.room]?.parts.head
      if (target) {
        target.getWorldPosition(anchor.current.position)
        anchor.current.position.y += target.getWorldScale(s.scale).y * (bubble.target === "dog" ? 0.22 : 0.32)
      }
    }

    // Ce qui mène ailleurs s'illumine au survol, et son étiquette flotte au-dessus
    for (const type of ["banner", "ecritel"]) {
      s.glow[type] = MathUtils.damp(s.glow[type], s.hover?.type === type ? 1 : 0, 6, delta)
      const mesh = type === "banner" ? world.banner : world.logo
      if (mesh) mesh.material.emissiveIntensity = s.glow[type] * 0.45
    }
    if (label && labelAnchor.current) {
      s.box.setFromObject(label.object)
      s.box.getCenter(labelAnchor.current.position)
      labelAnchor.current.position.y = s.box.max.y
    }

    // Décor : plantes, globes, bannière, écrans, lampe de chevet, poussière
    world.plants.forEach((p, k) => {
      p.rotation.z = Math.sin(time * 0.8 + k) * 0.05
      p.rotation.x = Math.sin(time * 0.6 + k * 2) * 0.035
    })
    s.globeSpin = MathUtils.damp(s.globeSpin, s.hover?.type === "globe" ? 0.5 : 0, 1.2, delta)
    if (!reducedMotion) world.globes.forEach((g) => (g.rotation.y += delta * (0.25 + s.globeSpin * 8)))
    if (world.banner) {
      // Au survol, la bannière ondule davantage, comme soulevée par un courant d'air
      const sway = 1 + s.glow.banner * 1.5
      world.banner.rotation.x = -(0.5 + 0.5 * Math.sin(time * (0.7 + s.glow.banner))) * 0.08 * sway
      world.banner.rotation.z = Math.sin(time * 0.45) * 0.015 * sway
    }
    world.decor.forEach((d) => d.animate(time, night))
    drawScreens(world.screens, time, now)
    for (const screen of world.screens) screen.material.color.setScalar(0.8 + 0.2 * night)
    if (world.bedside) {
      const flicker = 1 + Math.sin(time * 2.3) * 0.04 + Math.sin(time * 5.1) * 0.025
      world.bedside.light.intensity = 1.5 * flicker * night
      world.bedside.material.emissiveIntensity = 0.8 * flicker * night
    }
    rooms.forEach((room) => {
      room.dust.points.material.opacity = 0.7 * (0.3 + 0.7 * night)
      if (!reducedMotion) animateDust(room.dust, time)
    })
  })

  return (
    <>
      <primitive object={scene} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onClick={onClick} />
      {bubble && (
        <group ref={anchor}>
          {/* Dans le calque fixe de la scène, pas dans le conteneur qui défile */}
          <Html center portal={{ current: gl.domElement.parentNode }} zIndexRange={[35, 0]} style={{ pointerEvents: "none" }}>
            <div className="bubble" role="status">
              {bubble.text}
            </div>
          </Html>
        </group>
      )}
      {label && (
        <group ref={labelAnchor}>
          <Html center portal={{ current: gl.domElement.parentNode }} zIndexRange={[34, 0]} style={{ pointerEvents: "none" }}>
            <div className="hover-label">{label.text}</div>
          </Html>
        </group>
      )}
    </>
  )
}

useGLTF.preload(MODEL_URL)
