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


## 5대 핵심요소 화면 위치 및 단계별 자동작성

화면 위치:

- `의사결정 5대 핵심요소 설계` 화면을 주제 및 안건 입력 영역의
  `저장하기`, `① 회의 준비 자동 산출` 버튼 바로 아래로 이동했습니다.

자동작성 연결:

- `① 회의 준비 자동 산출` 클릭:
  주제 및 안건을 기준으로 1번 목표·문제, 2번 기준·가중치,
  3번 대안·시나리오 초안 자동작성
- `③ 의사결정 요약 생성` 클릭:
  앞선 안건·회의 분석을 기준으로 4번 실행력·자원 제약 초안 자동작성
- `④ 진행 현황 AI 분석` 클릭:
  3단계 결정 결과와 진행 현황을 기준으로 5번 KPI·Plan B 초안 자동작성

자동작성은 기존에 사용자가 직접 입력한 값을 덮어쓰지 않고,
비어 있는 항목과 초기 기본값을 중심으로 작성합니다.
각 자동작성 실패는 해당 STAGE의 본 분석을 중단하지 않으며,
5대 요소 화면의 상태 메시지에서 확인할 수 있습니다.


## 5대 핵심요소 적정성 위치 및 자동 갱신

변경 사항:

- STAGE 01 결과 카드에 표시되던 `5대 핵심요소 적정성`을 제거했습니다.
- 적정성 검토 결과를 `의사결정 준비도` 바로 아래의 전용 AI REVIEW 영역에 표시합니다.
- STAGE 01은 기존 회의 준비 분석에서 산출된 적정성 결과를 전용 영역에 반영합니다.
- STAGE 02, STAGE 03, STAGE 04를 실행할 때마다 최신 5대 핵심요소와 단계 산출물을 기준으로 적정성을 다시 작성합니다.
- 평가기준, 가중치, 대안, 시나리오, 제약, KPI, Plan B를 직접 변경·추가·삭제하면 기존 검토 결과를 `재분석 필요` 상태로 표시합니다.
- 다음 STAGE를 실행하거나 `적정성 다시 분석` 버튼을 누르면 최신 내용으로 갱신됩니다.
- 적정성 결과, 갱신 시각, 기준 STAGE는 기존 `decision_history.data_json`에 함께 저장되고 문서 재조회 시 복원됩니다.
- AI 적정성 분석이 실패하면 준비도·가중치·대안 수·누락 항목을 기반으로 자동 진단 결과를 표시합니다.

PostgreSQL 스키마 변경은 필요하지 않습니다.


## STAGE 01 초기화 및 적정성 분석 속도 개선

### STAGE 01 초기화

STAGE 01 초기화 시 다음 내용은 유지됩니다.

- 주제 및 안건 입력
- 첨부자료 내용과 표시 파일명
- 작성 중인 문서 세션
- 의사결정 5대 핵심요소 입력값
- 작성자와 자동 생성 제목

초기화되는 항목은 STAGE 01~04 산출 결과, 회의록 입력, 진행 현황 입력,
최종 보고서 화면입니다. 외부 DB의 기존 이력은 삭제하지 않습니다.

### 적정성 분석 속도 개선

기존에는 STAGE 02~04 본 분석 뒤에 적정성 검토용 Gemini 호출을 한 번 더 실행했습니다.

개선 후:

- STAGE 02~04의 기존 JSON 응답에 `framework_suitability_review`를 함께 생성
- 별도 적정성 API 호출 제거
- STAGE 01 적정성은 최초 Gemini 응답 수신 직후 표시
- Google Search Grounding 완료를 기다리지 않고 적정성 화면 먼저 갱신
- 응답에 적정성 필드가 누락되면 로컬 준비도 계산 결과로 즉시 대체
- `적정성 다시 분석` 버튼을 직접 누를 때만 별도 Gemini 호출

자동 단계 실행 기준 호출 수:

- STAGE 01: 적정성 추가 호출 없음
- STAGE 02: 2회 → 1회
- STAGE 03: 2회 → 1회
- STAGE 04: 2회 → 1회


## STAGE 초기화 복원 및 입력 이력 삭제 수정

### 초기화한 STAGE 데이터가 다시 표시되는 문제

기존 초기화는 브라우저 화면만 비우고 공유 DB에는 초기화 시점을 남기지 않아,
문서 재조회 시 초기화 이전 산출물이 다시 복원되었습니다.

수정 후:

- STAGE 초기화 시 `stage_reset` 초기화 기준을 공유 DB에 저장
- 초기화 기준보다 오래된 해당 단계 이후 산출물과 보고서는 자동 복원에서 제외
- STAGE 01의 주제·안건과 첨부자료는 계속 유지
- 대시보드 현재 단계와 보고서 완료 여부도 초기화 기준으로 재계산
- 이전 이력은 감사 기록으로 유지
- 저장 결과 재조회 시 조회 시각이 아닌 실제 DB 저장 시각 표시

### 입력 이력 삭제 401 오류

기존 개별 이력 삭제 API는 `ADMIN_TOKEN`을 요구했지만 브라우저에서 해당 토큰을
보내지 않아 `Invalid admin token` 오류가 발생했습니다.

수정 후:

- 개별 이력 삭제와 전체 이력 삭제를 문서 삭제와 동일한 `DELETE_CODE` 방식으로 통일
- 삭제 시 `삭제코드를 입력하시오` 팝업 표시
- 삭제코드는 기존과 동일한 `DpdlclDpfql`
- 이력 삭제 후 문서의 현재 단계, 완료 여부, 최종 저장 정보를 재계산
- 초기화 기준 삭제 시 이전 산출물이 다시 복원될 수 있다는 경고 표시

`backend/server.js` 변경이 포함되므로 GitHub 반영 후 Render 최신 커밋 재배포가 필요합니다.
Neon DB 스키마 변경은 필요하지 않습니다.


## DB API 고정값 및 UI 숨김

공유 DB API 주소를 다음 값으로 고정했습니다.

```text
https://hlbbusisup-ai-decision-api.onrender.com
```

변경 사항:

- 화면의 `DB API` 주소 입력란 제거
- 화면의 `공유 DB 사용` 체크박스 제거
- 사용자가 브라우저에서 DB API를 변경하거나 비활성화할 수 없도록 수정
- `config.js`의 고정 HTTPS 주소로 항상 자동 연결
- 과거 브라우저에 저장된 `pz_external_db_api_url`, `pz_use_external_db` 값을 자동 삭제
- DB 연결 상태 표시는 유지하여 `공유 DB 연결됨` 또는 오류 상태 확인 가능
- `config.js`를 불러오지 못한 경우에도 동일한 고정 주소를 프론트엔드 기본값으로 사용

참고: 화면에서 주소를 숨기는 것은 사용자 설정을 방지하기 위한 UI 처리입니다.
브라우저에서 호출하는 API 주소 자체는 네트워크 개발자 도구에서 확인할 수 있으므로
비밀번호나 관리자 토큰처럼 비밀값으로 취급할 수는 없습니다.
