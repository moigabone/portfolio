// Le niveau de qualité, choisi une fois au chargement selon l'appareil :
// - high : un ordinateur, rendu complet ;
// - mobile : un téléphone ou une tablette (écran tactile), ou un ordinateur modeste ;
// - low : un téléphone modeste (peu de cœurs ou de mémoire).
// En plus, la résolution baisse toute seule si l'image rame (voir AdaptiveQuality dans Experience).
//
// `dpr` : la densité de pixels, de [la plus basse, la plus haute] ; `shadows` : la taille de la carte d'ombres (0 : sans ombres) ;
// `liveShadows` : les ombres recalculées à chaque image (sinon, quelques fois par seconde) ; `decorLights` : les petites lumières
// colorées du décor (PC, lampe à lave, holocron…) ; `stars` : le nombre d'étoiles ; `hover` : un curseur qui survole (une souris)
const TIERS = {
  high: { name: "high", dpr: [1, 2], antialias: true, shadows: 2048, liveShadows: true, decorLights: true, stars: 2500 },
  mobile: { name: "mobile", dpr: [0.85, 1.5], antialias: true, shadows: 1024, liveShadows: false, decorLights: false, stars: 1500 },
  low: { name: "low", dpr: [0.7, 1], antialias: false, shadows: 0, liveShadows: false, decorLights: false, stars: 800 },
}

function detect() {
  if (typeof window === "undefined") return { ...TIERS.high, hover: true }
  const touch = window.matchMedia("(pointer: coarse)").matches
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4
  const tier = touch ? (weak ? TIERS.low : TIERS.mobile) : weak ? TIERS.mobile : TIERS.high
  return { ...tier, hover: window.matchMedia("(hover: hover)").matches }
}

export const QUALITY = detect()
