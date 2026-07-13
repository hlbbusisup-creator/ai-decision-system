# Project Zero 공유 DB 배포 패키지

이 패키지는 GitHub Pages 홈 화면에서 모든 사용자가 동일한 의사결정 문서와 STAGE별 이력을 조회하기 위한 구성입니다.

## 구성

```text
github-pages/
  index.html
  config.js
  404.html
  .nojekyll

backend/
  server.js
  schema.postgresql.sql
  package.json
  .env.example
  Dockerfile
  scripts/migrate-sqlite-to-postgres.js

render.yaml
```

## DB 구조

### decision_sessions

대시보드 카드 1개에 대응하는 의사결정 문서 마스터입니다.

- session_id
- decision_title
- author_name
- agenda_summary
- current_stage
- status
- has_report
- created_at
- updated_at

### decision_history

각 문서에서 지속적으로 생성되는 모든 입력과 산출 결과를 저장합니다.

- STAGE 01 입력 및 산출
- STAGE 02 입력 및 산출
- STAGE 03 산출
- STAGE 04 입력 및 산출
- 최종 종합 보고서
- 첨부 텍스트
- 카드 렌더링 데이터
- 생성 버전과 시간

## 홈 화면 조회

`#home`은 `/api/documents`를 자동 페이지 순회하여 모든 문서를 가져옵니다.

문서 아이콘을 클릭하면 `/api/documents/:sessionId`에서 해당 문서의 전체 이력을 가져와 STAGE 01~04 및 REPORT 화면을 복원합니다.

## Render 배포

1. 이 전체 폴더를 GitHub 저장소에 업로드합니다.
2. Render에서 `New → Blueprint`를 선택합니다.
3. 저장소를 연결하고 루트의 `render.yaml`을 적용합니다.
4. PostgreSQL과 API 서버가 함께 생성됩니다.
5. API 주소가 아래와 동일한지 확인합니다.

```text
https://hlbbusisup-ai-decision-api.onrender.com
```

다른 주소로 생성된 경우 `github-pages/config.js`의 `API_BASE_URL`을 변경합니다.

## GitHub Pages 반영

`github-pages` 폴더 안의 파일을 `ai-decision-system` 저장소의 Pages 게시 루트에 업로드합니다.

기본 URL:

```text
https://hlbbusisup-creator.github.io/ai-decision-system/#home
```

## 기존 SQLite 데이터 이관

기존 API 서버에 `data/project_zero_history.sqlite`가 있다면:

```bash
cd backend
npm install
cp .env.example .env

# .env에 DATABASE_URL과 SQLITE_PATH 입력
npm run migrate:sqlite
```

같은 ID는 중복 저장하지 않으므로 다시 실행해도 기존 이력을 덮어쓰지 않습니다.

## 보안

- 공개 HTML에 Gemini API Key를 넣지 않았습니다.
- 삭제 API는 ADMIN_TOKEN이 있어야 실행됩니다.
- GitHub Pages Origin만 CORS 허용하도록 기본 설정했습니다.
- 일반 사용자에게는 조회 및 신규 저장만 허용됩니다.
