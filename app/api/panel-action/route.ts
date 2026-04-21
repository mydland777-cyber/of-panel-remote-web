import { NextResponse } from "next/server";

const LOCAL_SERVER_URL = "http://127.0.0.1:8787/panel-action";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const panel = String(body?.panel ?? "").trim().toUpperCase();
    const slot = String(body?.slot ?? "").trim().toUpperCase();
    const action = String(body?.action ?? "").trim();

    if (!panel || !slot || !action) {
      return NextResponse.json(
        {
          ok: false,
          message: "panel / slot / action required",
        },
        { status: 400 }
      );
    }

    const upstream = await fetch(LOCAL_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        panel,
        slot,
        action,
      }),
      cache: "no-store",
    });

    const data = await upstream.json();

    return NextResponse.json(data, {
      status: upstream.status,
    });
  } catch (error) {
    console.error("[panel-action route] error", error);

    return NextResponse.json(
      {
        ok: false,
        message: "forward failed",
      },
      { status: 500 }
    );
  }
}