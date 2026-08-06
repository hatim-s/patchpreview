import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type InitialPatch = {
  contents: string;
  name: string;
};

type PatchPreviewState = {
  patchPath?: string;
};

async function getConfiguredPatchPath(): Promise<string | null> {
  const statePath = process.env.PATCHPREVIEW_STATE_FILE?.trim();
  if (statePath) {
    try {
      const state = JSON.parse(await readFile(statePath, "utf8")) as PatchPreviewState;
      return state.patchPath?.trim() || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to read PATCHPREVIEW_STATE_FILE at ${statePath}: ${message}`);
    }
  }

  return process.env.PATCHPREVIEW_FILE?.trim() || null;
}

async function readInitialPatch(): Promise<InitialPatch | null> {
  const configuredPath = await getConfiguredPatchPath();
  if (!configuredPath) return null;

  const absolutePath = resolve(process.cwd(), configuredPath);
  try {
    return {
      contents: await readFile(absolutePath, "utf8"),
      name: basename(absolutePath),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read PATCHPREVIEW_FILE at ${absolutePath}: ${message}`);
  }
}

function initialPatchPlugin(): Plugin {
  return {
    name: "patchpreview-initial-patch",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split("?")[0];
        if (pathname === "/__patchpreview-health") {
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ service: "patchpreview" }));
          return;
        }
        if (pathname !== "/initial-patch.json") {
          next();
          return;
        }

        const patch = await readInitialPatch();
        if (patch === null) {
          response.statusCode = 404;
          response.end("No initial patch configured.");
          return;
        }

        response.setHeader("Cache-Control", "no-store");
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
