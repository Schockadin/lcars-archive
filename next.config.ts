import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 308-Redirect – für SEO und Browser-Cache
      },
    ];
  },
};

export default nextConfig;
