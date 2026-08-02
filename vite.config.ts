import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type InitialPatch = {
  contents: string;
  name: string;
};

async function readInitialPatch(): Promise<InitialPatch | null> {
  const configuredPath = process.env.PATCH_VIEWER_FILE?.trim();
  if (!configuredPath) return null;

  const absolutePath = resolve(process.cwd(), configuredPath);
  try {
    return {
      contents: await readFile(absolutePath, "utf8"),
      name: basename(absolutePath),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read PATCH_VIEWER_FILE at ${absolutePath}: ${message}`);
  }
}

function initialPatchPlugin(): Plugin {
  return {
    name: "patch-viewer-initial-patch",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/initial-patch.json") {
          next();
          return;
        }

        const patch = await readInitialPatch();
        if (patch === null) {
          response.statusCode = 404;
          response.end("No initial patch configured.");
          return;
        }

        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify(patch));
      });
    },
    async generateBundle() {
      const patch = await readInitialPatch();
      if (patch !== null) {
        this.emitFile({
          type: "asset",
          fileName: "initial-patch.json",
          source: JSON.stringify(patch),
        });
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), initialPatchPlugin()],
});
