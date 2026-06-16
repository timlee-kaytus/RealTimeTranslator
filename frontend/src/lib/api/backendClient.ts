import type {
  CreateRealtimeSessionRequest,
  CreateRealtimeSessionResponse,
  EndRealtimeSessionRequest,
  RealtimeSessionCredential,
  UsageEventRequest,
} from "@/lib/types/realtime";
import type { SupportedLanguage } from "@/lib/types/language";

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
  const parentSessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `mock-${crypto.randomUUID()}`
      : `mock-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const model =
    request.mode === "presentation"
      ? "mock-gpt-realtime-translate-presentation"
      : "mock-gpt-realtime-translate-conversation";
  const targetLanguages: SupportedLanguage[] =
    request.targetLanguages.length > 0 ? request.targetLanguages : ["en"];
  const sessions = targetLanguages.map((targetLanguage, index) => ({
    sessionId:
      targetLanguages.length === 1
        ? parentSessionId
        : `${parentSessionId}-${targetLanguage}-${index + 1}`,
    targetLanguage,
    provider: "mock" as const,
    transport: "mock" as const,
    clientSecret: "mock-client-secret",
    expiresAt,
    model,
  }));
  const primarySession = sessions[0];

  if (!primarySession) {
    throw new Error("Mock realtime session was not created.");
  }

  return {
    ...primarySession,
    sessionId: parentSessionId,
    sessions,
  };
}

function normalizeRealtimeSessionResponse(
  data: unknown,
  request: CreateRealtimeSessionRequest,
): CreateRealtimeSessionResponse {
  const record = isRecord(data) ? data : {};
  const parentSessionId =
    readString(record.sessionId) ??
    readString(record.session_id) ??
    readString(record.id);
  const sessions = readRealtimeSessions(record, request, parentSessionId);
  const primarySession = sessions[0];

  if (!primarySession) {
    throw new Error("Backend did not return realtime session credentials.");
  }

  return {
    ...primarySession,
    sessionId: parentSessionId ?? primarySession.sessionId,
    sessions,
  };
}

function readRealtimeSessions(
  record: Record<string, unknown>,
  request: CreateRealtimeSessionRequest,
  parentSessionId: string | undefined,
): RealtimeSessionCredential[] {
  if (Array.isArray(record.sessions) && record.sessions.length > 0) {
    return record.sessions.map((session, index) =>
      normalizeRealtimeSessionCredential(
        isRecord(session) ? session : {},
        request,
        index,
        record,
        parentSessionId,
      ),
    );
  }

  return [
    normalizeRealtimeSessionCredential(
      record,
      request,
      0,
      record,
      parentSessionId,
    ),
  ];
}

function normalizeRealtimeSessionCredential(
  record: Record<string, unknown>,
  request: CreateRealtimeSessionRequest,
  index: number,
  parentRecord: Record<string, unknown>,
  parentSessionId: string | undefined,
): RealtimeSessionCredential {
  const clientSecret = readClientSecret(record);

  if (!clientSecret) {
    throw new Error("Backend did not return realtime session credentials.");
  }

  const targetLanguage =
    readTargetLanguage(record) ??
    request.targetLanguages[index] ??
    request.targetLanguages[0] ??
    "en";
  const fallbackSessionId = parentSessionId
    ? `${parentSessionId}-${targetLanguage}-${index + 1}`
    : `openai-${request.uiSessionId}-${targetLanguage}-${index + 1}`;

  return {
    sessionId:
      readString(record.sessionId) ??
      readString(record.session_id) ??
      readString(record.id) ??
      fallbackSessionId,
    targetLanguage,
    provider: readProvider(record) ?? readProvider(parentRecord) ?? "openai",
    transport: readTransport(record) ?? readTransport(parentRecord) ?? "webrtc",
    clientSecret,
    expiresAt:
      readCredentialExpiry(record) ??
      readCredentialExpiry(parentRecord) ??
      new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    model:
      readString(record.model) ??
      readString(parentRecord.model) ??
      "gpt-realtime-translate",
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

function readCredentialExpiry(
  record: Record<string, unknown>,
): string | undefined {
  return (
    readIsoDate(record.expiresAt) ??
    readIsoDate(record.expires_at) ??
    readIsoDateFromNested(record.client_secret, "expires_at") ??
    readIsoDateFromNested(record.clientSecret, "expires_at")
  );
}

function readProvider(
  record: Record<string, unknown>,
): RealtimeSessionCredential["provider"] | undefined {
  const provider = readString(record.provider);

  if (provider === "mock" || provider === "openai") {
    return provider;
  }
}

function readTransport(
  record: Record<string, unknown>,
): RealtimeSessionCredential["transport"] | undefined {
  const transport = readString(record.transport);

  if (transport === "mock" || transport === "webrtc") {
    return transport;
  }
}

function readTargetLanguage(
  record: Record<string, unknown>,
): SupportedLanguage | undefined {
  const value =
    readString(record.targetLanguage) ??
    readString(record.target_language) ??
    readString(record.outputLanguage) ??
    readString(record.output_language) ??
    readString(record.language);

  return isSupportedLanguage(value) ? value : undefined;
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

function readIsoDateFromNested(value: unknown, key: string): string | undefined {
  return isRecord(value) ? readIsoDate(value[key]) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === "ko" || value === "en" || value === "zh";
}
