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

/* 이 탭 세션 동안만 쓰는 열쇠(비밀번호 아님). 탭을 닫으면 사라집니다. */
const SKEY = "weekly-dashboard-session-key-v2";

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
  const views = { summary: $("view-summary"), mail: $("view-mail"), todo: $("view-todo") };
  function show(name) {
    if (!views[name]) return;
    Object.keys(views).forEach(k => views[k].classList.toggle("hide", k !== name));
    document.querySelectorAll(".tab").forEach(b => {
      const on = b.dataset.v === name;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => show(b.dataset.v)));
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault(); show(b.dataset.v);
  }));

  /* 첫 화면: 주소 뒤 #mail · #todo 로 바로 열 수 있음 */
  const startTab = (location.hash || "").replace("#", "");
  show(views[startTab] ? startTab : "summary");
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
