import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/analysis/report-context": ["./data/analysis/**/*"],
    "/api/layers/[id]": ["./data/geojson/**/*"],
  },
};

export default nextConfig;
