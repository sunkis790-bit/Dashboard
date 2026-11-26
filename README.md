# 주간 대시보드 (비밀번호 잠금 · 암호화)

메일 정리와 리뷰 작업 진행을 한눈에 보는 웹앱(PWA)입니다. GitHub Pages에서 바로 열 수 있고,
휴대폰에서 "홈 화면에 추가"하면 앱처럼 실행됩니다.

**페이지 내용은 암호화되어 있습니다.** 사이트를 열면 잠금 화면만 보이고, 비밀번호를 넣어야
대시보드가 열립니다. 저장소에는 평문 데이터도, 비밀번호도 들어 있지 않습니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 잠금 화면 + 화면 뼈대 (상단 앱바 + 본문 + 가계부 입력/설정 모달 + 하단 탭 4개) |
| `styles.css` | 보라색 테마, 잠금 화면, 가계부 목록·차트·모달, 모바일 앱 스타일 |
| `app.js` | 암호문(`ENC`)과 복호화·렌더링, 할 일 저장, 잠금 버튼, 가계부 화면 |
| `ledger-api.js` | Supabase `public.ledger_entries` REST 연결 (설정 읽기 + 조회/추가/수정/삭제) |
| `manifest.webmanifest` | PWA 정보 (이름, 아이콘, 테마 색) |
| `sw.js` | 오프라인 캐시 (한 번 열면 인터넷 없이도 표시) |
| `icon.svg`, `icon-*.png` | 앱 아이콘 |

## 잠금 방식

- 대시보드 데이터(JSON)를 **PBKDF2-SHA256**(210,000회, 랜덤 salt)으로 키를 만들고
  **AES-256-GCM**(랜덤 IV)으로 암호화해 `app.js`의 `ENC`에 Base64로 담았습니다.
- 브라우저는 입력한 비밀번호로 Web Crypto API(`crypto.subtle`)에서만 복호화를 시도합니다.
  틀린 비밀번호면 복호화가 실패하고 화면에는 "비밀번호가 맞지 않습니다."만 표시됩니다.
- 한 번 열면 탭을 닫을 때까지 유지됩니다(`sessionStorage`에 세션 열쇠만 보관, 비밀번호 원문은
  어디에도 저장하지 않습니다). 헤더의 **잠금** 버튼을 누르면 즉시 다시 잠깁니다.
- 원래 데이터를 보관해 두지 않으므로, 비밀번호를 잊으면 저장소에서 내용을 복구할 수 없습니다.

## 고치는 법

데이터를 바꿀 때는 평문을 이 저장소에 커밋하지 마세요. 대시보드 데이터를 JSON으로 만들어
같은 방식(PBKDF2-SHA256 + AES-256-GCM)으로 다시 암호화한 뒤, `app.js`의 `ENC` 값만
`salt` · `iv` · `ct` · `iter`와 함께 교체합니다.

- 할 일 체크 상태는 `localStorage`(`weekly-dashboard-tasks-v1`)에 기기에 저장됩니다.
- 파일을 고치면 `sw.js`의 `CACHE` 이름(`weekly-dashboard-v7` …)과 `index.html`·`sw.js`의
  `?v=` 숫자를 **함께** 올립니다. 그래야 기존 방문자도 새 화면을 받습니다.

## 가계부 (Supabase)

가계부 탭은 화면(암호문)과 달리 **Supabase**에 내역을 저장합니다.

- 표: `public.ledger_entries` (`id` uuid, `entry_date`, `entry_type` expense|income,
  `category`, `title`, `amount` integer, `payment_method`, `memo`, `created_at`)
- 접속 정보(Supabase URL + publishable key)는 **코드에 넣지 않고** 브라우저 `localStorage`의
  `dashboard_supabase_config`(`{ url, key }`)에만 저장합니다. `ledger-api.js`는 이 값을 읽어
  `/rest/v1/ledger_entries`로 `GET`·`POST`·`PATCH`·`DELETE`를 보냅니다.
- 휴대폰에서 긴 키를 입력하지 않아도 되도록 **연결 링크**를 씁니다.
  `…/Dashboard/#sb=<base64url(JSON.stringify({url,key}))>`
  → 접속 정보를 저장한 뒤 `history.replaceState`로 주소창에서 즉시 지우고 가계부 탭을 엽니다.
  (앱을 켜 둔 채 링크를 눌러 해시만 바뀌어도 동작합니다.)
- 연결 설정은 가계부 탭의 안내 카드 또는 오른쪽 위 **연결 설정**에서 바꾸거나 해제합니다.

> `anon`(publishable) 키에 이 표의 읽기·쓰기 권한이 열려 있으므로, 키를 아는 사람은 누구나
> 내역을 읽고 고칠 수 있습니다. 키는 저장소·채팅에 평문으로 남기지 말고, 필요하면 Supabase에서
> RLS(행 수준 보안) 정책과 키 회전을 사용하세요.

## 공개 범위

이 저장소는 공개되어 있습니다. 그래서 화면 내용은 모두 암호문으로만 두고, 평문 수치·이름·
결제 내역은 어떤 파일에도 넣지 않습니다. 비밀번호와 힌트도 저장소에 적지 않습니다.
