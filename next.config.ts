import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle server-only native/heavy packages.
  serverExternalPackages: ["pg", "unpdf"],
  // Skip the auto-generated AGENTS.md / CLAUDE.md.
  agentRules: false,
  turbopack: {
    resolveAlias: {
      // react-pdf / pd.js reference an optional Node `canvas` module that the
      // browser build never needs — point it at an empty stub.
      canvas: "./src/lib/empty-module.ts",
    },
  },
};

export default nextConfig;
