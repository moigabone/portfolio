// Tout le texte du site est ici : modifie ce fichier pour mettre à jour le portfolio.
// Il suit le CV (public/Gabin_Clavier_CV_EN.pdf) : quand l'un change, pense à l'autre.

export const profile = {
  name: "Gabin Clavier",
  firstName: "Gabin",
  role: "Alternant ingénieur réseau et sécurité chez Ecritel · Élève ingénieur en cybersécurité à l'ESIEA",
  tagline:
    "Le jour, je construis des clusters de firewalls pour les clients hébergés d'Ecritel. Le soir, je crée mes propres projets, de la 3D à l'IA. Bienvenue dans mon immeuble : chaque étage raconte une partie de mon parcours.",
  highlights: [
    "4ᵉ année d'école d'ingénieurs à l'ESIEA, majeure cybersécurité",
    "Alternant dans l'équipe réseau (NOC) d'Ecritel depuis 2023",
    "Passionné de 3D web et d'automatisation par l'IA",
  ],
  cv: { label: "Télécharger mon CV (anglais)", href: "/Gabin_Clavier_CV_EN.pdf" },
}

// La chambre : projets perso et vie en dehors du travail
export const projects = {
  eyebrow: "Rez-de-chaussée · La chambre",
  title: "Mes projets perso",
  subtitle: "Là où naissent les projets du soir : j'y expérimente les nouvelles technos.",
  items: [
    {
      title: "Portfolio 3D",
      description: "Ce site : un immeuble modélisé dans Blender, qu'on explore en faisant défiler la page.",
      tags: ["Blender", "Three.js", "Next.js"],
      url: "https://github.com/moigabone/portfolio",
    },
    {
      title: "Codex",
      description: "Mon carnet de films, séries, anime, manga et jeux, avec où j'en suis. Recherche TMDB et AniList, installable sur téléphone.",
      tags: ["Next.js", "Supabase"],
      url: "https://codex.gabin-clavier.fr",
    },
    {
      title: "Veille",
      description: "Le récap de l'actu prêt chaque matin : 30 flux RSS lus automatiquement, regroupés et résumés par Claude. Privé, sur invitation.",
      tags: ["GitHub Actions", "Supabase", "API Claude"],
      url: "https://veille.gabin-clavier.fr",
    },
    {
      title: "La carte",
      description: "La carte interactive de mes sites et de tout ce qui les fait tourner, avec des parcours animés.",
      tags: ["JavaScript", "SVG", "Three.js"],
      url: "https://links.gabin-clavier.fr",
    },
  ],
  afterHours: "En dehors du code",
  ideas: ["App de sport", "Second cerveau"],
  hobbies: [
    { label: "Montage vidéo : mes vlogs de voyage sur TikTok", href: "https://www.tiktok.com/@_gab11_" },
    { label: "Course à pied et musculation au poids du corps" },
    { label: "Jeux vidéo" },
    { label: "Mode" },
    { label: "IA et veille tech, avec le podcast Underscore_" },
  ],
}

// La salle de classe : formation et projets d'école
export const education = {
  eyebrow: "1er étage · La salle de classe",
  title: "Ma formation",
  items: [
    {
      period: "2025 — 2028",
      title: "Diplôme d'ingénieur, cybersécurité — ESIEA",
      detail: "En alternance, à Laval (label SecNumedu)",
    },
    {
      period: "2022 — 2025",
      title: "BUT Réseaux et Télécommunications",
      detail: "IUT de La Roche-sur-Yon, Nantes Université, parcours cybersécurité",
    },
  ],
  skills: [
    "Firewalls Stormshield, Fortinet, Cisco",
    "BGP, DNS, haute disponibilité",
    "Bastion d'administration",
    "Durcissement Linux et Windows",
    "Supervision réseau",
    "Pentest web (OWASP)",
    "Cryptographie",
  ],
  certifications: ["AWS Academy Cloud Foundations (2025)"],
  languages: "Français (langue maternelle), anglais (B1, technique et professionnel)",
  projectsTitle: "Projets d'école",
  schoolProjects: [
    {
      period: "ESIEA · 2025 — 2026",
      title: "Escape game de sensibilisation à la cybersécurité",
      detail:
        "En équipe de 8, pour des collégiens : ateliers sur le phishing, les mots de passe, les fake news et le cyberharcèlement, joués dans des collèges. J'ai mené les ateliers phishing et cyberharcèlement, et la relation avec les établissements.",
    },
    {
      period: "IUT · 2025 · 100 heures",
      title: "Bastion d'accès à privilèges",
      detail:
        "Pour la DSI de la ville de La Roche-sur-Yon : conception, déploiement et tests de performance d'un bastion d'administration. J'ai mené le projet, rédigé les guides d'installation et d'utilisation, et présenté les résultats au client.",
    },
  ],
}

// Le bureau : alternance
export const work = {
  eyebrow: "2e étage · Le bureau",
  title: "Mon alternance",
  role: "Alternant ingénieur réseau et sécurité",
  company: "Ecritel",
  companyDetail: "Équipe réseau (NOC) · hébergement cloud et infogérance",
  period: "Depuis 2023 · Nantes",
  missions: [
    "Construction de clusters de firewalls Stormshield avec plan de reprise pour les nouveaux clients : firewalls virtuels sur vCenter ou physiques, VXLAN, règles de flux, DNS, contrôle d'accès, routage BGP, haute disponibilité et supervision",
    "Refonte d'infrastructures existantes, dont la migration de firewalls mutualisés vers des clusters dédiés, de la réunion de lancement à l'exécution, avec l'équipe système pour la migration des VM",
    "Build de deux clusters Juniper et migration des VM",
    "Configuration et maintenance de switchs, routeurs et firewalls (Stormshield, Fortinet, Cisco, Juniper) pour les clients hébergés",
    "Responsable de la conformité clients : adressage IP, configurations, contrats",
  ],
  tools: ["Stormshield", "Fortinet", "Cisco", "Juniper", "BGP · VRF · VXLAN", "Haute disponibilité", "Plan de reprise", "VMware vCenter"],
  highlight:
    "J'ai créé un agent IA qui, à partir des infos d'un build, génère la checklist et les configurations à pousser (VLAN, routes, VRF, BGP).",
}

export const contact = {
  eyebrow: "Contact",
  title: "On en parle ?",
  subtitle: "Réseau, sécurité, 3D, IA ou simple curiosité : écris-moi.",
  links: [
    { label: "CV", value: "PDF, en anglais", href: "/Gabin_Clavier_CV_EN.pdf" },
    { label: "Email", value: "gabin.clv@gmail.com", href: "mailto:gabin.clv@gmail.com" },
    { label: "LinkedIn", value: "Gabin Clavier", href: "https://www.linkedin.com/in/gabin-clavier-636253275/" },
    { label: "GitHub", value: "moigabone", href: "https://github.com/moigabone" },
    { label: "TikTok", value: "@_gab11_", href: "https://www.tiktok.com/@_gab11_" },
  ],
}

export const site = {
  url: "https://gabin-clavier.fr",
  title: `${profile.name} — Portfolio`,
  description: `${profile.role}. Un portfolio en 3D : chaque étage raconte une partie de mon parcours.`,
}

// Les petits textes de l'interface et de la scène 3D
export const ui = {
  lang: "fr",
  scene: "Mon portfolio est un immeuble en 3D de trois étages : ma chambre (projets perso), une salle de classe (formation) et un bureau (alternance). Le texte de chaque étage s'affiche en faisant défiler la page. Au clavier, les touches 0, 1, 2 et C mènent aux étages, H à l'accueil.",
  hint: "Astuce : clique sur moi et sur les objets des pièces.",
  nextProjects: "Prochains projets",
  likes: "Ce que j'aime",
  skills: "Compétences",
  certifications: "Certification et langues",
  floors: { C: "Contact", 2: "2e étage · Le bureau", 1: "1er étage · La salle de classe", 0: "Rez-de-chaussée · La chambre", home: "Accueil" },
  floorsLabel: "Étages",
  toNight: "Passer en mode nuit",
  toDay: "Passer en mode jour",
  soundOn: "Activer l'ambiance sonore",
  soundOff: "Couper le son",
  language: "View the site in English",
  found: (count, total) => `${count} références trouvées sur ${total} : films, mangas, séries… cachés dans les pièces`,
  allFound: "Tu as tout trouvé, bravo !",
  inspectHint: "Clic ou Échap pour revenir",
  openHint: "Clic pour ouvrir le site · Échap pour revenir",
  playHint: "Espace ou clic pour sauter · Échap pour revenir",
  zoneHint: "Clique sur un objet · Échap pour revenir",
  recordHint: "Clic pour changer de disque · Échap pour revenir",
  recordTip: "♪ Approche-toi et clique pour changer de musique",
  labHint: "Clique sur les liens rouges pour les réparer · Échap pour revenir",
  // Ce qui s'affiche au survol des objets et dans les bulles
  labels: { banner: "Mes sites ↗", ecritel: "Mon alternance ↓", dog: "Lego" },
  phrases: {
    chambre: "Le soir, je m'amuse à expérimenter : nouvelles technos, IA, 3D… c'est ici que tout commence.",
    classe: "4e année à l'ESIEA, majeure cybersécurité. Diplôme en 2028 !",
    bureau: "Chez Ecritel, je construis des clusters de firewalls pour les clients.",
  },
  // Ce que disent les easter eggs quand on clique dessus
  lines: {
    muted: "active le son pour l'écouter",
    allFound: "Tout trouvé ! Lego fête ça 🎉",
    seven: "What's in the box?!",
    snatch: "Lego a encore avalé un diamant…",
    ring: "Mon précieux…",
    herNight: "Samantha t'appelle…",
    herDay: "Aucun appel. Samantha rappellera ce soir.",
    fightclub: "Première règle : on ne parle pas du Fight Club.",
    holocron: "Seul un Jedi peut l'ouvrir.",
    tva: "Ici, à la TVA, elles servent de presse-papiers.",
    "nen-emission": "Émission : l'eau change de couleur !",
    "nen-manipulation": "Manipulation : la feuille tourne !",
    "nen-renforcement": "Renforcement : l'eau déborde !",
  },
  objects: {}, // les noms des objets sont déjà en français dans la scène
}
