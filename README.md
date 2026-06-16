# 실시간 번역 자막기

한국어, 영어, 중국어 실시간 번역 자막을 제공하는 Web/PWA 애플리케이션입니다.

## Repository

- GitHub: https://github.com/timlee-kaytus/RealTimeTranslator
- Repository: Private
- Project Alias: RTT (RealTimeTranslator)
- Codex 연동: 완료

## 모드

- 대화 모드: 상/하단 분할 화면으로 마주보기 번역 지원
- 발표 모드: PC Chrome/Edge에서 항상 위 플로팅 자막창 지원

## 보안

OpenAI API Key는 프론트엔드에 포함되지 않습니다.
프론트엔드는 OCI 백엔드를 통해 short-lived session/client secret을 발급받아 실시간 연결을 수행합니다.

## 개발

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

Mock 모드는 기본값으로 켜져 있습니다.

```bash
NEXT_PUBLIC_USE_MOCK_REALTIME=true npm run dev
```

## 구조

```text
RealTimeTranslator/
├─ docs/
│  └─ phase0_realtime_translation_subtitle_app_codex.md
├─ frontend/
│  └─ Next.js PWA App
└─ backend/
   └─ API Contract Stub
```

