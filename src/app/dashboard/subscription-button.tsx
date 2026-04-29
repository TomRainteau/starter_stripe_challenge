"use client";

import { useState } from "react";
import Link from "next/link";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/subscription-plans";

export function SubscriptionButton({
  isSubscribed,
  planOptions,
}: {
  isSubscribed: boolean;
  planOptions: SubscriptionPlan[];
}) {
  const [loading, setLoading] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState(
    planOptions[0]?.key ?? "",
  );
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const selectedPlan = planOptions.find((p) => p.key === selectedPlanKey);
      if (!selectedPlan) return;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPlan.priceIds[selectedPeriod] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du checkout");
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="space-y-2">
        <Link
          href="/account"
          className="block w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-center font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Changer de plan / période
        </Link>
        <button
          onClick={handlePortal}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {loading ? "Redirection..." : "Portail de facturation"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {planOptions.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "yearly"] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {period === "monthly" ? "Mensuel" : "Annuel"}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {planOptions.map((plan) => (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlanKey(plan.key)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedPlanKey === plan.key
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <p className="font-medium">{plan.label}</p>
                <p className="text-sm opacity-80">
                  {selectedPeriod === "monthly"
                    ? "Facturation mensuelle"
                    : "Facturation annuelle"}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || planOptions.length === 0}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Redirection..." : "Souscrire"}
      </button>
    </div>
  );
}
