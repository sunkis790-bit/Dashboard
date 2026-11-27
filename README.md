# 가계부 (Supabase 로그인 · RLS)

이메일·비밀번호로 로그인해 쓰는 개인 가계부입니다. GitHub Pages에서 바로 열리고,
휴대폰 "홈 화면에 추가"로 앱처럼 실행됩니다.

**주소:** https://sunkis790-bit.github.io/Dashboard/

## 화면

화면은 가계부 하나뿐입니다.

- 로그인 / 회원가입 (이메일 + 비밀번호, 6자 이상)
- 월 이동, 수입·지출·잔액 요약, 카테고리별 도넛 차트
- 날짜별 내역 목록, 구분·분류 필터, 검색, 정렬
- `＋ 내역 추가` · 내역을 눌러 수정/삭제

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 로그인 화면 + 가계부 화면 뼈대 + 입력 모달 |
| `styles.css` | 보라색 테마, 로그인 화면, 가계부 목록·차트·모달 |
| `app.js` | Supabase Auth 로그인·세션 갱신·로그아웃, 가계부 화면 |
| `ledger-api.js` | 로그인 토큰으로 `public.ledger_entries` 조회/추가/수정/삭제 |
| `manifest.webmanifest` | PWA 정보 (이름, 아이콘, 테마 색) |
| `sw.js` | 오프라인 캐시 (한 번 열면 인터넷 없이도 화면 표시) |

## 로그인 (Supabase Auth)

- `POST /auth/v1/signup` 으로 회원가입하고, `POST /auth/v1/token?grant_type=password` 로 로그인합니다.
- 프로젝트에서 **Confirm email**이 켜져 있으면 가입 직후에는 세션이 없습니다. 화면은
  "입력하신 이메일로 인증 메일을 보냈습니다. 메일함의 확인 링크를 누른 뒤 로그인해 주세요."라고 안내하고,
  확인 링크로 돌아오면 주소의 `#access_token=…`을 읽어 세션을 저장합니다(주소창에서는 즉시 지웁니다).
- `access_token`·`refresh_token`은 브라우저 `localStorage`(`ledger-auth-session-v1`)에만 저장합니다.
  만료 전(1분 이내)이면 `grant_type=refresh_token`으로 자동 갱신하고, 갱신에 실패하면 로그인 화면으로 돌아갑니다.
- 헤더의 **로그아웃**은 `/auth/v1/logout`으로 세션을 끝내고 기기 저장값을 지웁니다.

## 데이터 (Supabase)

- 표: `public.ledger_entries`
  (`id` uuid PK, `user_id` uuid default `auth.uid()`, `entry_date`, `entry_type` expense|income,
  `category`, `title`, `amount` integer, `payment_method`, `memo`, `created_at`)
- **RLS**: `authenticated` 역할만, `auth.uid() = user_id` 조건으로 SELECT·INSERT·UPDATE·DELETE.
  `anon` 역할은 표 권한이 없어 읽기·쓰기가 모두 거부됩니다.
- Supabase URL과 publishable key는 `app.js`에 들어 있습니다. publishable key는 공개되어도 되는 키이고,
  실제 데이터 접근은 로그인 토큰 + RLS로 막습니다. (service_role 키는 절대 넣지 않습니다.)

## 고칠 때

- 파일을 고치면 `sw.js`의 `CACHE` 이름(`ledger-dashboard-v8` …)과 `index.html`·`sw.js`의
  `?v=` 숫자를 **함께** 올립니다. 그래야 기존 방문자도 새 화면을 받습니다.
- Supabase 프로젝트 `Dashboard`: https://supabase.com/dashboard/project/acgenglwpzawpljpchog
