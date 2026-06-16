# 실시간 번역 자막기 Frontend

Next.js, React, TypeScript, Tailwind CSS 기반 Phase 0 프론트엔드입니다.

## 개발 서버

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

Mock realtime은 기본값으로 켜져 있습니다.

Vercel 배포 시 Root Directory는 `frontend`로 설정합니다.

## 환경변수

```env
NEXT_PUBLIC_USE_MOCK_REALTIME=true
NEXT_PUBLIC_BACKEND_BASE_URL=https://api.example.com
```

## 구현 범위

- 대화 모드 Mock UI
- 발표 모드 Mock UI
- Document Picture-in-Picture 지원 감지
- 플로팅 자막 크기 설정 저장
- 백엔드 API client stub

## 아직 구현하지 않은 항목

- 실제 OpenAI Realtime 연결
- 실제 API Key 입력 UI
- 사용자 계정/로그인
- 대화 로그 저장
- 음성 출력/TTS
