/* ─────────────────────────────────────────────
   주간 대시보드 — 화면 코드

   대시보드 내용은 아래 ENC에 암호문으로만 들어 있습니다.
   (PBKDF2-SHA256 + AES-256-GCM, Web Crypto로만 복호화)
   이 파일에는 평문 데이터도, 비밀번호도 넣지 마세요.
   데이터를 바꾸려면 대시보드 데이터를 JSON으로 만들어 다시 암호화한 뒤 ENC를 바꿉니다.
   ───────────────────────────────────────────── */
const ENC = {
  v: 1,
  kdf: "PBKDF2-SHA256",
  iter: 210000,
  cipher: "AES-256-GCM",
  salt: "TpJcagdHGuGk+ZvoSCnHAw==",
  iv: "35qbau4gjd8JJH4G",
  ct: "tnyJ7AHAMZGpHdYiqqKe6LHIBvEGoAXCq0TkAzcuBzSaEeZ7ASnvJD86Tn/rsK58wlXonCCv3E7HcdQK82ANjc1rH8z5SyjoobbNSs9PsFa9g4GFVX/dtc6RdhguTC+LYZ76kPewLu1P398NVv30VvYA1cvuEo6LHcNibAqv09Qbd5jBY1Du/oeAclX8HaVdxD1IdAH6HeP4XxMNjGUopBW69IEmLtOzNYUU7xEzW2BVg/1PjbKADlSwXWYKCxZqvvsYmbtxUKqIINggZ/NZagzvNpEy0AqsQWdgwswdVQ+Aq63LoQnt1g0uFsmW65//SUv0bzt7FlDmYN1N0aZxyPV6Hg6MaZN9rRsTjfs91jtBG7Ear/tDaRHjr6f/+qMxMXw+mRsen0VJRruVQp+HVj2cZCp0+SikeHMeihc/4r8tH7uFXFmdqB3dHiaH4YEhiNe47VdQp0AZ/OZAOxU+p7ad+fqwQ1U06c67IojUk1c18wCAm8orBazBFfhKh/wcqwvjsBvzTvdhuYdqkOYn9axOxbDSQ27SJ9RHQypLuLyUe7rCOamY9GbmLGFfn4IP5M/p8Vb/mSzhe6TV1WJmNjgjr0pIrEL2OQhGw65ZSKwXNvlb0zrmDdyHub4zJE/9N9CI16mOrf/0te3GxojvjIDtRidfc4M8kZ1uhAMXN/7kaPT/FmEzK+ycjS7FEUi4dntBGQYnJwJpwd6NIS6xSr49IijXzDhZVSdqrm0DE2OOVoz88yccOkDSTJK4WKVP++d6ITYETQ65YgLDYmpED1AcnRdYIt10+Yvjed/ToBD74YVH0nVPYhT5PeDCyC6V65spxLkyBAKcd+B4rgbzCCOvNOgM5pjZnOnsik+3QmkS+UVmrm1qy5HcUfpa9D29VOcEMYSBjX2vLOoS2gT43c/PPLnG1DidyDSnSxRYtjuXQqorpjONJdp+McHgjKW7z9Wr+4PqU7FyB1AuuIfeXjkD3bsoT1J7b/M3ho6U1QlkzH4v7/4tSZjKv392D43s1xo0IOSJo+9DnItgsGZ3miD7YCyj9IgCbH1sUhDn6ar2BeDRMxXprmEMziDuHCsiQK9Ro2XyJon79vqxXzeIyruFR5hWDNGft44rFPzjim9r0pIGmoxcv5YiNqhA4ZDoXOYMUsDX9NUG6nCEF0u9UKQwXpGaUqKbx3kJEvINxYApkH3MhNTRmLZ7nDrEtXNXc1fjcp1gR48NcWq49jfndRFUNEtEXmMQoqJnj/NblpZCDx2wSYpMfSph2z+AUkuvYOddWc0JjWP4CYPOR1qCm2kXuSuklYUKs3OWsgSizng9Sxt2xk+Xlm5wE/xKPltOIX0UruNe8ELclt8fVbErcaVge58nV2EuvNPc/YKAJouZwfC5elaQTE6a6XQNkT0QpTbvjk3XMYiX09Soxw7rGHjVjCrgisoKsMfsMg8p0Tgu4gBmkDEP3+EoGGgjC6dtBlZPI3lzMbNYlY+JVjJu"
};

const $ = id => document.getElementById(id);
const nf = n => n.toLocaleString("ko-KR");

const b64ToBytes = s => {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
};
const bytesToB64 = buf => {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
};

/* base64url(연결 링크) → 바이트 */
function b64UrlToBytes(s) {
  let t = String(s).replace(/-/g, "+").replace(/_/g, "/").trim();
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

/* 이 탭 세션 동안만 쓰는 열쇠(비밀번호 아님). 탭을 닫으면 사라집니다. */
const SKEY = "weekly-dashboard-session-key-v2";

/* 연결 링크(#sb=…)로 들어왔을 때 열 탭과 안내 문구 */
let pendingTab = "";
let pendingNotice = "";

async function deriveKey(password) {
  const base = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password.normalize("NFC")),
    "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(ENC.salt), iterations: ENC.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]
  );
}

async function decryptWith(key) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ENC.iv), tagLength: 128 },
    key, b64ToBytes(ENC.ct)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/* ── 잠금 화면 ── */
const lockEl = $("lock");
const appEl = $("app");
let busy = false;

function setError(msg) {
  const el = $("pw-error");
  el.textContent = msg || "";
  el.classList.toggle("show", !!msg);
}
function setBusy(on) {
  busy = on;
  $("pw-go").disabled = on;
  $("pw-go").textContent = on ? "여는 중…" : "열기";
}

async function unlock(password) {
  const key = await deriveKey(password);
  const data = await decryptWith(key);
  try { sessionStorage.setItem(SKEY, bytesToB64(await crypto.subtle.exportKey("raw", key))); } catch (e) {}
  boot(data);
}

$("lock-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (busy) return;
  const pw = $("pw").value;
  if (!pw) { setError("비밀번호를 입력해 주세요."); return; }
  setError("");
  setBusy(true);
  try {
    await unlock(pw);
  } catch (err) {
    setError("비밀번호가 맞지 않습니다.");
    $("pw").value = "";
    $("pw").focus();
  } finally {
    setBusy(false);
  }
});

$("pw-eye").addEventListener("click", () => {
  const input = $("pw");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  $("pw-eye").setAttribute("aria-label", show ? "비밀번호 가리기" : "비밀번호 보기");
  input.focus();
});

/* ── 잠금 해제 후 화면 ── */
function boot(DATA) {
  lockEl.hidden = true;
  appEl.hidden = false;
  document.body.classList.remove("locked");
  if (deferredPrompt) $("installBtn").hidden = false;

  $("stamp").textContent = "기준 " + DATA.updated;
  $("foot").innerHTML =
    "수치는 마지막 갱신 시점 기준입니다. 삭제한 메일은 휴지통에서 복원할 수 있어요.<br>" +
    "내용은 암호화되어 있고, 비밀번호를 아는 이 기기에서만 열립니다.";

  if (pendingNotice) { toast(pendingNotice); pendingNotice = ""; }

  /* ── KPI ── */
  $("kpis").innerHTML = DATA.kpi.map(k =>
    `<div class="kpi">
       <div class="t">${k.t}</div>
       <div class="v">${nf(k.v)}<em>${k.u}</em></div>
       <div class="s">${k.s}</div>
     </div>`
  ).join("");

  /* ── 막대: 정리 전 → 정리 후 ── */
  const maxUnread = Math.max(DATA.unreadBefore, DATA.unreadAfter);
  $("b1n").textContent = nf(DATA.unreadBefore) + "통";
  $("b2n").textContent = nf(DATA.unreadAfter) + "통";
  const drop = Math.round((1 - DATA.unreadAfter / DATA.unreadBefore) * 100);
  $("dropHint").innerHTML = `안 읽은 메일이 <b>${drop}%</b> 줄었어요. (${nf(DATA.unreadBefore - DATA.unreadAfter)}통 감소)`;

  requestAnimationFrame(() => {
    $("b1").style.height = (DATA.unreadBefore / maxUnread * 100) + "%";
    $("b2").style.height = (DATA.unreadAfter / maxUnread * 100) + "%";
  });

  /* ── 이번 주 요약 ── */
  $("notes").innerHTML = [
    `안 읽은 메일 <b>${nf(DATA.unreadBefore)}통 → ${nf(DATA.unreadAfter)}통</b>`,
    `${DATA.cleaned[0].label} <b>${nf(DATA.cleaned[0].v)}통</b> 포함 <b>${nf(DATA.kpi[1].v)}통</b> 정리`,
    `${DATA.kpi[2].t} <b>${DATA.kpi[2].v}건</b> · ${DATA.kpi[3].t} <b>${nf(DATA.kpi[3].v)}점</b>`
  ].map(s => `<li><span class="tick">✓</span><span>${s}</span></li>`).join("");

  /* ── 도넛: 안 읽던 메일의 성격 ── */
  const totalMail = DATA.categories.reduce((s, c) => s + c.v, 0);
  const donut = $("donut");
  let offset = 0;
  DATA.categories.forEach(c => {
    const len = c.v / totalMail * 100;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", 21); el.setAttribute("cy", 21); el.setAttribute("r", 15.915);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", c.c);
    el.setAttribute("stroke-width", 6.5);
    el.setAttribute("stroke-dasharray", `0 100`);
    el.setAttribute("stroke-dashoffset", -offset);
    el.setAttribute("transform", "rotate(-90 21 21)");
    donut.appendChild(el);
    requestAnimationFrame(() => el.setAttribute("stroke-dasharray", `${len} ${100 - len}`));
    offset += len;
  });
  const centerTop = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerTop.setAttribute("x", 21); centerTop.setAttribute("y", 20.4);
  centerTop.setAttribute("text-anchor", "middle"); centerTop.setAttribute("font-size", 5);
  centerTop.setAttribute("font-weight", 700); centerTop.setAttribute("fill", "#2e2a3b");
  centerTop.textContent = nf(totalMail);
  const centerBottom = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerBottom.setAttribute("x", 21); centerBottom.setAttribute("y", 24.6);
  centerBottom.setAttribute("text-anchor", "middle"); centerBottom.setAttribute("font-size", 2.6);
  centerBottom.setAttribute("fill", "#9a93ad");
  centerBottom.textContent = "통";
  donut.appendChild(centerTop);
  donut.appendChild(centerBottom);

  $("pie-total").textContent = "합계 " + nf(totalMail) + "통";
  $("legend").innerHTML = DATA.categories.map(c =>
    `<div class="row"><span class="dot" style="background:${c.c}"></span>${c.label}<b>${Math.round(c.v / totalMail * 100)}%</b></div>`
  ).join("");

  /* ── 정리한 메일 내역 ── */
  const cleanedMax = Math.max(...DATA.cleaned.map(c => c.v));
  $("cleaned-total").textContent = "합계 " + nf(DATA.cleaned.reduce((s, c) => s + c.v, 0)) + "통";
  $("cleaned").innerHTML = DATA.cleaned.map(c =>
    `<li>
       <div class="l1"><span>${c.label}</span><b>${nf(c.v)}통</b></div>
       <div class="meter"><i style="width:${(c.v / cleanedMax * 100).toFixed(1)}%"></i></div>
     </li>`
  ).join("");

  /* ── 할 일 (localStorage) ── */
  const KEY = "weekly-dashboard-tasks-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }

  const taskList = $("tasks");
  function renderTasks() {
    taskList.innerHTML = DATA.tasks.map(t => {
      const done = !!saved[t.id];
      return `<li data-id="${t.id}" class="${done ? "done" : ""}" role="checkbox" aria-checked="${done}" tabindex="0">
        <span class="box">${done ? "✓" : ""}</span>
        <span><div class="tt">${t.t}</div><div class="dd">${t.d}</div></span>
      </li>`;
    }).join("");
    const doneCount = DATA.tasks.filter(t => saved[t.id]).length;
    $("todo-progress").textContent = `${doneCount} / ${DATA.tasks.length} 완료`;
    $("todoBar").style.width = (doneCount / DATA.tasks.length * 100) + "%";
  }
  function toggle(id) {
    saved[id] = !saved[id];
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    renderTasks();
  }
  taskList.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (li) toggle(li.dataset.id);
  });
  taskList.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const li = e.target.closest("li");
    if (li) { e.preventDefault(); toggle(li.dataset.id); }
  });
  renderTasks();

  /* ── 탭 이동 ── */
  const views = { summary: $("view-summary"), mail: $("view-mail"), todo: $("view-todo"), ledger: $("view-ledger") };
  function show(name) {
    if (!views[name]) return;
    Object.keys(views).forEach(k => views[k].classList.toggle("hide", k !== name));
    document.querySelectorAll(".tab").forEach(b => {
      const on = b.dataset.v === name;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    if (name === "ledger") { try { lgOnShow(); } catch (e) { console.warn("ledger", e); } }
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => show(b.dataset.v)));
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); show(b.dataset.v);
  }));

  /* 첫 화면: 연결 링크로 들어왔으면 가계부, 아니면 주소 뒤 #mail · #todo · #ledger */
  const startTab = (location.hash || "").replace("#", "");
  show(views[pendingTab] ? pendingTab : views[startTab] ? startTab : "summary");
  pendingTab = "";
  window.addEventListener("hashchange", () => {
    const name = (location.hash || "").replace("#", "");
    if (views[name]) show(name);
  });

  /* ── 잠금 버튼 ── */
  $("lockBtn").addEventListener("click", () => {
    try { sessionStorage.removeItem(SKEY); } catch (e) {}
    location.hash = "";
    location.reload();
  });

  /* ── 가계부 준비(가계부 오류가 다른 탭을 막지 않도록 감싼다) ── */
  try { lgInit(); } catch (e) { console.warn("ledger init", e); }
}

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
function lgReady() { const a = lgApi(); return !!(a && a.isConfigured()); }
function lgErrMessage(e) {
  if (!e) return "알 수 없는 오류가 났어요.";
  if (e.status === 401 || e.status === 403) return "Supabase가 요청을 거부했어요. 연결 설정에서 key를 확인해 주세요.";
  if (e.status === 404) return "ledger_entries 표를 찾지 못했어요. Supabase에 표가 있는지 확인해 주세요.";
  if (e.status === 400) return "저장 형식이 맞지 않아요. " + (e.message || "") ;
  return e.message || "연결하지 못했어요.";
}

/* ── 연결 상태에 따라 화면을 바꿉니다 ── */
function lgApplyConfigState() {
  const on = lgReady();
  $("ledger-setup").classList.toggle("hide", on);
  $("ledger-body").classList.toggle("hide", !on);
  $("entry-add").classList.toggle("hide", !on);
  $("entry-add-top").classList.toggle("hide", !on);
}

function lgInit() {
  if (!LG.bound) { lgBind(); LG.bound = true; }
  if (!LG.month) LG.month = lgMonthKey(new Date());
  $("month").value = LG.month;
  if (!lgApi() && !$("setup-err").textContent) {
    $("setup-err").textContent = "가계부 모듈을 불러오지 못했어요. 새로고침해 주세요.";
  }
  lgApplyConfigState();
  if (lgReady()) lgLoad();
}

function lgOnShow() {
  if (!LG.month) LG.month = lgMonthKey(new Date());
  lgApplyConfigState();
  if (lgReady()) lgLoad();
}

/* ── 불러오기 ── */
async function lgLoad() {
  const api = lgApi();
  if (!api) { lgListMessage("가계부 모듈을 불러오지 못했어요. 새로고침해 주세요.", true); return; }
  if (!api.isConfigured()) { lgApplyConfigState(); return; }
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
  if (!lgReady()) { toast("먼저 Supabase 연결을 해 주세요"); return; }
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
  if (!api || !api.isConfigured()) { lgEntryErr("연결 설정을 먼저 해 주세요."); return; }

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

/* ── 연결 설정 ── */
function lgOpenCfg() {
  const api = lgApi();
  if (!api) { toast("가계부 모듈을 불러오지 못했어요"); return; }
  const cfg = api.getConfig();
  $("cfg-url").value = cfg ? cfg.url : "";
  $("cfg-key").value = "";
  $("cfg-err").textContent = "";
  $("cfg-state").textContent = cfg
    ? "이 기기에만 저장된 접속 정보입니다. key를 바꿀 때만 새 key를 넣어 주세요."
    : "아직 연결되지 않았어요.";
  lgOpenModal("cfg-modal");
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

  /* 연결 설정 */
  $("cfg-open").addEventListener("click", lgOpenCfg);
  $("cfg-close").addEventListener("click", () => lgCloseModal("cfg-modal"));
  $("cfg-form").addEventListener("submit", e => {
    e.preventDefault();
    const api = lgApi();
    if (!api) return;
    const cur = api.getConfig();
    const key = $("cfg-key").value.trim() || (cur ? cur.key : "");
    if (!key) { $("cfg-err").textContent = "key를 넣어 주세요."; return; }
    try {
      api.setConfig({ url: $("cfg-url").value.trim(), key: key });
      lgCloseModal("cfg-modal");
      toast("연결 설정을 저장했어요");
      if (!LG.month) LG.month = lgMonthKey(new Date());
      lgApplyConfigState();
      lgLoad();
    } catch (err) {
      $("cfg-err").textContent = err.message;
    }
  });
  $("cfg-clear").addEventListener("click", () => {
    const api = lgApi();
    if (!api) return;
    api.clearConfig();
    lgCloseModal("cfg-modal");
    toast("연결을 해제했어요");
    lgApplyConfigState();
  });

  /* 연결 전 설정 폼 */
  $("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const api = lgApi();
    $("setup-err").textContent = "";
    if (!api) { $("setup-err").textContent = "가계부 모듈을 불러오지 못했어요. 새로고침해 주세요."; return; }
    try {
      api.setConfig({ url: $("setup-url").value.trim(), key: $("setup-key").value.trim() });
      $("setup-url").value = "";
      $("setup-key").value = "";
      LG.month = lgMonthKey(new Date());
      $("month").value = LG.month;
      toast("연결됐어요");
      lgApplyConfigState();
      lgLoad();
    } catch (err) {
      $("setup-err").textContent = err.message;
    }
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

/* ── 연결 링크(#sb=…): 접속 정보를 이 기기에 저장하고 주소창에서 지웁니다 ── */
function lgConnectFromHash() {
  const hash = location.hash || "";
  if (hash.indexOf("#sb=") !== 0) return false;
  let ok = false;
  let note = "";
  try {
    const json = new TextDecoder().decode(b64UrlToBytes(hash.slice(4)));
    const cfg = JSON.parse(json);
    if (!window.LedgerAPI) throw new Error("module missing");
    window.LedgerAPI.setConfig({ url: cfg && cfg.url, key: cfg && cfg.key });
    ok = true;
    note = "가계부 연결 정보를 이 기기에 저장했어요.";
  } catch (e) {
    note = "연결 링크를 읽지 못했어요. 링크를 다시 확인해 주세요.";
  }
  /* 링크에 담긴 key가 주소창·방문 기록에 남지 않게 바로 지웁니다. */
  try { history.replaceState(null, "", location.pathname + location.search); }
  catch (e) { try { location.hash = ""; } catch (_) {} }

  if (ok) {
    const tab = document.querySelector('.tab[data-v="ledger"]');
    if (tab && !appEl.hidden) setTimeout(() => { tab.click(); }, 0);
    else pendingTab = "ledger";
  }
  if (!appEl.hidden) toast(note);
  else pendingNotice = note;
  return true;
}

lgConnectFromHash();
/* 앱을 켜 둔 채 링크를 눌러 해시만 바뀐 경우에도 같게 처리합니다. */
window.addEventListener("hashchange", lgConnectFromHash);

/* ── 시작: 이 탭에서 이미 열었다면 바로, 아니면 잠금 화면 ── */
(async function init() {
  let raw = null;
  try { raw = sessionStorage.getItem(SKEY); } catch (e) {}
  if (raw) {
    try {
      const key = await crypto.subtle.importKey("raw", b64ToBytes(raw), "AES-GCM", true, ["decrypt"]);
      boot(await decryptWith(key));
      return;
    } catch (e) {
      try { sessionStorage.removeItem(SKEY); } catch (_) {}
    }
  }
  document.body.classList.add("locked");
  $("pw").focus();
})();
