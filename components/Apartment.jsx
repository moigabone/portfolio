"use client"
import { useMemo, useRef } from "react"
import { useGLTF, useScroll } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { Box3, CanvasTexture, DoubleSide, MathUtils, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Sphere, Vector3 } from "three"
import { SECTIONS, NB_SECTIONS } from "./Sections"

const MODEL_URL = "/models/appart.glb"
const MODEL_ROTATION = -Math.PI / 3

// Réglages de la caméra
const VIEW_DIRECTION = new Vector3(0, 0.35, 1).normalize() // vue de face, légèrement en plongée
const OVERVIEW_ZOOM = 0.75 // vue d'ensemble : l'immeuble entier est cadré
const ROOM_ZOOM = 0.62 // < 1 : la caméra se rapproche de chaque pièce
const PARALLAX = 0.08 // amplitude du mouvement de caméra qui suit la souris

// Renforce les couleurs d'origine du modèle (1 = couleurs de Blender)
const SATURATION = 1.4

// Repère de la caméra (fixe : seule sa position change)
const FORWARD = VIEW_DIRECTION.clone().negate()
const RIGHT = new Vector3().crossVectors(FORWARD, new Vector3(0, 1, 0)).normalize()
const UP = new Vector3().crossVectors(RIGHT, FORWARD).normalize()

// Nuit : les écrans s'allument, une lampe chaude éclaire chaque pièce
const SCREEN_MATERIAL = "Material.004" // la dalle des écrans, dans les trois pièces
const ROOMS = ["chambre", "classe", "bureau"]
const LAMP = { color: "#ffb46b", intensity: 6, reach: 1.7 } // reach : portée, en rayons de pièce

// L'affiche de la chambre devient une bannière brodée : un clin d'œil à mes autres sites
const POSTER = { room: "chambre", material: "Matériau.027", vertices: 12 }

const sphereOf = (object) => new Box3().setFromObject(object).getBoundingSphere(new Sphere())

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

// Remplace l'affiche par une bannière de la même taille, posée juste devant le mur
function hangBanner(scene) {
  const room = scene.getObjectByName(POSTER.room)
  let poster = null
  room?.traverse((child) => {
    if (child.isMesh && child.material.name === POSTER.material && child.geometry.attributes.position.count === POSTER.vertices) poster = child
  })
  if (!poster) return
  poster.geometry.computeBoundingBox()
  const box = poster.geometry.boundingBox
  const size = box.getSize(new Vector3())
  const banner = new Mesh(
    new PlaneGeometry(size.x, size.y),
    new MeshStandardMaterial({ map: bannerTexture(), transparent: true, alphaTest: 0.5, roughness: 0.85, side: DoubleSide }),
  )
  banner.position.set((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.max.z + 0.002)
  banner.position.applyMatrix4(poster.matrix)
  banner.name = "banniere"
  poster.parent.add(banner)
  poster.visible = false
}

// Position et cible de la caméra pour cadrer une sphère, du côté opposé à la carte de texte
function frame(shot, camera, size, out) {
  const isMobile = size.width < 768
  const aspect = size.width / size.height
  const vFov = MathUtils.degToRad(camera.fov)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  // La carte occupe la moitié de l'écran (à côté sur ordinateur, en dessous sur mobile)
  const fitFov = isMobile ? Math.min(vFov / 2, hFov) : Math.min(vFov, hFov / 2)
  const distance = (shot.sphere.radius / Math.sin(fitFov / 2)) * shot.zoom

  out.target.copy(shot.sphere.center)
  if (isMobile) {
    out.target.addScaledVector(UP, -0.5 * distance * Math.tan(vFov / 2))
  } else {
    out.target.addScaledVector(RIGHT, (shot.right ? 0.42 : -0.42) * distance * Math.tan(hFov / 2))
  }
  out.position.copy(out.target).addScaledVector(VIEW_DIRECTION, distance)
  out.distance = distance
  return out
}

const makeView = () => ({ target: new Vector3(), position: new Vector3(), distance: 0 })

export default function Apartment({ reducedMotion = false }) {
  const scroll = useScroll()
  const { camera, size, pointer } = useThree()
  const { scene } = useGLTF(MODEL_URL)
  const views = useRef({ a: makeView(), b: makeView(), lookAt: new Vector3(), parallax: { x: 0, y: 0 } })

  // Prépare le modèle une seule fois : centrage, ombres, couleurs, puis calcule le cadrage de chaque section
  const shots = useMemo(() => {
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
      if (material.name === SCREEN_MATERIAL) {
        material.emissive.set("#5f7dff")
        material.emissiveIntensity = 0.7
      }
      material.userData.graded = true
    })
    if (!scene.getObjectByName("banniere")) hangBanner(scene)

    const overview = sphereOf(scene)
    return SECTIONS.map((s) => ({
      sphere: s.room ? sphereOf(scene.getObjectByName(s.room)) : overview,
      zoom: s.room ? ROOM_ZOOM : OVERVIEW_ZOOM,
      right: s.right,
    }))
  }, [scene])

  // Une lampe au milieu de chaque pièce, un peu au-dessus du sol
  const lamps = useMemo(
    () =>
      ROOMS.map((name) => {
        const { center, radius } = sphereOf(scene.getObjectByName(name))
        return { name, position: center.clone().add(new Vector3(0, radius * 0.1, radius * 0.15)), distance: radius * LAMP.reach }
      }),
    [scene],
  )

  useFrame((_, delta) => {
    const v = views.current

    // Position entre deux sections, adoucie pour marquer une pause sur chaque pièce
    const position = scroll.offset * (NB_SECTIONS - 1)
    const i = Math.min(Math.floor(position), NB_SECTIONS - 2)
    const t = MathUtils.smootherstep(position - i, 0, 1)

    const a = frame(shots[i], camera, size, v.a)
    const b = frame(shots[i + 1], camera, size, v.b)
    camera.position.lerpVectors(a.position, b.position, t)
    v.lookAt.lerpVectors(a.target, b.target, t)

    // Léger décalage de la caméra qui suit la souris
    if (!reducedMotion) {
      v.parallax.x = MathUtils.damp(v.parallax.x, pointer.x, 3, delta)
      v.parallax.y = MathUtils.damp(v.parallax.y, pointer.y, 3, delta)
      const amount = MathUtils.lerp(a.distance, b.distance, t) * PARALLAX
      camera.position.addScaledVector(RIGHT, v.parallax.x * amount).addScaledVector(UP, v.parallax.y * amount)
    }
    camera.lookAt(v.lookAt)
  })

  return (
    <>
      <primitive object={scene} />
      {lamps.map((l) => (
        <pointLight key={l.name} position={l.position} color={LAMP.color} intensity={LAMP.intensity} distance={l.distance} decay={2} />
      ))}
    </>
  )
}

useGLTF.preload(MODEL_URL)
