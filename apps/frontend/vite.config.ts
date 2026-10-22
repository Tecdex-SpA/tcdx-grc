import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

export default defineConfig({
  publicDir: fileURLToPath(new URL("../../docs/ui/assets/brand/", import.meta.url)),
  plugins: [{
    name: "commercial-operational-documents",
    generateBundle() {
      for (const name of ["ticket-creacion-tenant-qa.pdf", "terminos-comerciales-grc-v2-qa.pdf"]) {
        this.emitFile({ type: "asset", fileName: `commercial/${name}`,
          source: readFileSync(new URL(`./public/commercial/${name}`, import.meta.url)) });
      }
    }
  }]
});
