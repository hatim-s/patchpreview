#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectDirectory = resolve(import.meta.dir, "..");
const viteEntrypoint = resolve(projectDirectory, "node_modules/vite/bin/vite.js");
const args = process.argv.slice(2);
let host = "127.0.0.1";
let port = "5173";
let shouldOpen = true;
let patchPath = "";

function usage() {
  console.log(`Usage: patchpreview <file.patch> [options]

Options:
  --host <host>  Dev server host (default: 127.0.0.1)
  --port <port>  Dev server port (default: 5173)
  --no-open      Update/start the viewer without opening the browser
  -h, --help     Show this help`);
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "-h" || arg === "--help") {
    usage();
    process.exit(0);
  }
  if (arg === "--host" || arg === "--port") {
    const value = args[index + 1];
    if (!value) throw new Error(`${arg} requires a value`);
    if (arg === "--host") host = value;
    else port = value;
    index += 1;
    continue;
  }
  if (arg === "--no-open") {
    shouldOpen = false;
    continue;
  }
  if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
  if (patchPath) throw new Error("Pass exactly one patch file");
  patchPath = resolve(arg);
}

if (!patchPath) {
  usage();
  process.exit(1);
}
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`Invalid port: ${port}`);
}
if (!existsSync(patchPath)) throw new Error(`Patch file not found: ${patchPath}`);
if (!existsSync(viteEntrypoint)) {
  throw new Error(`Dependencies are missing. Run 'bun install' in ${projectDirectory}`);
}

const safeHost = host.replace(/[^a-zA-Z0-9.-]/g, "_");
const stateDirectory = join(tmpdir(), "patchpreview");
const stateFile = join(stateDirectory, `${safeHost}-${port}.json`);
const connectionHost = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
const urlHost = connectionHost.includes(":") ? `[${connectionHost}]` : connectionHost;
const baseUrl = `http://${urlHost}:${port}`;

mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
writeFileSync(
  stateFile,
  `${JSON.stringify({ patchPath, updatedAt: new Date().toISOString() })}\n`,
  { mode: 0o600 },
);

async function viewerIsReady() {
  try {
    const response = await fetch(`${baseUrl}/__patchpreview-health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(500),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.service === "patchpreview";
  } catch {
    return false;
  }
}

function openBrowser(url) {
  const [command, ...commandArgs] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const browserProcess = spawn(command, commandArgs, {
    detached: true,
    stdio: "ignore",
  });
  browserProcess.on("error", () => {});
  browserProcess.unref();
}

const wasRunning = await viewerIsReady();
if (!wasRunning) {
  const server = spawn(
    process.execPath,
    [viteEntrypoint, "--host", host, "--port", port, "--strictPort"],
    {
      cwd: projectDirectory,
      detached: true,
      env: { ...process.env, PATCHPREVIEW_STATE_FILE: stateFile },
      stdio: "ignore",
    },
  );
  server.unref();

  for (let attempt = 0; attempt < 50 && !(await viewerIsReady()); attempt += 1) {
    await Bun.sleep(100);
  }
  if (!(await viewerIsReady())) {
    throw new Error(`Unable to start PatchPreview at ${baseUrl}. The port may already be in use.`);
  }
}

const viewerUrl = `${baseUrl}/?source=${Date.now()}`;
if (shouldOpen) openBrowser(viewerUrl);
console.log(`${wasRunning ? "Updated" : "Started"} PatchPreview: ${viewerUrl}`);
