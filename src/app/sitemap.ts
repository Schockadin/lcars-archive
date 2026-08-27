import type { MetadataRoute } from "next";
import { getCharacterListItems } from "@/lib/characters";
import { getAllLogPaths, getAllMissions } from "@/lib/missions";
import { getAllArchivePaths } from "@/lib/archive";

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
    const characters = await getCharacterListItems();
    characterRoutes = characters.map((c) => ({
      url: `${BASE_URL}/characters/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB nicht verfügbar → Sitemap läuft trotzdem durch
  }

  // Dynamische Missions-Routen
  let missionRoutes: MetadataRoute.Sitemap = [];
  try {
    const missions = await getAllMissions();
    missionRoutes = missions.map((m) => ({
      url: `${BASE_URL}/missions/${m.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB nicht verfügbar → Sitemap läuft trotzdem durch
  }

  // Dynamische Log-Routen
  let logRoutes: MetadataRoute.Sitemap = [];
  try {
    const logs = await getAllLogPaths();
    logRoutes = logs.map((l) => ({
      url: `${BASE_URL}/missions/${l.mission_slug}/${l.log_slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB nicht verfügbar → Sitemap läuft trotzdem durch
  }

  // Dynamische Archiv-Routen
  let archiveRoutes: MetadataRoute.Sitemap = [];
  try {
    const entries = await getAllArchivePaths();
    archiveRoutes = entries.map((e) => ({
      url: `${BASE_URL}/archive/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB nicht verfügbar → Sitemap läuft trotzdem durch
  }

  return [
    ...staticRoutes,
    ...characterRoutes,
    ...missionRoutes,
    ...logRoutes,
    ...archiveRoutes,
  ];
}
