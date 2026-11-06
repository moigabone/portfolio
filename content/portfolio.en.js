// The English version of content/portfolio.js: same shape, keep both files in step.

export const profile = {
  name: "Gabin Clavier",
  firstName: "Gabin",
  role: "Network and security engineering apprentice at Ecritel · Cybersecurity engineering student at ESIEA",
  tagline:
    "By day, I build firewall clusters for Ecritel's hosted customers. By night, I make my own projects, from 3D to AI. Welcome to my building: each floor tells part of my story.",
  highlights: [
    "4th year of engineering school at ESIEA, majoring in cybersecurity",
    "Apprentice in Ecritel's network team (NOC) since 2023",
    "Into web 3D and AI automation",
  ],
  cv: { label: "Download my CV", href: "/Gabin_Clavier_CV_EN.pdf" },
}

export const projects = {
  eyebrow: "Ground floor · The bedroom",
  title: "Side projects",
  subtitle: "Where my evening projects come to life: this is where I try out new tech.",
  items: [
    {
      title: "3D portfolio",
      description: "This site: a building modelled in Blender that you explore by scrolling.",
      tags: ["Blender", "Three.js", "Next.js"],
      url: "https://github.com/moigabone/portfolio",
    },
    {
      title: "Codex",
      description: "My log of films, series, anime, manga and games, with where I'm at. TMDB and AniList search, installable on a phone.",
      tags: ["Next.js", "Supabase"],
      url: "https://codex.gabin-clavier.fr",
    },
    {
      title: "Veille",
      description: "A news digest ready every morning: 30 RSS feeds read automatically, grouped and summarised by Claude. Private, invite only.",
      tags: ["GitHub Actions", "Supabase", "Claude API"],
      url: "https://veille.gabin-clavier.fr",
    },
    {
      title: "The map",
      description: "An interactive map of my sites and everything that runs them, with animated tours.",
      tags: ["JavaScript", "SVG", "Three.js"],
      url: "https://links.gabin-clavier.fr",
    },
  ],
  afterHours: "Away from the code",
  ideas: ["Workout app", "Second brain"],
  hobbies: [
    { label: "Video editing: my travel vlogs on TikTok", href: "https://www.tiktok.com/@_gab11_" },
    { label: "Running and bodyweight training" },
    { label: "Video games" },
    { label: "Fashion" },
    { label: "AI and tech news, with the Underscore_ podcast" },
  ],
}

export const education = {
  eyebrow: "1st floor · The classroom",
  title: "Education",
  items: [
    {
      period: "2025 — 2028",
      title: "Engineering degree, cybersecurity — ESIEA",
      detail: "Work-study, in Laval (SecNumedu certified)",
    },
    {
      period: "2022 — 2025",
      title: "Bachelor's in Networks and Telecommunications (BUT)",
      detail: "IUT of La Roche-sur-Yon, Nantes University, cybersecurity track",
    },
  ],
  skills: [
    "Stormshield, Fortinet, Cisco firewalls",
    "BGP, DNS, high availability",
    "Privileged access bastion",
    "Linux and Windows hardening",
    "Network monitoring",
    "Web pentesting (OWASP)",
    "Cryptography",
  ],
  certifications: ["AWS Academy Cloud Foundations (2025)"],
  languages: "French (native), English (B1, technical and professional)",
  projectsTitle: "School projects",
  schoolProjects: [
    {
      period: "ESIEA · 2025 — 2026",
      title: "Cybersecurity awareness escape game",
      detail:
        "In a team of 8, for middle-school pupils: workshops on phishing, passwords, fake news and cyberbullying, run in schools. I led the phishing and cyberbullying workshops, and the relationship with the schools.",
    },
    {
      period: "IUT · 2025 · 100 hours",
      title: "Privileged access bastion",
      detail:
        "For the IT department of the city of La Roche-sur-Yon: design, deployment and performance testing of an administration bastion. I led the project, wrote the installation and user guides, and presented the results to the client.",
    },
  ],
}

export const work = {
  eyebrow: "2nd floor · The office",
  title: "My apprenticeship",
  role: "Network and security engineering apprentice",
  company: "Ecritel",
  companyDetail: "Network team (NOC) · cloud hosting and managed services",
  period: "Since 2023 · Nantes",
  missions: [
    "Building Stormshield firewall clusters with disaster recovery for new customers: virtual firewalls on vCenter or physical ones, VXLAN, flow rules, DNS, access control, BGP routing, high availability and monitoring",
    "Redesigning existing infrastructures, including migrating shared firewalls to dedicated clusters, from kick-off meeting to execution, with the systems team for the VM migration",
    "Built two Juniper clusters and migrated the VMs",
    "Configuring and maintaining switches, routers and firewalls (Stormshield, Fortinet, Cisco, Juniper) for hosted customers",
    "In charge of customer compliance: IP addressing, configurations, contracts",
  ],
  tools: ["Stormshield", "Fortinet", "Cisco", "Juniper", "BGP · VRF · VXLAN", "High availability", "Disaster recovery", "VMware vCenter"],
  highlight:
    "I built an AI agent that takes a build's details and generates the checklist and the configurations to push (VLANs, routes, VRFs, BGP).",
}

export const contact = {
  eyebrow: "Contact",
  title: "Let's talk?",
  subtitle: "Networks, security, 3D, AI or plain curiosity: drop me a line.",
  links: [
    { label: "CV", value: "PDF", href: "/Gabin_Clavier_CV_EN.pdf" },
    { label: "Email", value: "gabin.clv@gmail.com", href: "mailto:gabin.clv@gmail.com" },
    { label: "LinkedIn", value: "Gabin Clavier", href: "https://www.linkedin.com/in/gabin-clavier-636253275/" },
    { label: "GitHub", value: "moigabone", href: "https://github.com/moigabone" },
    { label: "TikTok", value: "@_gab11_", href: "https://www.tiktok.com/@_gab11_" },
  ],
}

export const ui = {
  lang: "en",
  scene: "My portfolio is a three-storey 3D building: my bedroom (side projects), a classroom (education) and an office (apprenticeship). Each floor's text appears as you scroll. On the keyboard, keys 0, 1, 2 and C take you to a floor, H back home.",
  hint: "Tip: click on me and on the objects in the rooms.",
  nextProjects: "Next projects",
  likes: "What I enjoy",
  skills: "Skills",
  certifications: "Certification and languages",
  floors: { C: "Contact", 2: "2nd floor · The office", 1: "1st floor · The classroom", 0: "Ground floor · The bedroom", home: "Home" },
  floorsLabel: "Floors",
  toNight: "Switch to night mode",
  toDay: "Switch to day mode",
  soundOn: "Turn on ambient sound",
  soundOff: "Mute",
  language: "Voir le site en français",
  found: (count, total) => `${count} of ${total} objects found: click whatever catches your eye`,
  allFound: "You found everything, well done!",
  inspectHint: "Click or Esc to go back",
  openHint: "Click to open the site · Esc to go back",
  playHint: "Space or click to jump · Esc to go back",
  zoneHint: "Click an object · Esc to go back",
  recordHint: "Click to change the record · Esc to go back",
  recordTip: "♪ Zoom in and click to change the music",
  labHint: "Click the red links to fix them · Esc to go back",
  labels: { banner: "My sites ↗", ecritel: "My apprenticeship ↓", dog: "Lego" },
  phrases: {
    chambre: "In the evening, I love experimenting: new tech, AI, 3D… this is where it all starts.",
    classe: "4th year at ESIEA, majoring in cybersecurity. Graduating in 2028!",
    bureau: "At Ecritel, I build firewall clusters for our customers.",
  },
  // What the easter eggs say when clicked
  lines: {
    muted: "turn the sound on to listen",
    allFound: "All found! Lego is celebrating 🎉",
    seven: "What's in the box?!",
    snatch: "Lego swallowed a diamond again…",
    ring: "My precious…",
    herNight: "Samantha is calling…",
    herDay: "No calls. Samantha will call back tonight.",
    fightclub: "First rule: you do not talk about Fight Club.",
    holocron: "Only a Jedi can open it.",
    tva: "Here at the TVA, we use them as paperweights.",
    "nen-emission": "Emission: the water changes colour!",
    "nen-manipulation": "Manipulation: the leaf spins!",
    "nen-renforcement": "Enhancement: the water overflows!",
  },
  // The objects' names, written in French in the scene
  objects: {
    "L'horloge": "The clock",
    "Le tableau": "The whiteboard",
    "Mes lectures": "My books",
    "Ma PS Vita": "My PS Vita",
    "Mes mangas": "My manga",
    "Mes films": "My films",
    "Mon PC": "My PC",
    "La baie réseau": "The network rack",
    "Le cahier": "The notebook",
    "Ma banane": "My banana",
    "La salle serveurs": "The server room",
    "Voir l'écran": "See the screen",
    "Kevin": "Kevin",
    "La boule de cristal": "The crystal ball",
    "Ma platine": "My turntable",
    "Mon badge Ecritel": "My Ecritel badge",
    "Le modèle OSI": "The OSI model",
    "Une marque étrange": "A strange mark",
    "Un anneau": "A ring",
    "Une boîte": "A box",
    "La gamelle de Lego": "Lego's bowl",
    "Mon téléphone": "My phone",
    "Un verre d'eau": "A glass of water",
    "Un holocron": "A holocron",
    "Le tiroir": "The drawer",
    "Un savon": "A bar of soap",
    "Un post-it": "A sticky note",
    "La fontaine à eau": "The water cooler",
    "Le bureau": "The desk",
    "L'étagère": "The shelf",
    "La commode": "The chest of drawers",
    "Le meuble à chaussures": "The shoe rack",
    "Le tableau": "The whiteboard",
    "Le poste": "The workstation",
  },
}
