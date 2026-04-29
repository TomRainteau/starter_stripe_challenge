import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function requireMaxPlan() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { plan: true, stripeStatus: true },
  });

  if (user?.plan !== "max" || user.stripeStatus !== "active") {
    redirect("/pricing");
  }
}

export async function assertMaxPlan(
  email: string,
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { plan: true, stripeStatus: true },
  });

  if (user?.plan !== "max" || user.stripeStatus !== "active") {
    return NextResponse.json(
      { error: "Accès réservé au plan Max" },
      { status: 403 },
    );
  }

  return null;
}
