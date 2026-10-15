// Tout le texte du site est ici : modifie ce fichier pour mettre à jour le portfolio.
// ⚠️ Les éléments marqués "exemple" sont fictifs et à remplacer par tes vraies informations.

export const profile = {
  name: "Gabin Clavier",
  firstName: "Gabin",
  role: "Étudiant ingénieur · Alternant ingénieur réseau",
  tagline: "Réseaux le jour, 3D et web la nuit. Bienvenue dans mon immeuble : chaque étage raconte une partie de mon parcours.",
  highlights: [
    "🎓 Cycle ingénieur à l'ESIEA",
    "🌐 Alternant ingénieur réseau chez Ecritel",
    "🧊 Passionné de 3D web (Blender, Three.js)",
  ],
}

// Une pièce du modèle 3D = une étape du parcours
export const projects = {
  title: "Mes projets perso 🛠️",
  subtitle: "Ma chambre, là où naissent les projets du soir.",
  items: [
    {
      title: "Portfolio 3D",
      description: "Ce site ! Pièces modélisées dans Blender, animées avec React Three Fiber.",
      tags: ["Blender", "Three.js", "Next.js"],
      url: "https://github.com/moigabone",
    },
    {
      title: "Homelab réseau (exemple)",
      description: "Infra virtualisée avec VLAN, pare-feu et supervision.",
      tags: ["Proxmox", "pfSense", "Grafana"],
      url: "https://github.com/moigabone",
    },
    {
      title: "Bot Discord (exemple)",
      description: "Bot communautaire avec commandes et tableau de bord web.",
      tags: ["Node.js", "API REST"],
      url: "https://github.com/moigabone",
    },
  ],
}

export const education = {
  title: "Ma formation 🎓",
  subtitle: "La salle de classe.",
  items: [
    // Dates à vérifier
    { period: "Depuis 2025", title: "Cycle ingénieur — ESIEA", detail: "Formation en alternance" },
    { period: "2022 — 2025", title: "BUT Réseaux & Télécommunications", detail: "IUT de La Roche-sur-Yon" },
  ],
  skills: ["Réseaux IP", "Routage & switching", "Linux", "Cybersécurité", "Développement web"],
}

export const work = {
  title: "Mon alternance 💼",
  subtitle: "Le bureau, chez Ecritel.",
  role: "Alternant ingénieur réseau",
  company: "Ecritel",
  missions: [
    "Exploitation et évolution de l'infrastructure réseau (exemple)",
    "Automatisation de tâches d'administration (exemple)",
    "Supervision et résolution d'incidents (exemple)",
  ],
}

export const contact = {
  title: "Travaillons ensemble 🤙",
  subtitle: "Une question, une opportunité ? Écris-moi.",
  links: [
    { label: "Email", value: "contact@exemple.fr", href: "mailto:contact@exemple.fr" },
    { label: "GitHub", value: "github.com/moigabone", href: "https://github.com/moigabone" },
    { label: "LinkedIn", value: "Gabin Clavier", href: "https://www.linkedin.com/" },
  ],
}

export const site = {
  title: `${profile.name} — Portfolio 3D`,
  description: `${profile.role}. ${profile.tagline}`,
}
