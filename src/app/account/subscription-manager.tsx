"use client";

import { useState } from "react";
import type { BillingPeriod, SubscriptionPlan } from "@/lib/subscription-plans";

type Props = {
  plans: SubscriptionPlan[];
  currentPriceId: string | null;
  currentPlan: string | null;
  currentPeriod: string | null;
  stripeStatus: string | null;
};

type Message = { type: "success" | "error"; text: string };

const PERIOD_LABEL: Record<string, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
};

export function SubscriptionManager({
  plans,
  currentPriceId,
  currentPlan,
  currentPeriod,
  stripeStatus,
}: Props) {
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const isActive = stripeStatus === "active";

  const handleChangePlan = async () => {
    if (!selectedPriceId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selectedPriceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du changement");
      setMessage({ type: "success", text: "Plan mis à jour avec succès !" });
      setSelectedPriceId(null);
      window.location.reload();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors du changement de plan",
      });
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

  return (
    <div className="space-y-6">
      {/* Plan actuel */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
          Plan actuel
        </p>
        {isActive && currentPlan ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 capitalize">
                {currentPlan}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {currentPeriod ? PERIOD_LABEL[currentPeriod] ?? currentPeriod : "—"}
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Actif
            </span>
          </div>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">Aucun abonnement actif</p>
        )}
      </div>

      {/* Changer de plan */}
      {isActive && (
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Changer de plan
          </p>
          <div className="grid grid-cols-2 gap-2">
            {plans.flatMap((plan) =>
              (["monthly", "yearly"] as BillingPeriod[]).map((period) => {
                const priceId = plan.priceIds[period];
                const isCurrent = priceId === currentPriceId;
                const isSelected = priceId === selectedPriceId;
                return (
                  <button
                    key={priceId}
                    type="button"
                    disabled={isCurrent}
                    onClick={() =>
                      setSelectedPriceId(isSelected ? null : priceId)
                    }
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${
                      isCurrent
                        ? "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                        : isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                  >
                    <p className="font-medium">{plan.label}</p>
                    <p className="opacity-70">
                      {PERIOD_LABEL[period]}
                      {isCurrent && " · actuel"}
                    </p>
                  </button>
                );
              }),
            )}
          </div>

          {message && (
            <p
              className={`mt-3 text-sm ${
                message.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            onClick={handleChangePlan}
            disabled={!selectedPriceId || loading}
            className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Mise à jour..." : "Confirmer le changement"}
          </button>
        </div>
      )}

      {/* Portail Stripe */}
      <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
          Gérez vos factures, méthodes de paiement et annulez votre abonnement
          depuis le portail Stripe.
        </p>
        <button
          onClick={handlePortal}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Portail de facturation Stripe →
        </button>
      </div>
    </div>
  );
}
