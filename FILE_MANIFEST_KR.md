# AI 기반 의사결정 대시보드 전체 파일 구성

## GitHub Pages 프론트엔드

- `index.html`: 홈 대시보드, 신규 문서 작성, STAGE 01~04, 최종 보고서, 저장, 다중 선택 삭제, 운영 분석 그래프
- `config.js`: Render API 서버 주소 설정
- `404.html`: GitHub Pages 경로 오류 대응
- `.nojekyll`: GitHub Pages의 Jekyll 처리 비활성화

## Render API 서버

- `render.yaml`: Render Free Web Service Blueprint 설정
- `backend/server.js`: Neon PostgreSQL 연동 API
- `backend/package.json`: Node.js 패키지 및 실행 명령
- `backend/schema.postgresql.sql`: PostgreSQL 테이블·인덱스·트리거 생성
- `backend/.env.example`: 환경변수 예시
- `backend/Dockerfile`: Docker 배포용 설정
- `backend/scripts/migrate-sqlite-to-postgres.js`: 기존 SQLite 데이터 이관

## 안내 문서

- `README_DEPLOY_KR.md`: 기본 배포 안내
- `README_FREE_DEPLOY_KR.md`: GitHub Pages + Render Free + Neon Free 배포 안내

## 포함된 주요 기능

- 신규 의사결정 문서 저장 및 대시보드 조회
- 작성자·자동 생성 제목·안건 저장
- STAGE별 입력·산출·보고서 이력 관리
- Neon 공유 PostgreSQL DB
- 문서 다중 선택 및 삭제코드 검증
- Gemini 503·429·5xx 자동 재시도
- Gemini Flash-Lite 대체 모델 전환
- 진행 단계·완료율·문서 상태·작성자별 그래프
- `/api/analytics` 미배포 시 브라우저 호환 집계
- PostgreSQL 파라미터 타입 오류 수정
- Render 삭제코드 환경변수 누락 시 서버 해시 검증

## GitHub 저장소 권장 구조

```text
ai-decision-system/
├─ .nojekyll
├─ 404.html
├─ config.js
├─ index.html
├─ render.yaml
├─ README_DEPLOY_KR.md
├─ README_FREE_DEPLOY_KR.md
├─ FILE_MANIFEST_KR.md
└─ backend/
   ├─ .env.example
   ├─ Dockerfile
   ├─ package.json
   ├─ schema.postgresql.sql
   ├─ server.js
   └─ scripts/
      └─ migrate-sqlite-to-postgres.js
```
