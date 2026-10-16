import { profile, projects, education, work, contact } from "@/content/portfolio"

// Contenu de chaque "page" du scroll, partagé entre la version 3D et la version statique.
// `room` : pièce du modèle 3D sur laquelle la caméra zoome (null = vue d'ensemble).
// `right` place la carte à droite (la pièce est alors cadrée à gauche).

const ScrollHint = () => (
  <p className="mt-6 animate-bounce text-gray-400" aria-hidden="true">
    ↓
  </p>
)

const Tags = ({ items }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((item) => (
      <li key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
        {item}
      </li>
    ))}
  </ul>
)

export const SECTIONS = [
  {
    id: "intro",
    room: null,
    right: false,
    content: (
      <>
        <h1 className="font-serif text-3xl font-semibold">Hello, je suis {profile.firstName}</h1>
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
    id: "projets",
    room: "chambre",
    right: false,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">{projects.title}</h2>
        <p className="mt-1 text-gray-500">{projects.subtitle}</p>
        <ul className="mt-4 space-y-3">
          {projects.items.map((p) => {
            const body = (
              <>
                <p className="font-semibold">
                  {p.title}
                  {p.url && " ↗"}
                </p>
                <p className="text-sm text-gray-500">{p.description}</p>
                <p className="mt-1 text-xs text-gray-400">{p.tags.join(" · ")}</p>
              </>
            )
            const cardClass = "block rounded-xl border border-slate-200 p-3"
            return (
              <li key={p.title}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className={`${cardClass} transition hover:border-slate-400 hover:bg-slate-50`}>
                    {body}
                  </a>
                ) : (
                  <div className={cardClass}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="mt-4 font-semibold">Prochains projets</p>
        <Tags items={projects.ideas} />
        <p className="mt-4 font-semibold">En dehors du code</p>
        <ul className="mt-2 space-y-1 text-sm">
          {projects.hobbies.map((h) => (
            <li key={h.label}>
              {h.href ? (
                <a href={h.href} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600">
                  {h.label} ↗
                </a>
              ) : (
                h.label
              )}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "formation",
    room: "classe",
    right: true,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">{education.title}</h2>
        <p className="mt-1 text-gray-500">{education.subtitle}</p>
        <ol className="mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
          {education.items.map((e) => (
            <li key={e.title}>
              <p className="text-xs uppercase tracking-wide text-gray-400">{e.period}</p>
              <p className="font-semibold">{e.title}</p>
              <p className="text-sm text-gray-500">{e.detail}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 font-semibold">Compétences</p>
        <Tags items={education.skills} />
        <p className="mt-4 font-semibold">Certifications</p>
        <ul className="mt-1 text-sm text-gray-600">
          {education.certifications.map((c) => (
            <li key={c}>🏅 {c}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "alternance",
    room: "bureau",
    right: false,
    content: (
      <>
        <h2 className="font-serif text-2xl font-semibold">{work.title}</h2>
        <p className="mt-1 text-gray-500">{work.subtitle}</p>
        <p className="mt-4 font-semibold">
          {work.role} · {work.company}
        </p>
        <p className="text-xs uppercase tracking-wide text-gray-400">{work.period}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          {work.missions.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <Tags items={work.tools} />
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{work.highlight}</p>
      </>
    ),
  },
  {
    id: "contact",
    room: null,
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

// h-dvh et non h-screen : sur mobile, 100vh ignore la barre d'adresse et chaque section dépasserait
// d'une page de scroll, au point de rendre la dernière inaccessible
export function Section({ right, children, ref, style }) {
  return (
    <section
      ref={ref}
      style={style}
      className={`flex h-dvh flex-col justify-end p-4 md:justify-center md:p-10 ${right ? "md:items-end" : "md:items-start"}`}
    >
      <div className="w-full md:w-1/2 md:max-w-md">
        <div className="rounded-2xl bg-white/90 px-5 py-5 text-sm shadow-lg backdrop-blur md:px-8 md:py-10 md:text-base">
          {children}
        </div>
      </div>
    </section>
  )
}
