#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const viteEntrypoint = resolve(projectDirectory, "node_modules/vite/bin/vite.js");
const args = process.argv.slice(2);
let host = "127.0.0.1";
let port = "5173";
let shouldOpen = true;
let patchPath = "";

function usage() {
  console.log(`Usage: patch-viewer <file.patch> [options]

Options:
  --host <host>  Dev server host (default: 127.0.0.1)
  --port <port>  Dev server port (default: 5173)
  --no-open      Do not open the browser automatically
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
if (!existsSync(patchPath)) throw new Error(`Patch file not found: ${patchPath}`);
if (!existsSync(viteEntrypoint)) {
  throw new Error(`Dependencies are missing. Run 'bun install' in ${projectDirectory}`);
}

const command = [
  process.execPath,
  viteEntrypoint,
  "--host",
  host,
  "--port",
  port,
  ...(shouldOpen ? ["--open"] : []),
];
const child = Bun.spawn(command, {
  cwd: projectDirectory,
  env: { ...process.env, PATCH_VIEWER_FILE: patchPath },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await child.exited);
