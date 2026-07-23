# Backend API Contract

이 저장소에는 OCI 백엔드 구현체가 포함되어 있지 않으며, 프론트엔드가
의존하는 API 계약을 관리합니다.

- OpenAI API Key는 서버 환경변수로만 보관합니다.
- 프론트엔드는 `OPENAI_API_KEY`를 절대 받지 않습니다.
- 원문과 번역문은 기본 사용량 로그에 저장하지 않습니다.
- 통역사 모드는 `/api/realtime/interpreter-session`에서 음성 Realtime
  Client Secret을 발급합니다.

계약 문서: [contracts/realtime-api.md](contracts/realtime-api.md)
