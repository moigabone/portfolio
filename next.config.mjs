/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site 100 % statique : `pnpm build` génère le dossier `out/`, servi tel quel par Cloudflare Pages
  output: "export",
  // En développement, le mode strict monte deux fois les étiquettes 3D (Html de drei) sur le même élément :
  // React le signale à chaque chargement. Sans effet sur le site en ligne.
  reactStrictMode: false,
}

export default nextConfig
