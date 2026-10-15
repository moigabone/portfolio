"use client"
import { useMemo, useRef } from "react"
import { useGLTF, useScroll } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { Box3, MathUtils, Sphere, Vector3 } from "three"
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

const sphereOf = (object) => new Box3().setFromObject(object).getBoundingSphere(new Sphere())

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
      material.userData.graded = true
    })

    const overview = sphereOf(scene)
    return SECTIONS.map((s) => ({
      sphere: s.room ? sphereOf(scene.getObjectByName(s.room)) : overview,
      zoom: s.room ? ROOM_ZOOM : OVERVIEW_ZOOM,
      right: s.right,
    }))
  }, [scene])

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

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)
