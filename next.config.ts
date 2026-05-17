import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/analysis/report-context": ["./data/analysis/**/*"],
    "/api/layers/[id]": ["./data/geojson/**/*"],
  },
};

export default nextConfig;
