import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://neo-archiv.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },

      {
        userAgent: [
          "GPTBot", // OpenAI
          "ChatGPT-User", // OpenAI ChatGPT browsing
          "OAI-SearchBot", // OpenAI Search
          "ClaudeBot", // Anthropic
          "Claude-Web", // Anthropic (alt)
          "anthropic-ai", // Anthropic API
          "PerplexityBot", // Perplexity
          "YouBot", // You.com
          "Amazonbot", // Amazon / Alexa AI
          "Bytespider", // ByteDance / TikTok
          "CCBot", // Common Crawl (AI-Trainingsdaten)
          "cohere-ai", // Cohere
          "Google-Extended", // Google Gemini Training
          "FacebookBot", // Meta AI
          "Applebot-Extended", // Apple AI Training
          "meta-externalagent", // Meta (neu)
        ],
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
