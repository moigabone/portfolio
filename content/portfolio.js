// Tout le texte du site est ici : modifie ce fichier pour mettre à jour le portfolio.

export const profile = {
  name: "Gabin Clavier",
  firstName: "Gabin",
  role: "Apprenti ingénieur réseau · Étudiant ingénieur ESIEA",
  tagline:
    "Le jour, je déploie des firewalls et des clusters réseau au NOC d'Ecritel. Le soir, je modélise des pièces en 3D. Bienvenue dans mon immeuble : chaque étage raconte une partie de mon parcours.",
  highlights: [
    "🎓 4ᵉ année à l'ESIEA, majeure cybersécurité",
    "🌐 Apprenti ingénieur réseau au NOC d'Ecritel",
    "🧊 Passionné de 3D web et d'IA",
  ],
}

// La chambre : projets perso et vie en dehors du travail
export const projects = {
  title: "Mes projets perso 🛠️",
  subtitle: "Ma chambre, là où naissent les projets du soir.",
  items: [
    {
      title: "Portfolio 3D",
      description: "Ce site ! Trois pièces modélisées dans Blender, animées avec React Three Fiber.",
      tags: ["Blender", "Three.js", "Next.js"],
      url: "https://github.com/moigabone/portfolio",
    },
  ],
  ideas: ["App de sport", "App de veille", "Second cerveau"],
  hobbies: [
    { label: "🎬 Montage vidéo : mes edits de voyages sur TikTok", href: "https://www.tiktok.com/@_gab11_" },
    { label: "🎮 Jeux vidéo" },
    { label: "👕 Mode" },
    { label: "🤖 IA & veille tech" },
    { label: "🎧 Podcast Underscore_" },
  ],
}

// La salle de classe : formation
export const education = {
  title: "Ma formation 🎓",
  subtitle: "La salle de classe.",
  items: [
    {
      period: "Depuis sept. 2025",
      title: "Diplôme d'ingénieur — ESIEA",
      detail: "4ᵉ année, majeure cybersécurité (label SecNumedu), en alternance",
    },
    {
      period: "Sept. 2022 — août 2025",
      title: "BUT Réseaux & Télécommunications",
      detail: "IUT de La Roche-sur-Yon, parcours cybersécurité",
    },
  ],
  certifications: ["AWS Academy Cloud Foundations (2025)"],
  // D'après les programmes du BUT R&T cybersécurité et de la majeure cyber ESIEA (4ᵉ année)
  skills: [
    "Administration réseaux & Internet",
    "Pare-feu & détection d'intrusion",
    "Supervision de SI",
    "Durcissement Linux / Windows / AD",
    "Pentest web (OWASP)",
    "Cryptographie",
    "Droit de la cybersécurité",
  ],
}

// Le bureau : alternance
export const work = {
  title: "Mon alternance 💼",
  subtitle: "Le bureau, chez Ecritel.",
  role: "Apprenti ingénieur réseau — NOC",
  company: "Ecritel",
  period: "Depuis sept. 2023 · Nantes",
  missions: [
    "Déploiement de clusters de firewalls Stormshield pour des clients : VXLAN, firewalls virtuels sur vCenter ou physiques, supervision",
    "Migrations d'infrastructures existantes, de la réunion de lancement à l'exécution",
    "Build de deux clusters Juniper et migration des VM",
    "Responsable de la conformité clients : adressage IP, configurations, contrats",
  ],
  tools: ["Stormshield", "Juniper", "Cisco", "BGP · VRF · VXLAN", "VMware vCenter"],
  highlight:
    "🤖 J'ai créé un agent IA qui, à partir des infos d'un build, génère la checklist et les configurations à pousser (VLAN, routes, VRF, BGP).",
}

export const contact = {
  title: "On en parle ? 🤙",
  subtitle: "Réseau, 3D, IA ou simple curiosité : écris-moi.",
  links: [
    { label: "Email", value: "gabin.clv@gmail.com", href: "mailto:gabin.clv@gmail.com" },
    { label: "LinkedIn", value: "Gabin Clavier", href: "https://www.linkedin.com/in/gabin-clavier-636253275/" },
    { label: "GitHub", value: "moigabone", href: "https://github.com/moigabone" },
    { label: "TikTok", value: "@_gab11_", href: "https://www.tiktok.com/@_gab11_" },
  ],
}

export const site = {
  url: "https://gabin-clavier.fr",
  title: `${profile.name} — Portfolio 3D`,
  description: `${profile.role}. Un portfolio en 3D : chaque étage raconte une partie de mon parcours.`,
}
