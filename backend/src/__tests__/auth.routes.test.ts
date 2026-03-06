import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

// Mock the database pool (not used by /me currently, but kept for safety)
vi.mock("../db/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

const app = createApp();

function stubFetch(ok: boolean, userinfo?: object) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: async () => userinfo ?? {},
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    stubFetch(false);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
  });

  it("returns user info with a valid Authentik token", async () => {
    stubFetch(true, {
      sub: "uuid-1",
      preferred_username: "admin",
      groups: ["parkflow-admins"],
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("admin");
    expect(res.body.role).toBe("admin");
  });

  it("assigns role=user when not in admin group", async () => {
    stubFetch(true, {
      sub: "uuid-2",
      preferred_username: "regularuser",
      groups: [],
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("user");
  });
});
