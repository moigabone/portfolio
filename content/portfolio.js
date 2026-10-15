// Tout le texte du site est ici : modifie ce fichier pour mettre à jour le portfolio.
// ⚠️ Contenu provisoire (exemples fictifs) à remplacer par tes vraies informations.

export const profile = {
  name: "Gabin",
  role: "Développeur web créatif",
  tagline: "Je conçois des interfaces web rapides, accessibles et un peu en 3D.",
  highlights: [
    "🧑‍💻 Sites et applications React / Next.js",
    "🧊 Expériences 3D interactives avec Three.js",
    "🚀 Du prototype à la mise en production",
  ],
}

export const skills = [
  {
    title: "Frontend",
    items: ["React / Next.js", "TypeScript", "Tailwind CSS", "Three.js / R3F"],
  },
  {
    title: "Backend & outils",
    items: ["Node.js", "PostgreSQL", "Git / GitHub", "Vercel"],
  },
]

export const projects = [
  {
    title: "Projet Alpha",
    description: "Tableau de bord temps réel pour suivre des données IoT.",
    tags: ["Next.js", "WebSocket", "Recharts"],
    url: "https://github.com/moigabone",
  },
  {
    title: "Projet Bêta",
    description: "Configurateur 3D de mobilier directement dans le navigateur.",
    tags: ["Three.js", "R3F", "GSAP"],
    url: "https://github.com/moigabone",
  },
  {
    title: "Projet Gamma",
    description: "API REST et back-office pour une association locale.",
    tags: ["Node.js", "PostgreSQL"],
    url: "https://github.com/moigabone",
  },
]

export const contact = {
  title: "Travaillons ensemble 🤙",
  subtitle: "Une idée, un stage, une mission ? Écris-moi.",
  links: [
    { label: "Email", value: "contact@exemple.fr", href: "mailto:contact@exemple.fr" },
    { label: "GitHub", value: "github.com/moigabone", href: "https://github.com/moigabone" },
    { label: "LinkedIn", value: "linkedin.com/in/exemple", href: "https://www.linkedin.com/" },
  ],
}

export const site = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.tagline,
}
