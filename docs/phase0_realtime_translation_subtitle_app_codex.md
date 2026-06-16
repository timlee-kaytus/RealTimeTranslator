# Phase 0 설계 확정 작업 지시서 — 실시간 번역 자막기

> 대상: Codex Frontend 작업용  
> 목적: 실제 API 연동 전, 프론트엔드/백엔드 책임 범위와 API 계약을 먼저 고정하고, Mock 기반 UI/상태 흐름을 구현한다.  
> 프로젝트 방향: `Vercel + Next.js PWA` 프론트엔드, `OCI Always Free VM` 백엔드, `OpenAI Realtime Translation API` Primary 사용.  
> Git Repository: `https://github.com/timlee-kaytus/RealTimeTranslator` (`RTT`, Private, Codex 연동 완료)

---

## 0. 이번 Phase의 목표

Phase 0의 목표는 **실제 OpenAI API 연동 구현이 아니라, Codex가 이후 Phase에서 흔들리지 않도록 설계 기준과 인터페이스를 확정하는 것**이다.

이번 Phase에서 반드시 산출해야 하는 것:

1. `RTT(RealTimeTranslator)` Git Repository 기준 작업 범위 확정
2. 앱 모드 구조 확정
3. 프론트엔드 라우팅/컴포넌트 구조 초안
4. 백엔드 API 계약 초안
5. 실시간 이벤트 데이터 스키마 초안
6. Mock 데이터 기반 동작 검증
7. 발표모드 Document Picture-in-Picture 지원 가능 여부 체크
8. 보안 원칙 반영: API Key 프론트 노출 금지

---

## 1. 프로젝트 개요

### 1.1 서비스명

```text
실시간 번역 자막기
```

### 1.2 핵심 목적

한국어, 영어, 중국어를 사용하는 직원 간 커뮤니케이션을 지원하기 위한 **실시간 번역 자막 앱**이다.

앱은 음성 출력 없이, 사용자가 말한 내용을 실시간으로 번역하여 **텍스트 자막만 표시**한다.

### 1.3 핵심 사용 시나리오

#### A. 대화 모드

휴대폰/태블릿/PC 화면을 두 사람이 함께 보면서 대화한다.

- 화면 상단: 상대방용 번역 자막
- 화면 하단: 내 화면용 번역 자막
- 상단 패널은 상대방이 읽을 수 있도록 180도 회전
- 각 패널은 독립적으로 표시 언어 선택 가능
- 원문은 표시하지 않고 번역문만 크게 표시

#### B. 발표 모드

PC에서 PPT, PDF, 브라우저 발표 중 번역 자막을 항상 위에 표시한다.

- PC Chrome / Edge 전용
- Document Picture-in-Picture 기반 플로팅 자막창
- PowerPoint/PDF/브라우저 등 다른 앱 위에 자막 표시
- 플로팅 자막창 크기 조절 가능
- 출력 언어 하나 선택
- 원문 미표시, 번역문만 크게 표시

### 1.4 Git Repository 및 Codex 연동 상태

본 프로젝트의 Git Repository는 아래 Private Repository를 사용한다.

```text
https://github.com/timlee-kaytus/RealTimeTranslator
```

Repository 기본 정보:

| 항목 | 내용 |
|---|---|
| Repository 이름 | `RealTimeTranslator` |
| 약칭 | `RTT` |
| 용도 | 실시간 번역 자막기 Frontend / Backend 프로젝트 소스 관리 |
| 공개 범위 | Private Repository |
| GitHub Owner | `timlee-kaytus` |
| Codex 연동 상태 | Codex와 Git Repository 접근 권한 설정 완료 |

Codex 작업 시 전제 조건:

- Codex는 위 Private Repository에 접근 가능한 상태라고 간주한다.
- Codex는 새로운 프로젝트를 별도로 생성하지 말고, 반드시 `RealTimeTranslator` Repository 기준으로 작업한다.
- Codex는 프론트엔드 작업을 우선 수행한다.
- 백엔드의 실제 OCI VM 설정, OpenAI API Key 설정, Nginx/HTTPS 설정은 Codex가 임의로 구성하지 않는다.
- Codex가 필요한 경우 `.env.example`, API 타입 정의, Mock API 인터페이스 정도만 작성한다.
- 실제 `.env`, API Key, 서버 접속 정보, 인증서 파일은 Repository에 커밋하지 않는다.

권장 Repository 초기 구조:

```text
RealTimeTranslator/
├─ README.md
├─ docs/
│  └─ phase0_realtime_translation_subtitle_app_codex.md
├─ frontend/
│  └─ Next.js PWA App
├─ backend/
│  └─ OCI Backend Skeleton 또는 API Contract Stub
└─ .gitignore
```

Phase 0에서 Codex가 우선 집중할 위치:

```text
frontend/
```

`backend/`는 초기에는 API 계약 및 Mock 연동용 타입/Stub까지만 작성하고, 실제 서버 운영 구성은 추후 마스터가 OCI VM에서 직접 구축한다.

---

## 2. 기술 방향

### 2.1 Frontend

```text
Next.js + React + TypeScript + Tailwind CSS
Vercel 배포
PWA 지원
```

### 2.2 Backend

```text
OCI Always Free VM
Ubuntu 22.04 ARM
Node.js 또는 FastAPI
Nginx Reverse Proxy
Let's Encrypt HTTPS
OpenAI API Key 서버 보관
```

### 2.3 AI Primary

```text
OpenAI Realtime Translation API
모델 후보: gpt-realtime-translate
```

OpenAI 공식 문서 기준으로 Realtime Translation은 `/v1/realtime/translations` 전용 엔드포인트를 사용하며, 사람의 발화를 실시간 번역하는 경우 `gpt-realtime-translate`를 사용한다.

> 참고: 실제 모델명과 파라미터는 구현 직전 OpenAI 공식 문서에서 다시 검증한다.

---

## 3. 플랫폼 지원 범위

| 기능 | PC Chrome | PC Edge | Safari | Firefox | Android Browser | iOS Safari |
|---|---:|---:|---:|---:|---:|---:|
| 대화 모드 | 지원 | 지원 | 기본 지원 | 기본 지원 | 지원 | 지원 |
| 발표 모드 | 지원 | 지원 | 미지원 | 미지원 | 미지원 | 미지원 |
| PWA 홈화면 추가 | 가능 | 가능 | 제한적 가능 | 제한적 | 가능 | 가능 |
| Always-on-top 플로팅 | 가능 | 가능 | 미지원 | 미지원 | 미지원 | 미지원 |

### 3.1 발표 모드 제한

발표 모드는 `Document Picture-in-Picture API`를 전제로 한다.

지원하지 않는 브라우저에서는 다음 메시지를 표시한다.

```text
발표 모드는 PC Chrome 또는 Edge에서만 지원됩니다.
모바일 및 현재 브라우저에서는 대화 모드를 사용해 주세요.
```

---

## 4. 앱 모드 정의

## 4.1 대화 모드

### 4.1.1 화면 구조

```text
┌────────────────────────────┐
│ 상대방용 번역 화면           │
│ 180도 회전 표시              │
│ 표시 언어: [중국어 ▼]         │
│                            │
│   今天下午三点有客户会议。     │
│                            │
├────────────────────────────┤
│        [통역 시작/중지]       │
├────────────────────────────┤
│ 내 화면용 번역 화면           │
│ 표시 언어: [한국어 ▼]         │
│                            │
│   오늘 오후 3시에            │
│   고객 미팅이 있습니다.       │
└────────────────────────────┘
```

### 4.1.2 기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 기본 진입 모드 | 대화 모드 |
| 마이크 동작 | 한 번 누르면 시작, 다시 누르면 중지 |
| 입력 언어 | 자동 감지 |
| 지원 입력 언어 | 한국어, 영어, 중국어 |
| 상단 표시 언어 | 사용자가 선택 |
| 하단 표시 언어 | 사용자가 선택 |
| 양쪽 동일 언어 선택 | 허용 |
| 원문 표시 | 표시하지 않음 |
| 번역문 표시 | 최대한 크게 표시 |
| 음성 출력 | 없음 |
| 최근 기록 | MVP에서는 선택 기능. 기본 비활성 가능 |

### 4.1.3 CSS 핵심

상대방용 패널은 패널 전체를 180도 회전한다.

```css
.opponent-panel {
  transform: rotate(180deg);
}
```

주의: 텍스트만 뒤집지 말고, 상대방이 언어 선택까지 읽을 수 있도록 **상단 패널 전체를 회전**한다.

---

## 4.2 발표 모드

### 4.2.1 화면 구조

```text
[실시간 번역 자막기]
[대화 모드] [발표 모드]

출력 언어: [영어 ▼]
[플로팅 시작]

※ PC Chrome / Edge 전용
```

### 4.2.2 플로팅 자막창 구조

```text
┌────────────────────────────────────────────┐
│ 실시간 번역 자막             A- A+ ⛶  X    │
├────────────────────────────────────────────┤
│                                            │
│ We will now introduce the                  │
│ KAYTUS liquid cooling solution.            │
│                                            │
└────────────────────────────────────────────┘
```

### 4.2.3 기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 지원 환경 | PC Chrome / Edge |
| 출력 언어 | 사용자가 선택 |
| 원문 표시 | 표시하지 않음 |
| 음성 출력 | 없음 |
| 플로팅 방식 | Document Picture-in-Picture |
| 항상 위 표시 | 브라우저 PiP 창으로 구현 |
| 창 크기 조절 | 사용자가 가능 |
| 글자 크기 조절 | `A-`, `A+`, 슬라이더 중 하나 이상 제공 |
| 프리셋 | 작게 / 보통 / 크게 / 전체 하단바 |
| 위치 이동 | 사용자가 PiP 창을 직접 이동 |
| 설정 저장 | localStorage에 마지막 크기/글자 크기 저장 |
| 지원하지 않는 브라우저 | 안내 메시지 표시 |

### 4.2.4 발표모드 프리셋

```ts
type FloatingPreset = "small" | "medium" | "large" | "bottom_bar";
```

권장 기본값:

```json
{
  "preset": "bottom_bar",
  "width": 900,
  "height": 220,
  "fontSize": 48
}
```

---

## 5. 언어 정책

### 5.1 지원 언어

```ts
type SupportedLanguage = "ko" | "en" | "zh";
```

### 5.2 UI 표시명

```ts
const LANGUAGE_LABELS = {
  ko: "한국어",
  en: "영어",
  zh: "중국어"
} as const;
```

### 5.3 OpenAI 요청용 언어 코드

OpenAI Realtime Translation의 target language 값은 실제 구현 직전 공식 문서 기준으로 다시 검증한다.  
초안은 다음처럼 관리한다.

```ts
const OPENAI_LANGUAGE_CODES = {
  ko: "ko",
  en: "en",
  zh: "zh"
} as const;
```

---

## 6. Frontend 라우팅/컴포넌트 구조 초안

### 6.1 라우팅

```text
/
  메인 앱
  기본: 대화 모드

/settings
  추후 설정 페이지. MVP에서는 생략 가능.

/debug
  개발용 Mock 이벤트 테스트 페이지. 배포 전 비활성.
```

### 6.2 컴포넌트 구조

```text
src/
  app/
    page.tsx
    layout.tsx
  components/
    AppShell.tsx
    ModeSwitcher.tsx
    LanguageSelect.tsx
    MicToggleButton.tsx
    StatusPill.tsx

    conversation/
      ConversationMode.tsx
      OpponentSubtitlePanel.tsx
      UserSubtitlePanel.tsx

    presentation/
      PresentationMode.tsx
      FloatingCaptionLauncher.tsx
      FloatingCaptionWindow.tsx
      CaptionSizeControls.tsx
      BrowserSupportNotice.tsx

    shared/
      SubtitleText.tsx
      CaptionPreview.tsx
      ErrorBanner.tsx
      LoadingIndicator.tsx

  lib/
    api/
      backendClient.ts
      realtimeClient.ts
    mock/
      mockRealtimeEvents.ts
    storage/
      captionSettingsStorage.ts
    browser/
      featureDetection.ts
    types/
      language.ts
      realtime.ts
      settings.ts
```

---

## 7. Backend API 계약 초안

Phase 0에서는 실제 구현하지 않아도 된다.  
다만 프론트엔드는 아래 계약을 기준으로 Mock 또는 Stub을 만든다.

### 7.1 Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "kaytus-realtime-translator-backend",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

### 7.2 Realtime Translation Session 생성

대화 모드/발표 모드 공통으로 사용한다.

```http
POST /api/realtime/session
Content-Type: application/json
```

Request:

```json
{
  "mode": "conversation",
  "targetLanguages": ["zh", "ko"],
  "clientId": "anonymous-or-user-id",
  "uiSessionId": "uuid-from-frontend"
}
```

발표 모드 예시:

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

보안 원칙:

- `OPENAI_API_KEY`는 절대 프론트엔드에 전달하지 않는다.
- 프론트엔드에는 OpenAI Realtime 접속용 short-lived client secret 또는 백엔드 접속 정보만 전달한다.
- 실제 필드명은 OpenAI 공식 응답 구조에 맞춰 백엔드 구현 시 확정한다.

### 7.3 Session 종료

```http
POST /api/realtime/session/end
Content-Type: application/json
```

Request:

```json
{
  "sessionId": "server-session-id",
  "reason": "user_stop"
}
```

Response:

```json
{
  "ok": true
}
```

### 7.4 Usage Stub

```http
POST /api/usage/event
Content-Type: application/json
```

Request:

```json
{
  "sessionId": "server-session-id",
  "eventType": "session_started",
  "mode": "conversation",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

Response:

```json
{
  "ok": true
}
```

주의: 사용량 로그에는 원문/번역문을 저장하지 않는다.

---

## 8. Realtime 이벤트 스키마 초안

프론트엔드는 실제 OpenAI 이벤트를 직접 UI에 물리지 말고, 내부 표준 이벤트로 변환해서 렌더링한다.

### 8.1 공통 이벤트 타입

```ts
type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "translating"
  | "reconnecting"
  | "error"
  | "stopped";
```

```ts
type TranslationMode = "conversation" | "presentation";
```

### 8.2 대화 모드 UI 이벤트

```ts
type ConversationCaptionEvent = {
  type: "caption_delta" | "caption_final" | "status" | "error";
  mode: "conversation";
  sessionId: string;
  detectedLanguage?: SupportedLanguage | "unknown";

  top: {
    language: SupportedLanguage;
    text: string;
  };

  bottom: {
    language: SupportedLanguage;
    text: string;
  };

  isFinal: boolean;
  timestamp: string;
};
```

예시:

```json
{
  "type": "caption_delta",
  "mode": "conversation",
  "sessionId": "s_123",
  "detectedLanguage": "ko",
  "top": {
    "language": "zh",
    "text": "今天下午三点"
  },
  "bottom": {
    "language": "ko",
    "text": "오늘 오후 3시에"
  },
  "isFinal": false,
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

### 8.3 발표 모드 UI 이벤트

```ts
type PresentationCaptionEvent = {
  type: "caption_delta" | "caption_final" | "status" | "error";
  mode: "presentation";
  sessionId: string;
  detectedLanguage?: SupportedLanguage | "unknown";

  output: {
    language: SupportedLanguage;
    text: string;
  };

  isFinal: boolean;
  timestamp: string;
};
```

예시:

```json
{
  "type": "caption_delta",
  "mode": "presentation",
  "sessionId": "s_456",
  "detectedLanguage": "ko",
  "output": {
    "language": "en",
    "text": "We will now introduce the KAYTUS liquid cooling solution."
  },
  "isFinal": false,
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

---

## 9. OpenAI Realtime 연동 설계 메모

### 9.1 권장 Transport

브라우저에서 직접 마이크를 캡처하는 구조이므로 OpenAI Realtime 연결은 **WebRTC 우선**으로 설계한다.

```text
Browser/PWA
  -> Backend에 client secret 요청
  -> OpenAI Realtime Translation WebRTC 연결
  -> Data channel로 transcript delta 수신
  -> UI 자막 업데이트
```

### 9.2 백엔드 역할

백엔드는 다음만 담당한다.

```text
1. OpenAI 표준 API Key 보관
2. OpenAI Realtime Translation용 short-lived client secret 발급
3. Safety Identifier 부여
4. 사용량 이벤트 수집
5. 세션 제한/정책 제어
```

### 9.3 프론트엔드 역할

프론트엔드는 다음을 담당한다.

```text
1. 마이크 권한 요청
2. RTCPeerConnection 생성
3. 오디오 track 추가
4. DataChannel 이벤트 수신
5. transcript delta를 내부 UI 이벤트로 변환
6. 대화 모드/발표 모드 UI에 렌더링
```

### 9.4 음성 출력 금지

MVP는 **음성 출력 없음**이 원칙이다.

OpenAI Translation API가 remote audio track을 제공하더라도 프론트엔드에서는 자동 재생하지 않는다.

구현 지시:

```text
- translatedAudio.autoplay = true 형태의 재생 UI를 만들지 않는다.
- remote audio track은 받더라도 mute 또는 ignore 처리한다.
- 화면에는 transcript delta 기반 텍스트 자막만 렌더링한다.
```

추가 확인 필요:

```text
OpenAI Translation API에서 output audio 생성을 비활성화할 수 있는 공식 옵션이 있는지 구현 직전 재확인한다.
```

---

## 10. 발표 모드: Document Picture-in-Picture 설계

### 10.1 Feature Detection

```ts
function isDocumentPictureInPictureSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}
```

### 10.2 미지원 브라우저 메시지

```text
발표 모드는 PC Chrome 또는 Edge에서만 지원됩니다.
모바일 및 현재 브라우저에서는 대화 모드를 사용해 주세요.
```

### 10.3 PiP Window 설정

```ts
type FloatingCaptionSettings = {
  preset: "small" | "medium" | "large" | "bottom_bar";
  width: number;
  height: number;
  fontSize: number;
};
```

기본값:

```ts
const DEFAULT_FLOATING_CAPTION_SETTINGS = {
  preset: "bottom_bar",
  width: 900,
  height: 220,
  fontSize: 48
};
```

### 10.4 저장 위치

```text
localStorage key:
kaytus-translator:floating-caption-settings
```

### 10.5 구현 주의

Document Picture-in-Picture의 `requestWindow()`는 사용자 클릭 같은 명시적 사용자 액션에서만 호출되어야 한다.  
따라서 `플로팅 시작` 버튼 클릭 핸들러 안에서만 호출한다.

---

## 11. Mock 우선 개발 지시

Phase 0에서는 API 연결 전에 Mock 이벤트로 UI를 먼저 완성한다.

### 11.1 Mock 이벤트 예시

```ts
export const mockConversationEvents: ConversationCaptionEvent[] = [
  {
    type: "caption_delta",
    mode: "conversation",
    sessionId: "mock-session",
    detectedLanguage: "ko",
    top: { language: "zh", text: "今天下午三点有客户会议。" },
    bottom: { language: "ko", text: "오늘 오후 3시에 고객 미팅이 있습니다." },
    isFinal: false,
    timestamp: new Date().toISOString()
  }
];
```

```ts
export const mockPresentationEvents: PresentationCaptionEvent[] = [
  {
    type: "caption_delta",
    mode: "presentation",
    sessionId: "mock-session",
    detectedLanguage: "ko",
    output: {
      language: "en",
      text: "We will now introduce the KAYTUS liquid cooling solution."
    },
    isFinal: false,
    timestamp: new Date().toISOString()
  }
];
```

### 11.2 Mock 모드 토글

환경변수로 Mock 모드 제어:

```env
NEXT_PUBLIC_USE_MOCK_REALTIME=true
NEXT_PUBLIC_BACKEND_BASE_URL=https://api.example.com
```

Mock 모드에서는 실제 백엔드 호출 없이 UI 이벤트를 일정 간격으로 흘려보낸다.

---

## 12. 보안 원칙

### 12.1 절대 금지

```text
- 프론트엔드에 OPENAI_API_KEY 저장 금지
- localStorage/sessionStorage에 OpenAI API Key 저장 금지
- GitHub/Vercel env에 프론트 공개 변수로 API Key 노출 금지
- 원문/번역문을 기본 로그로 저장 금지
```

### 12.2 허용

```text
- 프론트엔드 공개 변수에는 백엔드 API 주소만 저장
- short-lived client secret은 메모리 상태로만 보관
- localStorage에는 UI 설정값만 저장
- 사용량 로그는 문장 내용 없이 sessionId, mode, timestamp, duration 정도만 저장
```

---

## 13. Codex 작업 지시

Codex는 이번 Phase에서 다음 작업을 수행한다.

### 13.1 구현 대상

1. Next.js + TypeScript + Tailwind 기반 앱 구조 정리
2. 대화 모드 UI 구현
3. 발표 모드 UI 구현
4. 발표 모드 Feature Detection 구현
5. Document Picture-in-Picture Mock UI 구현
6. 플로팅 자막창 크기/글자 크기 설정 UI 구현
7. Mock Realtime 이벤트 생성기 구현
8. API Client Stub 구현
9. 타입 정의 파일 작성
10. README 업데이트

### 13.2 아직 구현하지 말 것

```text
- 실제 OpenAI API 직접 호출
- 실제 API Key 입력 UI
- 사용자 계정/로그인
- DB 저장
- 관리자 페이지
- 대화 로그 저장 기능
- 음성 출력/TTS 기능
```

### 13.3 완료 기준

- `npm run dev`로 로컬 실행 가능
- 대화 모드에서 상/하단 번역 자막 표시 가능
- 상단 패널이 180도 회전되어 표시됨
- 상/하단 언어를 독립적으로 선택 가능
- 발표 모드에서 PC Chrome/Edge 지원 여부 안내 가능
- 지원 브라우저에서 플로팅 자막창 Mock 실행 가능
- 플로팅 자막창 크기/글자 크기 조절 UI 동작
- Mock 이벤트가 자막 UI에 반영됨
- API Key 관련 코드가 프론트에 없음

---

## 14. 권장 README 문구

```md
# 실시간 번역 자막기

## Repository

- GitHub: https://github.com/timlee-kaytus/RealTimeTranslator
- Repository: Private
- Project Alias: RTT (RealTimeTranslator)
- Codex 연동: 완료

한국어/영어/중국어 실시간 번역 자막을 제공하는 Web/PWA 애플리케이션입니다.

## 모드

- 대화 모드: 상/하단 분할 화면으로 마주보기 번역 지원
- 발표 모드: PC Chrome/Edge에서 항상 위 플로팅 자막창 지원

## 보안

OpenAI API Key는 프론트엔드에 포함되지 않습니다.  
프론트엔드는 OCI 백엔드를 통해 short-lived session/client secret을 발급받아 실시간 연결을 수행합니다.

## 개발 모드

```bash
NEXT_PUBLIC_USE_MOCK_REALTIME=true npm run dev
```
```

---

## 15. Phase 0 이후 다음 단계

Phase 0 완료 후 진행 순서:

```text
Phase 1: Frontend Mock UI 완성
Phase 2: OCI Backend /health 서버 구축
Phase 3: Nginx + HTTPS + 도메인 연결
Phase 4: OpenAI Realtime client secret 발급 API 구현
Phase 5: 대화 모드 실시간 연결
Phase 6: 발표 모드 실시간 연결
Phase 7: 비용/세션 제한/사용량 로그 추가
```

---

## 16. 공식 문서 확인 링크

구현 전 반드시 최신 공식 문서를 다시 확인한다.

- OpenAI Realtime and Audio Guide
  - https://developers.openai.com/api/docs/guides/realtime
- OpenAI Realtime Translation Guide
  - https://developers.openai.com/api/docs/guides/realtime-translation
- OpenAI Realtime WebRTC Guide
  - https://developers.openai.com/api/docs/guides/realtime-webrtc
- MDN Document Picture-in-Picture API
  - https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API
- MDN DocumentPictureInPicture requestWindow
  - https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture/requestWindow
- Chrome Document Picture-in-Picture
  - https://developer.chrome.com/docs/web-platform/document-picture-in-picture
