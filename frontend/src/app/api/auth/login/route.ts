import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  createAuthToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const configuredPassword = process.env.RTT_LOGIN_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.json(
      { ok: false, error: "server_not_configured" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof body.password === "string"
      ? body.password
      : "";

  if (password !== configuredPassword) {
    return NextResponse.json(
      { ok: false, error: "invalid_password" },
      { status: 401 },
    );
  }

  try {
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: await createAuthToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Session cookie: removed when the browser session ends.
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "server_not_configured" },
      { status: 500 },
    );
  }
}
