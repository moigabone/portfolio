# Portfolio 3D

Portfolio one-page en 3D : un immeuble de trois pièces modélisé dans Blender (chambre = projets perso, salle de classe = formation, bureau = alternance). Au fil du scroll, la caméra monte d'étage en étage et zoome sur chaque pièce, pendant que des cartes de texte apparaissent par-dessus.

**Stack** : Next.js (App Router) · React Three Fiber / Drei · Tailwind CSS

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
| `components/Experience.jsx` | Canvas 3D, éclairage, scroll ; bascule sur une version statique sans WebGL |
| `components/Apartment.jsx` | Modèle 3D, couleurs, et caméra qui cadre chaque pièce selon le scroll (réglages en haut du fichier) |
| `components/Overlay.jsx` | Fondu des cartes selon la position du scroll |
| `components/Sections.jsx` | Contenu et mise en page des cartes (une section = une page de scroll) |
| `components/Loader.jsx` | Écran de chargement du modèle |
| `public/models/appart.glb` | Modèle 3D (compressé avec meshopt) |

Ajouter une section dans `SECTIONS` ajoute automatiquement une page de scroll. Son champ `room` indique la pièce sur laquelle zoomer : le nom de l'objet dans Blender (`chambre`, `classe`, `bureau`), ou `null` pour une vue d'ensemble.

## Modèle 3D

Après un export depuis Blender (en gardant les noms des pièces), recompresser le modèle :

```bash
npx @gltf-transform/cli optimize export.glb tmp.glb --compress false --palette false --texture-compress false --simplify false --join false --flatten false
npx @gltf-transform/cli meshopt tmp.glb public/models/appart.glb
```

## Déploiement

Le site est déployé sur Vercel à chaque push sur `main`.
