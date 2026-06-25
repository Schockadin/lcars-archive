import type { MetadataRoute } from "next";
import { getAllCharacters } from "@/lib/characters";
// später ergänzen: getMissions, getArchiveEntries, etc.

const BASE_URL = "https://neo-archiv.de";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statische Routen
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/characters`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/missions`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/archive`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Dynamische Charakter-Routen
  let characterRoutes: MetadataRoute.Sitemap = [];
  try {
    const characters = await getAllCharacters();
    characterRoutes = characters.map((c) => ({
      url: `${BASE_URL}/characters/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB nicht verfügbar → Sitemap läuft trotzdem durch
  }

  //   ToDo: Wenn getAllMissions() fertig ist

  //   let missionRoutes: MetadataRoute.Sitemap = [];
  //   try {
  //     const missions = await getAllMissions();
  //     missionRoutes = missions.map((m) => ({
  //       url: `${BASE_URL}/missions/${m.slug}`,
  //       lastModified: new Date(m.updated_at),
  //       changeFrequency: "monthly" as const,
  //       priority: 0.7,
  //     }));
  //   } catch {}

  return [...staticRoutes, ...characterRoutes];
}
