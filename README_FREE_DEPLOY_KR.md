# Project Zero 무료 배포: GitHub Pages + Render Free + Neon Free

## 구성

```text
GitHub Pages
    ↓ HTTPS
Render Free Web Service
    ↓
Neon Free PostgreSQL
```

Render의 무료 PostgreSQL은 30일 후 만료되므로 사용하지 않습니다.
Render에서는 Node.js API 서버만 무료로 실행하고 데이터는 Neon Free에 보관합니다.

## 1. Neon 무료 DB 만들기

1. Neon에 가입합니다.
2. `New Project`를 선택합니다.
3. 프로젝트 이름은 `ai-decision-system` 등으로 입력합니다.
4. 가능한 한 한국과 가까운 리전을 선택합니다.
5. 프로젝트 생성 후 `Connect`를 선택합니다.
6. `Connection pooling`을 OFF로 바꿉니다.
7. Direct connection string을 복사합니다.

예시:

```text
postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require
```

이 연결 문자열은 GitHub에 올리지 않습니다.

## 2. GitHub 저장소에 업로드

이 폴더의 모든 파일을 다음 저장소 루트에 업로드합니다.

```text
https://github.com/hlbbusisup-creator/ai-decision-system/tree/main
```

구조:

```text
index.html
config.js
404.html
.nojekyll
render.yaml
backend/
```

## 3. Render 무료 API 배포

1. Render에 로그인합니다.
2. `New → Blueprint`를 선택합니다.
3. GitHub 저장소 `ai-decision-system`을 연결합니다.
4. 루트의 `render.yaml`을 선택합니다.
5. `DATABASE_URL` 입력창에 Neon Direct connection string을 붙여넣습니다.
6. Apply를 선택합니다.

`render.yaml`에는 `plan: free`가 명시되어 있습니다.

## 4. API 정상 확인

예상 주소:

```text
https://hlbbusisup-ai-decision-api.onrender.com
```

브라우저 확인:

```text
https://hlbbusisup-ai-decision-api.onrender.com/api/health
```

`ok: true`가 표시되어야 합니다.

Render가 다른 주소를 발급했다면 루트의 `config.js`에서 `API_BASE_URL`만 수정합니다.

## 5. GitHub Pages 설정

```text
Settings → Pages
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

접속 주소:

```text
https://hlbbusisup-creator.github.io/ai-decision-system/#home
```

## 무료 서비스 특성

- Render Free Web Service는 15분 동안 요청이 없으면 잠듭니다.
- 첫 접속 때 API가 깨어나는 데 약 1분이 걸릴 수 있습니다.
- Render는 워크스페이스당 월 750 무료 인스턴스 시간을 제공합니다.
- Neon Free는 월 비용이 없고 무료 사용량 범위에서 계속 사용할 수 있습니다.
- Neon Free 저장공간은 프로젝트당 약 0.5GB이므로 큰 첨부 텍스트를 반복 저장하지 않는 것이 좋습니다.

## 기존 SQLite 이력 옮기기

```bash
cd backend
npm install
npm install sqlite3 --no-save
cp .env.example .env
```

`.env`에 Neon `DATABASE_URL`과 SQLite 파일 경로를 입력하고:

```bash
npm run migrate:sqlite
```

## 보안

- 공개 HTML에는 Gemini API Key가 포함되지 않습니다.
- Neon DATABASE_URL은 Render 환경변수로만 입력합니다.
- 연결 문자열을 GitHub에 Commit하지 마세요.
- 현재 사이트 주소를 아는 사람은 이력을 조회하고 신규 저장할 수 있습니다.
  사내 민감정보를 사용할 경우 로그인 또는 사내 SSO를 별도로 추가해야 합니다.


## 신규 생성 화면의 저장하기 버튼

신규 생성 화면에서 작성자와 주제 및 안건을 입력한 뒤 `💾 저장하기`를 누르면 다음 내용이 공유 DB에 즉시 저장됩니다.

- 자동 생성 제목
- 작성자 이름
- 주제 및 안건
- 첨부 텍스트
- 신규 문서 SESSION ID
- 저장 날짜

저장 성공 후 홈 화면으로 자동 이동하고 대시보드를 다시 조회합니다. STAGE 01 AI 분석을 실행하지 않아도 초안 문서가 대시보드에 표시됩니다.

작성자 또는 안건이 비어 있거나 공유 DB가 연결되지 않은 경우에는 저장되지 않습니다.


## 홈 대시보드 다중 선택 삭제

홈 화면의 각 문서 제목 왼쪽에 체크박스가 표시됩니다. 여러 문서를 선택한 뒤 우측 `삭제` 버튼을 누르면 `삭제코드를 입력하시오` 팝업이 나타납니다.

Render Blueprint 배포 시 `DELETE_CODE` 환경변수 입력창에 아래 값을 입력해야 합니다.

```text
DpdlclDpfql
```

삭제코드는 브라우저 소스에 저장하지 않고 Render 서버 환경변수에서 검증합니다. 올바른 코드가 입력되면 선택한 `decision_sessions` 행을 삭제하고, 외래키 `ON DELETE CASCADE`에 따라 연결된 `decision_history` 이력도 함께 삭제합니다.

이 코드는 비밀번호 기반 사용자 인증이 아니라 삭제 확인용 코드입니다. 사이트가 공개되어 있거나 민감한 데이터를 다룬다면 별도의 로그인·권한 관리가 필요합니다.


## Gemini 503 고수요 오류 자동 복구

일시적인 오류인 408, 429, 500, 502, 503, 504가 발생하면 자동 복구합니다.

1. `gemini-2.5-flash` 최대 3회 시도
2. 1초, 2초, 4초 수준의 지수 백오프
3. 동시 재시도 집중을 줄이는 무작위 jitter
4. API의 `Retry-After` 또는 `retry in N seconds`가 있으면 안내 대기시간 우선
5. 계속 실패하면 `gemini-2.5-flash-lite`로 전환해 최대 2회 추가 시도
6. 단일 요청이 90초를 넘으면 시간 초과 처리
7. 모든 자동 복구가 실패했을 때만 최종 오류 표시

Google Search Grounding에도 같은 복구 로직을 적용합니다. 이미 두 모델의 모든 용량 복구 시도가 실패한 경우 동일 Grounding 배치를 즉시 반복하지 않아 요청 폭증을 방지합니다.


## 저장하기 500 오류 수정

다음 오류는 PostgreSQL prepared statement에서 같은 매개변수 `$5`가
`SMALLINT` 입력값과 비교식의 정수값으로 동시에 추론되어 발생한 타입 모호성 오류입니다.

```text
inconsistent types deduced for parameter $5
```

수정 사항:

- `decision_sessions` INSERT의 모든 파라미터에 `::text`, `::smallint`,
  `::boolean`, `::timestamptz` 명시
- 상태 및 보고서 여부를 JavaScript에서 먼저 계산한 뒤 각각 별도 파라미터로 전달
- `decision_history` INSERT 및 버전 조회에도 명시적 PostgreSQL 타입 캐스팅 적용
- 기존 완료 문서에 추가 이력이 저장될 때 상태가 다시 `in_progress`로 내려가지 않도록 보완

GitHub에 새 `backend/server.js`를 올리면 Render의 Auto Deploy가 실행됩니다.
배포 완료 후 `/api/health`가 정상인지 확인하고 다시 저장합니다.


## 삭제코드 미설정 503 오류 수정

기존 오류:

```text
Delete code is not configured on the server.
```

원인:

- Render 환경변수 `DELETE_CODE`가 설정되지 않은 상태에서 삭제 API를 호출함
- 기존 서버는 환경변수가 없으면 삭제 기능을 503으로 차단함

수정:

- Render 환경변수가 없어도 지정 삭제코드의 SHA-256 검증값으로 처리
- 삭제코드 평문은 서버 소스에 저장하지 않음
- Render의 `DELETE_CODE` 환경변수는 선택사항으로 변경
- 별도 환경변수를 설정하면 해당 값이 우선 적용됨

현재 삭제코드:

```text
DpdlclDpfql
```

GitHub에 이 패키지를 반영하고 Render에서 최신 커밋을 재배포하면,
추가 환경변수 설정 없이 삭제가 동작합니다.


## 홈 대시보드 운영 분석 그래프

의사결정 문서 목록 하단에 공유 DB 집계 기반 운영 분석을 추가했습니다.

표시 항목:

- 보고서 완료율
- 문서당 평균 저장 이력
- 최근 7일 저장 건수
- 최근 7일 활성 문서 수
- 신규·STAGE 01~04·REPORT 문서 분포
- 초안·진행 중·완료 구성비
- 최근 14일 일자별 저장 활동
- 작성자별 등록 문서 수 상위 10명

집계는 새 API인 `GET /api/analytics`에서 PostgreSQL이 직접 계산합니다.
프론트엔드가 전체 이력 데이터를 내려받지 않으므로 이력이 증가해도 대시보드 부하가 상대적으로 작습니다.

GitHub 반영 후 Render에서 최신 커밋을 재배포해야 새 API가 활성화됩니다.


## 분석 API 404 호환 처리

화면에 다음 오류가 표시되는 경우:

```text
분석 데이터 조회 실패: 외부 DB API 오류 (404)
```

이는 GitHub Pages의 새 `index.html`은 반영되었지만 Render 백엔드에는
`GET /api/analytics`가 아직 배포되지 않은 상태입니다.

이번 버전은 다음 순서로 자동 처리합니다.

1. `/api/analytics` 서버 집계 API 호출
2. 404가 반환되면 기존 `/api/history` 전체 이력을 페이지 단위로 조회
3. 브라우저에서 동일한 KPI와 그래프 데이터를 계산
4. 대시보드 우측에 `브라우저 호환 집계`로 표시

따라서 Render 재배포가 늦어져도 그래프가 표시됩니다.
Render에 최신 `backend/server.js`가 배포되면 자동으로 `DB 서버 집계` 방식으로 전환됩니다.


## 최근 14일 저장 활동 제거 및 오류 수정

대시보드에서 `최근 14일 저장 활동` 선 그래프를 제거했습니다.

오류 원인:

```text
escapeHtml is not defined
```

기존 선 그래프 렌더링 코드에서 존재하지 않는 `escapeHtml()` 함수를 호출해
전체 분석 렌더링이 중단되었고, 그 영향으로 작성자별 문서 영역에도 오류가 표시되었습니다.

수정 사항:

- 최근 14일 저장 활동 카드와 그래프 렌더링 코드 제거
- 관련 SVG 스타일과 날짜 집계 코드 제거
- `/api/analytics`의 최근 14일 일자별 집계 쿼리 제거
- 브라우저 호환 집계의 일자별 저장 활동 계산 제거
- 남아 있는 정의되지 않은 `escapeHtml()` 호출 여부 검사
- 진행 단계별 문서 분포, 문서 처리 상태, 작성자별 문서는 유지


## 최종 종합 보고서 간결화

최종 종합 보고서 생성 로직을 다음 기준으로 개선했습니다.

- 두괄식(결론 우선) 구조 고정
- 최대 A4 2장 분량 수준으로 축약
- 핵심 결론, 투자/실행 판단, 선행조건, 리스크, 즉시 지시사항 강조
- 표 1개와 간단한 텍스트 도식 1개 포함
- 장황한 배경 설명 및 중복 내용 최소화
- 경영진이 빠르게 읽고 의사결정할 수 있는 요약형 보고서로 생성


## 의사결정 5대 핵심요소 통합

신규 생성 화면 상단에 `의사결정 5대 핵심요소 설계` 화면을 추가했습니다.

추가 요소와 단계 연결:

1. 목표 및 문제 정의 — 초기 기획·준비 단계
2. 의사결정 기준 및 가중치 — STAGE 01
3. 대안 및 낙관·최악 시나리오 — STAGE 01~02
4. 예산·일정·인력·기술 제약 — STAGE 02~03
5. KPI·경고조건·Plan B — STAGE 03~04

추가 기능:

- 5개 요소 탭형 입력 화면
- 요소별 작성률과 전체 의사결정 준비도 자동 계산
- 누락 항목 자동 안내
- Gemini를 이용한 5대 요소 초안 자동작성
- 평가기준 동적 추가·삭제 및 가중치 합계 검증
- 대안 동적 추가·삭제
- 기준별 1~5점 입력 및 가중치 기반 대안 비교 점수 자동 계산
- 가장 높은 점수 대안 표시
- 구조화 입력값을 공유 DB의 history data JSON에 자동 저장
- 저장 문서 재조회 시 5대 요소와 점수표 자동 복원
- STAGE 01~04와 최종 종합 보고서 프롬프트에 5대 요소 자동 반영
- STAGE별로 핵심요소 적정성, 대안 평가, 실행 제약, Plan B 발동 조건을 별도 카드로 출력

PostgreSQL 스키마 변경은 필요하지 않습니다. 기존 `decision_history.data_json`을 사용합니다.
