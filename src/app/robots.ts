import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.CONTEXT === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.CONTEXT);

  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://neo-archiv.de/sitemap.xml",
  };
}
