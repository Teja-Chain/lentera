import { NextResponse } from "next/server";
import { getUserRiskProfile, setUserRiskProfile, resetUserRiskProfile } from "@/lib/memory/sibyl";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet query parameter is required" }, { status: 400 });
  }

  try {
    const { profile, source } = await getUserRiskProfile(wallet);
    return NextResponse.json({ profile, source });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load Sibyl Memory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { wallet, updates, reset } = body;

    if (!wallet) {
      return NextResponse.json({ error: "wallet is required" }, { status: 400 });
    }

    if (reset) {
      const resetProfile = await resetUserRiskProfile(wallet);
      return NextResponse.json({ profile: resetProfile, message: "Profile reset to defaults" });
    }

    const { profile, source } = await setUserRiskProfile(wallet, updates || {});
    return NextResponse.json({ profile, source });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update Sibyl Memory" },
      { status: 500 }
    );
  }
}
