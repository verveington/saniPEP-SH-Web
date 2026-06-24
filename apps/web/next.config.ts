import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["reshaped", "lucide-react"],
  experimental: {
    optimizePackageImports: ["reshaped", "lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/inkontinenz-pflege",
        destination: "/inkontinenz-pflegehilfsmittel",
        permanent: true,
      },
      {
        source: "/rezept-hochladen",
        destination: "/rezept-upload",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
