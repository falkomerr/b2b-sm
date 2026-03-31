import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  acquireDevLock,
  archiveExistingNextBuild,
  archiveIncompatibleNextBuildForDev,
  findConflictingDevServer,
  findIncompatibleNextBuild,
} from "./dev-guard.mjs";

describe("findConflictingDevServer", () => {
  test("returns another next dev process from the same workspace", () => {
    const projectRoot = "/workspace/sm-b2b";

    expect(
      findConflictingDevServer({
        projectRoot,
        currentPid: 200,
        processes: [
          { pid: 100, cwd: projectRoot, command: "next-server (v15.5.10)" },
          { pid: 200, cwd: projectRoot, command: "node /repo/node_modules/next/dist/bin/next dev" },
          { pid: 300, cwd: "/workspace/other", command: "next-server (v15.5.10)" },
        ],
      }),
    ).toEqual({
      pid: 100,
      cwd: projectRoot,
      command: "next-server (v15.5.10)",
    });
  });
});

describe("acquireDevLock", () => {
  test("rejects an active lock owned by another process", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-dev-lock-"));
    const lockPath = path.join(tempDir, ".next", "dev-server.lock");

    try {
      const firstLock = acquireDevLock({
        lockPath,
        currentPid: 101,
        isPidAlive: (pid) => pid === 101,
      });

      expect(firstLock.ok).toBe(true);

      const secondLock = acquireDevLock({
        lockPath,
        currentPid: 202,
        isPidAlive: (pid) => pid === 101,
      });

      expect(secondLock).toEqual({
        ok: false,
        conflictPid: 101,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("replaces a stale lock file", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-dev-lock-"));
    const lockPath = path.join(tempDir, ".next", "dev-server.lock");

    try {
      mkdirSync(path.dirname(lockPath), { recursive: true });
      writeFileSync(
        lockPath,
        JSON.stringify({
          pid: 303,
          createdAt: "2026-03-18T16:00:00.000Z",
        }),
        "utf8",
      );

      const lock = acquireDevLock({
        lockPath,
        currentPid: 404,
        isPidAlive: () => false,
      });

      expect(lock.ok).toBe(true);
      expect(JSON.parse(readFileSync(lockPath, "utf8"))).toMatchObject({
        pid: 404,
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("findIncompatibleNextBuild", () => {
  test("detects a stale non-dev .next build with server chunks", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-dev-lock-"));
    const nextDir = path.join(tempDir, ".next");
    const entryPath = path.join(nextDir, "server", "app", "page.js");

    try {
      mkdirSync(path.join(nextDir, "server", "chunks"), { recursive: true });
      mkdirSync(path.dirname(entryPath), { recursive: true });
      writeFileSync(entryPath, 'exports.id="app/page";', "utf8");

      expect(findIncompatibleNextBuild({ projectRoot: tempDir })).toEqual({
        nextDir,
        entryPath,
        reason: "server chunks from a non-dev build are incompatible with next dev",
      });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("ignores a dev .next build even if a chunks directory exists", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-dev-lock-"));
    const nextDir = path.join(tempDir, ".next");
    const entryPath = path.join(nextDir, "server", "app", "page.js");

    try {
      mkdirSync(path.join(nextDir, "server", "chunks"), { recursive: true });
      mkdirSync(path.dirname(entryPath), { recursive: true });
      writeFileSync(
        entryPath,
        '/* ATTENTION: An "eval-source-map" devtool has been used. */',
        "utf8",
      );

      expect(findIncompatibleNextBuild({ projectRoot: tempDir })).toBeNull();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("archiveIncompatibleNextBuildForDev", () => {
  test("moves an incompatible .next build into a unique stale directory", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-dev-lock-"));
    const nextDir = path.join(tempDir, ".next");
    const existingArchive = path.join(tempDir, ".next.stale.42");
    const entryPath = path.join(nextDir, "server", "app", "page.js");

    try {
      mkdirSync(path.join(nextDir, "server", "chunks"), { recursive: true });
      mkdirSync(path.dirname(entryPath), { recursive: true });
      mkdirSync(existingArchive, { recursive: true });
      writeFileSync(entryPath, 'exports.id="app/page";', "utf8");

      const archived = archiveIncompatibleNextBuildForDev({
        projectRoot: tempDir,
        now: () => 42000,
      });

      expect(archived?.archivedNextDir).toBe(path.join(tempDir, ".next.stale.42-1"));
      expect(existsSync(nextDir)).toBe(false);
      expect(existsSync(path.join(tempDir, ".next.stale.42-1", "server", "app", "page.js"))).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("archiveExistingNextBuild", () => {
  test("moves any existing .next directory into a unique stale directory", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "sm-b2b-build-"));
    const nextDir = path.join(tempDir, ".next");
    const markerPath = path.join(nextDir, "trace");
    const existingArchive = path.join(tempDir, ".next.stale.42");

    try {
      mkdirSync(nextDir, { recursive: true });
      mkdirSync(existingArchive, { recursive: true });
      writeFileSync(markerPath, "build-cache", "utf8");

      const archived = archiveExistingNextBuild({
        projectRoot: tempDir,
        now: () => 42000,
      });

      expect(archived?.archivedNextDir).toBe(path.join(tempDir, ".next.stale.42-1"));
      expect(existsSync(nextDir)).toBe(false);
      expect(existsSync(path.join(tempDir, ".next.stale.42-1", "trace"))).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
