import type { MetadataRoute } from "next";
import { getCampaignYears } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Neo Archive",
    short_name: "Neo Archive",
    description: `Kampagnen-Archiv der NeoVerse-Runde – Charaktere, Missionen und Logs aus ${getCampaignYears()} Jahren Pen & Paper.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "de",
    background_color: "#08081a",
    theme_color: "#08081a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable: eigene Varianten mit vollflächigem Hintergrund und dem
      // Emblem innerhalb der sicheren Zone (zentrierter 80%-Kreis) — Android
      // schneidet maskable Icons auf wechselnde Formen (Kreis, Squircle, …)
      // zu; die normalen "any"-Icons hätten dabei den Ring/Text am Rand
      // verloren, da das Emblem dort bis an den Bildrand reicht.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
