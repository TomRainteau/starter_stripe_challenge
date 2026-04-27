import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSubscriptionPlans } from "@/lib/subscription-plans";
import { PricingCards } from "./pricing-cards";

export default async function PricingPage() {
  const session = await auth();
  const plans = getSubscriptionPlans();

  let isSubscribed = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { stripeStatus: true },
    });
    isSubscribed = user?.stripeStatus === "active";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black px-4 py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Choisissez votre plan
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Commencez gratuitement, évoluez selon vos besoins.
        </p>
      </div>

      <PricingCards
        plans={plans}
        isAuthenticated={!!session?.user}
        isSubscribed={isSubscribed}
      />
    </div>
  );
}
