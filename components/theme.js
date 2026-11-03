// Jour ou nuit : par défaut selon l'heure de Paris, ou le choix du visiteur pour sa visite

const KEY = "portfolio:theme"

export function parisIsDay(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(date))
  return hour >= 7 && hour < 19
}

// Le choix ne vaut que pour la visite en cours : revenir le soir redonne la nuit
export function savedTheme() {
  try {
    const value = sessionStorage.getItem(KEY)
    return value === "day" || value === "night" ? value : null
  } catch {
    return null
  }
}

export function saveTheme(value) {
  try {
    sessionStorage.setItem(KEY, value)
  } catch {
    // stockage indisponible (navigation privée) : le choix vaut jusqu'au rechargement
  }
}

// Vitesse de la transition jour / nuit dans la scène 3D (amortissement)
export const DAYLIGHT_SPEED = 2
