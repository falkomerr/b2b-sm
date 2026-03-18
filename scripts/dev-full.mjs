#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const frontendDir = process.cwd();
const backendDir = path.resolve(
  frontendDir,
  process.env.BACKEND_DIR ?? "../sm-landing-backend",
);
const backendScript = process.env.BACKEND_SCRIPT ?? "start:dev";
const checkOnly = process.argv.includes("--check");

function ensureWorkspace(label, dir) {
  const manifestPath = path.join(dir, "package.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`${label}: package.json not found at ${manifestPath}`);
  }

  return manifestPath;
}

function log(message) {
  process.stdout.write(`[dev:full] ${message}\n`);
}

function prefixStream(stream, prefix, writer) {
  let buffer = "";
  stream.setEncoding("utf8");

  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      writer.write(`${prefix} ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      writer.write(`${prefix} ${buffer}\n`);
    }
  });
}

function runProcess(label, dir, args) {
  const child = spawn("bun", args, {
    cwd: dir,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  prefixStream(child.stdout, `[${label}]`, process.stdout);
  prefixStream(child.stderr, `[${label}]`, process.stderr);

  child.on("error", (error) => {
    process.stderr.write(`[${label}] failed to start: ${error.message}\n`);
  });

  return child;
}

ensureWorkspace("frontend", frontendDir);
ensureWorkspace("backend", backendDir);

if (checkOnly) {
  log(`frontend: ${frontendDir}`);
  log(`backend: ${backendDir}`);
  log(`frontend command: bun run dev`);
  log(`backend command: bun run ${backendScript}`);
  process.exit(0);
}

const processes = [
  runProcess("backend", backendDir, ["run", backendScript]),
  runProcess("frontend", frontendDir, ["run", "dev"]),
];

let shuttingDown = false;

function shutdown(reason, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log(reason);

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of processes) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(exitCode);
  }, 1000).unref();
}

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal
      ? `process stopped by signal ${signal}`
      : `process exited with code ${code ?? 1}`;

    shutdown(reason, code ?? 1);
  });
}

process.on("SIGINT", () => shutdown("received SIGINT, stopping frontend and backend"));
process.on("SIGTERM", () =>
  shutdown("received SIGTERM, stopping frontend and backend"),
);
