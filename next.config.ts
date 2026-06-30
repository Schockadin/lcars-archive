import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 308-Redirect – für SEO und Browser-Cache
      },
      {
        source: "/status",
        destination: "https://stats.uptimerobot.com/3pqHZOOYrY",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
