# Portfolio 3D

Portfolio one-page en 3D : un immeuble de trois pièces modélisé dans Blender (chambre = projets perso, salle de classe = formation, bureau = alternance). Au fil du scroll, la caméra monte d'étage en étage et zoome sur chaque pièce, pendant que des cartes de texte apparaissent par-dessus.

**Stack** : Next.js (App Router) · React Three Fiber / Drei · Tailwind CSS

## Démarrer

Prérequis : Node.js 20+ et pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # génère le site statique dans out/
pnpm preview    # sert out/ en local pour vérifier le build
```

## Modifier le contenu

Tout le texte du site se trouve dans [`content/portfolio.js`](content/portfolio.js) : profil, compétences, projets, liens de contact, titre et description SEO, petits textes de l'interface. La version anglaise est dans [`content/portfolio.en.js`](content/portfolio.en.js), avec la même structure : un ajout dans l'un se reporte dans l'autre. [`content/i18n.js`](content/i18n.js) garde la langue choisie (bouton FR / EN).

## Structure

| Fichier | Rôle |
| --- | --- |
| `components/Experience.jsx` | Canvas 3D, éclairage jour / nuit, scroll, boutons ; bascule sur une version statique sans WebGL |
| `components/DaySky.jsx` | Ciel du jour (nuages, oiseaux, un bus volant sous sa montgolfière) et, la nuit, la lune et une parade de jouets |
| `components/Apartment.jsx` | Modèle 3D, caméra qui cadre chaque pièce, mouvement des étages, décor animé, clics (réglages en haut du fichier) |
| `components/Person.js` | Le personnage d'après mon Bitmoji et ses gestes (frappe, regard caméra, coucou, et le scuba une fois sur trois) |
| `components/Dog.js` | Lego, mon chien, dans son panier ; il danse debout quand tous les objets sont trouvés |
| `components/Decor.js` | Décor ajouté : cube violet et boule de cristal à 4 étoiles, salle serveurs du bureau (deux baies 42U derrière des portes vitrées), guirlande, horloge à l'heure de Paris, sac, bouteille d'eau et banane, baie réseau (brassage, switch, NAS), lampe à lave, formules de Fourier, tranches des livres, PC gamer et casque RGB, PC de l'école, cahier, étagère de chevet chromée (chaussures, platine vinyle), commode en bois, vitres en pixels, modèle OSI en classe (et sa couche 8), fontaine à eau, et les easter eggs : marque de Berserk, Anneau unique, boîte de Seven, gamelle au diamant, téléphone de Her, verre du test de Nen, holocron, pierres de l'infini, post-it, confettis ; et le jeu de course de la PS Vita |
| `components/Screens.js` | Les écrans vivants : terminal, règles de firewall, mes sites (`public/screens/`, cliquables), un TP Packet Tracer, et l'écran mural du bureau (logo en veille, supervision) |
| `components/Elevator.jsx` | Le panneau d'ascenseur pour aller d'un étage à l'autre |
| `components/Controls.jsx`, `ambient.js`, `theme.js` | Compteur des références trouvées (liste REFERENCES dans Apartment), interrupteurs soleil / lune (heure de Paris par défaut) et FR / EN, ambiance sonore (lo-fi généré, disques de la platine et extraits joués au clic depuis `public/audio/`, aboiement de Lego) |
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

Site 100 % statique (`output: "export"`), hébergé sur Cloudflare Pages ([gabin-clavier.fr](https://gabin-clavier.fr)) et redéployé à chaque push sur `main`.

Réglages du projet Cloudflare Pages :

| Réglage | Valeur |
| --- | --- |
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `out` |
| Variable d'environnement | `NODE_VERSION` = `22` |
