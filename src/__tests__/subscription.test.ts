import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = jest.fn();
const mockFindUnique = jest.fn();
const mockSubscriptionsUpdate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock("@/auth", () => ({ auth: mockAuth }));

jest.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}));

jest.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
      update: mockSubscriptionsUpdate,
    },
  },
}));

jest.mock("@/lib/subscription-plans", () => ({
  getAllowedPriceIds: jest.fn(
    () => new Set(["price_pm", "price_py", "price_mm", "price_my"]),
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/stripe/subscription", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockStripeSubscription(currentPriceId: string) {
  mockSubscriptionsRetrieve.mockResolvedValue({
    items: { data: [{ id: "si_123", price: { id: currentPriceId } }] },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/stripe/subscription", () => {
  let PATCH: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ PATCH } = await import("@/app/api/stripe/subscription/route"));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("renvoie 401 si non authentifié", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ priceId: "price_mm" }));
    expect(res.status).toBe(401);
  });

  it("renvoie 400 si priceId manquant", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });

    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/priceId/i);
  });

  it("renvoie 400 si priceId invalide", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });

    const res = await PATCH(makeRequest({ priceId: "price_inconnu" }));
    expect(res.status).toBe(400);
  });

  it("renvoie 400 si aucun abonnement actif", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });
    mockFindUnique.mockResolvedValue({ stripeSubscriptionId: null });

    const res = await PATCH(makeRequest({ priceId: "price_mm" }));
    expect(res.status).toBe(400);
  });

  it("renvoie 400 si l'utilisateur est déjà sur ce plan", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });
    mockFindUnique.mockResolvedValue({ stripeSubscriptionId: "sub_123" });
    mockStripeSubscription("price_mm");

    const res = await PATCH(makeRequest({ priceId: "price_mm" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/déjà/i);
  });

  it("upgrade Premium mensuel → Max mensuel", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });
    mockFindUnique.mockResolvedValue({ stripeSubscriptionId: "sub_123" });
    mockStripeSubscription("price_pm");
    mockSubscriptionsUpdate.mockResolvedValue({});

    const res = await PATCH(makeRequest({ priceId: "price_mm" }));

    expect(res.status).toBe(200);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        items: [{ id: "si_123", price: "price_mm" }],
      }),
    );
  });

  it("downgrade Max annuel → Premium mensuel", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });
    mockFindUnique.mockResolvedValue({ stripeSubscriptionId: "sub_123" });
    mockStripeSubscription("price_my");
    mockSubscriptionsUpdate.mockResolvedValue({});

    const res = await PATCH(makeRequest({ priceId: "price_pm" }));

    expect(res.status).toBe(200);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        items: [{ id: "si_123", price: "price_pm" }],
      }),
    );
  });

  it("changement mensuel → annuel sur le même plan", async () => {
    mockAuth.mockResolvedValue({ user: { email: "user@test.com" } });
    mockFindUnique.mockResolvedValue({ stripeSubscriptionId: "sub_123" });
    mockStripeSubscription("price_pm");
    mockSubscriptionsUpdate.mockResolvedValue({});

    const res = await PATCH(makeRequest({ priceId: "price_py" }));

    expect(res.status).toBe(200);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        items: [{ id: "si_123", price: "price_py" }],
      }),
    );
  });
});
