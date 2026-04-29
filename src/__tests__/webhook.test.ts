import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";


// ── Mocks ────────────────────────────────────────────────────────────────────

const mockConstructEvent = jest.fn();
const mockRetrieve = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieve },
  },
}));

jest.mock("@/lib/db", () => ({
  prisma: { user: { update: mockUserUpdate } },
}));

jest.mock("@/lib/subscription-plans", () => ({
  getSubscriptionPlans: jest.fn(() => [
    {
      key: "premium",
      label: "Premium",
      priceIds: { monthly: "price_pm", yearly: "price_py" },
    },
    {
      key: "max",
      label: "Max",
      priceIds: { monthly: "price_mm", yearly: "price_my" },
    },
  ]),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: string) {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": "sig_test" },
  });
}

function makeSubscription(priceId: string, status = "active") {
  return {
    id: "sub_123",
    status,
    customer: "cus_123",
    items: { data: [{ price: { id: priceId } }] },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ POST } = await import("@/app/api/stripe/webhook/route"));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("renvoie 400 si la signature est invalide", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("checkout.session.completed - souscription Premium mensuel", async () => {
    const subscription = makeSubscription("price_pm");
    mockRetrieve.mockResolvedValue(subscription);
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: { subscription: "sub_123", customer: "cus_123" },
      },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeCustomerId: "cus_123" },
        data: expect.objectContaining({ plan: "premium", period: "monthly" }),
      }),
    );
  });

  it("checkout.session.completed - souscription Max annuel", async () => {
    const subscription = makeSubscription("price_my");
    mockRetrieve.mockResolvedValue(subscription);
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: { subscription: "sub_123", customer: "cus_123" },
      },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "max", period: "yearly" }),
      }),
    );
  });

  it("customer.subscription.updated - mise à jour du plan", async () => {
    const subscription = makeSubscription("price_mm");
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { ...subscription } },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "max", period: "monthly" }),
      }),
    );
  });

  it("customer.subscription.deleted - efface le plan et la période", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          status: "canceled",
          customer: "cus_123",
          items: { data: [{ price: { id: "price_pm" } }] },
        },
      },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: null,
          period: null,
          stripePriceId: null,
          stripeStatus: "canceled",
        }),
      }),
    );
  });
});
