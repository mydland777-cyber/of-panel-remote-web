import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const panel = String(body?.panel ?? "");
    const slot = String(body?.slot ?? "");
    const action = String(body?.action ?? "");

    console.log("[panel-action]", {
      panel,
      slot,
      action,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      panel,
      slot,
      action,
      message: "action received",
    });
  } catch (error) {
    console.error("[panel-action] error", error);

    return NextResponse.json(
      {
        ok: false,
        message: "invalid request",
      },
      { status: 400 }
    );
  }
}