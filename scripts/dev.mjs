#!/usr/bin/env bun

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import {
  acquireDevLock,
  archiveIncompatibleNextBuildForDev,
  findConflictingDevServer,
  listWorkspaceProcesses,
} from "./dev-guard.mjs";

const projectRoot = process.cwd();
const currentPid = process.pid;
const args = process.argv.slice(2);
const conflict = findConflictingDevServer({
  projectRoot,
  currentPid,
  processes: listWorkspaceProcesses(),
});

if (conflict) {
  process.stderr.write(
    `[dev] Another Next.js dev server is already running for ${projectRoot} (PID ${conflict.pid}).\n` +
      "[dev] Stop the existing dev process before starting a second one to avoid corrupting .next and missing vendor chunks.\n",
  );
  process.exit(1);
}

const archivedNextBuild = archiveIncompatibleNextBuildForDev({ projectRoot });

if (archivedNextBuild) {
  process.stdout.write(
    `[dev] Archived incompatible Next build from ${archivedNextBuild.nextDir} to ${archivedNextBuild.archivedNextDir}.\n` +
      `[dev] Reason: ${archivedNextBuild.reason} (${archivedNextBuild.entryPath}).\n`,
  );
}

const lock = acquireDevLock({
  lockPath: path.join(projectRoot, ".next", "dev-server.lock"),
  currentPid,
});

if (!lock.ok) {
  process.stderr.write(
    `[dev] Dev lock is already held by PID ${lock.conflictPid}. Stop that process first.\n`,
  );
  process.exit(1);
}

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.env.NODE_BINARY ?? "node", [nextBin, "dev", ...args], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

let finished = false;

function releaseAndExit(code) {
  if (finished) {
    return;
  }

  finished = true;
  lock.release();
  process.exit(code);
}

child.on("exit", (code, signal) => {
  if (signal) {
    releaseAndExit(1);
    return;
  }

  releaseAndExit(code ?? 0);
});

child.on("error", () => {
  releaseAndExit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
      return;
    }

    releaseAndExit(1);
  });
}
