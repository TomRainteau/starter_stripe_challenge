import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

function isStripeProduct(
  product: Stripe.Product | Stripe.DeletedProduct,
): product is Stripe.Product {
  return !("deleted" in product);
}

async function getSubscriptionDetails(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];

  if (!item) {
    return {
      priceId: null,
      plan: null,
      period: null,
    };
  }

  let plan: string | null = null;
  const product = item.price.product;

  if (product && typeof product !== "string" && isStripeProduct(product)) {
    plan = product.name;
  } else if (typeof product === "string") {
    const stripeProduct = await stripe.products.retrieve(product);
    if (isStripeProduct(stripeProduct)) {
      plan = stripeProduct.name;
    }
  }

  return {
    priceId: item.price.id,
    plan,
    period: item.price.recurring?.interval ?? null,
  };
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
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
          {
            expand: ["items.data.price.product"],
          },
        );
        const { priceId, plan, period } =
          await getSubscriptionDetails(subscription);

        await prisma.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeStatus: subscription.status,
            plan,
            period,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const { priceId, plan, period } =
        await getSubscriptionDetails(subscription);

      await prisma.user.update({
        where: { stripeCustomerId: subscription.customer as string },
        data: {
          stripeStatus: subscription.status,
          stripePriceId: priceId,
          plan,
          period,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
