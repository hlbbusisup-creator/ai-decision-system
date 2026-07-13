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
