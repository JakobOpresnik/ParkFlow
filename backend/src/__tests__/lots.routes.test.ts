import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const LOT = {
  id: "lot-uuid-1",
  name: "Zunaj",
  description: null,
  image_filename: "parking-map.png",
  image_width: 1200,
  image_height: 700,
  sort_order: 0,
  created_at: new Date().toISOString(),
};

describe("GET /api/lots", () => {
  it("returns all parking lots", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [LOT] });

    const res = await request(app).get("/api/lots");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Zunaj");
  });

  it("returns empty array when no lots exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/lots");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/lots", () => {
  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api/lots").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("returns 400 when name is empty string", async () => {
    const res = await request(app).post("/api/lots").send({ name: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it("creates a lot with minimal data", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [LOT] });

    const res = await request(app).post("/api/lots").send({ name: "Zunaj" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Zunaj");
  });

  it("creates a lot with all fields", async () => {
    const lotWithFields = { ...LOT, sort_order: 2, image_width: 800 };
    mockQuery.mockResolvedValueOnce({ rows: [lotWithFields] });

    const res = await request(app).post("/api/lots").send({
      name: "Zunaj",
      description: "Outdoor lot",
      image_filename: "outdoor.png",
      image_width: 800,
      image_height: 600,
      sort_order: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.image_width).toBe(800);
  });
});

describe("PUT /api/lots/:id", () => {
  it("returns 404 for non-existent lot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/api/lots/non-existent-id")
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("updates lot name", async () => {
    const updated = { ...LOT, name: "Updated Name" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/lots/lot-uuid-1")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
  });

  it("returns updated lot on success", async () => {
    const updated = { ...LOT, sort_order: 5 };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/api/lots/lot-uuid-1")
      .send({ sort_order: 5 });

    expect(res.status).toBe(200);
    expect(res.body.sort_order).toBe(5);
  });
});

describe("DELETE /api/lots/:id", () => {
  it("returns 409 when lot still has spots", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const res = await request(app).delete("/api/lots/lot-uuid-1");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/spots/);
  });

  it("returns 404 for non-existent lot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/api/lots/non-existent-id");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("deletes an empty lot successfully", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "lot-uuid-1" }] });

    const res = await request(app).delete("/api/lots/lot-uuid-1");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
