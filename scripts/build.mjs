import { spawnSync } from "node:child_process";
import path from "node:path";
import { archiveExistingNextBuild } from "./dev-guard.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const archivedBuild = archiveExistingNextBuild({ projectRoot });

if (archivedBuild) {
  console.log(`Archived existing .next build to ${path.basename(archivedBuild.archivedNextDir)}.`);
}

const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
const result = spawnSync(nextCommand, ["build"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
