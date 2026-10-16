/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site 100 % statique : `pnpm build` génère le dossier `out/`, servi tel quel par Cloudflare Pages
  output: "export",
}

export default nextConfig
