import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
// Note: Removed multer and some others that use dynamic require() which doesn't work with ESM
const allowlist = [
  "@google/generative-ai",
  "@neondatabase/serverless",
  "axios",
  "cors",
  "date-fns",
  "nanoid",
  "uuid",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  // Node.js built-in modules should always be external
  const nodeBuiltins = [
    "fs", "path", "url", "os", "crypto", "http", "https", "stream", "util", 
    "events", "buffer", "querystring", "zlib", "net", "tls", "child_process",
    "cluster", "dgram", "dns", "readline", "repl", "string_decoder", "timers",
    "tty", "vm", "worker_threads"
  ];
  
  // Combine node builtins with external dependencies
  const externals = [
    ...nodeBuiltins,
    ...allDeps.filter((dep) => !allowlist.includes(dep))
  ];
  
  // Remove duplicates
  const uniqueExternals = [...new Set(externals)];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm", // Changed from "cjs" to "esm" to support import.meta.url
    outfile: "dist/index.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: uniqueExternals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
