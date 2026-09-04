import type { NextConfig } from "next";

/**
 * `STATIC_DEMO=1` switches to the GitHub Pages build: a fully static export,
 * served from `/<repo>/` rather than the domain root. The default build is
 * unchanged, so `npm run dev` and any Node deployment keep the API routes.
 */
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";
const repo = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticDemo
    ? {
        output: "export" as const,
        // Pages serves the site under a subpath; without this, CSS, JS and the
        // media posters would all resolve against the domain root and 404.
        basePath: repo,
        assetPrefix: repo || undefined,
        // Pages has no rewrite layer, so emit /path/index.html.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
