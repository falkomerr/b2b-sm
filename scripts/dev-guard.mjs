import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function isNextDevCommand(command) {
  return (
    command.includes("next-server") ||
    command.includes("/next/dist/bin/next dev") ||
    /(^|\s)next dev(\s|$)/.test(command)
  );
}

export function findConflictingDevServer({ projectRoot, currentPid, processes }) {
  return (
    processes.find(
      (processInfo) =>
        processInfo.pid !== currentPid &&
        processInfo.cwd === projectRoot &&
        isNextDevCommand(processInfo.command),
    ) ?? null
  );
}

export function readLock(lockPath) {
  try {
    return JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return null;
  }
}

export function acquireDevLock({
  lockPath,
  currentPid,
  isPidAlive = defaultIsPidAlive,
}) {
  mkdirSync(path.dirname(lockPath), { recursive: true });

  const existingLock = readLock(lockPath);

  if (existingLock?.pid && existingLock.pid !== currentPid && isPidAlive(existingLock.pid)) {
    return {
      ok: false,
      conflictPid: existingLock.pid,
    };
  }

  writeFileSync(
    lockPath,
    JSON.stringify(
      {
        pid: currentPid,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    ok: true,
    release() {
      const activeLock = readLock(lockPath);

      if (activeLock?.pid === currentPid) {
        rmSync(lockPath, { force: true });
      }
    },
  };
}

const STALE_NEXT_ENTRY_FILES = [
  ["server", "app", "page.js"],
  ["server", "app", "favicon.ico", "route.js"],
  ["server", "pages", "_document.js"],
  ["server", "pages", "_app.js"],
];

export function findIncompatibleNextBuild({
  projectRoot,
  exists = existsSync,
  readFile = defaultReadFile,
}) {
  const nextDir = path.join(projectRoot, ".next");
  const serverChunksDir = path.join(nextDir, "server", "chunks");

  if (!exists(serverChunksDir)) {
    return null;
  }

  for (const segments of STALE_NEXT_ENTRY_FILES) {
    const entryPath = path.join(nextDir, ...segments);

    if (!exists(entryPath)) {
      continue;
    }

    const entrySource = readFile(entryPath);

    if (
      entrySource.includes("eval-source-map") ||
      entrySource.includes("isDev=true")
    ) {
      return null;
    }

    return {
      nextDir,
      entryPath,
      reason: "server chunks from a non-dev build are incompatible with next dev",
    };
  }

  return null;
}

export function archiveIncompatibleNextBuildForDev({
  projectRoot,
  now = Date.now,
  exists = existsSync,
  readFile = defaultReadFile,
  rename = renameSync,
}) {
  const incompatibleBuild = findIncompatibleNextBuild({
    projectRoot,
    exists,
    readFile,
  });

  if (!incompatibleBuild) {
    return null;
  }

  const archivedNextDir = createArchivedNextDir({
    projectRoot,
    exists,
    now,
  });

  rename(incompatibleBuild.nextDir, archivedNextDir);

  return {
    ...incompatibleBuild,
    archivedNextDir,
  };
}

export function archiveExistingNextBuild({
  projectRoot,
  now = Date.now,
  exists = existsSync,
  rename = renameSync,
}) {
  const nextDir = path.join(projectRoot, ".next");

  if (!exists(nextDir)) {
    return null;
  }

  const archivedNextDir = createArchivedNextDir({
    projectRoot,
    exists,
    now,
  });

  rename(nextDir, archivedNextDir);

  return {
    nextDir,
    archivedNextDir,
  };
}

export function listWorkspaceProcesses({ run = defaultRun } = {}) {
  const psResult = run("ps", ["-Ao", "pid=,command="]);

  if (psResult.status !== 0) {
    return [];
  }

  return psResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);

      if (!match) {
        return null;
      }

      return {
        pid: Number(match[1]),
        command: match[2],
      };
    })
    .filter((processInfo) => processInfo && isNextDevCommand(processInfo.command))
    .map((processInfo) => ({
      ...processInfo,
      cwd: readProcessCwd(processInfo.pid, run),
    }))
    .filter((processInfo) => Boolean(processInfo.cwd));
}

function readProcessCwd(pid, run) {
  const lsofResult = run("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"]);

  if (lsofResult.status !== 0) {
    return null;
  }

  const cwdLine = lsofResult.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("n"));

  return cwdLine ? cwdLine.slice(1) : null;
}

function defaultRun(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
  });
}

function defaultReadFile(filePath) {
  return readFileSync(filePath, "utf8");
}

function createArchivedNextDir({ projectRoot, exists, now }) {
  const timestamp = Math.floor(now() / 1000);
  let suffix = 0;

  while (true) {
    const candidateName =
      suffix === 0 ? `.next.stale.${timestamp}` : `.next.stale.${timestamp}-${suffix}`;
    const candidatePath = path.join(projectRoot, candidateName);

    if (!exists(candidatePath)) {
      return candidatePath;
    }

    suffix += 1;
  }
}

function defaultIsPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
