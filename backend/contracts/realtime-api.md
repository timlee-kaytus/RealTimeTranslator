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
  "uiSessionId": "uuid-from-frontend"
}
```

Presentation mode:

```json
{
  "mode": "presentation",
  "targetLanguages": ["en"],
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend"
}
```

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

