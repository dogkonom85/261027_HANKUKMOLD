# 가상 AI 오피스 (261027_HANKUKMOLD)

Three.js로 만든 3D 사무실에서 AI 직원과 대화하는 웹앱입니다. Vercel에 배포합니다.

- 사무실을 드래그해 회전하고, AI 직원을 클릭하면 채팅창이 열립니다.
- 직원은 Claude API로 응답합니다. 호출은 서버리스 함수(`api/chat.js`)에서만 일어나며, API 키는 브라우저에 노출되지 않습니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `index.html`, `style.css` | 페이지와 채팅 UI |
| `main.js` | 3D 장면, 직원 애니메이션, 채팅 연동 |
| `employees.js` | AI 직원 목록 (이름·역할·위치) |
| `api/chat.js` | Claude API 호출 서버리스 함수 (직원별 시스템 프롬프트 포함) |

## 직원 추가하기

1. `employees.js`에 항목을 추가합니다.
2. `api/chat.js`의 `EMPLOYEES`에 같은 `id`로 시스템 프롬프트를 추가합니다.

## 환경변수

Vercel 프로젝트 Settings → Environment Variables에 `ANTHROPIC_API_KEY`를 등록해야 채팅이 동작합니다. 키는 저장소에 커밋하지 마세요(`.env*`는 `.gitignore`에 포함).

## 배포

`main` 브랜치에 푸시하면 Vercel이 배포합니다. 수동 배포는 `npx.cmd vercel deploy --prod`.
