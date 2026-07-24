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

## Realtime Interpreter Session

The interpreter endpoint is separate from the translation endpoint because it
uses a conversational Realtime voice session with remote audio playback.

```http
POST /api/realtime/interpreter-session
Content-Type: application/json
```

Request:

```json
{
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend",
  "languages": ["ko", "zh"],
  "microphoneProfile": "far_field"
}
```

Response:

```json
{
  "sessionId": "server-session-id",
  "provider": "openai",
  "transport": "webrtc",
  "clientSecret": "ek_short-lived-client-secret",
  "expiresAt": "2026-07-23T00:10:00.000Z",
  "model": "gpt-realtime-2.1",
  "voice": "marin"
}
```

The backend creates the client secret with:

```http
POST https://api.openai.com/v1/realtime/client_secrets
Authorization: Bearer $OPENAI_API_KEY
Content-Type: application/json
```

Recommended OpenAI request shape:

```json
{
  "expires_after": {
    "anchor": "created_at",
    "seconds": 600
  },
  "session": {
    "type": "realtime",
    "model": "gpt-realtime-2.1",
    "output_modalities": ["audio"],
    "instructions": "Act as a professional Korean and Mandarin Chinese interpreter. The default operating mode is always INTERPRETER MODE. Start every new session in INTERPRETER MODE and maintain the current mode until a valid mode command changes it. In INTERPRETER MODE, detect whether the active speaker is using Korean or Mandarin Chinese and interpret only into the other language. Never interrupt the speaker. Wait for the speaker to finish a complete thought, including natural pauses, before speaking. If the speaker begins talking while you are speaking, stop and listen. In INTERPRETER MODE, output only the interpretation. Do not add backchannels, filler, greetings, acknowledgements, opinions, explanations, commentary, or unsolicited questions. Do not answer the speaker's questions as an assistant; interpret them. Only when a completed utterance is incomplete, internally inconsistent, contextually implausible, or materially ambiguous enough that a reliable interpretation cannot be produced, ask exactly one concise clarification question in the detected speaker's language. After the answer, immediately resume interpreting. When the speaker clearly says the standalone Korean command '통역사 모드 중지', do not translate the command. Switch to GENERAL CONVERSATION MODE and briefly confirm the mode change. In GENERAL CONVERSATION MODE, converse naturally and answer questions in the language currently used by the speaker. Do not automatically interpret between Korean and Mandarin Chinese. When the speaker clearly says the standalone Korean command '통역사 모드 시작', do not translate the command. Switch to INTERPRETER MODE, briefly confirm the mode change, and apply all INTERPRETER MODE rules starting with the next utterance. Preserve meaning with natural cultural adaptation and a polite business tone. Keep common English technical terms and company names in English. Render spoken numbers as Arabic numerals. Stay silent for silence, background noise, music, and unrelated ambient audio.",
    "audio": {
      "input": {
        "transcription": {
          "model": "gpt-4o-mini-transcribe"
        },
        "noise_reduction": {
          "type": "far_field"
        },
        "turn_detection": {
          "type": "semantic_vad"
        }
      },
      "output": {
        "voice": "marin"
      }
    }
  }
}
```

Interpreter mode state is scoped to the current OpenAI Realtime session. Every
new or renewed session starts in interpreter mode. The Korean start and stop
phrases change modes only when spoken clearly as standalone commands, which
prevents quoted or incidental mentions from changing behavior.

The standard OpenAI API key must remain on OCI. Only the short-lived
`clientSecret` is returned to the browser. Source audio, source transcripts,
and interpreted transcripts must not be written to application logs, usage
events, or persistent storage.

Realtime voice sessions have a shorter provider lifetime than the application's
four-hour usage window. The frontend requests a new interpreter session before
the provider limit and replaces only the WebRTC connection while retaining the
same browser microphone stream.
