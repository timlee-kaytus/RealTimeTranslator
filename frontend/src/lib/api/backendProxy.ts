const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ?? process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "";

export async function proxyBackendPost(
  request: Request,
  backendPath: string,
): Promise<Response> {
  const backendBaseUrl = BACKEND_BASE_URL.trim().replace(/\/+$/, "");

  if (!backendBaseUrl) {
    return Response.json(
      { ok: false, error: "backend_not_configured" },
      { status: 500 },
    );
  }

  const response = await fetch(`${backendBaseUrl}${backendPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const contentType = response.headers.get("Content-Type") ?? "application/json";
  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
    },
  });
}
