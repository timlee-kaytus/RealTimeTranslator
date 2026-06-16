import type {
  CreateRealtimeSessionRequest,
  CreateRealtimeSessionResponse,
  EndRealtimeSessionRequest,
  UsageEventRequest,
} from "@/lib/types/realtime";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "";

export function shouldUseMockRealtime(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_REALTIME !== "false";
}

export async function createRealtimeSession(
  request: CreateRealtimeSessionRequest,
): Promise<CreateRealtimeSessionResponse> {
  if (shouldUseMockRealtime() || BACKEND_BASE_URL.length === 0) {
    return createMockSession(request);
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/realtime/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Realtime session request failed.");
  }

  return response.json() as Promise<CreateRealtimeSessionResponse>;
}

export async function endRealtimeSession(
  request: EndRealtimeSessionRequest,
): Promise<{ ok: true }> {
  if (shouldUseMockRealtime() || BACKEND_BASE_URL.length === 0) {
    return { ok: true };
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/realtime/session/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Realtime session end request failed.");
  }

  return response.json() as Promise<{ ok: true }>;
}

export async function recordUsageEvent(
  request: UsageEventRequest,
): Promise<{ ok: true }> {
  if (shouldUseMockRealtime() || BACKEND_BASE_URL.length === 0) {
    return { ok: true };
  }

  const response = await fetch(`${BACKEND_BASE_URL}/api/usage/event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Usage event request failed.");
  }

  return response.json() as Promise<{ ok: true }>;
}

function createMockSession(
  request: CreateRealtimeSessionRequest,
): CreateRealtimeSessionResponse {
  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `mock-${crypto.randomUUID()}`
      : `mock-${Date.now()}`;

  return {
    sessionId,
    provider: "mock",
    transport: "mock",
    clientSecret: "mock-client-secret",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    model:
      request.mode === "presentation"
        ? "mock-gpt-realtime-translate-presentation"
        : "mock-gpt-realtime-translate-conversation",
  };
}

