import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const appsScriptUrl = process.env.WAITLIST_APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    return NextResponse.json(
      { ok: false, error: "Waitlist is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email =
    typeof payload === "object" && payload && "email" in payload
      ? String(payload.email).trim().toLowerCase()
      : "";

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        email,
        source: "velora-landing",
        userAgent: request.headers.get("user-agent") ?? "",
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Could not join the waitlist." },
        { status: 502 },
      );
    }

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (result && result.ok === false) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Could not join the waitlist." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not join the waitlist." },
      { status: 502 },
    );
  }
}
