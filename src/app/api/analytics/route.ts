import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertMaxPlan } from "@/lib/plan-guard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const denied = await assertMaxPlan(session.user.email);
  if (denied) return denied;

  return NextResponse.json({
    stats: {
      totalViews: 12430,
      activeUsers: 1847,
      conversionRate: 4.2,
    },
    activity: [40, 65, 50, 80, 70, 90, 60],
  });
}
