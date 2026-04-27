import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getSubscriptionPlans } from "@/lib/subscription-plans";
import Stripe from "stripe";

function resolvePlanFromPriceId(priceId: string) {
  for (const plan of getSubscriptionPlans()) {
    if (plan.priceIds.monthly === priceId) return { plan: plan.key, period: "monthly" };
    if (plan.priceIds.yearly === priceId) return { plan: plan.key, period: "yearly" };
  }
  return { plan: null, period: null };
}

async function syncSubscription(customerId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const { plan, period } = priceId ? resolvePlanFromPriceId(priceId) : { plan: null, period: null };

  await prisma.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeStatus: subscription.status,
      plan,
      period,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[webhook] Signature invalide:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  console.log(`[webhook] Événement reçu: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await syncSubscription(session.customer as string, subscription);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription.customer as string, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            stripeStatus: subscription.status,
            stripePriceId: null,
            plan: null,
            period: null,
          },
        });
        break;
      }
    }
  } catch (err) {
    console.error(`[webhook] Erreur lors du traitement de ${event.type}:`, err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
