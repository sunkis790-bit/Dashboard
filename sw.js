/* 가계부 오프라인 캐시 */
const CACHE = "ledger-dashboard-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=9",
  "./app.js?v=9",
  "./ledger-api.js?v=9",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      // HTTP 캐시에 남은 예전 사본이 아니라 서버의 최신 파일을 담습니다.
      .then(cache => Promise.all(
        ASSETS.map(url => fetch(new Request(url, { cache: "reload" }))
          .then(res => (res && res.ok ? cache.put(url, res) : null))
          .catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Supabase(다른 출처) 요청은 캐시하지 않습니다.
  if (url.origin !== location.origin) return;

  // 항상 네트워크의 최신 파일을 먼저 시도하고, 실패하면 캐시로 표시합니다.
  // (예전 캐시가 남아 있어도 새 버전이 바로 반영됩니다.)
  const fresh = new Request(req, { cache: "reload" });

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(fresh)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(fresh)
      .then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
