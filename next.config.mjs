/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp and mupdf are native/WASM-backed OMR decoders (src/lib/omr/**) with
  // no business being webpack-bundled into a Node.js route handler - mupdf in
  // particular is real ESM with a top-level await, which breaks under the
  // bundle ("TypeError: e is not a function" during `next build`'s page-data
  // collection, which actually executes route modules to read their config).
  // Left external, both resolve normally from node_modules at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ["sharp", "mupdf"],
  },
};

export default nextConfig;
