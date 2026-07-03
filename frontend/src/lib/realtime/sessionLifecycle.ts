import type { RealtimeSessionCredential } from "@/lib/types/realtime";

export const REALTIME_SESSION_MAX_DURATION_MS = 4 * 60 * 60 * 1000;
export const REALTIME_SESSION_REFRESH_BUFFER_MS = 2 * 60 * 1000;
export const REALTIME_SESSION_REFRESH_FALLBACK_MS = 25 * 60 * 1000;
export const REALTIME_SESSION_REFRESH_RETRY_MS = 30 * 1000;
export const REALTIME_SESSION_REFRESH_MIN_MS = 10 * 1000;
export const REALTIME_SESSION_MAX_DURATION_MESSAGE =
  "4시간 세션 유지 시간이 지나 통역을 자동으로 중지했습니다. 다시 시작해 주세요.";
export const REALTIME_SESSION_REFRESH_ERROR_MESSAGE =
  "실시간 번역 세션 연장에 실패했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";

export function getRealtimeSessionNowMs(): number {
  return Date.now();
}

export function getRealtimeSessionRefreshDelay(
  sessions: RealtimeSessionCredential[],
  now = getRealtimeSessionNowMs(),
): number {
  const earliestExpiry = sessions.reduce<number | null>((earliest, session) => {
    const expiry = Date.parse(session.expiresAt);

    if (!Number.isFinite(expiry)) {
      return earliest;
    }

    return earliest === null ? expiry : Math.min(earliest, expiry);
  }, null);

  if (earliestExpiry === null) {
    return REALTIME_SESSION_REFRESH_FALLBACK_MS;
  }

  const delay = earliestExpiry - now - REALTIME_SESSION_REFRESH_BUFFER_MS;

  if (delay <= 0) {
    return REALTIME_SESSION_REFRESH_MIN_MS;
  }

  return Math.max(REALTIME_SESSION_REFRESH_MIN_MS, delay);
}

export function getRealtimeSessionRemainingMs(
  startedAt: number | null,
  now = getRealtimeSessionNowMs(),
): number {
  if (startedAt === null) {
    return REALTIME_SESSION_MAX_DURATION_MS;
  }

  return REALTIME_SESSION_MAX_DURATION_MS - (now - startedAt);
}
