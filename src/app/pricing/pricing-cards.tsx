"use client";

import { useState } from "react";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/subscription-plans";

const PLAN_CONFIG: Record<
  string,
  {
    monthlyPrice: string;
    yearlyPrice: string;
    features: string[];
    highlighted: boolean;
  }
> = {
  premium: {
    monthlyPrice: "9€",
    yearlyPrice: "90€",
    features: [
      "Accès aux fonctionnalités de base",
      "5 Go de stockage",
      "Support par email",
      "Mises à jour incluses",
    ],
    highlighted: false,
  },
  max: {
    monthlyPrice: "19€",
    yearlyPrice: "190€",
    features: [
      "Tout le plan Premium",
      "Stockage illimité",
      "Support prioritaire 24/7",
      "Analytiques avancées",
      "Accès API",
    ],
    highlighted: true,
  },
};

export function PricingCards({
  plans,
  isAuthenticated,
  isSubscribed,
}: {
  plans: SubscriptionPlan[];
  isAuthenticated: boolean;
  isSubscribed: boolean;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      window.location.href = "/auth/signin";
      return;
    }
    if (isSubscribed) {
      window.location.href = "/dashboard";
      return;
    }

    setLoadingKey(plan.key);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceIds[period] }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Toggle mensuel / annuel */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          {(["monthly", "yearly"] as BillingPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              {p === "monthly" ? "Mensuel" : "Annuel"}
              {p === "yearly" && (
                <span className="ml-2 text-xs font-semibold text-green-600 dark:text-green-400">
                  −17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const config = PLAN_CONFIG[plan.key];
          if (!config) return null;
          const price =
            period === "monthly" ? config.monthlyPrice : config.yearlyPrice;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                config.highlighted
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {config.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 border border-zinc-700 px-3 py-0.5 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-200">
                  Populaire
                </span>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-1">{plan.label}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{price}</span>
                  <span
                    className={`text-sm ${config.highlighted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}
                  >
                    / {period === "monthly" ? "mois" : "an"}
                  </span>
                </div>
                {period === "yearly" && (
                  <p
                    className={`mt-1 text-xs ${config.highlighted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}
                  >
                    Soit{" "}
                    {plan.key === "premium" ? "7,50€" : "15,83€"} / mois
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {config.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg
                      className={`mt-0.5 h-4 w-4 shrink-0 ${config.highlighted ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-50"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span
                      className={
                        config.highlighted
                          ? "text-zinc-200 dark:text-zinc-700"
                          : "text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loadingKey === plan.key}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  config.highlighted
                    ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                }`}
              >
                {loadingKey === plan.key
                  ? "Redirection..."
                  : isSubscribed
                    ? "Gérer mon abonnement"
                    : "Commencer"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
