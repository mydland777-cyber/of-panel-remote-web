import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const panel = (req.nextUrl.searchParams.get("panel") || "").trim().toUpperCase();

    if (!panel) {
      return NextResponse.json(
        { ok: false, message: "panel query required" },
        { status: 400 }
      );
    }

    const tunnelUrl = process.env.PANEL_TUNNEL_URL;

    if (!tunnelUrl) {
      return NextResponse.json(
        { ok: false, message: "PANEL_TUNNEL_URL is not set" },
        { status: 500 }
      );
    }

    const targetUrl = `${tunnelUrl.replace(/\/$/, "")}/bridge-state?panel=${encodeURIComponent(panel)}`;

    const res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[bridge-state] proxy error", err);

    return NextResponse.json(
      { ok: false, message: "bridge-state proxy error" },
      { status: 500 }
    );
  }
}