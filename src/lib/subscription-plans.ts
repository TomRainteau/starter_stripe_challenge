export type BillingPeriod = "monthly" | "yearly";

export type SubscriptionPlan = {
  key: string;
  label: string;
  priceIds: Record<BillingPeriod, string>;
};

function createPlan(
  key: string,
  label: string,
  monthlyPriceId?: string,
  yearlyPriceId?: string,
): SubscriptionPlan | null {
  if (!monthlyPriceId || !yearlyPriceId) {
    return null;
  }

  return {
    key,
    label,
    priceIds: {
      monthly: monthlyPriceId,
      yearly: yearlyPriceId,
    },
  };
}

export function getSubscriptionPlans(): SubscriptionPlan[] {
  return [
    createPlan(
      "premium",
      "Premium",
      process.env.STRIPE_PRICE_ID_PREMIUM_MONTHLY,
      process.env.STRIPE_PRICE_ID_PREMIUM_YEARLY,
    ),
    createPlan(
      "max",
      "Max",
      process.env.STRIPE_PRICE_ID_MAX_MONTHLY,
      process.env.STRIPE_PRICE_ID_MAX_YEARLY,
    ),
  ].filter((plan): plan is SubscriptionPlan => plan !== null);
}

export function getAllowedPriceIds() {
  return new Set(
    getSubscriptionPlans().flatMap((plan) => [
      plan.priceIds.monthly,
      plan.priceIds.yearly,
    ]),
  );
}
