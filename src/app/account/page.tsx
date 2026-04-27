import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSubscriptionPlans } from "@/lib/subscription-plans";
import { SubscriptionManager } from "./subscription-manager";
import Link from "next/link";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      stripePriceId: true,
      stripeStatus: true,
      plan: true,
      period: true,
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const plans = getSubscriptionPlans();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Mon abonnement
          </h1>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <SubscriptionManager
            plans={plans}
            currentPriceId={user.stripePriceId}
            currentPlan={user.plan}
            currentPeriod={user.period}
            stripeStatus={user.stripeStatus}
          />
        </div>
      </div>
    </div>
  );
}
