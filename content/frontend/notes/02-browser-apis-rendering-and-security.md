# Browser APIs, Rendering & Frontend Security

A companion to *Web Platform Fundamentals*: the observer APIs, offline and real-time capabilities, how the browser turns code into pixels, and the headers that keep a frontend safe.

---

## 1. Observer APIs

| API | Watches | Typical uses |
|---|---|---|
| `IntersectionObserver` | element visibility relative to a root | lazy images, infinite scroll, analytics impressions, scroll-spy |
| `ResizeObserver` | element size changes | responsive components, charts that redraw, container-query fallbacks |
| `MutationObserver` | DOM changes (children, attributes, text) | reacting to third-party DOM changes; use sparingly, it can be expensive |
| `PerformanceObserver` | performance entries | real user monitoring of LCP, CLS, INP, long tasks |

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.src = e.target.dataset.src; io.unobserve(e.target); }
}, { rootMargin: '200px' });
document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img));

new PerformanceObserver((list) => {
  const last = list.getEntries().at(-1);
  sendToAnalytics('LCP', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

Observers beat scroll/resize listeners because the browser batches the work off the critical path. (The `web-vitals` library wraps PerformanceObserver correctly.)

> **Asked as:** "How would you implement infinite scroll efficiently?" · "How do you measure Core Web Vitals in production?"

---

## 2. Modern web APIs

| API | What it gives you | Notes |
|---|---|---|
| **Service Worker** | a programmable network proxy | offline support, caching strategies (cache-first for assets, network-first for HTML/API, stale-while-revalidate), background sync, push notifications. HTTPS only |
| **Web Workers** | real threads for JS | move parsing/crypto/image work off the main thread; communicate via `postMessage`; **transferable objects** (ArrayBuffer) move without copying; `comlink` makes it feel like RPC. Shared workers are shared across tabs |
| **IndexedDB** | transactional object store in the browser | large structured data, offline queues; use a wrapper (`idb`, Dexie) |
| **WebSockets** | full-duplex connection | chat, live dashboards; plan reconnection with backoff and heartbeats; Socket.IO adds rooms and fallbacks |
| **Server-Sent Events** | one-way server → client stream over HTTP | notifications, progress, LLM token streams; auto-reconnect built in |
| **WebRTC** | peer-to-peer audio, video and data channels | needs signalling (your server), STUN for NAT traversal, TURN relays as fallback |

---

## 3. How the browser renders

### 3.1 Critical rendering path

HTML → **DOM**; CSS → **CSSOM**; DOM + CSSOM → **render tree** → **layout** (geometry) → **paint** (pixels into layers) → **composite** (GPU assembles layers).

- CSS is render-blocking; synchronous `<script>` is parser-blocking. Use `defer`/`async`/`type="module"`, inline critical CSS, preload key resources (`<link rel="preload">`), and `fetchpriority="high"` for the LCP image.

### 3.2 Reflow vs repaint

| | Triggered by | Cost |
|---|---|---|
| **Reflow (layout)** | size/position changes, adding nodes, reading layout after writing (`offsetHeight`, `getBoundingClientRect`) | high: can cascade through the tree |
| **Repaint** | colour, visibility, background changes | medium |
| **Composite only** | `transform`, `opacity` on a promoted layer | low: GPU only |

Avoid **layout thrashing** (interleaved reads and writes in a loop): batch reads, then writes, or use `requestAnimationFrame`. Animate `transform` and `opacity`; use `will-change` sparingly as a hint for elements about to animate (each layer costs memory).

### 3.3 Debugging rendering

DevTools Performance panel (long tasks, forced reflow warnings), **Rendering → Paint flashing** and **Layer borders**, and the Layers panel to see what got promoted.

> **Asked as:** "Walk me through what happens between typing a URL and seeing the page." · "What's the difference between reflow and repaint?" · "Why animate transform instead of top/left?"

---

## 4. Frontend security headers and patterns

| Mechanism | Protects against | Example |
|---|---|---|
| **Content Security Policy** | XSS, data exfiltration | `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; object-src 'none'; frame-ancestors 'none'` |
| **Nonces / hashes** | allow specific inline scripts without `'unsafe-inline'` | server generates a fresh nonce per response |
| **HTTPS + HSTS** | downgrade and cookie theft | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| **Upgrade-Insecure-Requests** | mixed content | upgrades `http://` subresources to HTTPS |
| **X-Frame-Options / frame-ancestors** | clickjacking | `frame-ancestors 'self'` (the CSP directive supersedes XFO) |
| **iframe `sandbox`** | untrusted embedded content | `<iframe sandbox="allow-scripts" src=...>` |
| **postMessage origin checks** | cross-origin message spoofing | always check `event.origin` and send with an explicit `targetOrigin` |
| **Subresource Integrity** | tampered CDN files | `<script src="https://cdn/x.js" integrity="sha384-..." crossorigin="anonymous">` with a self-hosted fallback |
| **X-Content-Type-Options: nosniff** | MIME sniffing attacks | forces the declared content type |

React escapes text by default; the dangerous paths are `dangerouslySetInnerHTML`, `href="javascript:..."` from user input, and third-party scripts. Sanitise any HTML with DOMPurify, keep tokens in `HttpOnly; Secure; SameSite` cookies where possible, and treat frontend authorisation (hiding buttons) as UX only. The server must enforce it.
