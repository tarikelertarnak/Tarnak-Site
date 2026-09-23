// Generates wrangler.json at build time so the Cloudflare Pages build
// system (which runs its config check before the build command) never sees
// a config file, while opennext:build still gets the main/assets external map.
const fs = require("fs");

const config = {
  name: "tarikelertarnak",
  main: ".open-next/worker.js",
  assets: {
    not_found_handling: "single-page-application",
    run_worker_first: true,
  },
  compatibility_date: "2026-09-15",
  compatibility_flags: ["nodejs_compat", "nodejs_compat_v2"],
  pages_build_output_dir: ".open-next",
};

fs.writeFileSync("wrangler.json", JSON.stringify(config, null, 2));
console.log("wrangler.json generated from scripts/gen-wrangler.cjs");