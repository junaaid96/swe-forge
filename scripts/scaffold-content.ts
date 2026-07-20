/**
 * Creates content/manifest.json + 23 topic folders with Interview/Deep placeholders.
 * Run: npx tsx scripts/scaffold-content.ts
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');

const INTERVIEW_LEVELS = ['basics', 'medium', 'advanced', 'company-specific'] as const;
const DEEP_TRACKS = [
  'theory',
  'internals',
  'best-practices',
  'real-world-projects',
  'performance',
  'pitfalls',
] as const;

interface TopicDef {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  order: number;
  tag: string;
  accent: string;
  relatedTopics: string[];
  interviewStubs: Record<(typeof INTERVIEW_LEVELS)[number], string[]>;
  deepStubs: Record<(typeof DEEP_TRACKS)[number], string[]>;
}

const TOPICS: TopicDef[] = [
  {
    id: 'software-engineering',
    slug: 'software-engineering',
    title: 'Software Engineering',
    emoji: '🛠️',
    order: 1,
    tag: 'Best practices hub',
    accent: '#0D9488',
    relatedTopics: ['low-level-design', 'testing-quality', 'git-collaboration', 'devops-cloud'],
    interviewStubs: {
      basics: [
        'What are the main phases of the SDLC?',
        'Explain DRY, KISS, and YAGNI with examples.',
        'What does “done” mean vs “works on my machine”?',
      ],
      medium: [
        'Explain all five SOLID principles with examples.',
        'What belongs in a Definition of Done?',
        'How should you give and receive code review feedback?',
      ],
      advanced: [
        'How do you triage technical debt?',
        'What quality gates belong in a CI pipeline?',
        'What guardrails apply when using AI-assisted coding?',
      ],
      'company-specific': [
        'What are the four DORA metrics?',
        'Why do strong teams prefer small PRs?',
        'How do design docs / ADRs show ownership?',
      ],
    },
    deepStubs: {
      theory: ['Software process models', 'Agile values and Lean', 'Build-Measure-Learn'],
      internals: ['Quality gate pipeline', 'Cyclomatic complexity', 'Coupling and cohesion metrics'],
      'best-practices': [
        'Clean code checklist',
        'Code review checklist',
        'ADRs and docs-as-code',
        'Trunk-based vs GitFlow',
      ],
      'real-world-projects': [
        'Sample ADR set',
        'Sample Definition of Done',
        'Feature ticket → production walkthrough',
      ],
      performance: ['DORA delivery performance', 'Fast feedback loops', 'Small batches and WIP limits'],
      pitfalls: [
        'Over-engineering',
        'Cargo-cult Agile',
        'Huge PRs',
        'Premature microservices',
        'Ignoring security until late',
      ],
    },
  },
  {
    id: 'java',
    slug: 'java',
    title: 'Java',
    emoji: '☕',
    order: 2,
    tag: 'Language',
    accent: '#EA580C',
    relatedTopics: ['spring-boot', 'backend', 'cs-fundamentals', 'dsa'],
    interviewStubs: {
      basics: ['What is the JVM / JDK / JRE?', 'Explain String vs StringBuilder.', 'What is autoboxing?'],
      medium: ['equals vs == and hashCode contract', 'Checked vs unchecked exceptions', 'Collections hierarchy'],
      advanced: ['JVM memory model and GC basics', 'Concurrency and ExecutorService', 'Generics and PECS'],
      'company-specific': ['Common Java interview traps', 'Implications of immutability in interviews'],
    },
    deepStubs: {
      theory: ['Java type system overview', 'OOP model in Java'],
      internals: ['JVM architecture', 'Garbage collection', 'Class loading'],
      'best-practices': ['Effective Java highlights', 'Null safety habits'],
      'real-world-projects': ['Building a small CLI or library'],
      performance: ['Allocation and GC pressure', 'Collections performance'],
      pitfalls: ['Mutable shared state', 'Equals/hashCode bugs', 'Resource leaks'],
    },
  },
  {
    id: 'spring-boot',
    slug: 'spring-boot',
    title: 'Spring Boot',
    emoji: '🌱',
    order: 3,
    tag: 'Framework',
    accent: '#16A34A',
    relatedTopics: ['java', 'backend', 'database', 'security'],
    interviewStubs: {
      basics: ['What is a Spring Boot starter?', 'Explain dependency injection.', 'What is Actuator?'],
      medium: ['Profiles and configuration', 'Spring Data JPA basics', 'Security filter chain overview'],
      advanced: ['Transactions and @Transactional', 'Caching and async', 'Messaging with Kafka/Rabbit'],
      'company-specific': ['Production Spring Boot checklist', 'Common Spring Boot interview scenarios'],
    },
    deepStubs: {
      theory: ['IoC and Spring container', 'Auto-configuration'],
      internals: ['Bean lifecycle', 'AOP and proxies', 'Auto-config conditions'],
      'best-practices': ['Layered architecture', 'DTO vs entity', 'Config externalization'],
      'real-world-projects': ['CRUD API with JPA and security'],
      performance: ['Connection pooling', 'N+1 queries', 'Caching'],
      pitfalls: ['Field injection', 'Transactional self-invocation', 'Overusing @Autowired'],
    },
  },
  {
    id: 'python',
    slug: 'python',
    title: 'Python',
    emoji: '🐍',
    order: 4,
    tag: 'Language',
    accent: '#2563EB',
    relatedTopics: ['django', 'backend', 'dsa', 'cs-fundamentals'],
    interviewStubs: {
      basics: ['List vs tuple vs set vs dict', 'What are *args and **kwargs?', 'Explain list comprehensions.'],
      medium: ['GIL and concurrency options', 'Decorators and generators', 'Typing and dataclasses'],
      advanced: ['asyncio event loop', 'Packaging and virtualenvs', 'CPython memory model basics'],
      'company-specific': ['Python interview coding patterns', 'When to choose Python vs JVM/Node'],
    },
    deepStubs: {
      theory: ['Python data model', 'Duck typing vs static typing'],
      internals: ['GIL', 'Reference counting and GC', 'Import system'],
      'best-practices': ['PEP 8', 'Virtual environments', 'Type hints'],
      'real-world-projects': ['CLI + package structure'],
      performance: ['Profiling', 'Avoiding needless copies'],
      pitfalls: ['Mutable default arguments', 'Circular imports', 'Blocking the event loop'],
    },
  },
  {
    id: 'django',
    slug: 'django',
    title: 'Django',
    emoji: '🎸',
    order: 5,
    tag: 'Framework',
    accent: '#0F766E',
    relatedTopics: ['python', 'backend', 'database', 'security'],
    interviewStubs: {
      basics: ['MTV architecture', 'What is a Django model?', 'URL routing basics'],
      medium: ['ORM queries and migrations', 'Middleware', 'Auth and permissions'],
      advanced: ['DRF serializers and viewsets', 'Signals and transactions', 'Caching and Celery jobs'],
      'company-specific': ['Scaling Django apps', 'Common Django interview traps'],
    },
    deepStubs: {
      theory: ['Request/response cycle', 'ORM vs raw SQL'],
      internals: ['QuerySet evaluation', 'Middleware stack', 'Settings resolution'],
      'best-practices': ['Fat models vs services', 'Avoiding N+1', 'Secure defaults'],
      'real-world-projects': ['REST API with DRF'],
      performance: ['select_related / prefetch_related', 'Caching layers'],
      pitfalls: ['Blocking views', 'Migration conflicts', 'Overusing signals'],
    },
  },
  {
    id: 'nodejs',
    slug: 'nodejs',
    title: 'Node.js',
    emoji: '🟢',
    order: 6,
    tag: 'Runtime',
    accent: '#15803D',
    relatedTopics: ['backend', 'nextjs', 'frontend', 'api-design'],
    interviewStubs: {
      basics: ['What is the event loop?', 'Blocking vs non-blocking I/O', 'Common modules (fs, http, path)'],
      medium: ['Streams and backpressure', 'Express middleware chain', 'Error-first callbacks vs promises'],
      advanced: ['Worker threads vs clustering', 'Event loop phases', 'Memory leaks in Node'],
      'company-specific': ['Node production checklist', 'When Node is the wrong choice'],
    },
    deepStubs: {
      theory: ['Single-threaded concurrency model', 'libuv overview'],
      internals: ['Event loop phases', 'Thread pool', 'Module resolution'],
      'best-practices': ['Structured error handling', 'Graceful shutdown', 'Env config'],
      'real-world-projects': ['Express REST API'],
      performance: ['Async profiling', 'Connection pooling'],
      pitfalls: ['Unhandled promise rejections', 'Blocking the loop', 'Callback hell'],
    },
  },
  {
    id: 'frontend',
    slug: 'frontend',
    title: 'Frontend',
    emoji: '🎨',
    order: 7,
    tag: 'Web UI',
    accent: '#DB2777',
    relatedTopics: ['react', 'nextjs', 'angular', 'ui-ux'],
    interviewStubs: {
      basics: ['HTML semantic elements', 'CSS box model and layout', 'JS event loop vs call stack'],
      medium: ['TypeScript basics for UI', 'Browser rendering pipeline', 'Accessibility fundamentals'],
      advanced: ['Core Web Vitals', 'Module bundling concepts', 'Client-side state trade-offs'],
      'company-specific': ['Frontend system design prompts', 'Performance budgets in interviews'],
    },
    deepStubs: {
      theory: ['DOM and CSSOM', 'Progressive enhancement'],
      internals: ['Critical rendering path', 'Event loop and microtasks'],
      'best-practices': ['Semantic HTML', 'TypeScript discipline', 'Responsive design'],
      'real-world-projects': ['Accessible multi-page UI'],
      performance: ['Code splitting', 'Image optimization', 'CWV'],
      pitfalls: ['Layout thrashing', 'Ignoring a11y', 'Over-fetching'],
    },
  },
  {
    id: 'react',
    slug: 'react',
    title: 'React',
    emoji: '⚛️',
    order: 8,
    tag: 'Library',
    accent: '#0891B2',
    relatedTopics: ['frontend', 'nextjs', 'testing-quality'],
    interviewStubs: {
      basics: ['What is a component?', 'Props vs state', 'useEffect basics'],
      medium: ['Reconciliation and keys', 'Context vs external store', 'Controlled forms'],
      advanced: ['Concurrent features', 'Memoization pitfalls', 'Suspense and data fetching patterns'],
      'company-specific': ['Common React interview coding tasks', 'Performance debugging stories'],
    },
    deepStubs: {
      theory: ['Virtual DOM mental model', 'Unidirectional data flow'],
      internals: ['Fiber and reconciliation', 'Hooks rules and ordering'],
      'best-practices': ['Composition over inheritance', 'Colocate state', 'Testing components'],
      'real-world-projects': ['CRUD UI with remote API'],
      performance: ['Avoiding unnecessary renders', 'List virtualization'],
      pitfalls: ['Effect dependency bugs', 'Prop drilling excess', 'Stale closures'],
    },
  },
  {
    id: 'nextjs',
    slug: 'nextjs',
    title: 'Next.js',
    emoji: '▲',
    order: 9,
    tag: 'Framework',
    accent: '#111827',
    relatedTopics: ['react', 'frontend', 'nodejs', 'devops-cloud'],
    interviewStubs: {
      basics: ['App Router vs Pages Router', 'What is SSR / SSG / ISR?', 'File-based routing'],
      medium: ['Server Components vs Client Components', 'Data fetching and caching', 'Route handlers / API routes'],
      advanced: ['Caching and revalidation model', 'Middleware', 'Deployment and edge runtimes'],
      'company-specific': ['Next.js production checklist', 'When RSC helps or hurts'],
    },
    deepStubs: {
      theory: ['Rendering strategies', 'Full-stack React mental model'],
      internals: ['App Router caching', 'RSC payload'],
      'best-practices': ['Server-first by default', 'Env and secrets', 'Image and font optimization'],
      'real-world-projects': ['Auth + dashboard app'],
      performance: ['Streaming', 'Partial prerendering concepts'],
      pitfalls: ['Leaking secrets to client', 'Overusing client components', 'Cache stampede'],
    },
  },
  {
    id: 'angular',
    slug: 'angular',
    title: 'Angular',
    emoji: '🅰️',
    order: 10,
    tag: 'Framework',
    accent: '#DC2626',
    relatedTopics: ['frontend', 'ui-ux', 'testing-quality'],
    interviewStubs: {
      basics: ['Modules vs standalone components', 'Templates and data binding', 'Dependency injection basics'],
      medium: ['RxJS observables', 'Reactive forms vs template-driven', 'Routing and guards'],
      advanced: ['Change detection strategies', 'Signals', 'NgRx / state patterns'],
      'company-specific': ['Angular enterprise interview themes', 'Migration stories (modules → standalone)'],
    },
    deepStubs: {
      theory: ['DI hierarchy', 'Zone.js vs zoneless'],
      internals: ['Change detection', 'Compiler and AOT'],
      'best-practices': ['Feature modules / standalone', 'Smart vs presentational', 'RxJS unsubscribe'],
      'real-world-projects': ['Admin dashboard'],
      performance: ['OnPush', 'Lazy loading', 'TrackBy'],
      pitfalls: ['Memory leaks from subscriptions', 'Overusing any', 'Giant modules'],
    },
  },
  {
    id: 'backend',
    slug: 'backend',
    title: 'Backend',
    emoji: '🖥️',
    order: 11,
    tag: 'Server',
    accent: '#0284C7',
    relatedTopics: ['api-design', 'database', 'security', 'system-design', 'nodejs'],
    interviewStubs: {
      basics: ['What is idempotency?', 'Sessions vs JWT', 'Stateless services'],
      medium: [
        'Caching strategies with Redis',
        'What is a webhook and how do you secure it?',
        'WebSocket vs SSE vs long polling',
      ],
      advanced: [
        'Background jobs and transactional outbox',
        'Message queues (Kafka / RabbitMQ / SQS)',
        'Rate limiting and backpressure',
      ],
      'company-specific': ['Design a notification service', 'Payment webhook reliability scenarios'],
    },
    deepStubs: {
      theory: ['Request lifecycle', 'Sync vs async processing'],
      internals: ['Connection pools', 'Queue semantics', 'WebSocket framing basics'],
      'best-practices': [
        'Idempotency keys',
        'Webhook signing and retries',
        'Graceful degradation',
        'Structured logging',
      ],
      'real-world-projects': ['API + worker + Redis cache', 'Webhook receiver with retries'],
      performance: ['Cache invalidation', 'N+1 APIs', 'Hot partitions'],
      pitfalls: [
        'Dual writes without outbox',
        'Unsigned webhooks',
        'Blocking on external IO',
        'Chatty APIs',
      ],
    },
  },
  {
    id: 'api-design',
    slug: 'api-design',
    title: 'API Design',
    emoji: '🔌',
    order: 12,
    tag: 'Interfaces',
    accent: '#7C3AED',
    relatedTopics: ['backend', 'system-design', 'security'],
    interviewStubs: {
      basics: ['REST resource modeling', 'HTTP methods and status codes', 'Pagination strategies'],
      medium: ['REST vs GraphQL vs gRPC — when to use each', 'API versioning', 'Idempotent POST patterns'],
      advanced: ['Rate limiting headers', 'HATEOAS trade-offs', 'Contract testing / OpenAPI'],
      'company-specific': ['Design Twitter’s public API', 'BFF pattern interviews'],
    },
    deepStubs: {
      theory: ['Resource-oriented design', 'RPC vs REST'],
      internals: ['HTTP caching semantics', 'gRPC over HTTP/2'],
      'best-practices': ['OpenAPI as source of truth', 'Consistent error envelopes', 'Backward compatibility'],
      'real-world-projects': ['Versioned public API'],
      performance: ['Over/under-fetching', 'Batch endpoints'],
      pitfalls: ['Breaking changes', 'Chatty APIs', 'Ignoring auth scopes'],
    },
  },
  {
    id: 'cs-fundamentals',
    slug: 'cs-fundamentals',
    title: 'CS Fundamentals',
    emoji: '🧮',
    order: 13,
    tag: 'Foundations',
    accent: '#4F46E5',
    relatedTopics: ['dsa', 'backend', 'security', 'java', 'python', 'nodejs'],
    interviewStubs: {
      basics: ['Process vs thread', 'Stack vs heap', 'What is DNS?'],
      medium: ['TCP vs UDP', 'HTTP/1.1 vs HTTP/2 vs HTTP/3', 'Locks, mutexes, and race conditions'],
      advanced: ['Memory models and visibility', 'TLS handshake overview', 'Scheduling and context switches'],
      'company-specific': ['CS fundamentals MCQ bank', 'Explain a packet’s journey'],
    },
    deepStubs: {
      theory: ['OS abstractions', 'Network layered model'],
      internals: ['Virtual memory', 'TCP congestion control basics', 'Syscall path'],
      'best-practices': ['When to use threads vs processes vs async', 'Defensive concurrency'],
      'real-world-projects': ['Tiny TCP client / server lab'],
      performance: ['Cache locality', 'Context-switch cost'],
      pitfalls: ['Busy waiting', 'Ignoring endianness', 'Blocking on DNS'],
    },
  },
  {
    id: 'dsa',
    slug: 'dsa',
    title: 'DSA',
    emoji: '🧩',
    order: 14,
    tag: 'Algorithms',
    accent: '#B45309',
    relatedTopics: ['cs-fundamentals', 'low-level-design', 'java', 'python'],
    interviewStubs: {
      basics: ['Arrays and hash maps', 'Two pointers and sliding window', 'Big-O intuition'],
      medium: ['BFS/DFS on trees and graphs', 'Binary search variants', 'Heaps / Top-K'],
      advanced: ['Dynamic programming patterns', 'Backtracking', 'Union-Find'],
      'company-specific': ['Blind 75 pattern map', 'How to narrate complexity aloud'],
    },
    deepStubs: {
      theory: ['Amortized analysis', 'Common pattern catalog'],
      internals: ['Hash collision strategies', 'Tree balancing intuition'],
      'best-practices': ['Clarify constraints first', 'Test edge cases', 'Space-time trade-offs'],
      'real-world-projects': ['Implement pattern drill set'],
      performance: ['Constant factors', 'Cache-friendly layouts'],
      pitfalls: ['Off-by-one', 'Mutating inputs', 'Premature optimization'],
    },
  },
  {
    id: 'low-level-design',
    slug: 'low-level-design',
    title: 'Low-Level Design',
    emoji: '🧱',
    order: 15,
    tag: 'OOP design',
    accent: '#C2410C',
    relatedTopics: ['software-engineering', 'system-design', 'java'],
    interviewStubs: {
      basics: ['Class vs interface responsibilities', 'Composition vs inheritance', 'UML class diagram basics'],
      medium: ['Design a parking lot', 'Design a library / book system', 'Apply SOLID to a redesign'],
      advanced: ['Design an elevator system', 'Design a rate limiter (class level)', 'Extensibility without breaking callers'],
      'company-specific': ['LLD interview rubric', 'How interviewers score extensibility'],
    },
    deepStubs: {
      theory: ['GRASP principles', 'Design pattern catalog overview'],
      internals: ['Object collaboration', 'Invariant enforcement'],
      'best-practices': ['Prefer composition', 'Keep APIs small', 'Testable seams'],
      'real-world-projects': ['Parking lot / elevator walkthrough'],
      performance: ['Object churn', 'Lazy vs eager init'],
      pitfalls: ['God classes', 'Anemic domain without reason', 'Pattern overuse'],
    },
  },
  {
    id: 'ui-ux',
    slug: 'ui-ux',
    title: 'UI/UX',
    emoji: '✨',
    order: 16,
    tag: 'Product UI',
    accent: '#BE185D',
    relatedTopics: ['frontend', 'react', 'angular'],
    interviewStubs: {
      basics: ['Usability heuristics overview', 'What is accessibility (a11y)?', 'Visual hierarchy'],
      medium: ['Design systems and tokens', 'Forms and error messaging', 'Mobile-first layouts'],
      advanced: ['Inclusive design edge cases', 'Measuring UX with CWV + qualitative research'],
      'company-specific': ['Critique a UI in an interview', 'Trade-offs: beauty vs clarity'],
    },
    deepStubs: {
      theory: ['Nielsen heuristics', 'Information architecture'],
      internals: ['Perception and attention basics'],
      'best-practices': ['Consistent patterns', 'Empty/error/loading states', 'WCAG AA targets'],
      'real-world-projects': ['Redesign a settings page'],
      performance: ['Perceived performance', 'Skeleton screens'],
      pitfalls: ['Hidden affordances', 'Color-only status', 'Modal spam'],
    },
  },
  {
    id: 'system-design',
    slug: 'system-design',
    title: 'System Design',
    emoji: '🏛️',
    order: 17,
    tag: 'HLD',
    accent: '#9333EA',
    relatedTopics: ['backend', 'database', 'devops-cloud', 'api-design'],
    interviewStubs: {
      basics: ['Horizontal vs vertical scaling', 'Load balancer role', 'SQL vs NoSQL trade-offs'],
      medium: ['Caching layers and CDN', 'Sharding and replication', 'Message queues and fan-out'],
      advanced: ['CAP and consistency models', 'Design a URL shortener', 'Design a chat / news feed'],
      'company-specific': ['Rate limiter design', 'Webhook delivery at scale', 'Cost and failure modes'],
    },
    deepStubs: {
      theory: ['Distributed systems basics', 'Microservices vs monolith'],
      internals: ['Consistent hashing', 'Leader election intuition', 'Quorum reads/writes'],
      'best-practices': ['Clarify requirements first', 'Back-of-envelope estimates', 'Explicit trade-offs'],
      'real-world-projects': ['URL shortener', 'Chat system', 'Rate limiter'],
      performance: ['Hot keys', 'Tail latency', 'Backpressure'],
      pitfalls: ['Premature sharding', 'Single points of failure', 'Ignoring observability'],
    },
  },
  {
    id: 'database',
    slug: 'database',
    title: 'Database',
    emoji: '🗄️',
    order: 18,
    tag: 'Data',
    accent: '#0369A1',
    relatedTopics: ['backend', 'system-design', 'django', 'spring-boot'],
    interviewStubs: {
      basics: ['Primary vs foreign keys', 'Normalization basics', 'What is an index?'],
      medium: ['ACID and isolation levels', 'EXPLAIN basics', 'ORM vs raw SQL'],
      advanced: ['Replication topologies', 'Sharding strategies', 'NoSQL when and why'],
      'company-specific': ['Diagnose a slow query', 'Schema migration strategies'],
    },
    deepStubs: {
      theory: ['Relational model', 'CAP applied to databases'],
      internals: ['B-tree indexes', 'MVCC intuition', 'WAL'],
      'best-practices': ['Index for filters/joins', 'Migrations as code', 'Backups and restores'],
      'real-world-projects': ['Schema for a marketplace'],
      performance: ['Covering indexes', 'Avoid SELECT *', 'Connection pooling'],
      pitfalls: ['Missing indexes', 'N+1 ORM queries', 'Wrong isolation level'],
    },
  },
  {
    id: 'devops-cloud',
    slug: 'devops-cloud',
    title: 'DevOps & Cloud',
    emoji: '☁️',
    order: 19,
    tag: 'Ops',
    accent: '#4F46E5',
    relatedTopics: ['git-collaboration', 'security', 'system-design', 'backend'],
    interviewStubs: {
      basics: ['What is Docker?', 'CI vs CD', 'Environment variables and secrets'],
      medium: ['Kubernetes pods/services/ingress', 'GitHub Actions pipeline', 'Blue/green vs rolling'],
      advanced: ['Observability: logs, metrics, tracing', 'IAM least privilege', 'Serverless trade-offs'],
      'company-specific': ['Design a deploy pipeline', 'Incident response basics'],
    },
    deepStubs: {
      theory: ['Immutable infrastructure', 'Twelve-factor app'],
      internals: ['Container isolation', 'K8s control plane overview'],
      'best-practices': ['IaC', 'Fail builds on critical scans', 'SLO-oriented alerts'],
      'real-world-projects': ['Dockerize an API + CI deploy'],
      performance: ['Cold starts', 'Image size', 'Autoscaling signals'],
      pitfalls: ['Snowball servers', 'Secrets in images', 'Alert fatigue'],
    },
  },
  {
    id: 'git-collaboration',
    slug: 'git-collaboration',
    title: 'Git & Collaboration',
    emoji: '🌿',
    order: 20,
    tag: 'VCS',
    accent: '#EA580C',
    relatedTopics: ['software-engineering', 'devops-cloud', 'behavioral'],
    interviewStubs: {
      basics: ['git add / commit / push / pull', 'What is a branch?', 'Merge vs rebase'],
      medium: ['Resolve merge conflicts', 'Interactive rebase (conceptually)', 'PR best practices'],
      advanced: ['git bisect', 'Cherry-pick and revert', 'Monorepo vs multi-repo workflows'],
      'company-specific': ['Trunk-based development interviews', 'Code ownership models'],
    },
    deepStubs: {
      theory: ['DAG of commits', 'Snapshots vs diffs'],
      internals: ['Objects: blob/tree/commit', 'Refs and HEAD'],
      'best-practices': ['Small commits', 'Meaningful messages', 'Protected main'],
      'real-world-projects': ['PR template + review checklist'],
      performance: ['Shallow clones', 'Sparse checkout'],
      pitfalls: ['Force-pushing shared branches', 'Giant commits', 'Rewriting public history'],
    },
  },
  {
    id: 'testing-quality',
    slug: 'testing-quality',
    title: 'Testing & Quality',
    emoji: '🧪',
    order: 21,
    tag: 'QA',
    accent: '#059669',
    relatedTopics: ['software-engineering', 'devops-cloud', 'backend', 'frontend'],
    interviewStubs: {
      basics: ['Unit vs integration vs E2E', 'What is a mock/stub/fake?', 'Arrange-Act-Assert'],
      medium: ['Test pyramid', 'TDD red-green-refactor', 'Flaky tests causes'],
      advanced: ['Contract tests', 'Testcontainers', 'Mutation testing intro'],
      'company-specific': ['Coverage vs confidence', 'How you test in CI'],
    },
    deepStubs: {
      theory: ['Testing taxonomy', 'Test doubles'],
      internals: ['Determinism and isolation', 'Time and randomness in tests'],
      'best-practices': ['Test behavior not implementation', 'Fast unit suite', 'Shared fixtures carefully'],
      'real-world-projects': ['API test suite with Testcontainers'],
      performance: ['Parallelization', 'Selective test runs'],
      pitfalls: ['Testing implementation details', 'Slow E2E-only suites', 'Ignoring flaky tests'],
    },
  },
  {
    id: 'security',
    slug: 'security',
    title: 'Security',
    emoji: '🔒',
    order: 22,
    tag: 'AppSec',
    accent: '#BE123C',
    relatedTopics: ['backend', 'frontend', 'devops-cloud', 'api-design'],
    interviewStubs: {
      basics: ['Authentication vs authorization', 'OWASP Top 10 overview', 'HTTPS / TLS purpose'],
      medium: ['XSS / CSRF / SQLi defenses', 'Secret management', 'Webhook HMAC signatures'],
      advanced: ['Least privilege IAM', 'Secure WebSocket auth', 'Threat modeling basics'],
      'company-specific': ['Security interview scenarios', 'Incident disclosure habits'],
    },
    deepStubs: {
      theory: ['CIA triad', 'Trust boundaries'],
      internals: ['TLS handshake', 'Password hashing (bcrypt/argon2)'],
      'best-practices': ['Parameterized queries', 'CSP', 'Rotate secrets', 'Dependency scanning'],
      'real-world-projects': ['Secure login + webhook receiver'],
      performance: ['Auth caching', 'Token size trade-offs'],
      pitfalls: ['Secrets in git', 'Trusting client input', 'Disabling TLS verification'],
    },
  },
  {
    id: 'ai-ml',
    slug: 'ai-ml',
    title: 'AI / ML Engineering',
    emoji: '🤖',
    order: 23,
    tag: 'AI era',
    accent: '#A21CAF',
    relatedTopics: ['system-design', 'backend', 'database'],
    interviewStubs: {
      basics: ['What is an LLM API call?', 'Embeddings vs chat completions', 'What is RAG?'],
      medium: ['Vector databases role', 'Chunking and retrieval quality', 'Prompt vs fine-tune trade-offs'],
      advanced: ['Agent loops / tool use', 'Evaluation (faithfulness, recall@k)', 'Cost and latency controls'],
      'company-specific': ['Design a RAG chatbot', 'AI features in fullstack interviews'],
    },
    deepStubs: {
      theory: ['RAG pipeline', 'Hallucination causes'],
      internals: ['Embedding spaces intuition', 'Context windows'],
      'best-practices': ['Ground answers in retrieved docs', 'Guardrails and rate limits', 'PII handling'],
      'real-world-projects': ['Minimal RAG service'],
      performance: ['Caching embeddings', 'Batching requests'],
      pitfalls: ['Blind trust in model output', 'Prompt injection', 'Unbounded context'],
    },
  },
  {
    id: 'behavioral',
    slug: 'behavioral',
    title: 'Behavioral',
    emoji: '💬',
    order: 24,
    tag: 'STAR',
    accent: '#CA8A04',
    relatedTopics: ['software-engineering', 'git-collaboration'],
    interviewStubs: {
      basics: ['What is the STAR method?', 'Tell me about yourself (structure)', 'Why this company?'],
      medium: ['Conflict with a teammate', 'Missed deadline / failure story', 'Ownership example'],
      advanced: ['Influence without authority', 'Ambiguous requirements', 'Mentoring / leadership'],
      'company-specific': ['Leadership principles style answers', 'Story bank of 8–10'],
    },
    deepStubs: {
      theory: ['What behavioral rounds measure', 'Signal vs fluff'],
      internals: ['How interviewers score STAR'],
      'best-practices': ['Quantify impact', 'Own mistakes', 'Keep stories reusable'],
      'real-world-projects': ['Build your story bank'],
      performance: ['2-minute story timing', 'Clear structure under pressure'],
      pitfalls: ['Blaming others', 'Rambling', 'No measurable result'],
    },
  },
];

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function interviewMd(topic: TopicDef, level: (typeof INTERVIEW_LEVELS)[number]): string {
  const qs = topic.interviewStubs[level] ?? [];
  const body = qs
    .map(
      (q, i) => `## Q${i + 1}. ${q}

**Answer:** Content coming soon.

**Key takeaway:** TBD.

---
`,
    )
    .join('\n');

  return `---
id: ${topic.slug}-interview-${level}
level: ${level}
---

# ${topic.title} — Interview (${titleCase(level)})

> Placeholder Q&A stubs. Full answers will be filled in later.

${body || '_No stubs yet._\n'}
`;
}

function deepMd(topic: TopicDef, track: (typeof DEEP_TRACKS)[number]): string {
  const sections = topic.deepStubs[track] ?? [];
  const body = sections
    .map(
      (h) => `## ${h}

Content coming soon.

`,
    )
    .join('\n');

  return `---
id: ${topic.slug}-deep-${track}
track: ${track}
---

# ${topic.title} — Deep: ${titleCase(track)}

> Placeholder sections for must-cover curriculum.

${body || '_No stubs yet._\n'}
`;
}

function main() {
  mkdirSync(CONTENT, { recursive: true });

  const manifest = {
    version: 1,
    topics: TOPICS.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      emoji: t.emoji,
      order: t.order,
      tag: t.tag,
      accent: t.accent,
    })),
  };

  writeFileSync(join(CONTENT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  for (const topic of TOPICS) {
    const dir = join(CONTENT, topic.slug);
    const interviewDir = join(dir, 'interview');
    const deepDir = join(dir, 'deep');
    mkdirSync(interviewDir, { recursive: true });
    mkdirSync(deepDir, { recursive: true });

    const meta = {
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      emoji: topic.emoji,
      order: topic.order,
      tag: topic.tag,
      accent: topic.accent,
      relatedTopics: topic.relatedTopics,
      quiz: [] as unknown[],
      problems: [] as unknown[],
    };

    // Don't overwrite meta if migrate already enriched it
    const metaPath = join(dir, 'meta.json');
    if (!existsSync(metaPath)) {
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    }

    for (const level of INTERVIEW_LEVELS) {
      const path = join(interviewDir, `${level}.md`);
      if (!existsSync(path)) writeFileSync(path, interviewMd(topic, level));
    }
    for (const track of DEEP_TRACKS) {
      const path = join(deepDir, `${track}.md`);
      if (!existsSync(path)) writeFileSync(path, deepMd(topic, track));
    }
  }

  console.log(`Scaffolded ${TOPICS.length} topics under content/`);
}

main();
