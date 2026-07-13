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
