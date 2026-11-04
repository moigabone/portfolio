import type { MetadataRoute } from "next"
import { site } from "@/content/portfolio"

// Une seule page : le site entier tient dans l'immeuble
export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: site.url, changeFrequency: "monthly", priority: 1 }]
}
