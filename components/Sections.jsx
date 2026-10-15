import { profile, skills, projects, contact } from "@/content/portfolio"

// Contenu de chaque "page" du scroll, partagé entre la version 3D et la version statique.
// `right` place la carte à droite (le modèle 3D se décale alors à gauche).

const ScrollHint = () => (
  <p className="mt-6 animate-bounce text-gray-400" aria-hidden="true">
    ↓
  </p>
)

export const SECTIONS = [
  {
    id: "intro",
    right: false,
    content: (
      <>
        <h1 className="font-serif text-3xl font-semibold">Hello, je suis {profile.name}</h1>
        <p className="mt-1 text-gray-500">{profile.role}</p>
        <p className="mt-4">{profile.tagline}</p>
        <ul className="mt-3 space-y-2">
          {profile.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <ScrollHint />
      </>
    ),
  },
  {
    id: "competences",
    right: true,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">Mes compétences 🔥</h2>
        {skills.map((group) => (
          <div key={group.title}>
            <p className="mt-4 font-semibold">{group.title}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ScrollHint />
      </>
    ),
  },
  {
    id: "projets",
    right: false,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">Projets 🛠️</h2>
        <ul className="mt-4 space-y-4">
          {projects.map((p) => (
            <li key={p.title}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <p className="font-semibold">{p.title} ↗</p>
                <p className="text-sm text-gray-500">{p.description}</p>
                <p className="mt-2 text-xs text-gray-400">{p.tags.join(" · ")}</p>
              </a>
            </li>
          ))}
        </ul>
        <ScrollHint />
      </>
    ),
  },
  {
    id: "contact",
    right: true,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">{contact.title}</h2>
        <p className="mt-1 text-gray-500">{contact.subtitle}</p>
        <ul className="mt-6 space-y-3">
          {contact.links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex justify-between gap-4 rounded-lg bg-slate-100 p-3 transition hover:bg-slate-200"
              >
                <span className="font-semibold">{l.label}</span>
                <span className="truncate text-gray-600">{l.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
  },
]

export const NB_SECTIONS = SECTIONS.length

export function Section({ right, children, ref, style }) {
  return (
    <section
      ref={ref}
      style={style}
      className={`flex h-screen flex-col justify-end p-4 md:justify-center md:p-10 ${right ? "md:items-end" : "md:items-start"}`}
    >
      <div className="w-full md:w-1/2 md:max-w-md">
        <div className="rounded-2xl bg-white/90 px-6 py-8 shadow-lg backdrop-blur md:px-8 md:py-12">
          {children}
        </div>
      </div>
    </section>
  )
}
