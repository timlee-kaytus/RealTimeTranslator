# Backend Contract Stub

Phase 0에서는 실제 OCI VM, Nginx, HTTPS, OpenAI API 연동을 구성하지 않습니다.

이 디렉터리는 프론트엔드가 의존할 API 계약만 고정합니다.

- OpenAI API Key는 서버 환경변수로만 보관합니다.
- 프론트엔드는 `OPENAI_API_KEY`를 절대 받지 않습니다.
- 원문과 번역문은 기본 사용량 로그에 저장하지 않습니다.

계약 문서: [contracts/realtime-api.md](contracts/realtime-api.md)

