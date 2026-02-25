import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

vi.mock("../db/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

const { pool } = await import("../db/pool.js");
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

const app = createApp();

const SPOT = {
  id: "spot-uuid-1",
  number: 1,
  label: "A1",
  floor: "P1",
  lot_id: "lot-uuid-1",
  status: "free",
  coordinates: null,
  created_at: new Date().toISOString(),
};

describe("POST /api/spots — admin create", () => {
  it("returns 400 when number is missing", async () => {
    const res = await request(app)
      .post("/api/spots")
      .send({ lot_id: "lot-uuid-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/number/);
  });

  it("returns 400 when number is not a positive integer", async () => {
    const res = await request(app)
      .post("/api/spots")
      .send({ number: -1, lot_id: "lot-uuid-1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/number/);
  });

  it("returns 400 when lot_id is missing", async () => {
    const res = await request(app).post("/api/spots").send({ number: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lot_id/);
  });

  it("creates spot with minimal data", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SPOT] });

    const res = await request(app)
      .post("/api/spots")
      .send({ number: 1, lot_id: "lot-uuid-1" });

    expect(res.status).toBe(201);
    expect(res.body.number).toBe(1);
    expect(res.body.status).toBe("free");
  });

  it("defaults status to free for invalid status value", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...SPOT, status: "free" }] });

    const res = await request(app)
      .post("/api/spots")
      .send({ number: 1, lot_id: "lot-uuid-1", status: "invalid-status" });

    expect(res.status).toBe(201);
    // status is coerced to 'free' for unknown values
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["free"]),
    );
  });

  it("creates spot with reserved status", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...SPOT, status: "reserved" }],
    });

    const res = await request(app)
      .post("/api/spots")
      .send({ number: 2, lot_id: "lot-uuid-1", status: "reserved" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("reserved");
  });
});

describe("PUT /api/spots/:id — admin update", () => {
  it("returns 404 for non-existent spot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/spots/non-existent-id")
      .send({ number: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 400 for invalid status value", async () => {
    const res = await request(app)
      .put("/api/spots/spot-uuid-1")
      .send({ status: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
  });

  it("updates spot number", async () => {
    const updated = { ...SPOT, number: 99 };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/spots/spot-uuid-1")
      .send({ number: 99 });

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(99);
  });

  it("updates spot status", async () => {
    const updated = { ...SPOT, status: "occupied" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/spots/spot-uuid-1")
      .send({ status: "occupied" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("occupied");
  });
});

describe("DELETE /api/spots/:id — admin delete", () => {
  it("returns 404 for non-existent spot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/spots/non-existent-id");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("deletes spot successfully", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "spot-uuid-1" }] });

    const res = await request(app).delete("/api/spots/spot-uuid-1");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
