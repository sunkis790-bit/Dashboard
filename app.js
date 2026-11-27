/* ─────────────────────────────────────────────
   가계부 — 화면 코드

   화면은 가계부 하나뿐입니다.
   로그인은 Supabase Auth(이메일 + 비밀번호)로 하고,
   내역은 RLS로 보호된 public.ledger_entries에 저장됩니다.
   로그인한 사용자는 자기 user_id의 행만 읽고 쓸 수 있습니다.
   ───────────────────────────────────────────── */
const SB_URL = "https://acgenglwpzawpljpchog.supabase.co";
const SB_KEY = "sb_publishable_6mtDDnrNEnit9dUI6Fgmdw_fqzFukpI";
const SESSION_KEY = "ledger-auth-session-v1";

const $ = id => document.getElementById(id);
const nf = n => n.toLocaleString("ko-KR");

/* ── 로그인 세션(이 기기 브라우저에만 보관) ── */
function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return s && s.access_token ? s : null;
  } catch (e) { return null; }
}
function writeSession(d) {
  if (!d || !d.access_token) return null;
  const prev = readSession() || {};
  const s = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || prev.refresh_token || "",
    expires_at: Date.now() + (Number(d.expires_in) || 3600) * 1000,
    user: d.user || prev.user || null
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}
function dropSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

/* ── Supabase Auth ── */
async function authPost(path, body) {
  const res = await fetch(SB_URL + "/auth/v1/" + path, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
  return { ok: res.ok, status: res.status, data: data };
}

function authErrorText(r) {
  const d = r.data || {};
  const raw = [
    d.error_code, d.code, d.msg, d.message, d.error_description, d.error
  ].filter(Boolean).join(" ");
  if (/invalid_credentials/i.test(raw)) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (/email_not_confirmed/i.test(raw)) return "이메일 확인이 아직 안 끝났어요. 받은 메일의 확인 링크를 먼저 눌러 주세요.";
  if (/user_already_exists|already registered/i.test(raw)) return "이미 가입된 이메일이에요. 로그인으로 들어가 주세요.";
  if (/weak_password|at least 6/i.test(raw)) return "비밀번호는 6자 이상으로 정해 주세요.";
  if (/over_email_send_rate_limit|rate limit/i.test(raw)) return "잠시 뒤 다시 시도해 주세요. 인증 메일을 너무 자주 보냈어요.";
  if (r.status === 429) return "잠시 뒤 다시 시도해 주세요. 요청이 너무 잦았어요.";
  if (/invalid.*email|email.*invalid/i.test(raw)) return "이메일 주소를 확인해 주세요.";
  if (r.status === 422) return "입력한 값을 다시 확인해 주세요. (비밀번호는 6자 이상)";
  return d.msg || d.message || d.error_description || d.error || "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

async function signIn(email, password) {
  const r = await authPost("token?grant_type=password", { email: email, password: password });
  if (!r.ok || !r.data || !r.data.access_token) throw new Error(authErrorText(r));
  writeSession(r.data);
}

async function signUp(email, password) {
  const r = await authPost("signup", { email: email, password: password });
  if (!r.ok) throw new Error(authErrorText(r));
  if (r.data && r.data.access_token) { writeSession(r.data); return "session"; }
  return "confirm";
}

async function refreshSession() {
  const s = readSession();
  if (!s || !s.refresh_token) throw new Error("로그인이 필요합니다.");
  const r = await authPost("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
  if (!r.ok || !r.data || !r.data.access_token) { dropSession(); throw new Error("다시 로그인해 주세요."); }
  return writeSession(r.data);
}

async function ensureSession() {
  const s = readSession();
  if (!s) return null;
  if (!s.expires_at || s.expires_at - Date.now() < 60000) {
    try { return await refreshSession(); } catch (e) { return null; }
  }
  return s;
}

async function signOut() {
  const s = readSession();
  dropSession();
  if (s && s.access_token) {
    try {
      await fetch(SB_URL + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: SB_KEY, Authorization: "Bearer " + s.access_token }
      });
    } catch (e) {}
  }
  if (typeof LG !== "undefined") { LG.rows = []; LG.loaded = false; LG.error = ""; }
  ["lg-list", "lg-summary", "lg-cat-wrap"].forEach(id => { const el = $(id); if (el) el.innerHTML = ""; });
  $("who").textContent = "";
  showAuth("로그아웃했어요.");
}

/* ── 로그인 화면 ── */
const authEl = $("auth");
const appEl = $("app");
let mode = "signin";
let busy = false;

function setAuthError(msg) {
  const el = $("auth-error");
  el.textContent = msg || "";
  el.classList.toggle("show", !!msg);
}

function setBusy(on) {
  busy = on;
  const btn = $("auth-go");
  btn.disabled = on;
  btn.textContent = on ? (mode === "signup" ? "가입 중…" : "로그인 중…")
                       : (mode === "signup" ? "회원가입" : "로그인");
}

function setMode(m) {
  mode = m === "signup" ? "signup" : "signin";
  document.querySelectorAll("#auth-mode button").forEach(b => {
    const on = b.dataset.mode === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  $("auth-go").textContent = mode === "signup" ? "회원가입" : "로그인";
  $("auth-pw").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
  $("auth-note").classList.remove("ok");
  $("auth-note").innerHTML = mode === "signup"
    ? "이메일과 <b>6자 이상</b>의 비밀번호로 계정을 만듭니다. 인증 메일이 오면 확인 링크를 눌러 주세요."
    : "처음이면 <b>회원가입</b>에서 계정을 만들 수 있어요.";
  setAuthError("");
}

$("auth-mode").addEventListener("click", e => {
  const b = e.target.closest("button[data-mode]");
  if (b) setMode(b.dataset.mode);
});

$("pw-eye").addEventListener("click", () => {
  const input = $("auth-pw");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  $("pw-eye").setAttribute("aria-label", show ? "비밀번호 가리기" : "비밀번호 보기");
  input.focus();
});

$("auth-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (busy) return;
  const email = $("auth-email").value.trim();
  const password = $("auth-pw").value;
  if (!email) { setAuthError("이메일을 넣어 주세요."); $("auth-email").focus(); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setAuthError("이메일 형식을 확인해 주세요."); $("auth-email").focus(); return; }
  if (!password) { setAuthError("비밀번호를 넣어 주세요."); $("auth-pw").focus(); return; }
  if (mode === "signup" && password.length < 6) { setAuthError("비밀번호는 6자 이상으로 정해 주세요."); $("auth-pw").focus(); return; }

  setAuthError("");
  setBusy(true);
  try {
    if (mode === "signup") {
      const result = await signUp(email, password);
      if (result === "confirm") {
        $("auth-pw").value = "";
        setMode("signin");
        $("auth-note").classList.add("ok");
        $("auth-note").textContent = "입력하신 이메일로 인증 메일을 보냈습니다. 메일함의 확인 링크를 누른 뒤 로그인해 주세요.";
        $("auth-email").value = email;
        $("auth-pw").focus();
        return;
      }
      boot();
    } else {
      await signIn(email, password);
      boot();
    }
  } catch (err) {
    setAuthError((err && err.message) || "요청을 처리하지 못했어요.");
  } finally {
    setBusy(false);
  }
});

/* ── 화면 전환 ── */
function showAuth(msg) {
  authEl.hidden = false;
  appEl.hidden = true;
  document.body.classList.add("locked");
  $("auth-pw").value = "";
  if (msg) {
    $("auth-note").classList.add("ok");
    $("auth-note").textContent = msg;
  }
}

function boot() {
  const s = readSession();
  authEl.hidden = true;
  appEl.hidden = false;
  document.body.classList.remove("locked");
  if (deferredPrompt) $("installBtn").hidden = false;

  $("who").textContent = (s && s.user && s.user.email) || "";
  $("foot").innerHTML =
    "내역은 로그인한 계정에만 보입니다.<br>" +
    "다른 기기에서도 같은 이메일로 로그인하면 이어서 쓸 수 있어요.";

  try {
    LedgerAPI.configure({ url: SB_URL, key: SB_KEY });
    LedgerAPI.setAccessToken(s ? s.access_token : "");
    lgInit();
  } catch (e) { console.warn("ledger init", e); }

  if (!(s && s.user && s.user.email)) refreshWho();
}

async function refreshWho() {
  const s = readSession();
  if (!s) return;
  try {
    const res = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + s.access_token }
    });
    if (!res.ok) return;
    const u = await res.json();
    if (u && u.email) {
      const cur = readSession();
      if (cur) {
        cur.user = { id: u.id, email: u.email };
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(cur)); } catch (e) {}
      }
      $("who").textContent = u.email;
    }
  } catch (e) {}
}

$("logoutBtn").addEventListener("click", () => { signOut(); });

/* ── 토스트 ── */
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}
window.addEventListener("offline", () => toast("오프라인 · 저장된 화면을 보는 중"));
window.addEventListener("online", () => toast("다시 연결되었어요"));

/* ── 홈 화면에 추가 (Android/Chrome) ── */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  $("installBtn").hidden = false;
});
$("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch (e) {}
  deferredPrompt = null;
  $("installBtn").hidden = true;
});
window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; });

/* ── 서비스 워커 ── */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}


/* ═════════════════════════════════════════════
   가계부 — Supabase public.ledger_entries

   내역은 Supabase에 저장되고, 접속 정보는 이 기기 localStorage에만 둡니다.
   (repo에는 URL·key 평문 금지 — ledger-api.js 머리말 참고)
   ═════════════════════════════════════════════ */
const LG_COLORS = ["#6a4cb0","#8e74cc","#b7a6e0","#e0a05c","#5fa89a","#c4718d","#7aa7d8","#c2ae63","#9b8ad1","#7fa87f"];
const LG_CATS = ["식비","교통","생활","쇼핑","의료","교육","주거","통신","여가","기타"];
const LG_PAYS = ["카드","현금","계좌이체","간편결제"];

const LG = {
  bound: false,
  month: "",
  type: "all",
  cat: "",
  q: "",
  sort: "desc",
  rows: [],
  loaded: false,
  error: "",
  seq: 0,
  entryType: "expense",
  editing: null,
  saving: false
};

const lgEsc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lgPad = n => (n < 10 ? "0" : "") + n;
const lgToday = () => { const d = new Date(); return d.getFullYear() + "-" + lgPad(d.getMonth() + 1) + "-" + lgPad(d.getDate()); };
const lgMonthKey = d => d.getFullYear() + "-" + lgPad(d.getMonth() + 1);
function lgMonthRange(mk) {
  const y = Number(mk.slice(0, 4)), m = Number(mk.slice(5, 7));
  return { from: mk + "-01", to: mk + "-" + lgPad(new Date(y, m, 0).getDate()) };
}
function lgMonthLabel(mk) { return Number(mk.slice(0, 4)) + "년 " + Number(mk.slice(5, 7)) + "월"; }
function lgDayLabel(iso) {
  const p = String(iso || "").split("-").map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return String(iso || "");
  const wd = ["일","월","화","수","목","금","토"][new Date(p[0], p[1] - 1, p[2]).getDay()] || "";
  return p[1] + "월 " + p[2] + "일 (" + wd + ")";
}
function lgShort(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 100000000) { const x = v / 100000000; return (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "억"; }
  if (v >= 10000) { const x = v / 10000; return (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10).toString().replace(/\.0$/, "") + "만"; }
  return nf(v);
}
function lgApi() { return window.LedgerAPI || null; }
function lgReady() { const a = lgApi(); return !!(a && a.isReady()); }
function lgErrMessage(e) {
  if (!e) return "알 수 없는 오류가 났어요.";
  if (e.status === 401) return "로그인이 만료되었어요. 다시 로그인해 주세요.";
  if (e.status === 403) return "이 계정에는 이 내역을 볼 권한이 없어요.";
  if (e.status === 404) return "ledger_entries 표를 찾지 못했어요. Supabase에 표가 있는지 확인해 주세요.";
  if (e.status === 400) return "저장 형식이 맞지 않아요. " + (e.message || "") ;
  return e.message || "연결하지 못했어요.";
}

/* ── 로그인 상태에 따라 입력 버튼을 보이거나 숨깁니다 ── */
function lgApplyConfigState() {
  const on = lgReady();
  $("entry-add").classList.toggle("hide", !on);
  $("entry-add-top").classList.toggle("hide", !on);
}

function lgInit() {
  if (!LG.bound) { lgBind(); LG.bound = true; }
  if (!LG.month) LG.month = lgMonthKey(new Date());
  $("month").value = LG.month;
  lgApplyConfigState();
  if (lgReady()) lgLoad();
}

/* ── 불러오기 ── */
async function lgLoad(retried) {
  const api = lgApi();
  if (!api) { lgListMessage("가계부 모듈을 불러오지 못했어요. 새로고침해 주세요.", true); return; }
  if (!api.isReady()) { lgApplyConfigState(); return; }
  lgApplyConfigState();
  const seq = ++LG.seq;
  const range = lgMonthRange(LG.month);
  $("lg-range").textContent = lgMonthLabel(LG.month);
  if (!LG.loaded) lgListMessage("불러오는 중…", false);
  try {
    const rows = await api.listEntries({ from: range.from, to: range.to, order: "entry_date.desc,created_at.desc" });
    if (seq !== LG.seq) return;
    LG.rows = Array.isArray(rows) ? rows : [];
    LG.error = "";
    LG.loaded = true;
    lgRender();
  } catch (err) {
    if (seq !== LG.seq) return;
    /* 로그인 토큰이 만료됐으면 한 번 새로 받아 다시 시도합니다. */
    if (err && err.status === 401 && !retried) {
      try {
        const s = await refreshSession();
        if (s) { api.setAccessToken(s.access_token); await lgLoad(true); return; }
      } catch (e) {
        signOut();
        return;
      }
    }
    LG.rows = [];
    LG.error = lgErrMessage(err);
    LG.loaded = true;
    lgRender();
  }
}

function lgListMessage(msg, isErr) {
  $("lg-list").innerHTML = '<li class="lg-msg' + (isErr ? " err" : "") + '">' + lgEsc(msg) + "</li>";
  $("lg-count").textContent = "";
}

/* ── 그리기 ── */
function lgRender() {
  lgRenderSummary();
  lgRenderCats();
  lgFillChoices();
  lgRenderCatOptions();
  lgRenderList();
}

function lgKpi(label, amount, cls, sub) {
  const neg = amount < 0;
  const body = nf(Math.abs(amount));
  const txt = (neg ? "−" : "") + body;
  const long = txt.length >= 9 ? " long" : "";
  return '<div class="kpi lg-kpi"><div class="t">' + label + '</div>' +
    '<div class="v ' + cls + long + '" title="' + nf(Math.abs(amount)) + '원">' + txt + '<em>원</em></div>' +
    '<div class="s">' + lgEsc(sub) + '</div></div>';
}

function lgRenderSummary() {
  const inc = LG.rows.filter(r => r.entry_type === "income");
  const out = LG.rows.filter(r => r.entry_type !== "income");
  const incSum = inc.reduce((s, r) => s + Number(r.amount || 0), 0);
  const outSum = out.reduce((s, r) => s + Number(r.amount || 0), 0);
  const bal = incSum - outSum;
  $("lg-summary").innerHTML =
    lgKpi("수입", incSum, "in", inc.length + "건") +
    lgKpi("지출", outSum, "out", out.length + "건") +
    lgKpi("잔액", bal, "bal", bal < 0 ? "지출이 더 많아요" : "수입 − 지출");
}

function lgRenderCats() {
  const map = new Map();
  LG.rows.filter(r => r.entry_type !== "income").forEach(r => {
    const k = (r.category || "").trim() || "미분류";
    map.set(k, (map.get(k) || 0) + Number(r.amount || 0));
  });
  const items = Array.from(map.entries()).map(([k, v]) => ({ k: k, v: v })).sort((a, b) => b.v - a.v);
  const total = items.reduce((s, i) => s + i.v, 0);
  $("lg-cat-total").textContent = total ? "합계 " + nf(total) + "원" : "";
  const wrap = $("lg-cat-wrap");
  if (LG.error) { wrap.innerHTML = '<p class="empty">지출 내역을 불러오지 못했어요.</p>'; return; }
  if (!items.length) { wrap.innerHTML = '<p class="empty">이 달에는 지출 내역이 없어요.</p>'; return; }

  const svg = ['<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="카테고리별 지출 비중">',
    '<circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1ecfa" stroke-width="6.5"></circle>'];
  let offset = 0;
  items.forEach((it, i) => {
    const len = it.v / total * 100;
    svg.push('<circle cx="21" cy="21" r="15.915" fill="none" stroke="' + LG_COLORS[i % LG_COLORS.length] +
      '" stroke-width="6.5" stroke-dasharray="' + len.toFixed(2) + " " + (100 - len).toFixed(2) +
      '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 21 21)"></circle>');
    offset += len;
  });
  svg.push('<text x="21" y="20.2" text-anchor="middle" font-size="4.6" font-weight="700" fill="#2e2a3b">' + lgShort(total) + '</text>');
  svg.push('<text x="21" y="24" text-anchor="middle" font-size="2.4" fill="#9a93ad">원</text>');
  svg.push("</svg>");

  const legend = items.map((it, i) =>
    '<div class="row"><span class="dot" style="background:' + LG_COLORS[i % LG_COLORS.length] + '"></span>' +
    '<span class="nm">' + lgEsc(it.k) + '</span><b>' + nf(it.v) + '원</b><i>' + Math.round(it.v / total * 100) + '%</i></div>'
  ).join("");
  wrap.innerHTML = '<div class="donutbox">' + svg.join("") + '<div class="legend">' + legend + "</div></div>";
}

function lgRenderCatOptions() {
  const set = new Set();
  LG.rows.forEach(r => set.add((r.category || "").trim() || "미분류"));
  LG_CATS.forEach(c => set.add(c));
  if (LG.cat) set.add(LG.cat);
  const list = Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  $("cat-filter").innerHTML = '<option value="">분류 전체</option>' +
    list.map(c => '<option value="' + lgEsc(c) + '">' + lgEsc(c) + "</option>").join("");
  const keep = LG.cat && list.indexOf(LG.cat) >= 0 ? LG.cat : "";
  $("cat-filter").value = keep;
  LG.cat = keep;
}

function lgRenderList() {
  const list = $("lg-list");
  if (LG.error) { list.innerHTML = '<li class="lg-msg err">' + lgEsc(LG.error) + '</li>'; $("lg-count").textContent = ""; return; }

  let rows = LG.rows.slice();
  if (LG.type !== "all") rows = rows.filter(r => (r.entry_type === "income" ? "income" : "expense") === LG.type);
  if (LG.cat) rows = rows.filter(r => ((r.category || "").trim() || "미분류") === LG.cat);
  const q = LG.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => ((r.title || "") + " " + (r.memo || "")).toLowerCase().indexOf(q) !== -1);
  rows.sort((a, b) => {
    const ka = (a.entry_date || "") + " " + (a.created_at || "");
    const kb = (b.entry_date || "") + " " + (b.created_at || "");
    if (ka === kb) return 0;
    const r = ka < kb ? -1 : 1;
    return LG.sort === "asc" ? r : -r;
  });

  $("lg-count").textContent = rows.length ? rows.length + "건" : "";
  if (!rows.length) {
    list.innerHTML = '<li class="lg-msg">' +
      (LG.rows.length ? "조건에 맞는 내역이 없어요." : "이 달에는 내역이 없어요. ＋ 내역 추가로 넣어 보세요.") + "</li>";
    return;
  }

  const groups = [];
  rows.forEach(r => {
    const d = r.entry_date || "";
    const last = groups[groups.length - 1];
    if (!last || last.date !== d) groups.push({ date: d, rows: [r] });
    else last.rows.push(r);
  });

  const today = lgToday();
  list.innerHTML = groups.map(g => {
    const out = g.rows.filter(r => r.entry_type !== "income").reduce((s, r) => s + Number(r.amount || 0), 0);
    const inc = g.rows.filter(r => r.entry_type === "income").reduce((s, r) => s + Number(r.amount || 0), 0);
    const bits = [];
    if (out) bits.push("지출 " + nf(out));
    if (inc) bits.push("수입 " + nf(inc));
    const head = '<div class="day-head"><span>' + lgEsc(lgDayLabel(g.date)) + '</span><b>' + bits.join(" · ") + '</b></div>';
    const items = g.rows.map(r => {
      const isOut = r.entry_type !== "income";
      const amt = Number(r.amount || 0);
      const catName = (r.category || "").trim() || "미분류";
      const sub = [catName, (r.payment_method || "").trim()].filter(Boolean).join(" · ");
      return '<li class="lg-item" data-id="' + lgEsc(r.id) + '" tabindex="0" role="button" aria-label="' +
        lgEsc((r.title || "") + " " + nf(amt) + "원 수정") + '">' +
        '<span class="cat">' + lgEsc(catName.slice(0, 1)) + '</span>' +
        '<div class="tx"><div class="t">' + lgEsc(r.title || "(내용 없음)") + '</div><div class="m">' + lgEsc(sub) + '</div></div>' +
        '<span class="amt ' + (isOut ? "out" : "in") + '">' + (isOut ? "−" : "+") + nf(amt) + '원</span></li>';
    }).join("");
    return '<li class="lg-day' + (g.date === today ? " today" : "") + '">' + head + '<ul class="lg-items">' + items + "</ul></li>";
  }).join("");
}

/* ── 분류·결제수단 선택지 ── */
function lgFillChoices() {
  const cats = new Set(LG_CATS);
  const pays = new Set(LG_PAYS);
  LG.rows.forEach(r => {
    const c = (r.category || "").trim(); if (c) cats.add(c);
    const p = (r.payment_method || "").trim(); if (p) pays.add(p);
  });
  const catList = Array.from(cats);
  const payList = Array.from(pays);
  $("cat-list").innerHTML = catList.map(c => '<option value="' + lgEsc(c) + '"></option>').join("");
  $("pay-list").innerHTML = payList.map(p => '<option value="' + lgEsc(p) + '"></option>').join("");
  $("cat-chips").innerHTML = catList.slice(0, 10).map(c => '<button type="button" data-cat="' + lgEsc(c) + '">' + lgEsc(c) + "</button>").join("");
  $("pay-chips").innerHTML = payList.map(p => '<button type="button" data-pay="' + lgEsc(p) + '">' + lgEsc(p) + "</button>").join("");
  lgSyncChips();
}

function lgSyncChips() {
  const c = $("entry-category").value.trim();
  const p = $("entry-pay").value.trim();
  $("cat-chips").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.cat === c));
  $("pay-chips").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.pay === p));
}

/* ── 모달 ── */
function lgOpenModal(id) {
  const m = $(id); if (!m) return;
  m.classList.remove("hide");
  document.body.classList.add("modal-open");
}
function lgCloseModal(id) {
  const m = $(id); if (m) m.classList.add("hide");
  if (!document.querySelector(".modal:not(.hide)")) document.body.classList.remove("modal-open");
}

/* ── 내역 입력·수정 ── */
function lgOpenEntry(row) {
  if (!lgReady()) { toast("다시 로그인해 주세요"); return; }
  LG.editing = row ? row.id : null;
  LG.entryType = row && row.entry_type === "income" ? "income" : "expense";
  $("entry-title").textContent = row ? "내역 수정" : "내역 추가";
  $("entry-type").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.type === LG.entryType));
  $("entry-amount").value = row ? nf(Number(row.amount || 0)) : "";
  $("entry-date").value = (row && row.entry_date) || lgToday();
  $("entry-category").value = row ? (row.category || "") : "";
  $("entry-name").value = row ? (row.title || "") : "";
  $("entry-pay").value = row ? (row.payment_method || "") : "";
  $("entry-memo").value = row ? (row.memo || "") : "";
  $("entry-err").textContent = "";
  $("entry-del").classList.toggle("hide", !row);
  $("entry-actions").classList.remove("hide");
  $("entry-confirm").classList.add("hide");
  lgFillChoices();
  lgOpenModal("entry-modal");
  if (!row && window.matchMedia && window.matchMedia("(pointer:fine)").matches) {
    setTimeout(() => { try { $("entry-amount").focus(); } catch (e) {} }, 80);
  }
}

function lgEntryErr(msg) {
  $("entry-err").textContent = msg || "";
}

async function lgSaveEntry(e) {
  e.preventDefault();
  if (LG.saving) return;
  const api = lgApi();
  if (!api || !api.isReady()) { lgEntryErr("다시 로그인해 주세요."); return; }

  const entry = {
    entry_date: $("entry-date").value,
    entry_type: LG.entryType,
    category: $("entry-category").value.trim(),
    title: $("entry-name").value.trim(),
    amount: Number(($("entry-amount").value || "").replace(/[^\d]/g, "")) || 0,
    payment_method: $("entry-pay").value.trim(),
    memo: $("entry-memo").value.trim()
  };
  if (!entry.entry_date) { lgEntryErr("날짜를 넣어 주세요."); return; }
  if (!entry.title) { lgEntryErr("내용을 넣어 주세요."); $("entry-name").focus(); return; }
  if (!entry.amount) { lgEntryErr("금액을 넣어 주세요."); $("entry-amount").focus(); return; }

  const wasEdit = !!LG.editing;
  const id = LG.editing;
  lgEntryErr("");
  LG.saving = true;
  $("entry-save").disabled = true;
  $("entry-save").textContent = "저장 중…";
  try {
    if (wasEdit) await api.updateEntry(id, entry);
    else await api.createEntry(entry);
    LG.editing = null;
    lgCloseModal("entry-modal");
    toast(wasEdit ? "수정했어요" : "저장했어요");
    const mk = entry.entry_date.slice(0, 7);
    if (mk !== LG.month) { LG.month = mk; $("month").value = mk; }
    await lgLoad();
  } catch (err) {
    lgEntryErr(lgErrMessage(err));
  } finally {
    LG.saving = false;
    $("entry-save").disabled = false;
    $("entry-save").textContent = "저장";
  }
}

async function lgDeleteEntry() {
  const api = lgApi();
  if (!api || !LG.editing) return;
  const id = LG.editing;
  try {
    await api.deleteEntry(id);
    LG.editing = null;
    lgCloseModal("entry-modal");
    toast("삭제했어요");
    await lgLoad();
  } catch (err) {
    lgEntryErr(lgErrMessage(err));
    $("entry-confirm").classList.add("hide");
    $("entry-actions").classList.remove("hide");
  }
}

/* ── 이벤트 연결(처음 한 번만) ── */
function lgBind() {
  /* 달 이동 */
  $("month-prev").addEventListener("click", () => lgShiftMonth(-1));
  $("month-next").addEventListener("click", () => lgShiftMonth(1));
  $("month").addEventListener("change", e => {
    if (!e.target.value) { e.target.value = LG.month; return; }
    LG.month = e.target.value;
    lgLoad();
  });

  /* 내역 추가 */
  $("entry-add").addEventListener("click", () => lgOpenEntry(null));
  $("entry-add-top").addEventListener("click", () => lgOpenEntry(null));

  /* 지출/수입 */
  $("entry-type").addEventListener("click", e => {
    const b = e.target.closest("button[data-type]");
    if (!b) return;
    LG.entryType = b.dataset.type;
    $("entry-type").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  });

  /* 금액: 숫자만 남기고 천단위 쉼표 */
  $("entry-amount").addEventListener("input", e => {
    const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
    e.target.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
  });

  /* 분류·결제수단 칩 */
  $("cat-chips").addEventListener("click", e => {
    const b = e.target.closest("button[data-cat]");
    if (!b) return;
    $("entry-category").value = b.dataset.cat;
    lgSyncChips();
  });
  $("pay-chips").addEventListener("click", e => {
    const b = e.target.closest("button[data-pay]");
    if (!b) return;
    $("entry-pay").value = b.dataset.pay;
    lgSyncChips();
  });
  $("entry-category").addEventListener("input", lgSyncChips);
  $("entry-pay").addEventListener("input", lgSyncChips);

  /* 저장·삭제 */
  $("entry-form").addEventListener("submit", lgSaveEntry);
  $("entry-del").addEventListener("click", () => {
    $("entry-actions").classList.add("hide");
    $("entry-confirm").classList.remove("hide");
  });
  $("confirm-no").addEventListener("click", () => {
    $("entry-confirm").classList.add("hide");
    $("entry-actions").classList.remove("hide");
  });
  $("confirm-yes").addEventListener("click", lgDeleteEntry);
  $("entry-close").addEventListener("click", () => lgCloseModal("entry-modal"));

  /* 목록에서 수정 */
  $("lg-list").addEventListener("click", e => {
    const li = e.target.closest("li.lg-item[data-id]");
    if (!li) return;
    const row = LG.rows.filter(r => r.id === li.dataset.id)[0];
    if (row) lgOpenEntry(row);
  });
  $("lg-list").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const li = e.target.closest("li.lg-item[data-id]");
    if (!li) return;
    e.preventDefault();
    const row = LG.rows.filter(r => r.id === li.dataset.id)[0];
    if (row) lgOpenEntry(row);
  });

  /* 필터·정렬·검색 */
  $("type-filter").addEventListener("click", e => {
    const b = e.target.closest("button[data-type]");
    if (!b) return;
    LG.type = b.dataset.type;
    $("type-filter").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    lgRenderList();
  });
  $("cat-filter").addEventListener("change", e => { LG.cat = e.target.value; lgRenderList(); });
  $("lg-search").addEventListener("input", e => { LG.q = e.target.value; lgRenderList(); });
  $("sort-toggle").addEventListener("click", () => {
    LG.sort = LG.sort === "desc" ? "asc" : "desc";
    $("sort-toggle").textContent = LG.sort === "desc" ? "최신순 ↓" : "오래된순 ↑";
    lgRenderList();
  });

  /* 모달 바깥을 누르거나 Esc */
  Array.prototype.forEach.call(document.querySelectorAll(".modal"), m => {
    m.addEventListener("click", e => { if (e.target === m) lgCloseModal(m.id); });
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const open = document.querySelector(".modal:not(.hide)");
    if (open) lgCloseModal(open.id);
  });
}

function lgShiftMonth(delta) {
  const y = Number(LG.month.slice(0, 4)), m = Number(LG.month.slice(5, 7));
  const d = new Date(y, m - 1 + delta, 1);
  LG.month = lgMonthKey(d);
  $("month").value = LG.month;
  lgLoad();
}

/* ── 이메일 확인 링크로 돌아온 토큰(#access_token=…)을 저장합니다 ── */
function consumeAuthHash() {
  const hash = location.hash || "";
  if (hash.indexOf("access_token=") === -1 && hash.indexOf("error_description=") === -1) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  let out = null;
  if (p.get("error_description")) {
    out = { error: p.get("error_description") };
  } else if (p.get("access_token")) {
    writeSession({
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      expires_in: Number(p.get("expires_in")) || 3600
    });
    out = { ok: true };
  }
  /* 주소창·방문 기록에 토큰이 남지 않게 바로 지웁니다. */
  try { history.replaceState(null, "", location.pathname + location.search); }
  catch (e) { try { location.hash = ""; } catch (_) {} }
  return out;
}

/* 이메일 링크가 ?token_hash=… 로 올 때도 확인해 세션을 만듭니다. */
async function consumeTokenHash() {
  const p = new URLSearchParams(location.search || "");
  const tokenHash = p.get("token_hash"), type = p.get("type");
  if (!tokenHash) return null;
  let out = null;
  try {
    const r = await authPost("verify", { type: type || "signup", token_hash: tokenHash });
    if (r.ok && r.data && r.data.access_token) { writeSession(r.data); out = { ok: true }; }
    else out = { error: true };
  } catch (e) { out = { error: true }; }
  try { history.replaceState(null, "", location.pathname); } catch (e) {}
  return out;
}

/* ── 시작: 이미 로그인했으면 가계부, 아니면 로그인 화면 ── */
(async function init() {
  const fromHash = consumeAuthHash();
  const fromQuery = await consumeTokenHash();
  const fromLink = fromHash || fromQuery;
  if (fromLink && fromLink.error) {
    showAuth("링크를 확인하지 못했어요. 이메일과 비밀번호로 다시 로그인해 주세요.");
    return;
  }
  const s = await ensureSession();
  if (s) { boot(); return; }
  setMode("signin");
  showAuth(fromLink && fromLink.ok ? "이메일 확인이 끝났어요. 이메일과 비밀번호로 로그인해 주세요." : "");
})();
