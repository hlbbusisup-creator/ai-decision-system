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
