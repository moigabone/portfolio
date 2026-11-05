"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Html, useGLTF, useScroll } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  Box3,
  BoxGeometry,
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
  Raycaster,
  SRGBColorSpace,
  Sphere,
  Vector3,
} from "three"
import { SECTIONS, NB_SECTIONS } from "./Sections"
import { animatePerson, makePerson, setOpacity } from "./Person"
import { animateDog, makeDog } from "./Dog"
import { sound } from "./ambient"
import { useContent } from "@/content/i18n"
import {
  BOOKS,
  bookTexture,
  fourierTexture,
  makeBackpack,
  makeBadge,
  makeBigPlant,
  makeClock,
  makeGlowCube,
  makeGamingPC,
  makeGarland,
  makeHeadset,
  makeDVDs,
  makeDeskHeadset,
  makeDrawerChest,
  makeLavaLamp,
  makeMangas,
  makeMushroomLamp,
  makePSVita,
  makeTrailingPlant,
  makeBanana,
  makeNotebook,
  makeSchoolPC,
  makeServerRoom,
  makeShoePair,
  makeTurntable,
  makeWireShelf,
  pixelWindowTexture,
  makeSoap,
  makeStarBall,
  makeSwitch,
  makeWaterBottle,
  makeWaterCooler,
  osiTexture,
  persianRugTexture,
} from "./Decor"
import { SITES, drawScreens, installScreens, makeWallScreen, screenContents } from "./Screens"
import { scrollToSection } from "./Elevator"
import { DAYLIGHT_SPEED } from "./theme"

const MODEL_URL = "/models/appart.glb"
const MODEL_ROTATION = -Math.PI / 3

// Réglages de la caméra
const VIEW_DIRECTION = new Vector3(0, 0.35, 1).normalize() // vue de face, légèrement en plongée
const SCREEN_RIGHT = new Vector3(1, 0, 0) // la droite de l'écran, vue de face
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
const BEDSIDE_LAMP = { room: "chambre", material: "Matériau.027", vertices: 691 } // l'abat-jour de la lampe de chevet…
const BEDSIDE_BASE = { material: "Matériau.015", vertices: 1078 } // …et son pied : remplacés par la lampe champignon
const NIGHTSTAND_BOOKS = [
  { material: "Material", vertices: 280 },
  { material: "Matériau.022", vertices: 279 },
  { material: "Matériau.023", vertices: 285 },
] // les livres posés sur la table de nuit : la PS Vita prend leur place
const RUG = { material: "Matériau.021", vertices: 1793, flat: 0.1 } // le tapis de la chambre ; flat : épaisseur du tapis (unités de l'objet), au-dessus c'est un autre petit objet du même maillage
const SHELF = { material: "Matériau.023", vertices: 458 } // l'étagère de la chambre, dupliquée plus bas
const LOWER_SHELF = { drop: 0.55, mangas: -0.38, plant: -0.02, dvds: 0.16, soap: 0.44 } // en mètres : sous la première ; les mangas, la plante qui les sépare des DVD, puis le savon
// Agrandis pour aller avec le reste du modèle (les livres de l'étagère font 37 cm)
const SIZES = { dvds: 1.6, mangas: 1.6, plant: 1.15, lamp: 1.4, vita: 1.8 }
const PLANTS = { material: "Matériau.022", vertices: 560 } // les feuilles se balancent
const BEDROOM_PLANT = [PLANTS, { material: "Matériau.023", vertices: 206 }, { material: "Matériau.021", vertices: 522 }] // la plante du meuble noir de la chambre, son pot et sa terre
const PLANT_MOVE = { back: 0.18, left: 0.14 } // en mètres, vers le mur et vers la gauche de l'écran : la lampe à lave ne la cache plus
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
const DOG = { forward: 0.9, scale: 1, facing: -Math.PI / 2.4, awakeSeconds: 4 }

// Décor ajouté, placé par rapport à la chaise de chaque pièce (en mètres) :
// `ahead` vers l'écran, `aside` sur le côté du personnage
const WATER = { ahead: 0.3, aside: -0.62 } // au boulot, de l'eau…
const BANANA = { ahead: 0.62, aside: -0.45 } // …et une banane
const SERVER_WINDOW = { room: "bureau", material: "UberTexture", vertices: 1466 } // la fenêtre du bureau : la salle serveurs est derrière
const BUREAU_WALLS = { material: "Material", vertices: 142 } // les murs du bureau
const BACKPACK = { ahead: -0.05, aside: 0.5 }
const GARLAND = { above: 0.12, overhang: 0.15, sag: 0.12 } // au-dessus de la fenêtre de la chambre
const LAVA_LAMP = { ahead: 0.8, aside: -0.75 } // au bout du bureau de la chambre (puis elle échange sa place avec le pot à crayons)
const LAVA_SIZE = 1.4
const LAVA_RIGHT = 0.12 // en mètres, vers la droite de l'écran, une fois à la place du pot à crayons
const HEADSET = { ahead: 0.62, aside: 1.02 } // sur son support, entre le PC et l'écran
const NOTEBOOK = { ahead: 0.57, aside: 0.8, lift: 0.012, size: 0.6 } // entre les deux postes, bien sur le plateau ; format A5, posé sur le plateau (un peu au-dessus de l'estimation)
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
const WINDOW = { material: "Matériau.017", vertices: 1439 } // la fenêtre de la chambre : des motifs en pixels sur ses vitres
const CHEST = { material: "Matériau.041", vertices: 456 } // la commode noire à côté du bureau : refaite en bois, tiroirs et poignées
const NIGHTSTAND = { material: "Matériau.018", vertices: 1762 } // la table de chevet de la chambre, remplacée par une étagère chromée
// En mètres : la place ajoutée côté pièce (pour la platine), le décalage vers la droite, l'écart entre deux paires de chaussures,
// et où poser la lampe et la PS Vita sur le dessus, depuis le bout côté mur
const CHEVET = { widen: 0.75, shift: 0.35, shoe: 0.25, lamp: 0.26, vita: 0.6, turntable: 1.35 }
const PENCIL_POT = [
  { material: "Matériau.025", vertices: 76 },
  { material: "Matériau.027", vertices: 48 },
  { material: "Matériau.026", vertices: 76 },
  { material: "Matériau.024", vertices: 76 },
] // le pot à crayons de la chambre (le pot et ses crayons) : il échange sa place avec la lampe à lave
const WHITEBOARD = { material: "Matériau.047", vertices: 830 } // le tableau de la classe
const CLASS_WALLS = { material: "Material", vertices: 143 } // les murs de la classe
const CLASS_WINDOW = { material: "Matériau.017", vertices: 1452 } // la fenêtre de la classe : l'horloge est accrochée à sa droite
const CLOCK = { gap: 0.24, raise: 0.25, off: 0.012 } // en mètres : écart avec la fenêtre, hauteur au-dessus de son centre, décollement du mur

// Au survol, ces objets s'illuminent et une étiquette dit où ils mènent

// Examiner un objet : un clic rapproche la caméra pour lire ce qui est écrit dessus ;
// un autre clic, Échap ou le scroll la ramènent. `margin` : distance en rayons de l'objet ;
// `blend` : part de l'axe habituel de la caméra mêlée à la direction propre à l'objet
const INSPECT = { margin: 1.25, speed: 3, blend: 0.2 }

// Interactions : ce que dit le personnage quand on clique sur lui, selon la pièce
const BUBBLE_SECONDS = 4
const WALL_SCREEN = { delay: 3, hold: 15 } // secondes : l'écran du bureau s'allume un peu après l'arrivée, puis se rendort
const OFFICE_CABINET = { material: "Matériau.018", vertices: 1762 } // le caisson à droite du bureau, remplacé par la fontaine à eau
const OFFICE_DESK = { material: "Matériau.017", vertices: 269 } // le bureau du travail
const COOLER_SPOT = { plant: 0.16, cooler: 0.16, cups: 0.09, gap: 0.03 } // en mètres : les demi-largeurs de la plante et de la fontaine, ses gobelets, l'écart
const DESK_HEADSET = { ahead: 0.5, aside: 0.62 } // le casque du travail, à gauche du clavier
const BADGE = { before: 0.2, left: 0.32, size: 1.6 } // mon badge, entre le clavier et l'écran du milieu, un peu à gauche (en mètres)
const OFFICE_PLANT = [{ material: "Matériau.023", vertices: 206 }, { material: "Matériau.021", vertices: 522 }] // le pot et la terre de sa plante
const CLASS_WINDOW_KEEP = 0.55 // la fenêtre de la classe garde cette part de sa largeur, côté horloge : le reste accueille le modèle OSI
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
  // Le Petit Prince sur sa planète, son écharpe au vent, à côté de sa rose
  const star = (x, y, r) => {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2
      const d = i % 2 ? r * 0.45 : r
      g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    }
    g.fill()
  }
  g.fillStyle = "#ffd36a"
  for (const [x, y, r] of [[62, 62, 9], [196, 80, 7], [52, 140, 5], [206, 160, 9], [128, 48, 5], [70, 210, 4]]) star(x, y, r)
  const cx = w / 2
  // Tout le dessin remonte un peu : la planète reste au-dessus de l'encoche du bas
  g.save()
  g.translate(0, -30)
  // La planète et ses cratères
  g.fillStyle = "#e8c66a"
  g.beginPath()
  g.arc(cx, 262, 46, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#c9a35a"
  for (const [x, y, r] of [[-18, 258, 8], [14, 278, 6], [20, 248, 4], [-4, 288, 4]]) {
    g.beginPath()
    g.arc(cx + x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  // La rose, sur le bord de la planète
  g.strokeStyle = "#3f8f3a"
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(cx + 30, 228)
  g.lineTo(cx + 34, 206)
  g.stroke()
  g.fillStyle = "#e0453a"
  g.beginPath()
  g.arc(cx + 34, 202, 7, 0, Math.PI * 2)
  g.fill()
  // Le petit prince : jambes, long manteau, tête et cheveux en épis
  const ink = "#f4ecd8"
  g.fillStyle = "#2f7a5a"
  g.fillRect(cx - 9, 200, 6, 18)
  g.fillRect(cx + 2, 200, 6, 18)
  g.fillStyle = "#3f9a6a"
  g.beginPath()
  g.moveTo(cx - 12, 150)
  g.lineTo(cx + 12, 150)
  g.lineTo(cx + 17, 204)
  g.lineTo(cx - 17, 204)
  g.closePath()
  g.fill()
  g.fillStyle = "#ffd36a"
  g.fillRect(cx - 12, 176, 24, 4) // ceinture
  g.fillStyle = ink
  g.beginPath()
  g.arc(cx, 136, 13, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = "#ffd36a"
  g.beginPath()
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI
    g.lineTo(cx + Math.cos(a) * 14, 132 + Math.sin(a) * 14)
    if (i < 6) {
      const b = a + Math.PI / 12
      g.lineTo(cx + Math.cos(b) * 21, 132 + Math.sin(b) * 21)
    }
  }
  g.closePath()
  g.fill()
  // L'écharpe qui flotte au vent
  g.fillStyle = "#ffe14a"
  g.beginPath()
  g.moveTo(cx - 8, 149)
  g.bezierCurveTo(cx + 20, 140, cx + 40, 160, cx + 62, 134)
  g.bezierCurveTo(cx + 50, 158, cx + 28, 162, cx + 8, 156)
  g.closePath()
  g.fill()
  g.restore()
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
    screens: screens.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(screens.length), // le milieu de tous les écrans
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
// Le nom sous lequel un objet cliquable compte dans les découvertes ; le compteur l'apprend par un évènement
const discoveryKey = (action) => (action.type === "person" ? `person-${action.room}` : (action.label ?? action.type))
const announce = (name, detail) => window.dispatchEvent(new CustomEvent(`portfolio:${name}`, { detail }))

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

// Remplace un objet du modèle par un objet fait main (en mètres) de la même taille, posé au même endroit et dans le même sens.
// `build(largeur, profondeur, hauteur)` construit l'objet façade en -z ; la façade est tournée vers `toward`.
function replaceMesh(room, mesh, m, toward, build) {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const size = box.getSize(new Vector3())
  const axes = [0, 1, 2].map((k) => new Vector3().setComponent(k, 1).transformDirection(mesh.matrixWorld))
  const linear = new Matrix3().setFromMatrix4(mesh.matrixWorld)
  const meters = [0, 1, 2].map((k) => new Vector3().setComponent(k, size.getComponent(k)).applyMatrix3(linear).length() / m.scale)
  const up = [0, 1, 2].reduce((p, q) => (Math.abs(axes[p].y) > Math.abs(axes[q].y) ? p : q))
  const [p, q] = [0, 1, 2].filter((k) => k !== up)
  const front = Math.abs(axes[p].dot(toward)) > Math.abs(axes[q].dot(toward)) ? p : q
  const across = front === p ? q : p
  const Y = axes[up].clone().multiplyScalar(Math.sign(axes[up].y) || 1)
  const Z = axes[front].clone().multiplyScalar(axes[front].dot(toward) > 0 ? -1 : 1)
  const X = new Vector3().crossVectors(Y, Z)
  const object = build(meters[across], meters[front], meters[up])
  // Le bas de l'objet, au centre
  const bottom = box.getCenter(new Vector3())
  bottom.setComponent(up, axes[up].y > 0 ? box.min.getComponent(up) : box.max.getComponent(up))
  object.root.position.copy(bottom.applyMatrix4(mesh.matrixWorld))
  object.root.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(X, Y, Z))
  object.root.scale.setScalar(m.scale)
  object.root.updateMatrixWorld(true)
  room.attach(object.root)
  mesh.visible = false
  return object
}

// Le tapis devient un tapis persan : ses sommets reçoivent une projection vue de dessus, dans le sens de sa longueur.
// La tranche du tapis et le petit objet rangé dans le même maillage, plus haut, prennent la couleur du fond.
function dressRug(mesh) {
  const pos = mesh.geometry.attributes.position
  // L'axe de l'objet qui pointe vers le haut dans la pièce, et les deux axes à plat
  const axes = [0, 1, 2].map((k) => new Vector3().setComponent(k, 1).transformDirection(mesh.matrixWorld))
  const up = [0, 1, 2].reduce((p, q) => (Math.abs(axes[p].y) > Math.abs(axes[q].y) ? p : q))
  const sign = Math.sign(axes[up].y) || 1
  const height = (i) => sign * pos.getComponent(i, up)
  let floor = Infinity
  for (let i = 0; i < pos.count; i++) floor = Math.min(floor, height(i))
  const box = new Box3(), v = new Vector3()
  for (let i = 0; i < pos.count; i++) if (height(i) - floor < RUG.flat) box.expandByPoint(v.fromBufferAttribute(pos, i))
  const size = box.getSize(new Vector3())
  const top = sign > 0 ? box.max.getComponent(up) : -box.min.getComponent(up)
  const [p, q] = [0, 1, 2].filter((k) => k !== up)
  const long = size.getComponent(p) > size.getComponent(q) ? p : q, short = long === p ? q : p
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const onRug = height(i) > floor + (top - floor) * 0.6 && height(i) - floor < RUG.flat // le dessus, pas la tranche
    uv[i * 2] = onRug ? (pos.getComponent(i, short) - box.min.getComponent(short)) / size.getComponent(short) : 0.005
    uv[i * 2 + 1] = onRug ? (pos.getComponent(i, long) - box.min.getComponent(long)) / size.getComponent(long) : 0.5
  }
  mesh.geometry.setAttribute("uv", new BufferAttribute(uv, 2))
  // Double face, comme le matériau d'origine : le dessus du tapis est tourné vers le bas dans le modèle
  mesh.material = new MeshStandardMaterial({ map: persianRugTexture(size.getComponent(long) / size.getComponent(short)), roughness: 0.95, side: DoubleSide })
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
  return N.clone().applyMatrix3(normals).normalize()
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
// Visible à l'écran : l'objet et tous ses parents (un maillage remplacé reste dans la scène, caché)
const shown = (object) => {
  for (let o = object; o; o = o.parent) if (!o.visible) return false
  return true
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
    glow: { banner: 0 },
    bannerPhase: 0,
    wall: { here: false, wakeAt: null, until: 0, glow: 0 }, // l'écran mural du bureau
    dogLook: 0, // 0 à 1 : Lego tourne la tête vers le visiteur
    vaultOpen: 0, // 0 : portes dépolies, 1 : on voit les baies
    box: new Box3(),
    inspect: null, // l'objet examiné
    shown: null, // le dernier examiné, gardé le temps que la caméra revienne
    zoom: 0, // 0 : vue normale, 1 : caméra sur l'objet
    inspectOffset: 0,
    focus: new Vector3(),
    eye: new Vector3(),
  })
  const [label, setLabel] = useState(null)
  const { ui } = useContent() // les textes de la scène, dans la langue choisie
  const [inspecting, setInspecting] = useState(false)
  const hintAnchor = useRef()
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
      const images = SITES.map(({ image }) => Object.assign(new Image(), { src: `/screens/${image}.jpg` }))
      const contents = screenContents(images)
      const screens = rooms.flatMap((r) => installScreens(r.object, r.sphere.center, contents[r.name], SCREEN_MATERIAL))

      // La lampe de chevet devient une lampe champignon orange, avec sa propre petite lumière
      let bedside = null
      const shade = findMesh(chambre, BEDSIDE_LAMP), stand = findMesh(chambre, BEDSIDE_BASE)
      if (shade && stand && measures[0]) {
        const spot = new Box3().setFromObject(stand).getCenter(new Vector3())
        const lamp = makeMushroomLamp()
        lamp.root.scale.setScalar(measures[0].scale * SIZES.lamp)
        lamp.root.position.set(spot.x, new Box3().setFromObject(stand).min.y, spot.z)
        lamp.root.updateMatrixWorld(true)
        chambre.attach(lamp.root)
        shade.visible = stand.visible = false
        const glow = new PointLight("#ff8a3a", 1.5, 2.5, 2)
        glow.position.copy(lamp.bulb).applyMatrix4(lamp.root.matrixWorld)
        chambre.attach(glow)
        bedside = { material: lamp.glass, light: glow, root: lamp.root, bulb: lamp.bulb }
      }

      // La plante de la commode recule vers le mur et part à gauche : la lampe à lave, qui prend la place du pot à crayons, part à droite
      const away = new Vector3(-VIEW_DIRECTION.x, 0, -VIEW_DIRECTION.z).normalize()
      for (const spec of BEDROOM_PLANT) {
        const mesh = findMesh(chambre, spec)
        if (!mesh || !measures[0]) continue
        mesh.position.copy(mesh.parent.worldToLocal(mesh.getWorldPosition(new Vector3()).addScaledVector(away, PLANT_MOVE.back * measures[0].scale).addScaledVector(SCREEN_RIGHT, -PLANT_MOVE.left * measures[0].scale)))
        mesh.updateMatrixWorld()
      }
      const plants = rooms.map((r) => findMesh(r.object, PLANTS)).filter(Boolean).map((m) => pivotAt(m, "base"))
      // Les globes gris deviennent Kevin, le cube violet (chambre), et la boule de cristal à quatre étoiles (bureau)
      const relics = []
      let kevin = null
      const globes = rooms
        .map((r) => [r.object, findMesh(r.object, GLOBE)])
        .filter(([, m]) => m)
        .map(([room, m]) => {
          const box = new Box3().setFromObject(m)
          const size = box.getSize(new Vector3())
          const radius = Math.min(size.x, size.y, size.z) / 2
          const relic = room === chambre ? makeGlowCube(radius * 1.25) : makeStarBall(radius)
          relic.root.position.copy(box.getCenter(new Vector3()))
          if (room === chambre) relic.root.position.y = box.min.y + radius * 0.625 // Kevin, posé à plat sur l'étagère
          relic.root.updateMatrixWorld(true)
          room.attach(relic.root)
          const action = { type: "globe", label: room === chambre ? "Kevin" : "La boule de cristal", object: relic.root }
          relic.spinner.traverse((c) => (c.userData.action = action))
          relics.push(relic)
          m.visible = false
          if (room !== chambre) return relic.spinner
          kevin = relic // Kevin ne tourne pas : il s'allume au survol
          return null
        })
        .filter(Boolean)

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
      // L'affiche d'Ecritel devient un écran mural : en veille avec le logo, la supervision s'allume quand on arrive ou qu'on le survole
      let wallScreen = null
      let ecritelLogo = null
      let officeWall = null // le mur du fond du bureau, là où est l'écran mural : un point et sa normale
      const poster = findMesh(bureau, ECRITEL_LOGO)
      if (poster && measures[2]) {
        const w = wallFrame(poster, rooms[2].sphere.center)
        officeWall = { at: w.center.clone(), normal: w.normal.clone().setY(0).normalize() }
        const sc = measures[2].scale
        ecritelLogo = poster.material.map?.image
        const screen = makeWallScreen(ecritelLogo)
        const height = Math.min(w.height, w.width / screen.aspect), width = height * screen.aspect
        const frame = new Mesh(new BoxGeometry(width + 0.06 * sc, height + 0.06 * sc, 0.05 * sc), new MeshStandardMaterial({ color: "#14161b", roughness: 0.35, metalness: 0.4 }))
        frame.position.copy(w.center).addScaledVector(w.normal, w.depth / 2 + 0.025 * sc)
        frame.lookAt(frame.position.clone().add(w.normal))
        const panel = new Mesh(new PlaneGeometry(width, height), screen.material)
        panel.position.set(0, 0, 0.026 * sc)
        frame.add(panel)
        frame.updateMatrixWorld(true)
        bureau.attach(frame)
        poster.visible = false
        frame.userData.action = { type: "ecritel", object: frame }
        wallScreen = screen
      }
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

      // Décor ajouté : guirlande au-dessus de la fenêtre de la chambre, horloge en classe, sac, eau et banane, switch
      const decor = [...relics]
      const windowMesh = findMesh(chambre, WINDOW)
      if (windowMesh) {
        const w = wallFrame(windowMesh, rooms[0].sphere.center)
        const s = measures[0]?.scale ?? 1
        const top = w.center.clone().addScaledVector(WORLD_UP, w.height / 2 + GARLAND.above * s).addScaledVector(w.normal, w.depth / 2 + 0.05 * s)
        const half = w.right.clone().multiplyScalar(w.width / 2 + GARLAND.overhang * s)
        const garland = makeGarland(top.clone().sub(half), top.clone().add(half), GARLAND.sag * s, s)
        chambre.attach(garland.root)
        decor.push(garland)
        // Les vitres : des motifs en pixels collés sur le verre
        const panes = new Mesh(
          new PlaneGeometry(w.width * 0.92, w.height * 0.88),
          new MeshStandardMaterial({ map: pixelWindowTexture(w.width / w.height), transparent: true, depthWrite: false, side: DoubleSide, roughness: 0.8 }),
        )
        panes.position.copy(w.center)
        panes.lookAt(panes.position.clone().add(w.normal))
        panes.updateMatrixWorld(true)
        chambre.attach(panes)
      }
      // Ce qu'on peut examiner de près : un clic rapproche la caméra
      // `normal` : d'où regarder (dans le monde) ; `hide` : la pièce dont on cache le personnage, s'il gêne la vue ;
      // `margin` et `blend` remplacent les réglages d'INSPECT (plus près pour ce qui est plat, vu bien en face)
      const inspectable = (object, label, normal = null, { hide = -1, margin = INSPECT.margin, blend = INSPECT.blend } = {}) => {
        const targets = [].concat(object)
        const action = { type: "inspect", object: targets, label, normal: normal?.clone().normalize() ?? null, hide, margin, blend }
        for (const target of targets) target.userData.action = action
      }
      const mix = (...parts) => parts.reduce((v, [dir, w]) => v.addScaledVector(dir, w), new Vector3())

      // L'horloge, à droite de la fenêtre de la classe
      const classWindow = findMesh(classe, CLASS_WINDOW)
      if (classWindow && measures[1]) {
        const w = wallFrame(classWindow, rooms[1].sphere.center)
        const sc = measures[1].scale
        const clock = makeClock()
        clock.root.scale.setScalar(sc)
        // Le cadre de la fenêtre déborde du mur : on cherche la surface du mur avec un rayon lancé depuis la pièce
        const spot = w.center.clone().addScaledVector(w.right, w.width / 2 + CLOCK.gap * sc).addScaledVector(WORLD_UP, CLOCK.raise * sc)
        const ray = new Raycaster(spot.clone().addScaledVector(w.normal, sc), w.normal.clone().negate())
        const hit = ray.intersectObject(classe, true).find((h) => h.object.isMesh && h.object.visible)
        clock.root.position.copy(hit ? hit.point : spot).addScaledVector(w.normal, CLOCK.off * sc)
        clock.root.lookAt(clock.root.position.clone().add(w.normal))
        clock.root.updateMatrixWorld(true)
        classe.attach(clock.root)
        decor.push(clock)
        inspectable(clock.root, "L'horloge", w.normal)

        // La fenêtre rétrécit côté opposé à l'horloge ; un pan de mur comble la place, avec le modèle OSI affiché dessus
        const keep = CLASS_WINDOW_KEEP
        const pivot = w.center.clone().addScaledVector(w.right, w.width / 2)
        const axes = [0, 1, 2].map((k) => new Vector3().setComponent(k, 1).transformDirection(classWindow.matrixWorld))
        const along = [0, 1, 2].reduce((p, q) => (Math.abs(axes[p].dot(w.right)) > Math.abs(axes[q].dot(w.right)) ? p : q))
        classWindow.scale.setComponent(along, classWindow.scale.getComponent(along) * keep)
        classWindow.updateMatrixWorld(true)
        const narrow = wallFrame(classWindow, rooms[1].sphere.center)
        const edge = narrow.center.clone().addScaledVector(narrow.right, narrow.width / 2)
        classWindow.position.copy(classWindow.parent.worldToLocal(classWindow.getWorldPosition(new Vector3()).add(pivot.sub(edge))))
        classWindow.updateMatrixWorld(true)
        const freed = w.width * (1 - keep)
        const wallMesh = findMesh(classe, CLASS_WALLS)
        const fill = new Mesh(new BoxGeometry(freed + 0.02 * sc, w.height + 0.02 * sc, w.depth * 0.7), wallMesh?.material ?? new MeshStandardMaterial({ color: "#d8ccb0" }))
        const freedAt = w.center.clone().addScaledVector(w.right, -w.width / 2 + freed / 2) // le milieu de la place libérée
        fill.position.copy(freedAt)
        fill.lookAt(fill.position.clone().add(w.normal))
        fill.updateMatrixWorld(true)
        classe.attach(fill)
        const posterW = freed * 0.82, posterH = w.height * 0.85
        const osi = new Mesh(new PlaneGeometry(posterW, posterH), new MeshStandardMaterial({ map: osiTexture(posterW / posterH), roughness: 0.7 }))
        osi.position.copy(freedAt).addScaledVector(w.normal, w.depth * 0.35 + 0.004 * sc)
        osi.lookAt(osi.position.clone().add(w.normal))
        osi.updateMatrixWorld(true)
        classe.attach(osi)
        inspectable(osi, "Le modèle OSI", w.normal, { margin: 1 })
      }
      const board = findMesh(classe, WHITEBOARD)
      // Le tableau : séries et transformée de Fourier
      if (board) {
        const w = wallFrame(board, rooms[1].sphere.center)
        const width = w.width * BOARD_INSET.width, height = w.height * BOARD_INSET.height
        const formulas = new Mesh(new PlaneGeometry(width, height), new MeshStandardMaterial({ map: fourierTexture(width / height), roughness: 0.6 }))
        formulas.position.copy(w.center).addScaledVector(w.normal, w.depth / 2 + 0.004)
        formulas.lookAt(formulas.position.clone().add(w.normal))
        formulas.updateMatrixWorld(true)
        classe.attach(formulas)
        inspectable(formulas, "Le tableau", w.normal)
      }
      const rug = findMesh(chambre, RUG)
      if (rug) dressRug(rug)
      // Les livres de l'étagère de la chambre
      const books = [], spines = new Vector3()
      SHELF_BOOKS.forEach((spec, k) => {
        const mesh = findMesh(chambre, spec)
        if (!mesh) return
        spines.add(dressBook(mesh, BOOKS[k], rooms[0].sphere.center))
        books.push(mesh)
      })
      const shelfFacing = spines.clone().setY(0).normalize() // le devant des étagères, vers la pièce
      if (books.length) inspectable(books, "Mes lectures", spines.add(new Vector3(0, 0.15 * books.length, 0)))

      if (measures[0]) {
        const sc = measures[0].scale
        // La PS Vita remplace les livres de la table de nuit
        const nightItems = {} // ce qui ira sur l'étagère de chevet
        const stack = NIGHTSTAND_BOOKS.map((spec) => findMesh(chambre, spec)).filter(Boolean)
        if (stack.length) {
          const box = new Box3()
          for (const mesh of stack) {
            box.expandByObject(mesh)
            mesh.visible = false
          }
          const vita = makePSVita()
          vita.root.scale.setScalar(sc * SIZES.vita)
          vita.root.position.copy(box.getCenter(new Vector3())).setY(box.min.y)
          vita.root.lookAt(vita.root.position.clone().add(shelfFacing))
          vita.root.rotateY(0.35)
          vita.root.updateMatrixWorld(true)
          chambre.attach(vita.root)
          inspectable(vita.root, "Ma PS Vita", shelfFacing.clone().add(new Vector3(0, 1.6, 0)), { margin: 1.1 })
          nightItems.vita = vita.root
        }
        // La commode noire : refaite en bois foncé, pour qu'on voie ses tiroirs
        const chest = findMesh(chambre, CHEST)
        if (chest) {
          const back = new Box3().setFromObject(chest).getCenter(new Vector3()).sub(rooms[0].sphere.center).setY(0).normalize()
          decor.push(replaceMesh(chambre, chest, measures[0], back, makeDrawerChest))
        }
        // La table de chevet devient une étagère chromée, élargie côté pièce : la platine dessus, mes chaussures dessous
        const nightstand = findMesh(chambre, NIGHTSTAND)
        if (nightstand) {
          const m = measures[0]
          const back = new Box3().setFromObject(nightstand).getCenter(new Vector3()).sub(rooms[0].sphere.center).setY(0).normalize()
          let width = 0, depth = 0
          const shelf = replaceMesh(chambre, nightstand, m, back, (W, D, H) => {
            width = W
            depth = D
            return makeWireShelf(W + CHEVET.widen, D, H)
          })
          // Le côté ajouté va vers le milieu de la pièce, l'autre reste contre le mur
          const side = Math.sign(shelf.root.worldToLocal(rooms[0].sphere.center.clone()).x) || 1
          shelf.root.translateX(side * (CHEVET.widen / 2) * sc)
          shelf.root.updateMatrixWorld(true)
          const [low, middle, top] = shelf.levels
          // Sur le dessus, du mur vers la pièce : la lampe champignon, la PS Vita et son savon, la platine
          const edge = -side * (width + CHEVET.widen) / 2 // le bout côté mur
          const onTop = (object, along, z = 0) => {
            shelf.root.attach(object)
            object.position.set(edge + side * along, top, z)
            object.updateMatrixWorld(true)
          }
          if (bedside) {
            onTop(bedside.root, CHEVET.lamp, -depth * 0.15)
            bedside.light.position.copy(chambre.worldToLocal(bedside.root.localToWorld(bedside.bulb.clone())))
          }
          if (nightItems.vita) onTop(nightItems.vita, CHEVET.vita)
          const turntable = makeTurntable()
          turntable.root.scale.setScalar(CHEVET.turntable)
          turntable.root.position.set(-edge - side * 0.23 * CHEVET.turntable, top, 0)
          turntable.root.rotation.y = -side * 0.15
          shelf.root.add(turntable.root)
          decor.push(shelf, turntable)
          // On l'écarte du meuble noir, vers le bord droit de la pièce
          shelf.root.translateX(-side * CHEVET.shift * sc)
          shelf.root.updateMatrixWorld(true)
          if (bedside) bedside.light.position.copy(chambre.worldToLocal(bedside.root.localToWorld(bedside.bulb.clone())))
          inspectable(turntable.root, "Ma platine", mix([shelfFacing, 1], [WORLD_UP, 1]), { margin: 1.1 })
          // Trois paires par plateau, réduites si l'étagère est peu profonde
          const fit = Math.min(1, (depth - 0.02) / 0.28)
          ;[low, middle].forEach((y, level) => {
            for (let k = 0; k < 3; k++) {
              const pair = makeShoePair(level * 3 + k)
              pair.position.set((k - 1) * CHEVET.shoe, y, 0)
              pair.rotation.y = (k - 1) * 0.08
              pair.scale.setScalar(fit)
              shelf.root.add(pair)
            }
          })
        }
        // Une deuxième étagère sous la première : une plante tombante et mes films
        const shelf = findMesh(chambre, SHELF)
        if (shelf && books.length) {
          const lower = shelf.clone()
          shelf.parent.add(lower)
          const at = shelf.getWorldPosition(new Vector3()).addScaledVector(WORLD_UP, -LOWER_SHELF.drop * sc)
          lower.position.copy(shelf.parent.worldToLocal(at))
          lower.updateMatrixWorld(true)
          const box = new Box3().setFromObject(lower)
          const along = new Vector3().crossVectors(WORLD_UP, shelfFacing)
          const top = box.getCenter(new Vector3()).setY(box.max.y)
          const put = (object, offset, size) => {
            object.root.scale.setScalar(sc * size)
            object.root.position.copy(top).addScaledVector(along, offset * sc)
            object.root.lookAt(object.root.position.clone().add(shelfFacing))
            object.root.updateMatrixWorld(true)
            chambre.attach(object.root)
            decor.push(object)
          }
          const plant = makeTrailingPlant()
          put(plant, LOWER_SHELF.plant, SIZES.plant)
          const mangas = makeMangas()
          put(mangas, LOWER_SHELF.mangas, SIZES.mangas)
          inspectable(mangas.root, "Mes mangas", shelfFacing.clone().add(new Vector3(0, 0.25, 0)), { margin: 1 })
          const dvds = makeDVDs()
          put(dvds, LOWER_SHELF.dvds, SIZES.dvds)
          const soap = makeSoap()
          put(soap, LOWER_SHELF.soap, SIZES.dvds) // un pain de savon rose à côté des films, tourné pour tenir sur la planche
          soap.root.rotateY(Math.PI / 2)
          inspectable(dvds.root, "Mes films", shelfFacing.clone().add(new Vector3(0, 0.25, 0)), { margin: 1 })
        }
      }
      // Le PC de la chambre devient un PC gamer, ceux de la classe des PC d'école détaillés
      const tower = findMesh(chambre, TOWER)
      if (tower && measures[0]) {
        const m = measures[0]
        const pc = replaceMesh(chambre, tower, m, m.facing.clone().negate(), (w, d, h) => makeGamingPC(w, d, h, m.scale))
        const glass = findMesh(chambre, TOWER_GLASS)
        if (glass) glass.visible = false
        decor.push(pc)
        inspectable(pc.root, "Mon PC", mix([m.side, 0.7], [m.facing, -0.6], [WORLD_UP, 0.3]))
      }
      for (const spec of SCHOOL_TOWERS) {
        const mesh = findMesh(classe, spec)
        if (!mesh || !measures[1]) continue
        const pc = replaceMesh(classe, mesh, measures[1], measures[1].facing.clone().negate(), makeSchoolPC)
        decor.push(pc)
      }
      const [m0, m1, m2] = measures
      if (m0) {
        const headset = makeHeadset()
        place(chambre, m0, headset.root, HEADSET, m0.deskTop)
        decor.push(headset)
        const lava = makeLavaLamp(m0.scale * LAVA_SIZE)
        place(chambre, m0, lava.root, LAVA_LAMP, m0.deskTop)
        lava.root.scale.multiplyScalar(LAVA_SIZE)
        decor.push(lava)
        // Le pot à crayons et la lampe à lave échangent leur place
        const pot = PENCIL_POT.map((spec) => findMesh(chambre, spec)).filter(Boolean)
        if (pot.length) {
          const box = new Box3()
          for (const mesh of pot) box.expandByObject(mesh)
          const potSpot = box.getCenter(new Vector3()).setY(box.min.y)
          const shift = lava.root.getWorldPosition(new Vector3()).sub(potSpot)
          for (const mesh of pot) {
            mesh.position.copy(mesh.parent.worldToLocal(mesh.getWorldPosition(new Vector3()).add(shift)))
            mesh.updateMatrixWorld()
          }
          lava.root.position.copy(chambre.worldToLocal(potSpot.addScaledVector(SCREEN_RIGHT, LAVA_RIGHT * m0.scale)))
          lava.root.updateMatrixWorld(true)
        }
      }
      if (m1) {
        const notebook = makeNotebook()
        place(classe, m1, notebook.root, NOTEBOOK, m1.deskTop + NOTEBOOK.lift * m1.scale)
        notebook.root.scale.multiplyScalar(NOTEBOOK.size)
        decor.push(notebook)
        // La petite baie réseau, entre les deux écrans
        const netSwitch = makeSwitch()
        const between = m1.screens.clone().sub(m1.center).setY(0)
        place(classe, m1, netSwitch.root, { ahead: between.dot(m1.facing) / m1.scale, aside: between.dot(m1.side) / m1.scale }, m1.deskTop)
        decor.push(netSwitch)
        inspectable(netSwitch.root, "La baie réseau", mix([m1.facing, -1], [WORLD_UP, 0.35]), { margin: 1 })
        inspectable(notebook.root, "Le cahier", mix([WORLD_UP, 1], [m1.facing, -0.3]), { margin: 0.8, blend: 0 })
        const backpack = makeBackpack()
        place(classe, m1, backpack.root, BACKPACK, m1.floor)
        decor.push(backpack)
      }
      if (m2) {
        const water = makeWaterBottle()
        place(bureau, m2, water.root, WATER, m2.deskTop)
        const banana = makeBanana()
        place(bureau, m2, banana.root, BANANA, m2.deskTop)
        banana.root.rotateY(0.6)
        decor.push(water, banana)
        // Le caisson et sa plante laissent la place, contre le mur du fond : la grande plante collée au bout du bureau,
        // puis la fontaine à eau à sa droite
        const cabinet = findMesh(bureau, OFFICE_CABINET)
        const desk = findMesh(bureau, OFFICE_DESK)
        if (cabinet && desk && officeWall) {
          for (const spec of [OFFICE_CABINET, PLANTS, ...OFFICE_PLANT]) {
            const mesh = findMesh(bureau, spec)
            if (mesh) mesh.visible = false
          }
          // Dans le repère du mur : `n` vers la pièce, `u` le long du mur, orienté du bureau vers le caisson
          const n = officeWall.normal
          const u = new Vector3().crossVectors(WORLD_UP, n)
          const pos = desk.geometry.attributes.position
          const along = []
          for (let i = 0; i < pos.count; i++) along.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(desk.matrixWorld).dot(u))
          const deskCenter = (Math.min(...along) + Math.max(...along)) / 2
          const sign = new Box3().setFromObject(cabinet).getCenter(new Vector3()).dot(u) > deskCenter ? 1 : -1
          const deskEnd = sign > 0 ? Math.max(...along) : Math.min(...along)
          const wall = officeWall.at.dot(n)
          const sc = m2.scale
          const { plant: P, cooler: C, cups, gap } = COOLER_SPOT
          // Posé au sol, collé au mur, à `offset` mètres du bout du bureau, face à la pièce
          const stand = (object, offset, half) => {
            object.root.scale.setScalar(sc)
            object.root.position.copy(u).multiplyScalar(deskEnd + sign * offset * sc).addScaledVector(n, wall + (half + gap) * sc)
            object.root.position.y = m2.floor
            object.root.lookAt(object.root.position.clone().add(n))
            object.root.updateMatrixWorld(true)
            bureau.attach(object.root)
          }
          const plant = makeBigPlant()
          stand(plant, P + gap, P)
          const cooler = makeWaterCooler()
          stand(cooler, 2 * P + cups + C + 2 * gap, C)
          decor.push(plant, cooler)
        }
        const headset = makeDeskHeadset()
        place(bureau, m2, headset.root, DESK_HEADSET, m2.deskTop)
        headset.root.rotateY(-0.5)
        const badge = makeBadge(ecritelLogo)
        const screens = m2.screens.clone().sub(m2.center).setY(0)
        place(bureau, m2, badge.root, { ahead: screens.dot(m2.facing) / m2.scale - BADGE.before, aside: screens.dot(m2.side) / m2.scale + BADGE.left }, m2.deskTop)
        badge.root.scale.multiplyScalar(BADGE.size)
        badge.root.rotateY(Math.PI + 0.3)
        decor.push(headset, badge)
        inspectable(badge.root, "Mon badge Ecritel", mix([WORLD_UP, 1], [m2.facing, -0.3]), { margin: 1, blend: 0 })
        inspectable(banana.root, "Ma banane", mix([m2.facing, -0.6], [WORLD_UP, 0.8]))
      }
      // La fenêtre du bureau ouvre sur la salle serveurs : des portes vitrées qui s'éclaircissent au survol
      let vault = null
      const serverWindow = findMesh(bureau, SERVER_WINDOW)
      if (serverWindow && m2) {
        const w = wallFrame(serverWindow, rooms[2].sphere.center)
        vault = makeServerRoom(w.width, w.height, m2.scale, findMesh(bureau, BUREAU_WALLS)?.material)
        vault.root.position.copy(w.center).addScaledVector(WORLD_UP, -w.height / 2)
        vault.root.lookAt(vault.root.position.clone().add(w.normal))
        vault.root.updateMatrixWorld(true)
        bureau.attach(vault.root)
        decor.push(vault)
        inspectable(vault.glass, "La salle serveurs", mix([w.normal, 1], [WORLD_UP, 0.5]), { hide: 2, margin: 0.8, blend: 0 })
      }
      // Les écrans : on cache le personnage, assis devant
      rooms.forEach((r, k) => {
        if (!measures[k]) return
        r.object.traverse((c) => {
          // (pas ceux qui font partie d'un objet déjà cliquable, comme l'écran de la PS Vita)
          if (c.isMesh && c.material.map && c.material.isMeshBasicMaterial && !actionOf(c)) {
            inspectable(c, "Voir l'écran", mix([measures[k].facing, -1], [WORLD_UP, 0.15]), { hide: k, margin: 0.85, blend: 0.1 })
            // L'écran qui fait défiler mes sites : une fois zoomé, un clic ouvre celui qui est affiché
            const showcase = screens.find((screen) => screen.mesh === c)?.painters.find((paint) => "showing" in paint)
            if (showcase) c.userData.action.link = () => showcase.showing?.url
          }
        })
      })

      scene.userData.world = { rooms, people, screens, bedside, plants, globes, kevin, banner, wallScreen, lego, decor, vault, overview: sphereOf(scene) }
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
      if (!shown(hit.object)) continue
      const action = actionOf(hit.object)
      if (action) return action
      // Un objet plein sans action (le bureau, un mur) cache ce qu'il y a derrière
      if (hit.object.isMesh && ![hit.object.material].flat().some((m) => m.transparent)) return null
    }
    return null
  }
  const hoverOn = (action) => {
    state.current.hover = action
    document.body.style.cursor = action ? "pointer" : ""
    // L'étiquette ne change que quand on passe d'un objet à un autre (pas de rendu React à chaque mouvement)
    // Un nom d'objet ou un type qui a une étiquette, traduit à l'affichage (ui.objects, ui.labels)
    const text = action && (action.label ?? (action.type in ui.labels ? action.type : null))
    setLabel((current) => (current?.object === action?.object && current?.text === text ? current : text ? { text, object: action.object } : null))
  }
  const inspect = (action) => {
    const s = state.current
    s.inspect = action
    if (action) {
      s.shown = action
      s.inspectOffset = scroll.offset
      // Cadrage mesuré une seule fois, dans le repère de la pièce : il suit son flottement sans trembler
      const box = new Box3()
      for (const target of action.object) box.expandByObject(target)
      let room = action.object[0]
      while (room && !world.rooms.some((r) => r.object === room)) room = room.parent
      const toRoom = (v) => (room ? room.worldToLocal(v) : v)
      s.frameOf = {
        room,
        center: toRoom(box.getCenter(new Vector3())),
        bottom: toRoom(box.getCenter(new Vector3()).setY(box.min.y)),
        radius: box.getSize(new Vector3()).length() / 2,
      }
    }
    setInspecting(!!action)
  }
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && inspect(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })
  // Le compteur d'objets découverts : chaque objet cliquable compte une fois (voir Discoveries)
  useEffect(() => {
    const keys = new Set()
    scene.traverse((o) => o.userData.action && keys.add(discoveryKey(o.userData.action)))
    announce("discoverable", [...keys])
  }, [scene])
  // Pendant l'examen d'un objet, seul cet objet réagit : les autres ne s'allument pas et ne s'ouvrent pas
  const onPointerMove = (e) => {
    const action = pick(e)
    hoverOn(!state.current.inspect || action === state.current.inspect ? action : null)
  }
  const onPointerLeave = () => hoverOn(null)
  const onClick = (e) => {
    const action = pick(e)
    const s = state.current
    // Pendant l'examen d'un objet, un clic ouvre son lien s'il en a un, sinon revient à la vue normale
    if (s.inspect) {
      const url = action === s.inspect && action.link?.()
      return url ? window.open(url, "_blank", "noopener") : inspect(null)
    }
    if (action) announce("discover", discoveryKey(action))
    if (!action) return
    const now = clock.elapsedTime
    if (action.type === "inspect") {
      inspect(action)
    } else if (action.type === "person") {
      s.waves[action.room] = now
      setBubble({ room: action.room, at: now })
    } else if (action.type === "dog") {
      s.dogWake = now
      sound.bark()
      inspect({ type: "inspect", object: [world.lego.root], normal: null, margin: 1.1, blend: 1, hide: -1 })
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

    // Examen d'un objet : la caméra le rejoint, et revient si on scrolle
    if (s.inspect && Math.abs(scroll.offset - s.inspectOffset) > 0.01) inspect(null)
    s.zoom = reducedMotion ? (s.inspect ? 1 : 0) : MathUtils.damp(s.zoom, s.inspect ? 1 : 0, INSPECT.speed, delta)
    scroll.inspect = s.zoom // les cartes de texte s'effacent (voir Overlay)
    const framed = s.frameOf
    if (framed?.room) framed.room.updateMatrixWorld() // la pièce vient de bouger : sa position de cette image
    const fromRoom = (local, out) => (framed.room ? framed.room.localToWorld(out.copy(local)) : out.copy(local))
    if (s.zoom > 0.001 && s.shown && framed) {
      fromRoom(framed.center, s.focus)
      const radius = framed.radius
      const dir = s.shown.normal ? s.eye.copy(s.shown.normal).lerp(s.axes.view, s.shown.blend).normalize() : s.eye.copy(s.axes.view)
      const fit = Math.min(MathUtils.degToRad(camera.fov), 2 * Math.atan(Math.tan(MathUtils.degToRad(camera.fov) / 2) * camera.aspect))
      const distance = (radius / Math.sin(fit / 2)) * s.shown.margin
      const e = ease(s.zoom)
      camera.position.lerp(dir.multiplyScalar(distance).add(s.focus), e)
      s.lookAt.lerp(s.focus, e)
    }

    // Léger décalage de la caméra qui suit la souris
    if (!reducedMotion) {
      s.parallax.x = MathUtils.damp(s.parallax.x, pointer.x, 3, delta)
      s.parallax.y = MathUtils.damp(s.parallax.y, pointer.y, 3, delta)
      const amount = MathUtils.lerp(a.distance, b.distance, t) * PARALLAX
      const still = 1 - s.zoom
      camera.position.addScaledVector(s.axes.right, s.parallax.x * amount * still).addScaledVector(s.axes.up, s.parallax.y * amount * still)
    }
    camera.lookAt(s.lookAt)

    // Le personnage apparaît dans la pièce visitée ; survolé, il regarde le visiteur ; cliqué, il fait coucou
    people.forEach((person, k) => {
      if (!person) return
      const hidden = s.shown?.hide === k ? s.zoom : 0 // il s'efface quand on regarde ses écrans
      setOpacity(person, MathUtils.smoothstep(presence(k), 0.15, 0.85) * (1 - hidden))
      const hovered = s.hover?.type === "person" && s.hover.room === k
      s.attention[k] = MathUtils.damp(s.attention[k], hovered ? 1 : 0, 4, delta)
      const wave = reducedMotion ? 0 : pulse(now - s.waves[k], WAVE_SECONDS)
      if (person.root.visible) animatePerson(person, time, k * 3.7, reducedMotion ? null : camera.position, { attention: s.attention[k], wave })
    })

    // Lego se réveille quand on clique dessus, quand on le survole, ou quand le personnage de la chambre se retourne
    const turned = Math.max(s.attention[0], pulse(now - s.waves[0], WAVE_SECONDS))
    const petted = s.hover?.type === "dog" ? 0.8 : 0
    // Survolé, il tourne la tête vers le visiteur (la tête regarde vers +x dans son repère)
    s.dogLook = MathUtils.damp(s.dogLook, petted ? 1 : 0, 4, delta)
    let look = null
    if (s.dogLook > 0.01 && !reducedMotion) {
      // La caméra vue depuis sa tête, dans son repère : il tourne la tête vers elle et la lève
      const seen = world.lego.head.parent.worldToLocal(s.eye.copy(camera.position)).sub(world.lego.head.position)
      look = {
        amount: s.dogLook,
        yaw: MathUtils.clamp(Math.atan2(-seen.z, seen.x), -0.9, 0.9),
        pitch: MathUtils.clamp(Math.atan2(seen.y, Math.hypot(seen.x, seen.z)), 0, 0.7),
      }
    }
    animateDog(world.lego, time, reducedMotion ? 0 : Math.max(pulse(now - s.dogWake, DOG.awakeSeconds), turned * 0.6, petted), look)

    // Bulle au-dessus du personnage
    if (bubble && anchor.current) {
      const target = people[bubble.room]?.parts.head
      if (target) {
        target.getWorldPosition(anchor.current.position)
        anchor.current.position.y += target.getWorldScale(s.scale).y * 0.32
      }
    }

    // Ce qui mène ailleurs s'illumine au survol, et son étiquette flotte au-dessus
    s.glow.banner = MathUtils.damp(s.glow.banner, s.hover?.type === "banner" ? 1 : 0, 6, delta)
    if (world.banner) world.banner.material.emissiveIntensity = s.glow.banner * 0.45
    if (label && labelAnchor.current) {
      s.box.makeEmpty()
      for (const target of [].concat(label.object)) s.box.expandByObject(target)
      s.box.getCenter(labelAnchor.current.position)
      labelAnchor.current.position.y = s.box.max.y
    }
    if (inspecting && hintAnchor.current && framed) fromRoom(framed.bottom, hintAnchor.current.position)

    // Décor : plantes, globes, bannière, écrans, lampe de chevet, poussière
    world.plants.forEach((p, k) => {
      p.rotation.z = Math.sin(time * 0.8 + k) * 0.05
      p.rotation.x = Math.sin(time * 0.6 + k * 2) * 0.035
    })
    s.globeSpin = MathUtils.damp(s.globeSpin, s.hover?.type === "globe" ? 0.5 : 0, 1.2, delta)
    if (!reducedMotion) world.globes.forEach((g) => (g.rotation.y += delta * (0.25 + s.globeSpin * 8)))
    if (world.kevin) world.kevin.lit = MathUtils.damp(world.kevin.lit, s.hover?.object === world.kevin.root ? 1 : 0, 6, delta)
    if (world.banner) {
      // Au survol, la bannière ondule davantage, comme soulevée par un courant d'air
      // La phase avance à sa propre vitesse : changer la vitesse ne la fait pas sauter
      const sway = 1 + s.glow.banner * 1.5
      if (!reducedMotion) s.bannerPhase += delta * (0.7 + s.glow.banner)
      world.banner.rotation.x = -(0.5 + 0.5 * Math.sin(s.bannerPhase)) * 0.08 * sway
      world.banner.rotation.z = Math.sin(time * 0.45) * 0.015 * sway
    }
    world.decor.forEach((d) => d.animate(time, night))
    // L'écran mural du bureau : la supervision s'allume quelques secondes après l'arrivée, ou au survol, puis se rendort
    if (world.wallScreen) {
      const here = focus(2) > 0.9
      const hovered = s.hover?.type === "ecritel"
      if (here && !s.wall.here) s.wall.wakeAt = now + WALL_SCREEN.delay
      if (!here) s.wall.wakeAt = null
      s.wall.here = here
      if (hovered || (s.wall.wakeAt !== null && now >= s.wall.wakeAt)) {
        s.wall.until = now + WALL_SCREEN.hold
        s.wall.wakeAt = null
      }
      const awake = now < s.wall.until ? 1 : 0
      s.wall.glow = reducedMotion ? awake : MathUtils.damp(s.wall.glow, awake, 3, delta)
      world.wallScreen.draw(time, now, s.wall.glow)
    }
    if (world.vault) {
      const action = world.vault.glass.userData.action
      s.vaultOpen = MathUtils.damp(s.vaultOpen, s.hover === action || s.inspect === action ? 1 : 0, 5, delta)
      world.vault.open(s.vaultOpen)
    }
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
      <primitive
        object={scene}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        onPointerMissed={() => state.current.inspect && inspect(null)}
      />
      {bubble && (
        <group ref={anchor}>
          {/* Dans le calque fixe de la scène, pas dans le conteneur qui défile */}
          <Html center portal={{ current: gl.domElement.parentNode }} zIndexRange={[35, 0]} style={{ pointerEvents: "none" }}>
            <div className="bubble" role="status">
              {ui.phrases[ROOMS[bubble.room]]}
            </div>
          </Html>
        </group>
      )}
      {inspecting && (
        <group ref={hintAnchor}>
          <Html center portal={{ current: gl.domElement.parentNode }} zIndexRange={[33, 0]} style={{ pointerEvents: "none" }}>
            <div className="hover-label inspect-hint">{state.current.shown?.link ? ui.openHint : ui.inspectHint}</div>
          </Html>
        </group>
      )}
      {label && !inspecting && (
        <group ref={labelAnchor}>
          <Html center portal={{ current: gl.domElement.parentNode }} zIndexRange={[34, 0]} style={{ pointerEvents: "none" }}>
            <div className="hover-label">{ui.labels[label.text] ?? ui.objects[label.text] ?? label.text}</div>
          </Html>
        </group>
      )}
    </>
  )
}

useGLTF.preload(MODEL_URL)
