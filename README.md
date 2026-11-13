# ⚔️ QUEST MODE — 현실 퀘스트 생성기

하기 싫은 현실의 목표를 **AI가 RPG 퀘스트로 바꾸고**, 사용자는 미션 4개를 체크하며 **최대 100 XP**를 모으는 웹앱입니다.

**GitHub → Vercel 배포용 완성 프로젝트**입니다. 정적 HTML/CSS/JavaScript + Vercel Node.js 서버리스 함수로 구현되어 있습니다. React, Next.js, Express, 데이터베이스, 회원가입, 외부 npm 패키지가 필요하지 않습니다.

## 구성 파일

```text
quest-mode/
├── api/
│   └── generate.js      # 서버에서만 Gemini API 호출 (키 보호)
├── public/
│   ├── index.html       # 웹앱 화면
│   ├── app.js           # 입력 / UI / XP 및 미션 체크
│   ├── style.css        # 다크 RPG 테마와 모바일 반응형
│   └── favicon.svg
├── scripts/
│   └── dev-server.js    # 패키지 설치 없는 로컬 실행
├── tests/
│   └── generate.test.js # 서버 단위 테스트 (Gemini 모의 응답)
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

> **중요:** GitHub 저장소의 최상위에 `api/`, `public/`, `vercel.json`이 보이도록 업로드하세요. ZIP을 통째로 업로드하는 것이 아니라 압축을 푼 파일/폴더들을 올려야 합니다.

## 🚀 GitHub + Vercel 배포 (처음 하는 사람용)

1. [GitHub](https://github.com/)에서 새 저장소를 만들고 (`quest-mode` 등), 이 프로젝트의 **압축을 푼 내용물 전체**를 저장소 최상위에 업로드합니다. **`.env.local`과 API 키는 절대 업로드하지 않습니다.**
2. [Vercel](https://vercel.com/)에 로그인하고 **Add New → Project → Import Git Repository**에서 저장소를 선택합니다.
3. **Framework Preset: Other**, **Root Directory: `./`**, **Output Directory: `public`**로 설정합니다. Build Command는 비워둡니다. `vercel.json`에 출력 디렉터리와 함수 시간(60초)이 이미 들어 있습니다.
4. Vercel 프로젝트 **Settings → Environment Variables**에서 다음을 등록합니다.
   - `GEMINI_API_KEY` : [Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급받은 실제 키 **(필수)**
   - `GEMINI_MODEL` : `gemini-3.5-flash-lite` **(선택; 기본값이 이미 설정됨)**
   - `ACCESS_CODE` : 시연용 비밀번호 **(선택)**. 빈 값이면 누구나 호출할 수 있습니다.
5. **Deploy**를 클릭합니다. 나중에 환경변수를 추가하거나 변경했을 때는 Vercel에서 **Redeploy**해야 해당 배포에 적용됩니다.
6. 완성된 Vercel URL에 접속하여 목표 입력 → 퀘스트 생성 → 4개 미션 체크 → `QUEST CLEAR`까지 확인합니다.

### Git CLI를 사용한다면

저장소 내부에서 아래 명령을 실행합니다.

```bash
git init
git add .
git commit -m "Build QUEST MODE web app"
git branch -M main
git remote add origin https://github.com/내-사용자명/내-저장소명.git
git push -u origin main
```

이미 GitHub에서 만든 저장소를 클론했다면 `git init`과 `git remote add`는 생략하면 됩니다.

## 💻 로컬 실행

**Node.js 20.12 이상 권장** (외부 패키지 설치 불필요).

1. `.env.example`을 `.env.local`로 **복사**하고 `GEMINI_API_KEY`에 실제 키를 입력합니다. 이 파일은 `.gitignore` 처리되어 있습니다.
2. 터미널에서 `npm run dev`
3. 브라우저에서 `http://localhost:3000` 접속
4. API 키가 없어도 **샘플 퀘스트 미리 보기** 버튼으로 UI와 미션 체크를 체험할 수 있습니다. 샘플은 AI 호출 결과가 아닙니다.

Windows PowerShell 예시:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

macOS/Linux 예시:

```bash
cp .env.example .env.local
npm run dev
```

## ✅ 테스트

```bash
npm run check
npm test
```

`npm test`는 네트워크 통신 없이 모의 Gemini 응답으로 서버 동작을 검증합니다. **실제 Gemini 응답 및 Vercel 운영 동작은 직접 배포 후 확인해야 합니다.**

## API 계약

**POST `/api/generate`**, `Content-Type: application/json` (8KB 이하)

```json
{
  "goal": "내일 시험인데 공부하기 너무 싫어",
  "duration": 30,
  "difficulty": "NORMAL",
  "energy": "MEDIUM"
}
```

- `goal`: 5~300자
- `duration`: `10`, `20`, `30`, `60`
- `difficulty`: `EASY`, `NORMAL`, `HARD`
- `energy`: `LOW`, `MEDIUM`, `HIGH`
- 접속 코드 설정 시 `x-access-code: 비밀번호` 헤더 필요

**응답 예시:**

```json
{
  "quest_title": "지식의 탑을 정복하라!",
  "quest_story": "시험의 마왕이 다가오고 있다...",
  "difficulty": "NORMAL",
  "total_minutes": 30,
  "missions": [
    {"title":"장비 준비","description":"교재를 꺼낸다.","minutes":3},
    {"title":"지식 수집","description":"핵심 개념을 복습한다.","minutes":10},
    {"title":"훈련장 돌파","description":"연습 문제를 푼다.","minutes":12},
    {"title":"최종 보스전","description":"틀린 문제를 복습한다.","minutes":5}
  ],
  "completion_message": "지식의 탑을 정복했습니다!"
}
```

미션 완료는 브라우저에서만 처리합니다. 서브 미션은 각각 20 XP, 보스 미션은 40 XP로 최대 100 XP입니다.

## 보안 및 제약

- `GEMINI_API_KEY`는 Vercel 서버 환경변수로만 접근합니다. **브라우저에 키를 보내지 않습니다.**
- API 출력은 브라우저 DOM `textContent`로 출력합니다. AI 텍스트를 `innerHTML`에 넣지 않습니다.
- 서버에서 입력 길이, 요청 크기, 옵션, AI 응답 배열 길이 및 각 미션 시간의 합을 검증합니다.
- 별도 로그인, DB, 분석 이력, 사용자 행동 로그 저장 기능은 없습니다. 단, Vercel/Google 플랫폼 자체의 요청·운영 기록은 있을 수 있습니다.
- 공개 URL의 접속 코드는 간단한 공유 제한일 뿐 보안 인증 솔루션은 아닙니다. 공개 서비스로 장기간 운영할 때는 별도 남용·요금 방지 수단을 추가해야 합니다.
- 사용자 목표 텍스트가 Google Gemini API에 전송됩니다. **개인정보/비밀 정보를 입력하지 않도록 주의**하세요.
- 외부 폰트 CDN 연결이 차단되어도 시스템 폰트로 표시됩니다.
- GitHub와 Vercel, Gemini 모델의 요금제 및 할당량은 각각의 제공 정책을 확인하세요. Vercel Hobby는 비상업적 개인 사용에 맞춥니다.
- 사용자의 퀘스트 및 진행 상태는 새로고침하면 사라집니다. 자동 저장 기능은 없습니다.
- API 키가 없거나 할당량 초과일 때 실시간 퀘스트 생성은 작동하지 않습니다.

## 수용 테스트 체크리스트

- [ ] GitHub 최상위에 `api/` 와 `public/`이 있음
- [ ] Vercel 배포 후 첫 화면 및 모바일 레이아웃 정상
- [ ] 목표가 5자 미만이면 생성 버튼 비활성화
- [ ] 생성 중 중복 요청 버튼 비활성화 및 로딩 표시
- [ ] 올바른 키로 실제 Gemini 호출 성공, 미션 4개 표시
- [ ] 완료 체크 시 XP `20+20+20+40` 계산, 해제 시 차감
- [ ] 모두 체크하면 `QUEST CLEAR!` 표시, 하나 해제하면 취소
- [ ] 복사 버튼 동작, 새 퀘스트 초기화 동작
- [ ] ACCESS_CODE 설정 시 잘못된 코드에 401, 올바른 코드에 성공
- [ ] 개발자 도구 Network/Sources 및 GitHub 저장소에 키가 노출되지 않음
- [ ] 새로고침하면 진행 상황이 복원되지 않음

### 기술 문서

- [Gemini 모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
- [Gemini JSON 구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Vercel 배포](https://vercel.com/docs/deployments)
