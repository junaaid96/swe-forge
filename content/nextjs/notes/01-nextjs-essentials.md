# Next.js Essentials

Next.js is a React framework that adds routing, server rendering, data fetching, bundling and deployment conventions. Interviews focus on **rendering strategies** (when HTML is produced), the **App Router** with React Server Components, and how caching and data fetching fit together.

---

## 1. Two routers

| | Pages Router (`pages/`) | App Router (`app/`) |
|---|---|---|
| Since | Next 9 | Next 13.4 (stable), default today |
| Components | Client components everywhere | **Server Components by default** |
| Data fetching | `getStaticProps`, `getServerSideProps`, `getStaticPaths` | `async` components + `fetch` with cache options |
| Layouts | `_app.js`, `_document.js` | nested `layout.tsx` files |
| API | `pages/api/*.ts` | `route.ts` route handlers |

Both can live in one project during a migration; routes in `app/` win when paths collide.

> **Asked as:** "Pages Router vs App Router?" · "How would you migrate an app to the App Router?"

---

## 2. File-based routing

```
app/
├── layout.tsx            → root layout (required: <html>, <body>)
├── page.tsx              → /
├── blog/
│   ├── page.tsx          → /blog
│   └── [slug]/page.tsx   → /blog/:slug     (dynamic segment)
├── docs/[...path]/page.tsx  → /docs/a/b/c  (catch-all)
├── (marketing)/about/page.tsx → /about     (route group: no URL segment)
├── loading.tsx           → instant loading UI (Suspense boundary)
├── error.tsx             → error boundary ('use client')
└── api/health/route.ts   → GET /api/health
```

`<Link href="/blog">` does client-side navigation with automatic prefetching of visible links; `router.push` / `router.replace` (from `next/navigation`) navigate programmatically.

---

## 3. Rendering strategies

| Strategy | HTML produced | Use when |
|---|---|---|
| **SSG** (static) | at build time | marketing pages, docs, blogs |
| **ISR** | at build, then regenerated in the background after `revalidate` seconds or on demand | catalogue pages, content that changes occasionally |
| **SSR** (dynamic) | on every request | per-user pages, request-time data (cookies, headers) |
| **CSR** | in the browser after JS loads | highly interactive dashboards behind login |
| **Streaming** | server sends HTML in chunks as Suspense boundaries resolve | slow data sources; show the shell immediately |

Pages Router equivalents:

```tsx
export async function getStaticProps() {            // SSG / ISR
  const posts = await getPosts();
  return { props: { posts }, revalidate: 60 };      // ISR: refresh at most once a minute
}
export async function getServerSideProps({ req }) { // SSR
  return { props: { user: await getUser(req) } };
}
export async function getStaticPaths() {            // which dynamic pages to prebuild
  return { paths: [{ params: { slug: 'hello' } }], fallback: 'blocking' };
}
```

App Router equivalents:

```tsx
// app/blog/[slug]/page.tsx — a Server Component
export const revalidate = 60;                        // ISR for this route
export async function generateStaticParams() {       // replaces getStaticPaths
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetch(`${API}/posts/${slug}`, { next: { revalidate: 60, tags: ['posts'] } }).then((r) => r.json());
  return <article>{post.title}</article>;
}
// elsewhere, after a CMS webhook:  revalidateTag('posts')  or  revalidatePath('/blog')
```

> **Asked as:** "SSR vs SSG vs ISR, and when do you pick each?" · "How does ISR work?" · "What makes a route dynamic?"

---

## 4. Server and Client Components

**Server Components** run only on the server: they can be `async`, read databases or secrets directly, and send **no JavaScript** to the browser. **Client Components** start with `'use client'` and are needed for state, effects, event handlers and browser APIs.

```tsx
// app/products/page.tsx (server)
import AddToCart from './AddToCart';
export default async function Products() {
  const products = await db.product.findMany();      // direct DB access, never shipped to the client
  return products.map((p) => <div key={p.id}>{p.name} <AddToCart id={p.id} /></div>);
}

// app/products/AddToCart.tsx (client)
'use client';
export default function AddToCart({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return <button disabled={busy} onClick={() => { setBusy(true); addToCart(id); }}>Add</button>;
}
```

Rules of thumb: keep the `'use client'` boundary as low in the tree as possible; props crossing the boundary must be serialisable; a client component can render server components passed as `children`.

**Server Actions** (`'use server'` functions) handle form submissions and mutations without hand-written API routes; validate input and check auth inside them, since they are public endpoints.

---

## 5. Layouts, loading and errors

- `layout.tsx` wraps child routes and **persists across navigation** (state is kept). Use `template.tsx` if you need a fresh instance each time.
- `loading.tsx` becomes a Suspense fallback for the segment, so navigation feels instant.
- `error.tsx` is a client error boundary for the segment; `not-found.tsx` handles `notFound()`.
- Metadata: export `metadata` or `generateMetadata()` for titles, Open Graph tags, etc.

---

## 6. Route handlers and middleware

```ts
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await listUsers();
  return Response.json(users);
}
export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(await createUser(body), { status: 201 });
}
```

`middleware.ts` at the project root runs **before** routing, at the edge, for every matched request: auth redirects, A/B rewrites, geolocation, headers. Keep it light; no heavy Node APIs or DB calls.

```ts
export function middleware(req: NextRequest) {
  if (!req.cookies.get('session')) return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/dashboard/:path*'] };
```

---

## 7. Environment, optimisation and deployment

| Topic | Key facts |
|---|---|
| Env vars | `.env.local` for secrets; only `NEXT_PUBLIC_*` reaches the browser, and it is inlined **at build time** |
| Images | `next/image`: lazy loading, responsive `srcset`, AVIF/WebP, prevents CLS; `priority` for the LCP image |
| Fonts | `next/font` self-hosts fonts with zero layout shift |
| Code splitting | automatic per route; `dynamic(() => import('./Chart'), { ssr: false })` for heavy client-only widgets |
| Bundle analysis | `@next/bundle-analyzer` |
| Static export | `output: 'export'` produces plain HTML/CSS/JS: no SSR, ISR, middleware, route handlers with dynamic behaviour, or image optimisation |
| `_document` / `_app` | Pages Router only: custom HTML shell / global layout and state. The App Router replaces both with the root `layout.tsx` |

> **Asked as:** "How do you improve LCP in a Next.js app?" · "Why can't I read process.env.SECRET in a client component?" · "What breaks with static export?"

---

## 8. Common pitfalls

- Marking a whole page `'use client'` and losing server rendering benefits.
- Fetching the same data in many components without understanding request memoisation and caching; use `cache()` or a shared data function.
- Reading cookies or headers in a component makes the whole route dynamic; know which APIs opt you out of static rendering.
- Hydration mismatches from `Date.now()`, `Math.random()` or `window` checks during render.
- Treating Server Actions as private: they are callable endpoints, so authorise every one.
