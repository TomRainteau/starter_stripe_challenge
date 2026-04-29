import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAllowedPriceIds } from "@/lib/subscription-plans";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const priceId =
    body && typeof body.priceId === "string" ? body.priceId : null;

  if (!priceId) {
    return NextResponse.json({ error: "priceId manquant" }, { status: 400 });
  }

  if (!getAllowedPriceIds().has(priceId)) {
    return NextResponse.json({ error: "priceId invalide" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.stripeSubscriptionId) {
    return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(
    user.stripeSubscriptionId,
  );
  const currentItem = subscription.items.data[0];

  if (currentItem.price.id === priceId) {
    return NextResponse.json(
      { error: "Vous êtes déjà sur ce plan" },
      { status: 400 },
    );
  }

  try {
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    console.error("[subscription] Erreur Stripe:", err);
    const message =
      err instanceof Error ? err.message : "Erreur lors du changement de plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
