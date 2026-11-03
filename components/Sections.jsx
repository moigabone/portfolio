import { profile, projects, education, work, contact } from "@/content/portfolio"

// Contenu de chaque "page" du scroll, partagé entre la version 3D et la version statique.
// `room` : pièce du modèle 3D sur laquelle la caméra zoome (null = vue d'ensemble).
// `right` place la carte à droite (la pièce est alors cadrée à gauche).

const ScrollHint = () => (
  <p className="mt-6 animate-bounce text-gilt" aria-hidden="true">
    ↓
  </p>
)

const Eyebrow = ({ children }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-gilt">{children}</p>
)

const Title = ({ children }) => <h2 className="font-serif text-3xl font-semibold leading-tight text-parchment">{children}</h2>

const Subtitle = ({ children }) => <p className="mt-1 text-ash">{children}</p>

const Label = ({ children }) => (
  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-ash">{children}</p>
)

const Tags = ({ items }) => (
  <ul className="mt-2 flex flex-wrap gap-2">
    {items.map((item) => (
      <li key={item} className="border border-seam px-2.5 py-1 text-xs text-ink">
        {item}
      </li>
    ))}
  </ul>
)

// Liste à puces dorées, sans emojis
const Dots = ({ items, className = "" }) => (
  <ul className={`space-y-1.5 ${className}`}>
    {items.map((item) => (
      <li key={item} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-gilt">
        {item}
      </li>
    ))}
  </ul>
)

const Timeline = ({ items }) => (
  <ol className="mt-4 space-y-4 border-l border-seam pl-4">
    {items.map((e) => (
      <li key={e.title}>
        <p className="text-xs uppercase tracking-[0.14em] text-mist">{e.period}</p>
        <p className="font-semibold text-ink">{e.title}</p>
        <p className="text-sm text-ash">{e.detail}</p>
      </li>
    ))}
  </ol>
)

const external = (href) => (href.startsWith("http") || href.endsWith(".pdf") ? { target: "_blank", rel: "noreferrer" } : {})

export const SECTIONS = [
  {
    id: "intro",
    room: null,
    right: false,
    content: (
      <>
        <Eyebrow>Portfolio</Eyebrow>
        <h1 className="font-serif text-5xl font-semibold leading-none text-parchment md:text-6xl">{profile.name}</h1>
        <p className="mt-3 text-ash">{profile.role}</p>
        <p className="mt-4">{profile.tagline}</p>
        <Dots items={profile.highlights} className="mt-4" />
        <a
          href={profile.cv.href}
          {...external(profile.cv.href)}
          className="mt-6 inline-block bg-gilt px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-parchment"
        >
          {profile.cv.label} ↓
        </a>
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
        <Eyebrow>{projects.eyebrow}</Eyebrow>
        <Title>{projects.title}</Title>
        <Subtitle>{projects.subtitle}</Subtitle>
        <ul className="mt-4 space-y-3">
          {projects.items.map((p) => (
            <li key={p.title}>
              <a
                href={p.url}
                {...external(p.url)}
                className="group block border border-seam bg-night/40 p-3 transition hover:border-neon"
              >
                <p className="font-semibold text-ink">
                  {p.title} <span className="text-gilt transition group-hover:text-neon">↗</span>
                </p>
                <p className="text-sm text-ash">{p.description}</p>
                <p className="mt-1 hidden text-xs text-mist md:block">{p.tags.join(" · ")}</p>
              </a>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "loisirs",
    room: "chambre",
    right: true,
    content: (
      <>
        <Eyebrow>{projects.eyebrow}</Eyebrow>
        <Title>{projects.afterHours}</Title>
        <Label>Prochains projets</Label>
        <Tags items={projects.ideas} />
        <Label>Ce que j'aime</Label>
        <ul className="mt-2 space-y-1.5 text-sm">
          {projects.hobbies.map((h) => (
            <li key={h.label}>
              {h.href ? (
                <a href={h.href} target="_blank" rel="noreferrer" className="text-link underline decoration-seam underline-offset-4 transition hover:text-neon">
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
    right: false,
    content: (
      <>
        <Eyebrow>{education.eyebrow}</Eyebrow>
        <Title>{education.title}</Title>
        <Timeline items={education.items} />
        <Label>Compétences</Label>
        <Tags items={education.skills} />
        <Label>Certification et langues</Label>
        <p className="mt-1 text-sm text-ash">{education.certifications.join(", ")}</p>
        <p className="text-sm text-ash">{education.languages}</p>
      </>
    ),
  },
  {
    id: "ecole",
    room: "classe",
    right: true,
    content: (
      <>
        <Eyebrow>{education.eyebrow}</Eyebrow>
        <Title>{education.projectsTitle}</Title>
        <Timeline items={education.schoolProjects} />
      </>
    ),
  },
  {
    id: "alternance",
    room: "bureau",
    right: false,
    content: (
      <>
        <Eyebrow>{work.eyebrow}</Eyebrow>
        <Title>{work.title}</Title>
        <p className="mt-3 font-semibold text-ink">
          {work.role} · {work.company}
        </p>
        <p className="text-sm text-ash">{work.companyDetail}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-mist">{work.period}</p>
        <Dots items={work.missions} className="mt-3 text-sm" />
        <div className="hidden md:block">
          <Tags items={work.tools} />
        </div>
        <p className="mt-4 border-l-2 border-gilt bg-night/40 p-3 text-sm">{work.highlight}</p>
      </>
    ),
  },
  {
    id: "contact",
    room: null,
    right: true,
    content: (
      <>
        <Eyebrow>{contact.eyebrow}</Eyebrow>
        <Title>{contact.title}</Title>
        <Subtitle>{contact.subtitle}</Subtitle>
        <ul className="mt-6 space-y-2">
          {contact.links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                {...external(l.href)}
                className="flex justify-between gap-4 border border-seam bg-night/40 p-3 transition hover:border-neon"
              >
                <span className="font-semibold text-ink">{l.label}</span>
                <span className="truncate text-ash">{l.value}</span>
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
        <div className="border border-seam bg-panel px-5 py-5 text-sm text-ink shadow-[0_20px_60px_rgb(0_0_0/0.45)] backdrop-blur-md md:px-8 md:py-9 md:text-base">
          {children}
        </div>
      </div>
    </section>
  )
}
