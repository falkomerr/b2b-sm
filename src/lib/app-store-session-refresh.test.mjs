import { describe, expect, test } from "bun:test";
import {
  SESSION_TTL_MS,
  replaceSessionAccessToken,
} from "./app-store.tsx";

const NOW = Date.parse("2026-03-24T12:00:00.000Z");

describe("replaceSessionAccessToken", () => {
  test("preserves absolute expiry when applying a refreshed access token", () => {
    const session = {
      accessToken: "expired-token",
      expiresAt: NOW + SESSION_TTL_MS,
      user: {
        userId: "user-1",
        accountType: "b2b_company",
        name: "Иван Иванов",
      },
    };

    expect(replaceSessionAccessToken(session, "fresh-token")).toEqual({
      accessToken: "fresh-token",
      expiresAt: NOW + SESSION_TTL_MS,
      user: session.user,
    });
  });
});
