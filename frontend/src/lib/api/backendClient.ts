import type {
  CreateRealtimeSessionRequest,
  CreateRealtimeSessionResponse,
  EndRealtimeSessionRequest,
  UsageEventRequest,
} from "@/lib/types/realtime";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "";

export function shouldUseMockRealtime(): boolean {
  // Phase 0 defaults to mock realtime until the OCI backend is connected.
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

  return normalizeRealtimeSessionResponse(await response.json(), request);
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

function normalizeRealtimeSessionResponse(
  data: unknown,
  request: CreateRealtimeSessionRequest,
): CreateRealtimeSessionResponse {
  const record = isRecord(data) ? data : {};
  const clientSecret = readClientSecret(record);

  if (!clientSecret) {
    throw new Error("Backend did not return a realtime client secret.");
  }

  return {
    sessionId:
      readString(record.sessionId) ??
      readString(record.session_id) ??
      readString(record.id) ??
      `openai-${request.uiSessionId}`,
    provider: readString(record.provider) === "mock" ? "mock" : "openai",
    transport: readString(record.transport) === "mock" ? "mock" : "webrtc",
    clientSecret,
    expiresAt:
      readIsoDate(record.expiresAt) ??
      readIsoDate(record.expires_at) ??
      new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    model: readString(record.model) ?? "gpt-realtime-translate",
  };
}

function readClientSecret(record: Record<string, unknown>): string | undefined {
  return (
    readString(record.clientSecret) ??
    readString(record.client_secret) ??
    readString(record.value) ??
    readStringFromNested(record.clientSecret, "value") ??
    readStringFromNested(record.client_secret, "value")
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringFromNested(value: unknown, key: string): string | undefined {
  return isRecord(value) ? readString(value[key]) : undefined;
}

function readIsoDate(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number") {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
