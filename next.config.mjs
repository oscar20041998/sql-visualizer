import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  distDir: process.env.DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  sourceMaps: process.env.NODE_ENV === 'production' ? true : false,
  experimental: {
    appDir: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    qualities: [75, 85, 100],
  },
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  // sherpa-onnx-node (local read-aloud) is a native addon: webpack cannot bundle a .node binary,
  // so the speech route has to require it from node_modules at runtime.
  serverExternalPackages: ['sherpa-onnx-node'],
  // The /readme and /confluence routes read Markdown at runtime from the filesystem. The filenames
  // come from a Record, so Next's static analysis cannot follow them and would leave the files out
  // of a standalone/`output: 'export'` build — the routes would then throw ENOENT in production.
  outputFileTracingIncludes: {
    '/readme': ['./README.md', './README_VI.md'],
    '/confluence': ['./docs/confluence/*.md'],
  },
  webpack(
    config,
    {
      dev: dev
    }
  ) {
    config.module.rules.push({
      test: /\.(jsx|tsx)$/,
      exclude: [/node_modules/],
      use: [{
        loader: '@dhiwise/component-tagger/nextLoader',
      }],
    });
    if (dev) {
      const ignoredPaths = (process.env.WATCH_IGNORED_PATHS || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      config.watchOptions = {
        ignored: ignoredPaths.length
          ? ignoredPaths.map((p) => `**/${p.replace(/^\/+|\/+$/g, '')}/**`)
          : undefined,
      };
    }
    return config;
  },
};
export default nextConfig;