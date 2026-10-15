# Portfolio 3D

Portfolio one-page en 3D : un modèle d'appartement se déplace au fil du scroll pendant que des cartes de texte (intro, compétences, projets, contact) apparaissent par-dessus.

**Stack** : Next.js (App Router) · React Three Fiber / Drei · GSAP · Tailwind CSS

## Démarrer

Prérequis : Node.js 20+ et pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # build de production
```

## Modifier le contenu

Tout le texte du site se trouve dans [`content/portfolio.js`](content/portfolio.js) : profil, compétences, projets, liens de contact, titre et description SEO. Ajouter un projet ou une compétence se fait uniquement dans ce fichier.

## Structure

| Fichier | Rôle |
| --- | --- |
| `components/Experience.jsx` | Canvas 3D, lumières, scroll ; bascule sur une version statique sans WebGL |
| `components/Apartment.jsx` | Modèle 3D et timeline GSAP pilotée par le scroll |
| `components/Overlay.jsx` | Fondu des cartes selon la position du scroll |
| `components/Sections.jsx` | Contenu et mise en page des cartes (une section = une page de scroll) |
| `components/Loader.jsx` | Écran de chargement du modèle |
| `public/models/appart.glb` | Modèle 3D (compressé avec meshopt) |

Ajouter une section dans `SECTIONS` ajoute automatiquement une page de scroll et une étape d'animation du modèle.

## Modèle 3D

Après un export depuis Blender, recompresser le modèle :

```bash
npx @gltf-transform/cli optimize export.glb public/models/appart.glb --compress meshopt --texture-compress webp --simplify false
```

## Déploiement

Le site est déployé sur Vercel à chaque push sur `main`.
