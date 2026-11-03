import { ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three"

// Un chat gris-bleu aux yeux dorés, roulé en boule sur le tapis de la chambre.
// En mètres, l'origine au sol au centre du chat, la tête vers +x.

export function makeCat() {
  const fur = new MeshStandardMaterial({ color: "#5a5870", roughness: 0.9 })
  const eyes = new MeshStandardMaterial({ color: "#ffd36a", emissive: "#ffb43a", emissiveIntensity: 0.8 })
  const pink = new MeshStandardMaterial({ color: "#c98a8a", roughness: 0.8 })
  const root = new Group()

  const body = new Mesh(new SphereGeometry(1, 20, 14), fur)
  body.scale.set(0.2, 0.11, 0.15)
  body.position.y = 0.1
  root.add(body)

  // Tête posée sur les pattes ; elle se relève quand le chat se réveille
  const head = new Group()
  head.position.set(0.17, 0.08, 0.05)
  root.add(head)
  const skull = new Mesh(new SphereGeometry(0.07, 16, 12), fur)
  skull.scale.set(1, 0.9, 1.05)
  head.add(skull)
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(0.028, 0.055, 4), fur)
    ear.position.set(0, 0.065, side * 0.04)
    ear.rotation.x = side * 0.3
    head.add(ear)
    const eye = new Mesh(new SphereGeometry(0.012, 8, 6), eyes)
    eye.position.set(0.058, 0.012, side * 0.028)
    eye.scale.set(0.6, 0.15, 1) // fermés : une fente
    head.add(eye)
  }
  const nose = new Mesh(new SphereGeometry(0.008, 6, 4), pink)
  nose.position.set(0.07, -0.008, 0)
  head.add(nose)

  // Queue enroulée autour du corps, en perles qui ondulent
  const tail = []
  for (let i = 0; i < 16; i++) {
    const bead = new Mesh(new SphereGeometry(0.026 - i * 0.0008, 10, 8), fur)
    root.add(bead)
    tail.push(bead)
  }

  root.traverse((child) => {
    if (child.isMesh) child.castShadow = true
  })
  return { root, head, body, tail, eyes: head.children.filter((c) => c.material === eyes) }
}

// Respiration, bout de queue qui bat ; `awake` (0 à 1) relève la tête et ouvre les yeux
export function animateCat(cat, time, awake) {
  cat.body.scale.y = 0.11 * (1 + Math.sin(time * 1.8) * 0.04 * (1 - awake))
  cat.head.position.y = 0.08 + awake * 0.07
  cat.head.rotation.z = awake * 0.25
  cat.head.rotation.y = awake * Math.sin(time * 0.8) * 0.3
  for (const eye of cat.eyes) eye.scale.y = 0.15 + awake * 0.85
  cat.tail.forEach((bead, i) => {
    const a = Math.PI * 0.15 + i * 0.19 + (i > 9 ? Math.sin(time * (1.5 + awake * 3) + i) * 0.06 * (i - 9) : 0)
    bead.position.set(Math.cos(a) * 0.19, 0.03, Math.sin(a) * 0.16 + 0.02)
  })
}
