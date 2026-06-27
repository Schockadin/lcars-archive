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
        source: "/corien",
        destination: "http://assets.neo-archiv.de/portraits/desmond-hobbes.png",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
