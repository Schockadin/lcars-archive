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
    theme_color: "#ff9a00",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
