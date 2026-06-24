import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

vi.mock("../db/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock("../middleware/auth.js", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "test-user", username: "admin", role: "admin" };
    next();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireNonGuest: (_req: any, _res: any, next: any) => next(),
}));

// Mock only the network-bound timesheet fetch; keep ownerTimesheetIds (the pure
// name→id matcher) real so the route's real wiring is under test.
vi.mock("../lib/presence.js", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, fetchWeekPresence: vi.fn() };
});

const { pool } = await import("../db/pool.js");
const mockQuery = pool.query as ReturnType<typeof vi.fn>;
const { fetchWeekPresence } = await import("../lib/presence.js");
const mockFetchPresence = fetchWeekPresence as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

const app = createApp();

const OWNER = {
  id: "owner-uuid-1",
  name: "Janez Novak",
  email: "janez@example.com",
  phone: "041000000",
  vehicle_plate: "LJ-123-AB",
  notes: null,
  created_at: new Date().toISOString(),
};

describe("GET /api/owners", () => {
  it("returns all owners", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [OWNER] });

    const res = await request(app).get("/api/owners");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Janez Novak");
  });

  it("returns empty array when no owners exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/owners");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/owners/user-ids", () => {
  // /user-ids takes no auth — it is consumed only by the internal Friday
  // reminder flow.
  it("returns a flat array of owner user IDs (no auth required)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: "jakobo" }, { user_id: "jdoe" }],
    });

    const res = await request(app).get("/api/owners/user-ids");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["jakobo", "jdoe"]);
  });

  it("returns an empty array when no owners are linked", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/owners/user-ids");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not require the owners API token (reserved for /timesheet-ids)", async () => {
    process.env.OWNERS_API_TOKEN = "owners-token";
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: "jakobo" }] });

    const res = await request(app).get("/api/owners/user-ids");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["jakobo"]);
    delete process.env.OWNERS_API_TOKEN;
  });
});

describe("GET /api/owners/timesheet-ids", () => {
  const TOKEN = "secret-owners-token";

  const day = (date: string, parking_available = false) => ({
    date,
    status: "in_office" as const,
    is_work_free_day: false,
    parking_available,
  });

  beforeEach(() => {
    process.env.OWNERS_API_TOKEN = TOKEN;
  });

  afterEach(() => {
    delete process.env.OWNERS_API_TOKEN;
  });

  it("returns numeric timesheet ids for spot owners, matched by name, sorted", async () => {
    // Spot owners include a placeholder ("Tesla S") that must be excluded.
    mockQuery.mockResolvedValueOnce({
      rows: [
        { name: "Janez Novak" },
        { name: "Ana Kovač" },
        { name: "Tesla S" },
      ],
    });
    mockFetchPresence.mockResolvedValueOnce({
      employees: [
        { user_id: 42, name: "Janez Novak", week: [day("2026-06-22")] },
        { user_id: 7, name: "Ana Kovač", week: [day("2026-06-22")] },
        { user_id: 99, name: "Someone Else", week: [day("2026-06-22")] },
      ],
      work_free_days: [],
    });

    const res = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([7, 42]);
  });

  it("splits slash-separated co-owner names and matches each segment", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ name: "Janez Novak/Ana Kovač" }],
    });
    mockFetchPresence.mockResolvedValueOnce({
      employees: [
        { user_id: 5, name: "Janez Novak", week: [] },
        { user_id: 6, name: "Ana Kovač", week: [] },
      ],
      work_free_days: [],
    });

    const res = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([5, 6]);
  });

  it("omits owners with no matching timesheet employee", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ name: "Not On Timesheet" }] });
    mockFetchPresence.mockResolvedValueOnce({
      employees: [{ user_id: 1, name: "Someone Else", week: [] }],
      work_free_days: [],
    });

    const res = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 401 with a missing or wrong token", async () => {
    const missing = await request(app).get("/api/owners/timesheet-ids");
    expect(missing.status).toBe(401);

    const wrong = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", "nope");
    expect(wrong.status).toBe(401);
  });

  it("returns 500 when the token is not configured", async () => {
    delete process.env.OWNERS_API_TOKEN;

    const res = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", TOKEN);

    expect(res.status).toBe(500);
  });

  it("returns 502 when the timesheet presence fetch fails", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ name: "Janez Novak" }] });
    mockFetchPresence.mockRejectedValueOnce(new Error("timesheet down"));

    const res = await request(app)
      .get("/api/owners/timesheet-ids")
      .set("X-Owners-Token", TOKEN);

    expect(res.status).toBe(502);
  });
});

describe("POST /api/owners", () => {
  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/owners").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await request(app).post("/api/owners").send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("creates owner with name only", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...OWNER, email: null, phone: null }],
    });

    const res = await request(app)
      .post("/api/owners")
      .send({ name: "Janez Novak" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Janez Novak");
  });

  it("creates owner with all fields", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [OWNER] });

    const res = await request(app).post("/api/owners").send({
      name: "Janez Novak",
      email: "janez@example.com",
      phone: "041000000",
      vehicle_plate: "LJ-123-AB",
    });

    expect(res.status).toBe(201);
    expect(res.body.vehicle_plate).toBe("LJ-123-AB");
  });
});

describe("PUT /api/owners/:id", () => {
  it("returns 404 for non-existent owner", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/owners/non-existent-id")
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 400 when name is set to empty string", async () => {
    const res = await request(app)
      .put("/api/owners/owner-uuid-1")
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("updates owner name", async () => {
    const updated = { ...OWNER, name: "Updated Name" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/owners/owner-uuid-1")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("updates owner vehicle plate", async () => {
    const updated = { ...OWNER, vehicle_plate: "MB-999-ZZ" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/owners/owner-uuid-1")
      .send({ vehicle_plate: "MB-999-ZZ" });

    expect(res.status).toBe(200);
    expect(res.body.vehicle_plate).toBe("MB-999-ZZ");
  });
});

describe("DELETE /api/owners/:id", () => {
  it("returns 404 for non-existent owner", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/owners/non-existent-id");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("deletes owner successfully", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "owner-uuid-1" }] });

    const res = await request(app).delete("/api/owners/owner-uuid-1");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
