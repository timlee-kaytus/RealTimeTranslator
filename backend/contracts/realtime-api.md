# Realtime Translation API Contract

## Health Check

```http
GET /api/health
```

```json
{
  "status": "ok",
  "service": "kaytus-realtime-translator-backend",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

## Realtime Translation Session

```http
POST /api/realtime/session
Content-Type: application/json
```

Conversation mode:

```json
{
  "mode": "conversation",
  "targetLanguages": ["zh", "ko"],
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend",
  "translationInstructions": "You are a professional business interpreter for KAYTUS sales, presales, technical meetings, and internal collaboration. Translate meaning naturally, not word-for-word. Use a polite and professional business tone by default. For Korean output, use respectful business Korean such as '~습니다' and '~해 주세요'. For Chinese output, use polite business Chinese expressions such as '您', '请', '麻烦您', and '确认一下'. For English output, use professional business English such as 'Could you please' and 'Please confirm'. Preserve ordinary English technical or business source terms in English when they are commonly used as-is in meetings, such as Pipeline. Always preserve company and brand names such as NAVER and KAKAO exactly in English. Preserve all terms in PRESERVE_ENGLISH_TERMS exactly as written. Convert spoken numbers from Korean, English, or Chinese into Arabic numerals in every target language."
}
```

Presentation mode:

```json
{
  "mode": "presentation",
  "targetLanguages": ["en"],
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend",
  "translationInstructions": "You are a professional business interpreter for KAYTUS sales, presales, technical meetings, and internal collaboration. Translate meaning naturally, not word-for-word. Use a polite and professional business tone by default. For Korean output, use respectful business Korean such as '~습니다' and '~해 주세요'. For Chinese output, use polite business Chinese expressions such as '您', '请', '麻烦您', and '确认一下'. For English output, use professional business English such as 'Could you please' and 'Please confirm'. Preserve ordinary English technical or business source terms in English when they are commonly used as-is in meetings, such as Pipeline. Always preserve company and brand names such as NAVER and KAKAO exactly in English. Preserve all terms in PRESERVE_ENGLISH_TERMS exactly as written. Convert spoken numbers from Korean, English, or Chinese into Arabic numerals in every target language."
}
```

`translationInstructions` is an optional policy string for the backend to apply
when creating realtime translation sessions. It must not include source text,
translated text, or any user transcript content.

The frontend expands `PRESERVE_ENGLISH_TERMS` from
`frontend/src/lib/translation/preserveEnglishGlossary.ts` before sending the
session request. Backend implementations should pass this policy through to the
Realtime provider without logging source text or translated text.

Response:

```json
{
  "sessionId": "server-session-id",
  "provider": "openai",
  "transport": "webrtc",
  "clientSecret": "ephemeral-token-or-client-secret",
  "expiresAt": "2026-06-16T00:15:00.000Z",
  "model": "gpt-realtime-translate"
}
```

## End Session

```http
POST /api/realtime/session/end
Content-Type: application/json
```

```json
{
  "sessionId": "server-session-id",
  "reason": "user_stop"
}
```

```json
{
  "ok": true
}
```

## Usage Event

```http
POST /api/usage/event
Content-Type: application/json
```

```json
{
  "sessionId": "server-session-id",
  "eventType": "session_started",
  "mode": "conversation",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

```json
{
  "ok": true
}
```

Usage events must not include source text or translated text.
