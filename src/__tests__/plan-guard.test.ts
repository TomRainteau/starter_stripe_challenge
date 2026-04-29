import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}));

// requireMaxPlan utilise redirect et auth — testée via assertMaxPlan
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("assertMaxPlan", () => {
  let assertMaxPlan: (email: string) => Promise<Response | null>;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ assertMaxPlan } = await import("@/lib/plan-guard"));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("renvoie null pour un utilisateur Max actif", async () => {
    mockFindUnique.mockResolvedValue({ plan: "max", stripeStatus: "active" });

    const result = await assertMaxPlan("max@test.com");
    expect(result).toBeNull();
  });

  it("renvoie 403 pour un utilisateur Premium actif", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "premium",
      stripeStatus: "active",
    });

    const result = await assertMaxPlan("premium@test.com");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toMatch(/max/i);
  });

  it("renvoie 403 si aucun abonnement actif", async () => {
    mockFindUnique.mockResolvedValue({ plan: null, stripeStatus: null });

    const result = await assertMaxPlan("free@test.com");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("renvoie 403 si le statut est canceled", async () => {
    mockFindUnique.mockResolvedValue({
      plan: "max",
      stripeStatus: "canceled",
    });

    const result = await assertMaxPlan("canceled@test.com");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("renvoie 403 si l'utilisateur n'existe pas", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await assertMaxPlan("unknown@test.com");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
