import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/analysis/report-context": ["./data/analysis/**/*"],
    "/api/layers/[id]": ["./data/geojson/**/*"],
  },
};

export default nextConfig;
