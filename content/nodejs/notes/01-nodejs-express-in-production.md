# Node.js & Express in Production

Node is a single-threaded JavaScript runtime built around an event loop and non-blocking I/O. It is excellent for I/O-heavy services (APIs, gateways, real-time apps) and poor at long CPU-bound work unless you move that work off the main thread. This guide covers the parts interviews probe: the runtime model, Express request pipelines, streams, scaling across cores, and what "production-ready" means.

---

## 1. The runtime model

### 1.1 Event loop phases

libuv runs the loop. Each iteration walks through phases; between every callback Node drains the **microtask queues** (`process.nextTick` first, then promise reactions).

| Phase | Runs |
|---|---|
| timers | `setTimeout` / `setInterval` callbacks whose time has come |
| pending callbacks | some deferred system errors (e.g. TCP `ECONNREFUSED`) |
| poll | new I/O events; blocks here waiting for I/O if nothing else is queued |
| check | `setImmediate` callbacks |
| close callbacks | `socket.on('close')` and friends |

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// sync → nextTick → promise → (timeout | immediate: order depends on loop entry)
// Inside an I/O callback, setImmediate always runs before setTimeout(0).
```

> **Asked as:** "Explain the Node event loop." · "nextTick vs setImmediate vs setTimeout(0)?" · "Why is Node fast if it's single-threaded?"

### 1.2 Blocking vs non-blocking

The main thread runs your JavaScript; libuv's thread pool (default 4 threads, `UV_THREADPOOL_SIZE`) handles file system, DNS lookup, crypto and zlib. Anything synchronous and slow on the main thread (a big `JSON.parse`, a tight loop, `fs.readFileSync` in a handler, a catastrophic regex) blocks **every** request.

```js
// ❌ blocks the loop for every concurrent request
app.get('/report', (req, res) => res.send(fs.readFileSync('big.csv')));

// ✅ stream it; the loop stays free
app.get('/report', (req, res) => fs.createReadStream('big.csv').pipe(res));
```

Detect blocking with `--cpu-prof`, `clinic doctor`, or `monitorEventLoopDelay()` from `perf_hooks`.

---

## 2. Express request pipeline

### 2.1 Middleware order and `next()`

Express runs middleware in registration order. Each one either ends the response or calls `next()`.

| Call | Effect |
|---|---|
| `next()` | continue to the next matching middleware/route |
| `next('route')` | skip the remaining handlers of the *current route* |
| `next(err)` | jump straight to error-handling middleware |
| not calling anything | the request hangs (a classic bug) |

```js
const app = express();
app.use(helmet());                         // security headers first
app.use(express.json({ limit: '1mb' }));   // body parsing
app.use(requestId);                        // correlation id for logs
app.use('/api/users', usersRouter);        // feature routers
app.use(notFound);                         // 404 after all routes
app.use(errorHandler);                     // error middleware LAST
```

### 2.2 Router-level middleware

`express.Router()` groups routes by feature and lets you attach middleware to just that group.

```js
// users/users.router.js
const router = express.Router();
router.use(requireAuth);                       // only for /api/users/*
router.get('/:id', validate(idSchema), getUser);
router.patch('/:id', requireRole('admin'), updateUser);
export default router;
```

### 2.3 Error-handling middleware

It is recognised by **four parameters** and must be registered after the routes. Express 5 forwards rejected promises from async handlers automatically; on Express 4 wrap handlers (or use `express-async-errors`).

```js
// Express 4 helper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  req.log.error({ err, requestId: req.id }, 'request failed');
  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : err.message,
    requestId: req.id,
  });
}
```

> **Asked as:** "How does Express error handling work?" · "What happens if an async route throws?" · "Why must the error handler have 4 args?"

### 2.4 Static files and templates

`express.static('public', { maxAge: '1y', immutable: true })` serves files with caching headers; put it before dynamic routes. Server-side rendering with a view engine (EJS, Pug, Handlebars) uses `app.set('view engine', 'ejs')` and `res.render('page', data)`. In most modern stacks a CDN serves static assets and Express only serves the API.

---

## 3. Streams and Buffers

### 3.1 Four stream types

| Type | Example |
|---|---|
| Readable | `fs.createReadStream`, `req` on the server |
| Writable | `fs.createWriteStream`, `res` on the server |
| Duplex | TCP socket |
| Transform | `zlib.createGzip()`, CSV parser |

```js
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

await pipeline(
  fs.createReadStream('access.log'),
  createGzip(),
  fs.createWriteStream('access.log.gz'),
); // handles errors and cleanup on every stream, unlike .pipe()
```

### 3.2 Backpressure

When a writable can't keep up, `write()` returns `false`; the producer should pause until `'drain'`. `pipe()`/`pipeline()` do this for you. Ignoring it buffers everything in memory, which is how upload services run out of RAM.

### 3.3 Buffer

`Buffer` is a fixed-size chunk of raw bytes (a `Uint8Array` subclass) outside the V8 heap. Use it for binary protocols, file uploads and hashing.

```js
const b = Buffer.from('héllo', 'utf8');
b.length;               // 6 bytes, not 5 characters
b.toString('base64');   // 'aMOpbGxv'
Buffer.alloc(16);       // zero-filled; Buffer.allocUnsafe is faster but may hold old memory
```

---

## 4. Using more than one core

### 4.1 child_process

| API | Use |
|---|---|
| `spawn(cmd, args)` | stream output of a long-running command |
| `exec(cmd)` | run a shell command, buffer output (never with user input: command injection) |
| `execFile(file, args)` | like exec without a shell; safer |
| `fork(module)` | spawn another Node process with an IPC channel (`process.send`) |

### 4.2 worker_threads

For CPU-bound work inside one process (image resizing, parsing, crypto), use workers; they share memory via `SharedArrayBuffer` and transfer `ArrayBuffer`s without copying. Pools such as `piscina` manage them.

### 4.3 cluster and PM2

`cluster` forks one worker process per core, all sharing the same server port; the primary distributes connections. In practice **PM2** (`pm2 start app.js -i max`) or the container orchestrator does this, plus restarts on crash, log management and zero-downtime reloads (`pm2 reload`). On Kubernetes, prefer one process per container and scale with replicas.

### 4.4 Native addons

C/C++ addons via **Node-API (N-API)** give an ABI-stable interface across Node versions. Reach for them only for existing native libraries or hot paths that JS can't handle; WebAssembly is often the simpler alternative.

> **Asked as:** "How do you handle CPU-intensive tasks in Node?" · "cluster vs worker_threads?" · "What does PM2 give you?"

---

## 5. Production readiness checklist

### 5.1 Security

```js
app.use(helmet());                                    // CSP, HSTS, X-Content-Type-Options…
app.use(rateLimit({ windowMs: 60_000, limit: 100 })); // express-rate-limit
app.use(cors({ origin: ['https://app.example.com'], credentials: true }));
const body = userSchema.parse(req.body);              // zod / joi / yup validation
await db.query('SELECT * FROM users WHERE email = $1', [email]); // parameterised
```

Also: keep dependencies patched (`npm audit`, Dependabot), never `eval` user input, and set `app.disable('x-powered-by')` (helmet does it).

### 5.2 Logging

Use structured JSON logs (**Pino** is fastest; Winston and Bunyan are alternatives) with levels, a request id on every line, and no secrets or PII. Ship stdout to your log platform instead of writing files and rotating them in-process.

```js
import pino from 'pino';
import pinoHttp from 'pino-http';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization'] });
app.use(pinoHttp({ logger }));
```

### 5.3 Memory leaks

Common causes: unbounded in-memory caches or maps, listeners added per request and never removed, closures capturing large objects, timers never cleared. Diagnose with `node --inspect` → Chrome DevTools heap snapshots (compare two snapshots), `--heapsnapshot-signal`, and by watching RSS/heap in metrics.

### 5.4 Graceful shutdown and health checks

```js
const server = app.listen(port);
app.get('/healthz', (_req, res) => res.send('ok'));        // liveness
app.get('/readyz', async (_req, res) => (await db.ping()) ? res.send('ok') : res.sendStatus(503));

process.on('SIGTERM', () => {
  server.close(async () => {          // stop accepting, finish in-flight requests
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // hard deadline
});
```

### 5.5 Tooling

`node --watch` or nodemon in development, PM2 or the platform's process manager in production, `NODE_ENV=production`, and `--enable-source-maps` for readable stack traces from TypeScript builds.

---

## 6. Quick comparison

| Question | Short answer |
|---|---|
| Why Node for APIs? | Cheap concurrency for I/O; one language across the stack |
| When not Node? | Heavy CPU work per request without workers; strict latency on compute |
| Express vs Fastify vs NestJS | Express: minimal and ubiquitous. Fastify: faster, schema-first. NestJS: opinionated DI and modules, Angular-like |
| `require` vs `import` | CommonJS (sync, dynamic) vs ES modules (static, async loading, top-level await) |
