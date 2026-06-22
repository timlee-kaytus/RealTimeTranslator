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
  "translationInstructions": "Translate every utterance in a professional business tone and manner. Use natural, idiomatic localization actively when literal translation sounds awkward. Preserve ordinary English technical or business source terms in English when they are commonly used as-is in meetings, such as Pipeline. Always preserve company and brand names such as NAVER and KAKAO exactly in English. Preserve all terms in PRESERVE_ENGLISH_TERMS exactly as written. If a word is likely a person's name and is not a preserved brand, product, acronym, code, or glossary term, render it naturally in the target language's phonetic form. Convert spoken numbers from Korean, English, or Chinese into Arabic numerals in every target language; for example, '일 이 삼 사', 'one two three four', and '一 二 三 四' should output as '1234'."
}
```

Presentation mode:

```json
{
  "mode": "presentation",
  "targetLanguages": ["en"],
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend",
  "translationInstructions": "Translate every utterance in a professional business tone and manner. Use natural, idiomatic localization actively when literal translation sounds awkward. Preserve ordinary English technical or business source terms in English when they are commonly used as-is in meetings, such as Pipeline. Always preserve company and brand names such as NAVER and KAKAO exactly in English. Preserve all terms in PRESERVE_ENGLISH_TERMS exactly as written. If a word is likely a person's name and is not a preserved brand, product, acronym, code, or glossary term, render it naturally in the target language's phonetic form. Convert spoken numbers from Korean, English, or Chinese into Arabic numerals in every target language; for example, '일 이 삼 사', 'one two three four', and '一 二 三 四' should output as '1234'."
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
