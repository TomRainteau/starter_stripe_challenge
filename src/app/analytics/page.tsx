import { requireMaxPlan } from "@/lib/plan-guard";
import Link from "next/link";
import { headers } from "next/headers";

type AnalyticsData = {
  stats: { totalViews: number; activeUsers: number; conversionRate: number };
  activity: number[];
};

async function getAnalytics(): Promise<AnalyticsData> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  const res = await fetch(`${protocol}://${host}/api/analytics`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Erreur lors de la récupération des données");
  return res.json();
}

export default async function AnalyticsPage() {
  await requireMaxPlan();

  const data = await getAnalytics();
  const { stats, activity } = data;

  const statCards = [
    { label: "Vues totales", value: stats.totalViews.toLocaleString("fr-FR") },
    { label: "Utilisateurs actifs", value: stats.activeUsers.toLocaleString("fr-FR") },
    { label: "Taux de conversion", value: `${stats.conversionRate} %` },
  ];

  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const max = Math.max(...activity);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Analytiques avancées
          </h1>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Activité des 7 derniers jours
          </p>
          <div className="flex items-end gap-2 h-24">
            {activity.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-zinc-900 dark:bg-zinc-50 opacity-80"
                style={{ height: `${(h / max) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-400">
            {days.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
