# Topic-Wise Prep Map

*These are not about remembering topics. They are about connecting them.*

This is a checklist of what to know in each area. Every **bold term** below also becomes a flashcard (deck: *Prep map*) and can come up in a mock interview. Use the table to jump to the full notes for each area.

| Area | Study it in Forgeline |
|---|---|
| Java & Spring Boot | [Spring Boot](/topics/spring-boot) · [Java](/topics/java) |
| Python & Django | [Django](/topics/django) · [Python](/topics/python) |
| Node.js & Express | [Node.js: Express & production](/topics/nodejs/notes/01-nodejs-express-in-production) |
| Databases, SQL & NoSQL | [Database](/topics/database) · [Advanced SQL & NoSQL](/topics/database/notes/05-advanced-sql-and-nosql-deep-dive) |
| DSA & coding interviews | [DSA](/topics/dsa) · [Advanced algorithms](/topics/dsa/notes/04-advanced-algorithms) · [Coding interview playbook](/topics/dsa/notes/05-coding-interview-playbook) |
| TypeScript & JavaScript | [JavaScript & TypeScript](/topics/javascript) · [Advanced TypeScript](/topics/javascript/notes/03-advanced-typescript-and-react-typing) |
| React, Next.js, Angular | [React](/topics/react) · [Next.js](/topics/nextjs/notes/01-nextjs-essentials) · [Angular](/topics/angular/notes/01-angular-and-rxjs-essentials) |
| Browser & web platform | [Frontend](/topics/frontend) · [Browser APIs & rendering](/topics/frontend/notes/02-browser-apis-rendering-and-security) |
| System design | [System Design](/topics/system-design) · [System design interview playbook](/topics/system-design/notes/05-system-design-interview-playbook) |
| Testing | [Testing & Quality](/topics/testing-quality) · [Frontend & E2E testing](/topics/testing-quality/notes/02-frontend-and-e2e-testing) |
| DevOps & cloud | [DevOps & Cloud](/topics/devops-cloud) · [AWS essentials](/topics/devops-cloud/notes/15-aws-cloud-essentials) |
| Security | [Security](/topics/security) |
| Communication & behavioral | [Behavioral & communication](/topics/behavioral/notes/01-behavioral-and-technical-communication) |
| MCQ screening tests | [MCQ Test Prep](/topics/interview-mcq) |

---

# Part 1 · Enhanced map

---

## BACKEND ENGINEERING - Enhanced

### Java & Spring Boot (NEW)

**Spring Core Concepts**
- **Dependency Injection & IoC Container**: Spring manages object creation and dependencies. @Autowired, @Component, @Service, @Repository annotations. Container creates beans and wires them together.
- **Bean Lifecycle & Scopes**: Singleton (default), Prototype, Request, Session. Init/destroy callbacks. @PostConstruct, @PreDestroy.
- **Spring Boot Auto-Configuration**: Convention over configuration. @SpringBootApplication combines @Configuration, @EnableAutoConfiguration, @ComponentScan. application.properties/yml for config.
- **Component Scan & Stereotypes**: @Component (generic), @Service (business logic), @Repository (data access), @Controller (web layer). Package scanning for automatic bean discovery.

**Spring MVC & REST**
- **DispatcherServlet Flow**: Front controller pattern. Request → HandlerMapping → Controller → ViewResolver → Response. Understanding request lifecycle is critical.
- **@RestController vs @Controller**: @RestController = @Controller + @ResponseBody. Returns JSON/XML directly vs returning view names.
- **Request Mapping Variants**: @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping. Path variables with @PathVariable, query params with @RequestParam.
- **Exception Handling**: @ExceptionHandler for controller-level, @ControllerAdvice for global. ResponseEntity for custom responses. @ResponseStatus for HTTP codes.
- **Request/Response Body Binding**: Jackson for JSON serialization/deserialization. @RequestBody binds JSON to object. @Valid for validation with Bean Validation.

**Spring Data JPA**
- **Repository Patterns**: JpaRepository extends PagingAndSortingRepository. CRUD methods included. Custom queries with @Query or method naming conventions.
- **Entity Relationships**: @OneToOne, @OneToMany, @ManyToOne, @ManyToMany. Cascade types, fetch strategies (LAZY vs EAGER). Bidirectional relationships with mappedBy.
- **JPA vs Hibernate**: JPA is specification, Hibernate is implementation. EntityManager, persistence context, detached entities.
- **N+1 Problem Solutions**: @EntityGraph, JOIN FETCH in JPQL, @BatchSize. Understanding when queries are executed.
- **Transaction Management**: @Transactional annotation. Propagation levels (REQUIRED, REQUIRES_NEW, NESTED). Isolation levels. Rollback rules.

**Spring Security (Critical)**
- **Authentication vs Authorization Flow**: SecurityContext holds Authentication. Filter chain processes requests. UserDetailsService loads user data.
- **Filter Chain Architecture**: Security filters execute in order. UsernamePasswordAuthenticationFilter, JwtAuthenticationFilter (custom). OncePerRequestFilter for custom filters.
- **JWT Implementation**: Token generation with secret key. Validation in filter. Stateless authentication. Token storage (header: "Bearer token").
- **Method Security**: @PreAuthorize, @PostAuthorize, @Secured. Expression-based access control. hasRole(), hasAuthority().
- **CORS Configuration**: WebMvcConfigurer for global CORS. @CrossOrigin for controller-level. Allow origins, methods, headers.

**Spring Advanced**
- **AOP (Aspect-Oriented Programming)**: Cross-cutting concerns (logging, security, transactions). @Aspect, @Before, @After, @Around. Join points and pointcuts.
- **Spring Profiles**: Different configurations for environments. @Profile annotation. spring.profiles.active property. Dev, staging, prod configs.
- **Caching with Spring**: @Cacheable, @CacheEvict, @CachePut. Cache managers (EhCache, Redis). TTL configuration.
- **Async Processing**: @Async for async methods. @EnableAsync. Thread pool configuration. CompletableFuture for async results.
- **Spring Boot Actuator**: Production-ready features. /health, /metrics, /info endpoints. Custom health indicators. Monitoring integration.

### Python & Django (NEW)

**Django Core**
- **MVT Architecture**: Model-View-Template (not MVC). Model = data, View = logic (like controller), Template = presentation. Understanding Django's interpretation matters.
- **Django ORM**: QuerySets are lazy. filter(), exclude(), get(), all(). Chaining queries. select_related() and prefetch_related() for optimization.
- **Models & Migrations**: Field types (CharField, IntegerField, ForeignKey). Meta options. python manage.py makemigrations, migrate. Migration files are version control.
- **URL Routing & Views**: urls.py patterns. path() and re_path(). Function-based views vs Class-based views. Generic views for common patterns.
- **Django Admin**: Auto-generated admin interface. ModelAdmin customization. list_display, search_fields, list_filter. Actions for bulk operations.

**Django REST Framework (DRF)**
- **Serializers**: Converting between complex types and JSON. ModelSerializer for automatic field generation. Validation with `validate_<field>` methods.
- **ViewSets & Routers**: ViewSet combines logic for CRUD. ModelViewSet includes all operations. Router automatically generates URL patterns.
- **Authentication & Permissions**: TokenAuthentication, SessionAuthentication, JWTAuthentication. Permission classes: IsAuthenticated, IsAdminUser, custom permissions.
- **Pagination**: PageNumberPagination, LimitOffsetPagination, CursorPagination. Performance implications of each type.
- **Filtering & Searching**: django-filter integration. SearchFilter, OrderingFilter. Query parameter-based filtering.

**Django Advanced**
- **Middleware**: Request/response processing. Order matters. Custom middleware for logging, auth, etc. MIDDLEWARE setting in settings.py.
- **Signals**: Decoupled event handling. pre_save, post_save, pre_delete, post_delete. @receiver decorator. Use sparingly (can make code hard to follow).
- **Django Channels**: WebSocket support. ASGI vs WSGI. Async views. Real-time features (chat, notifications).
- **Celery with Django**: Async task queue. Task decorators @task. Scheduling periodic tasks. Beat for cron-like functionality.
- **Django Testing**: TestCase class. setUp/tearDown. Fixtures for test data. Mock objects. Coverage.py for test coverage.

**Python Specific**
- **Virtual Environments**: venv, virtualenv, pipenv, poetry. Isolation of dependencies. requirements.txt vs Pipfile.
- **Decorators**: Function wrappers. @property, @staticmethod, @classmethod. Custom decorators for route protection, logging.
- **Context Managers**: with statement. __enter__ and __exit__ methods. Managing resources (files, DB connections).
- **Type Hints**: Static typing for better code quality. mypy for type checking. Function signatures with -> return type.
- **List/Dict Comprehensions**: Pythonic data transformations. [x*2 for x in range(10)]. Generator expressions for memory efficiency.

### Node.js & Express - Enhanced

**Advanced Express Patterns**
- **Router-level Middleware**: Modular route handlers. express.Router() for feature-based routing. Middleware specific to router groups.
- **Error Handling Middleware**: Must have 4 parameters (err, req, res, next). Placed after all routes. Async error handling with express-async-errors or wrapper functions.
- **Request Pipeline**: Understanding middleware execution order. next() vs next('route') vs next(error). Short-circuiting the pipeline.
- **Static Files & Templates**: express.static() for serving files. View engines (EJS, Pug, Handlebars). res.render() for server-side rendering.

**Node.js Advanced**
- **Streams**: Readable, Writable, Duplex, Transform streams. Piping for memory-efficient file processing. Backpressure handling.
- **Buffer**: Binary data handling. Creating buffers. Converting between buffer and string. Use cases: file uploads, binary protocols.
- **Child Processes**: spawn(), exec(), fork(). Running external commands. Process communication. CPU-intensive tasks in separate processes.
- **Cluster Module**: Utilizing multiple CPU cores. Master-worker pattern. Load balancing across workers. Process management with PM2.
- **Native Modules**: C++ addons for performance. N-API for stable interface. When to use vs pure JavaScript.

**Performance & Production**
- **Memory Leaks**: Common causes (global variables, event listeners, closures). Profiling with --inspect. Heap snapshots. Garbage collection monitoring.
- **Process Management**: PM2 for production. Forever, nodemon for development. Zero-downtime deployments. Log management.
- **Security Best Practices**: Helmet.js for security headers. Rate limiting with express-rate-limit. Input validation with joi/yup. SQL injection prevention with parameterized queries.
- **Logging**: Winston, Bunyan, Pino. Structured logging. Log levels. Log rotation. Integration with monitoring tools.

---

## DATABASE - Enhanced

### Advanced SQL Topics (NEW)

**Query Optimization Deep Dive**
- **Execution Plans**: EXPLAIN ANALYZE for query analysis. Sequential scan vs Index scan vs Bitmap scan. Cost estimation. Query planner statistics.
- **Index Types**: B-Tree (default), Hash, GiN (full-text), GiST (geometric), Partial indexes, Composite indexes. When to use each.
- **Covering Index**: Index contains all columns in query. Avoids table lookup. Index-only scans. Trade-off: larger index size.
- **Query Hints & Optimization**: Force index usage, join order. Analyze and update statistics. Vacuum in PostgreSQL.
- **Partitioning**: Range, List, Hash partitioning. Horizontal partitioning for large tables. Partition pruning for query performance.

**Advanced SQL Operations**
- **Window Functions**: ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD(). PARTITION BY for grouped calculations. Running totals, moving averages.
- **CTEs (Common Table Expressions)**: WITH clause for readable queries. Recursive CTEs for hierarchical data (org charts, tree structures).
- **Subqueries vs Joins**: Correlated vs non-correlated subqueries. Performance implications. When subquery is better than join.
- **HAVING vs WHERE**: WHERE filters before grouping. HAVING filters after aggregation. GROUP BY with multiple columns.
- **EXISTS vs IN**: Performance differences with large datasets. Correlated EXISTS for existence checks. NOT EXISTS vs NOT IN with NULL handling.

**Database Design Patterns**
- **Star Schema vs Snowflake**: Data warehouse designs. Fact tables and dimension tables. Denormalization for analytics.
- **Slowly Changing Dimensions (SCD)**: Type 1 (overwrite), Type 2 (historical tracking), Type 3 (limited history). Handling dimension changes.
- **Soft Deletes**: deleted_at column instead of DELETE. Preserving data for audit trails. Filtered indexes for active records.
- **Audit Tables**: Tracking data changes. Trigger-based auditing. Created_by, updated_by, created_at, updated_at columns.
- **UUID vs Auto-increment**: UUID for distributed systems. Auto-increment for single database. Performance trade-offs. GUIDs vs BIGINT.

**Concurrency & Locking**
- **Lock Types**: Shared (read), Exclusive (write). Row-level vs Table-level. Intent locks. Deadlock detection and resolution.
- **Optimistic vs Pessimistic Locking**: Optimistic uses version field. Pessimistic locks rows with SELECT FOR UPDATE. Use cases for each.
- **Deadlocks**: Circular dependency of locks. Prevention strategies (consistent lock order). Detection and timeout handling.
- **MVCC (Multi-Version Concurrency Control)**: PostgreSQL implementation. Multiple versions of rows. Snapshot isolation. No read locks.

### NoSQL Deep Dive (NEW)

**MongoDB Specifics**
- **Document Model**: BSON format. Embedded documents vs references. Schema flexibility vs validation with JSON Schema.
- **Aggregation Pipeline**: $match, $group, $project, $sort, $limit. Multi-stage data processing. MapReduce alternative.
- **Indexing in MongoDB**: Single field, compound, multikey (arrays), text, geospatial, hashed indexes. index.stats() for monitoring.
- **Replication**: Replica sets for high availability. Primary-secondary architecture. Automatic failover. Read preference (primary, secondary, nearest).
- **Sharding**: Horizontal scaling. Shard key selection (critical decision). Chunk distribution. mongos router.

**Redis Patterns**
- **Data Structures**: Strings, Lists, Sets, Sorted Sets, Hashes, Bitmaps, HyperLogLog, Streams. Use case for each.
- **Pub/Sub**: Message broadcasting. SUBSCRIBE, PUBLISH, PSUBSCRIBE for patterns. Not persistent (unlike message queues).
- **Redis as Cache**: LRU eviction policies. Expiration strategies (TTL). Cache aside, write-through, write-behind patterns.
- **Transactions in Redis**: MULTI/EXEC for atomic operations. WATCH for optimistic locking. Lua scripts for complex operations.
- **Persistence**: RDB (snapshots) vs AOF (append-only file). Hybrid persistence. Trade-offs between durability and performance.

**Cassandra (Distributed NoSQL)**
- **Wide-column Store**: Column families. Partition key + clustering columns. Data locality matters.
- **CAP Theorem Application**: AP system (Availability + Partition tolerance). Eventual consistency. Tunable consistency levels.
- **Denormalization Mandatory**: No joins. Duplicate data across tables. Query-driven data modeling.
- **Compaction**: SSTables and memtables. Merge and compaction process. Impact on read/write performance.

### Database Scaling (NEW)

**Replication Strategies**
- **Master-Slave Replication**: Write to master, read from slaves. Asynchronous vs synchronous replication. Lag handling.
- **Master-Master Replication**: Multiple writable nodes. Conflict resolution. Last-write-wins, application-level resolution.
- **Read Replicas**: Offloading read traffic. Replication lag considerations. Eventual consistency acceptance.
- **Failover & Recovery**: Automatic vs manual failover. Split-brain problem. Fencing and STONITH.

**Sharding Deep Dive**
- **Sharding Keys**: Hash-based, range-based, directory-based. Hotspot prevention. Resharding challenges.
- **Cross-shard Queries**: Scatter-gather pattern. Performance implications. Denormalization to avoid cross-shard queries.
- **Distributed Transactions**: Two-phase commit (2PC). Saga pattern for microservices. Eventual consistency trade-offs.
- **Consistent Hashing**: Distributing data across nodes. Virtual nodes. Minimal data movement on node addition/removal.

**Database Performance**
- **Slow Query Analysis**: Identify bottleneck queries. Query profiling. pt-query-digest for MySQL.
- **Database Pooling Deep Dive**: Connection lifecycle. Pool exhaustion. Idle timeout vs max lifetime. Pool size calculation.
- **Read-heavy vs Write-heavy**: Different optimization strategies. CQRS (Command Query Responsibility Segregation) pattern.
- **Bulk Operations**: Batch inserts/updates. Transaction batching. COPY in PostgreSQL, bulk API in MongoDB.

---

## DSA - Enhanced

### Advanced Patterns (NEW)

**Sliding Window Advanced**
- **Variable Size Window**: Expand until condition met, shrink from left. Minimum window substring, longest substring with K distinct characters.
- **Fixed vs Dynamic**: Fixed size (array of size K). Dynamic size (condition-based). Template: two pointers with HashMap.

**Two Pointers Advanced**
- **Opposite Direction**: Start and end pointers moving toward each other. Container with most water, valid palindrome.
- **Same Direction**: Both start from beginning, move at different speeds. Remove duplicates, partition array.
- **Three Pointers**: Extension for 3-sum problems. Sort array, fix one element, two-pointer on rest.

**Binary Search Variants (Critical)**
- **Search Space Pattern**: Not just arrays. Answer lies in range [low, high]. Minimize/maximize problems. Capacity to ship packages, split array largest sum.
- **First/Last Occurrence**: Modified binary search. Continue searching even after finding target. Template for lower_bound/upper_bound.
- **Rotated Array Search**: Find pivot point. Two binary searches or modified single pass. No duplicates vs with duplicates.
- **Binary Search on Answer**: When answer is in continuous range. Minimize maximum or maximize minimum problems. Aggressive cows, painters partition.

**Monotonic Stack/Queue Patterns**
- **Next Greater Element**: Monotonic decreasing stack. Template: iterate right to left or left to right with stack.
- **Sliding Window Maximum**: Monotonic decreasing deque. Remove elements outside window and smaller elements.
- **Largest Rectangle in Histogram**: Stack stores indices. Calculate area when popping smaller heights.

### Tree Advanced (NEW)

**Binary Tree Advanced**
- **Morris Traversal**: O(1) space traversal using threaded binary tree. Temporary links to inorder successor/predecessor.
- **Serialization/Deserialization**: Convert tree to string and back. Preorder with null markers. Level order approach.
- **Vertical Order Traversal**: Horizontal distance concept. HashMap with column as key. Handle same column + same row ordering.
- **Boundary Traversal**: Left boundary (exclude leaf), leaves (left to right), right boundary (bottom to top, exclude leaf).

**BST Advanced**
- **Construct BST from Traversal**: From preorder, inorder, postorder. Range-based construction. O(n) solutions.
- **Validate BST**: Not just left < root < right. Use range: (min, max) for each subtree. Common interview mistake.
- **Kth Smallest/Largest**: Inorder traversal for sorted order. Augmented BST with count at each node for O(h) solution.
- **BST Iterator**: hasNext() and next() in O(1) average. Controlled inorder traversal with stack.

**Advanced Tree Problems**
- **Distance Between Nodes**: Find LCA first. Distance = distance(root, node1) + distance(root, node2) - 2*distance(root, LCA).
- **Flatten to Linked List**: In-place transformation. Post-order traversal approach. Right pointer as next.
- **Maximum Path Sum**: Can start and end at any node. Consider single node, left path, right path, node through root.
- **Count Complete Tree Nodes**: O(log²n) using completeness property. Check if left and right heights same.

### Graph Advanced (NEW)

**Shortest Path Algorithms**
- **Bellman-Ford**: Handles negative weights. O(VE) time. Detects negative cycles. Relax all edges V-1 times.
- **Floyd-Warshall**: All-pairs shortest path. O(V³). Dynamic programming approach. Intermediate vertex concept.
- **A* Search**: Informed search with heuristic. f(n) = g(n) + h(n). Better than Dijkstra for pathfinding with good heuristic.
- **Bidirectional Search**: Search from both source and destination. Meet in middle. Reduces search space significantly.

**Advanced Graph Algorithms**
- **Strongly Connected Components (SCC)**: Kosaraju's algorithm. Two DFS passes. Tarjan's algorithm with low-link values.
- **Articulation Points & Bridges**: Critical nodes/edges whose removal increases connected components. DFS-based. Discovery time and low values.
- **Minimum Spanning Tree**: Prim's (dense graphs) vs Kruskal's (sparse graphs). Union-find for Kruskal's. Greedy approach proof.
- **Network Flow**: Max flow problem. Ford-Fulkerson method. Edmonds-Karp (BFS-based). Min-cut max-flow theorem.

**Graph Representations**
- **Adjacency Matrix vs List**: Matrix: O(1) edge check, O(V²) space. List: O(V+E) space, better for sparse graphs. Trade-offs for different algorithms.
- **Edge List**: Array of edges. Good for Kruskal's MST. Sorting by weight.
- **Implicit Graphs**: Grid as graph. State space graphs. No explicit representation, generated on fly.

### Dynamic Programming Advanced (NEW)

**DP Patterns Deep Dive**
- **Knapsack Variations**: 0/1, Unbounded, Fractional (greedy), Multi-dimensional. Space optimization from 2D to 1D.
- **Palindrome Problems**: Longest palindromic subsequence/substring. Expand around center vs DP. Manacher's algorithm for O(n).
- **String DP**: Edit distance (Levenshtein), longest common subsequence/substring, distinct subsequences. State transitions.
- **Stock Problems**: Buy/sell with cooldown, multiple transactions, transaction fee. State machine approach.
- **Game Theory DP**: Minimax strategy. Predict opponent's optimal move. Stone game variations.

**DP Optimization Techniques**
- **Space Optimization**: 2D to 1D DP. Rolling array. Only need previous row/column.
- **Divide and Conquer DP**: Quadrangle inequality optimization. Convex hull trick for slope optimization.
- **Digit DP**: Counting numbers with properties in range [L, R]. Tight bound concept.
- **Bitmask DP**: State compression using bits. Traveling salesman problem. Subset-based DP.

**State Design in DP**
- **What Makes Good State**: Must be sufficient to make decisions. No redundant information. Transition must be clear.
- **State Reduction**: Identify what truly changes. Remove redundant dimensions. Example: Fibonacci needs only last two states.
- **State Expansion**: Adding dimension for constraints. Example: K transactions in stock problem.

### Advanced Algorithms (NEW)

**Bit Manipulation Advanced**
- **Brian Kernighan's Algorithm**: n & (n-1) removes rightmost set bit. Count set bits efficiently.
- **XOR Properties**: a ^ a = 0, a ^ 0 = a. Find unique element. Swap without temp variable.
- **Bit Masks**: Represent subsets. Iterate all subsets of N elements in O(2^N). Subset generation.
- **Power of 2**: (n & (n-1)) == 0 and n != 0. Single bit check.

**Two-Pointer Technique Deep Dive**
- **Fast and Slow Pointer**: Floyd's cycle detection. Finding cycle start. Finding middle of linked list.
- **Sliding Window with HashMap**: Frequency map. Longest substring without repeating characters. Anagram in string.
- **Partition Pattern**: Quick select algorithm. Kth largest element. Dutch national flag problem.

**Math Algorithms**
- **Sieve of Eratosthenes**: Generate all primes up to N. O(N log log N) time. Segmented sieve for large N.
- **Prime Factorization**: Trial division up to sqrt(n). Pollard's rho for large numbers.
- **Fast Exponentiation**: a^b in O(log b) using binary representation. Modular exponentiation for large numbers.
- **GCD Variants**: Extended Euclidean for Bezout coefficients. LCM calculation. Coprime numbers.

### Problem-Solving Meta-Skills (NEW)

**Pattern Recognition Enhanced**
- **Keywords to Pattern Mapping**: 
  - "Maximize/minimize" → Greedy or DP
  - "Count ways" → DP
  - "All possible" → Backtracking
  - "Shortest/longest path" → BFS/Dijkstra
  - "Connected components" → Union-Find or DFS
  - "Optimize" → Binary search on answer or DP

**Complexity Analysis Deep Dive**
- **Recurrence Relations**: Master theorem. T(n) = aT(n/b) + f(n). Recognizing patterns.
- **Amortized Analysis**: Average over sequence. ArrayList resize. Union-find with path compression.
- **Space Complexity**: Auxiliary space vs total space. Recursion stack counts. In-place algorithms.

**Debugging Techniques**
- **Dry Run Strategy**: Small test case by hand. Track variables in table. Verify each loop iteration.
- **Edge Case Checklist**: Empty input, single element, all same elements, negative numbers, maximum values, null/undefined.
- **Assertion Points**: Add checks for invariants. Verify preconditions and postconditions.

---

## FRONTEND - Enhanced

### TypeScript (NEW - Critical for Modern Frontend)

**Type System Fundamentals**
- **Basic Types**: string, number, boolean, array, tuple, enum, any, unknown, never, void. When to use each.
- **Type Inference**: TypeScript infers types from initialization. Explicit typing when needed. Type widening and narrowing.
- **Union & Intersection Types**: Type | Type for OR. Type & Type for AND. Use cases: API responses, event handlers.
- **Type Aliases vs Interfaces**: type for unions/tuples. interface for object shapes with extension. Personal preference for objects.
- **Literal Types**: Specific string/number values as types. "GET" | "POST" | "PUT" | "DELETE". Const assertions.

**Advanced Types**
- **Generics**: Reusable type-safe code. `<T>` syntax. Constraints with extends. Generic functions, interfaces, classes.
- **Utility Types**: `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, T>`, `ReturnType<T>`. Built-in type transformations.
- **Mapped Types**: Creating new types from old. keyof operator. in operator. Transformation patterns.
- **Conditional Types**: T extends U ? X : Y. Type narrowing based on conditions. Inference with infer keyword.
- **Template Literal Types**: String manipulation at type level. `${A}${B}` for string combinations.

**TypeScript with React**
- **Typing Components**: React.FC vs function components. Props typing. Children typing. Event handlers.
- **Hooks Typing**: `useState<Type>()`, `useRef<Type>(null)`, `useContext<Type>()`. Generic hook typing.
- **Event Types**: React.MouseEvent, React.ChangeEvent, React.FormEvent. Proper event parameter typing.
- **Ref Types**: RefObject vs MutableRefObject. ForwardRef typing. useImperativeHandle.
- **Props with Children**: React.ReactNode vs React.ReactElement vs JSX.Element. When to use each.

**TypeScript Patterns**
- **Type Guards**: typeof, instanceof, custom type predicates with is. Narrowing union types.
- **Discriminated Unions**: Common property (type field) for union discrimination. Exhaustiveness checking with never.
- **Branded Types**: Nominal typing simulation. Unique symbol for type safety. ID types, validated strings.
- **Declaration Merging**: Interface merging. Module augmentation. Extending third-party types.

### Next.js (NEW - Critical Framework)

**Core Concepts**
- **Pages Router vs App Router**: Old file-based routing vs new (React Server Components). Migration considerations.
- **File-based Routing**: pages/ directory structure. Dynamic routes with [param]. Catch-all with [...slug].
- **Pre-rendering**: Static Generation (SSG) vs Server-Side Rendering (SSR). getStaticProps, getServerSideProps, getStaticPaths.
- **Image Optimization**: next/image component. Lazy loading, responsive images, automatic format. Priority for above-fold images.
- **Link Component**: Client-side navigation. Prefetching. Scroll restoration. Replace vs push.

**Data Fetching Patterns**
- **SSG (Static Site Generation)**: Build-time data fetching. getStaticProps. ISR (Incremental Static Regeneration) with revalidate.
- **SSR (Server-Side Rendering)**: Request-time data fetching. getServerSideProps. When user-specific or frequently changing data.
- **CSR (Client-Side Rendering)**: useEffect + fetch. SWR or React Query for better DX. When data needs to be fresh.
- **ISR (Incremental Static Regeneration)**: Stale-while-revalidate at page level. revalidate property. Best of SSG + SSR.

**App Router (React Server Components)**
- **Server Components**: Default in app/. Run on server, no JS sent to client. Async components possible. Access backend resources directly.
- **Client Components**: "use client" directive. Interactive components, browser APIs, hooks. Boundary between server and client.
- **Layouts**: Shared UI across routes. layout.js in app/. Nested layouts. Root layout required.
- **Loading & Error States**: loading.js for instant loading UI. error.js for error boundaries. Automatic code splitting.
- **Route Handlers**: API routes in app/ with route.js. GET, POST, etc. as named exports. Response object handling.

**Next.js Advanced**
- **Middleware**: Edge functions. Request modification. Authentication, redirects, rewrites at edge. middleware.ts in root.
- **Environment Variables**: NEXT_PUBLIC_ prefix for client-side. .env.local for secrets. Build-time vs runtime.
- **Static Exports**: next export for static hosting. Limitations (no SSR, no API routes). When to use.
- **Custom Document & App**: _document.js for HTML structure. _app.js for layout, state. Difference in app router.
- **Optimizations**: Bundle analyzer. Tree shaking. Dynamic imports. Font optimization with next/font.

### Angular (NEW)

**Core Concepts**
- **Components & Modules**: @Component decorator. NgModule for organization. Standalone components (new approach).
- **Templates & Data Binding**: Interpolation {{}}. Property binding [property]. Event binding (event). Two-way [(ngModel)].
- **Directives**: Structural (*ngIf, *ngFor, *ngSwitch). Attribute (ngClass, ngStyle). Custom directives.
- **Services & Dependency Injection**: @Injectable decorator. Singleton services. Hierarchical injection. providedIn: 'root'.
- **Lifecycle Hooks**: ngOnInit, ngOnChanges, ngOnDestroy, ngAfterViewInit. When each executes.

**RxJS & Observables (Critical for Angular)**
- **Observable Pattern**: Stream of values over time. Subscribe to receive values. Cold vs hot observables.
- **Operators**: map, filter, mergeMap, switchMap, debounceTime, distinctUntilChanged. Pipe for chaining.
- **Subject Types**: Subject, BehaviorSubject, ReplaySubject, AsyncSubject. State management patterns.
- **Subscription Management**: Unsubscribe to prevent memory leaks. async pipe for automatic unsubscribe. takeUntil pattern.
- **Error Handling**: catchError operator. retry, retryWhen. Error channels.

**Routing**
- **Router Configuration**: Routes array. path, component, redirectTo. Lazy loading with loadChildren.
- **Route Guards**: CanActivate, CanDeactivate, Resolve, CanLoad. Authentication, unsaved changes warning.
- **Route Parameters**: ActivatedRoute service. params, queryParams. Snapshot vs observable.
- **Child Routes**: Nested routing. router-outlet for child components. Relative navigation.

**Forms**
- **Template-driven Forms**: FormsModule. ngModel, #form="ngForm". Validation directives.
- **Reactive Forms**: ReactiveFormsModule. FormGroup, FormControl, FormArray. Programmatic control. Complex validation.
- **Validation**: Built-in validators (required, email, minLength). Custom validators. Async validators for backend checks.
- **Dynamic Forms**: FormArray for dynamic fields. Conditional validation. Form state management.

**Angular Advanced**
- **Change Detection**: Zone.js. Default vs OnPush strategy. Immutability for performance. Detach/reattach.
- **State Management**: Services with BehaviorSubject. NgRx (Redux pattern). Component communication patterns.
- **HTTP Client**: HttpClient service. Interceptors for auth headers. Retry logic. Error handling.
- **Lazy Loading**: Code splitting by route. Preloading strategies. Custom preloading.
- **Testing**: Jasmine, Karma. TestBed configuration. Component testing. Service testing with mocks.

### Advanced React Patterns (NEW)

**Composition Patterns**
- **Compound Components**: Parent-child implicit communication. Context for internal state. React.Children.map.
- **Render Props**: Function as child. Sharing logic without HOC. Flexibility in rendering.
- **Higher-Order Components (HOC)**: Component wrapping. Props injection. withAuth, withRouter examples. Composition over inheritance.
- **Slots Pattern**: Named slots like Vue. Children composition. Flexible layouts without prop drilling.

**Performance Patterns**
- **Code Splitting Strategies**: Route-based, component-based, vendor splitting. React.lazy at route level first.
- **Virtualization**: react-window, react-virtualized. Render only visible items. Critical for long lists.
- **Memoization Strategy**: When to memo, when not to. Measure before optimizing. Profile with React DevTools.
- **Web Workers**: Offloading heavy computation. comlink for easier worker communication. When JavaScript becomes CPU-bound.

**Advanced Hooks**
- **useReducer Deep Dive**: Complex state logic. Immer for immutable updates. Compared to Redux.
- **useTransition & useDeferredValue**: Concurrent features. Non-blocking updates. Priority-based rendering.
- **useImperativeHandle**: Exposing methods to parent. With forwardRef. Controlled imperative API.
- **useLayoutEffect**: Synchronous DOM mutations. Measuring DOM. Avoiding visual flicker.
- **Custom Hook Composition**: Composing multiple hooks. Sharing stateful logic. Hook dependencies.

### Browser & Web Platform (NEW)

**Performance APIs**
- **Performance Observer**: Monitoring metrics. LCP, FID, CLS observation. Real user monitoring (RUM).
- **Intersection Observer**: Lazy loading images. Infinite scroll. Tracking visibility. Performance over scroll listeners.
- **ResizeObserver**: Responsive behavior without window resize. Container queries alternative.
- **MutationObserver**: DOM change monitoring. Dynamic content handling. Use sparingly (performance).

**Modern Web APIs**
- **Service Workers**: Offline functionality. Cache strategies. Background sync. Push notifications.
- **Web Workers**: Multi-threading in browser. Shared workers. Dedicated workers. Transferable objects.
- **IndexedDB**: Client-side database. Large data storage. Transactions. Key-value storage for complex data.
- **WebSockets**: Bidirectional communication. Real-time data. Socket.io abstraction. Reconnection logic.
- **WebRTC**: Peer-to-peer communication. Video/audio streaming. Data channels.

**Browser Rendering**
- **Critical Rendering Path**: DOM → CSSOM → Render Tree → Layout → Paint → Composite. Optimization opportunities.
- **Reflow vs Repaint**: Layout changes (expensive) vs visual changes (cheaper). Batching DOM changes.
- **Layer Composition**: GPU-accelerated properties (transform, opacity). will-change for optimization hints.
- **Paint Flashing**: DevTools paint visualization. Identifying repaint-heavy areas. Debouncing visual updates.

**Security**
- **Content Security Policy (CSP)**: script-src, style-src directives. Nonce/hash for inline scripts. Preventing XSS.
- **HTTPS & Mixed Content**: Security implications. Upgrade-Insecure-Requests header. HSTS.
- **iframe Security**: X-Frame-Options, CSP frame-ancestors. postMessage for cross-origin communication. Sandboxing.
- **Subresource Integrity (SRI)**: CDN integrity verification. Hash-based verification. Fallback strategies.

---

## SYSTEM DESIGN ESSENTIALS (NEW SECTION)

### Fundamentals

**CAP Theorem**
- **Consistency, Availability, Partition Tolerance**: Can only have 2 of 3. Network partitions are unavoidable in distributed systems.
- **Trade-offs**: CP systems (MongoDB, HBase). AP systems (Cassandra, DynamoDB). Tunable consistency (Cassandra).
- **Real-world Application**: Understanding system guarantees. Eventual consistency acceptance.

**Scalability Concepts**
- **Vertical vs Horizontal Scaling**: Scale up (bigger machine) vs scale out (more machines). Limits of vertical. Horizontal for true scalability.
- **Load Balancing**: Round robin, least connections, IP hash. Layer 4 vs Layer 7. Health checks. Sticky sessions.
- **Stateless vs Stateful**: Stateless services easier to scale. Stateful needs session management. Database as state store.
- **Caching Layers**: Client-side, CDN, application cache, database cache. Different TTLs for each layer.

**Reliability Patterns**
- **Fault Tolerance**: System operates despite component failures. Redundancy, replication, failover.
- **Circuit Breaker**: Prevent cascade failures. States: closed, open, half-open. Timeout and error thresholds.
- **Retry with Backoff**: Exponential backoff. Jitter to prevent thundering herd. Maximum retry count.
- **Rate Limiting**: Token bucket, leaky bucket, sliding window. Per-user, per-IP, global limits.
- **Bulkhead Pattern**: Isolate resources. Thread pools per service. Prevent resource exhaustion.

### Microservices Architecture

**Service Communication**
- **Synchronous vs Asynchronous**: REST (sync), gRPC (sync, faster), message queues (async). Trade-offs for each.
- **Service Discovery**: Client-side (Eureka), server-side (Consul). DNS-based. Service mesh (Istio, Linkerd).
- **API Gateway**: Single entry point. Routing, auth, rate limiting, request aggregation. Kong, AWS API Gateway.
- **Message Queues**: RabbitMQ, Kafka, SQS. Pub/sub vs point-to-point. Guaranteed delivery, ordering.

**Data Management**
- **Database per Service**: Separate databases for each microservice. Challenges: joins, transactions, consistency.
- **Saga Pattern**: Distributed transactions. Choreography vs orchestration. Compensating transactions for rollback.
- **Event Sourcing**: Store events, not state. Replay for state reconstruction. Audit trail. CQRS often paired.
- **CQRS**: Separate read and write models. Optimized queries. Eventual consistency between models.

**Microservices Challenges**
- **Distributed Tracing**: Request correlation across services. Trace ID propagation. Jaeger, Zipkin.
- **Service Mesh**: Sidecar proxy pattern. Traffic management, security, observability. Envoy proxy.
- **Configuration Management**: Centralized config. Spring Cloud Config, Consul. Environment-specific configs.
- **Monitoring & Logging**: Centralized logging (ELK). Metrics (Prometheus, Grafana). Alerting based on SLOs.

### Design Patterns for Scale

**Caching Strategies Deep Dive**
- **Cache-Aside (Lazy Loading)**: Application manages cache. Read: check cache → read DB → write cache. Write: invalidate cache.
- **Write-Through**: Write to cache and DB simultaneously. Slower writes, fresh cache. Good for read-heavy.
- **Write-Behind (Write-Back)**: Write to cache, async write to DB. Faster writes, risk of data loss. Batching for efficiency.
- **Refresh-Ahead**: Proactive refresh before expiry. Reduces cache misses. Requires prediction of access patterns.

**Database Strategies**
- **Read Replicas**: Master for writes, replicas for reads. Replication lag consideration. Scaling reads.
- **Database Sharding Patterns**: Horizontal partitioning. Shard key selection critical. Consistent hashing for distribution.
- **Connection Pooling**: Reuse connections. Pool size tuning. Validation queries. Maximum lifetime.

**Async Processing**
- **Message Queue Patterns**: Point-to-point vs pub/sub. Dead letter queues. Message ordering. Idempotency.
- **Event-Driven Architecture**: Events as first-class citizens. Decoupling. Eventual consistency. Event sourcing.
- **Background Job Processing**: Sidekiq, Celery, Bull. Priorities, retries, scheduling. Worker management.

---

## TESTING (NEW SECTION)

### Testing Philosophy

**Testing Pyramid**
- **Unit Tests (Base)**: Fast, isolated, many. 70% of tests. Mock dependencies. Single function/method testing.
- **Integration Tests (Middle)**: Multiple components. Database, APIs, services. 20% of tests. Slower but more confidence.
- **E2E Tests (Top)**: Full user flows. Cypress, Playwright, Selenium. 10% of tests. Slowest, most brittle, highest value.
- **Anti-pattern**: Inverted pyramid (too many E2E). Ice cream cone (no integration).

### Backend Testing

**Unit Testing Best Practices**
- **AAA Pattern**: Arrange (setup), Act (execute), Assert (verify). Clear test structure.
- **Mocking Strategies**: Mock external dependencies (DB, APIs). Stub for simple returns. Spy for verification.
- **Test Data Builders**: Factory pattern for test data. Faker for realistic data. Fixtures for common scenarios.
- **Coverage Metrics**: Lines, branches, functions. 80% is good target. 100% not always necessary. Mutation testing for quality.

**Integration Testing**
- **Database Testing**: Test database schema. Repository layer tests. Use test database or transactions that rollback.
- **API Testing**: Supertest for Node, TestRestTemplate for Spring. Test full request-response cycle.
- **Contract Testing**: Provider-consumer contracts. Pact for contract testing. Prevents breaking changes.

### Frontend Testing

**Component Testing**
- **React Testing Library**: Render, query, interact, assert. User-centric testing. Avoid implementation details.
- **Testing User Interactions**: fireEvent vs userEvent. Async utilities (waitFor, findBy). Screen reader queries.
- **Mocking**: Mock API calls (MSW). Mock modules with Jest. Mock components for isolation.
- **Snapshot Testing**: Good for component structure. Version control. Update carefully. Don't over-use.

**E2E Testing**
- **Test Selectors**: data-testid for stability. Avoid class names or IDs used for styling. Semantic queries preferred.
- **Page Object Model**: Encapsulate page logic. Reusable actions. Maintainable tests.
- **Flaky Test Prevention**: Explicit waits. Retry logic. Isolation (clean state). Deterministic data.
- **Visual Regression**: Percy, Chromatic. Screenshot comparison. Catches UI regressions.

---

## DEPLOYMENT & DEVOPS ESSENTIALS (NEW)

### Containerization

**Docker Deep Dive**
- **Images vs Containers**: Image is template, container is running instance. Layers in images. Union file system.
- **Dockerfile Best Practices**: Multi-stage builds. Layer caching. Minimal base images (Alpine). .dockerignore file.
- **Docker Compose**: Multi-container apps. Service definitions. Networks and volumes. Development environments.
- **Container Orchestration**: Kubernetes for production. Docker Swarm. ECS. Service discovery, scaling, health checks.

### CI/CD

**Pipeline Stages**
- **Build**: Compile, bundle, transpile. Dependency installation. Caching for speed.
- **Test**: Unit, integration, E2E. Parallel execution. Fail fast. Code coverage reporting.
- **Deploy**: Staging first, production after approval. Blue-green deployment. Canary releases. Rollback strategy.
- **Tools**: GitHub Actions, GitLab CI, Jenkins, CircleCI. YAML configuration. Secrets management.

**Deployment Strategies**
- **Blue-Green**: Two identical environments. Switch traffic. Instant rollback. Requires 2x resources.
- **Canary**: Gradual rollout. Monitor metrics. Rollback if issues. Traffic percentage control.
- **Rolling**: Replace instances gradually. Zero downtime. Health checks crucial. Slower than blue-green.
- **Feature Flags**: Deploy code, enable for subset. A/B testing. Gradual rollout. Kill switch.

### Cloud Basics

**AWS Services (Common)**
- **Compute**: EC2 (VMs), Lambda (serverless), ECS/EKS (containers). Choose based on requirements.
- **Storage**: S3 (object storage), EBS (block storage), EFS (file storage). Durability and availability.
- **Database**: RDS (managed SQL), DynamoDB (NoSQL), ElastiCache (Redis/Memcached).
- **Networking**: VPC, subnets, security groups. Load balancers (ALB, NLB). CloudFront (CDN).

**Infrastructure as Code**
- **Terraform**: Declarative. Multi-cloud. State management. Modules for reusability.
- **CloudFormation**: AWS-specific. Native integration. Stack management.
- **Benefits**: Version control. Reproducibility. Documentation. Disaster recovery.

---

## SECURITY DEEP DIVE (Enhanced)

### Authentication Mechanisms

**OAuth 2.0 & OpenID Connect**
- **OAuth 2.0**: Authorization framework. Delegated access. Access tokens. Flows: Authorization Code, Implicit, Client Credentials.
- **OpenID Connect**: Authentication layer on OAuth. ID tokens. UserInfo endpoint. Claims.
- **Token Types**: Access token (short-lived), Refresh token (long-lived), ID token (user info).
- **Flow Selection**: Authorization Code for web apps. Client Credentials for service-to-service. PKCE for mobile/SPA.

**Session Management**
- **Session Storage**: Server-side (Redis, DB). Session ID in cookie. Expiration and renewal.
- **CSRF Protection**: Synchronizer token pattern. Double submit cookie. SameSite cookie attribute.
- **Session Fixation**: Regenerate session ID after login. Don't accept session IDs from URL.

### Input Validation & Sanitization

**Injection Prevention**
- **SQL Injection**: Parameterized queries. ORM with proper escaping. Never concatenate user input.
- **NoSQL Injection**: MongoDB operators in queries. Sanitize input. Use schema validation.
- **Command Injection**: Avoid shell execution with user input. Whitelist allowed commands. Escape special characters.
- **LDAP Injection**: Escape special LDAP characters. Validate and sanitize search filters.

**Output Encoding**
- **HTML Encoding**: Convert <, >, &, ", ' to entities. Prevents XSS. Context-aware encoding.
- **JavaScript Encoding**: Encoding for JS contexts. Different than HTML. Library support (DOMPurify).
- **URL Encoding**: Encode URL parameters. Prevent URL manipulation attacks.

### API Security

**Rate Limiting & Throttling**
- **Fixed Window**: Count requests per fixed time window. Simple but allows burst at boundary.
- **Sliding Window**: Smooth rate limiting. Calculates based on current time. More accurate.
- **Token Bucket**: Tokens replenish over time. Allows burst up to bucket size. Flexible.
- **Leaky Bucket**: Constant output rate. Queue requests. Smooth traffic.

**API Authentication**
- **API Keys**: Simple but insecure if transmitted insecurely. Good for identifying application, not user.
- **JWT**: Stateless. Contains claims. Signature verification. Expiry validation. Refresh tokens for long-lived sessions.
- **mTLS**: Mutual TLS. Certificate-based authentication. Service-to-service. Strong security.

**API Security Headers**
- **CORS**: Control cross-origin access. Preflight requests. Credentials handling.
- **Content-Type Validation**: Prevent content sniffing. X-Content-Type-Options: nosniff.
- **Strict-Transport-Security**: HSTS header. Force HTTPS. Preload lists.

---

## Communication & Soft Skills for Interviews (NEW)

### Behavioral Interview Prep

**STAR Method**
- **Situation**: Context and background. Set the scene.
- **Task**: Your responsibility. What needed to be done.
- **Action**: Steps you took. Focus on "I", not "we".
- **Result**: Outcome. Quantify if possible. Learning.

**Common Questions**
- "Tell me about a challenging bug" → STAR with debugging process
- "Disagreement with teammate" → STAR with conflict resolution
- "Project you're proud of" → STAR with technical depth
- "Failure/mistake" → STAR with learning and growth

### Technical Communication

**Explaining Technical Concepts**
- **Know Your Audience**: Adjust depth based on interviewer. Use analogies for non-technical.
- **Start High-Level**: Big picture first. Then drill into details. "First, let me explain the overall approach..."
- **Use Diagrams**: Draw architecture. Clarify with boxes and arrows. Visual helps understanding.
- **Define Acronyms**: Don't assume knowledge. "REST, which stands for..."

**Asking Clarifying Questions**
- **Requirements**: "What's the expected scale?" "Are there latency requirements?"
- **Constraints**: "Can we use external libraries?" "What's the input format?"
- **Edge Cases**: "How should we handle duplicates?" "What if input is empty?"
- **Trade-offs**: "Should we optimize for time or space?" "Is eventual consistency acceptable?"

### Problem-Solving Communication

**Think Out Loud**
- **Explain Your Thought Process**: "I'm thinking we could use a HashMap here because..."
- **State Assumptions**: "I'm assuming the array is not sorted..."
- **Discuss Trade-offs**: "This approach is O(n) time but uses O(n) space. Alternatively..."
- **Ask for Feedback**: "Does this approach make sense?" "Am I on the right track?"

**Handling Uncertainty**
- **Admit When Stuck**: "I'm not immediately seeing the optimal solution. Let me think through some approaches..."
- **Work Through Examples**: "Let me try a small example to see if I can spot a pattern..."
- **Ask for Hints**: "Could you give me a hint about which data structure might work well here?"
- **Stay Positive**: Don't get frustrated. Show problem-solving resilience.

---

## Interview-Specific Topics (NEW)

### System Design Interview Prep

**Step-by-Step Approach**
1. **Clarify Requirements**: Functional (features) and non-functional (scale, latency, availability).
2. **Estimate Scale**: Users, requests/second, storage. Back-of-envelope calculations.
3. **High-Level Design**: Draw main components. Client, servers, databases, caches. Data flow.
4. **Deep Dive**: Interviewer chooses focus areas. Database schema, API design, scaling, etc.
5. **Bottlenecks & Trade-offs**: Identify and address. Discuss alternatives.

**Common System Design Questions**
- **URL Shortener**: Hashing, database design, scaling, cache.
- **Twitter/Feed**: Fan-out on write vs read. Timeline generation. Caching.
- **Rate Limiter**: Token bucket. Distributed rate limiting. Redis.
- **Chat System**: WebSocket, message queue, delivery guarantees, presence.
- **Video Platform**: CDN, transcoding, adaptive bitrate, storage.

**Numbers to Remember**
- 1 million QPS → 1000 servers (1000 RPS each)
- 1 GB = 10^9 bytes, 1 TB = 10^12 bytes
- Latency: Memory (100 ns), SSD (100 μs), Network within DC (0.5 ms), Disk (10 ms), Internet (150 ms)
- Availability: 99.9% = 8.76 hours downtime/year, 99.99% = 52.6 minutes/year

### Coding Interview Patterns

**Recognize → Recall → Code**
- **Two Pointers**: Sorted array, palindrome, partition, merge.
- **Sliding Window**: Subarray, substring, max/min in window.
- **Fast/Slow Pointers**: Cycle detection, middle element.
- **Merge Intervals**: Overlapping intervals, meeting rooms.
- **Cyclic Sort**: Missing numbers in range.
- **In-place Reversal**: Reverse linked list, reverse sublist.
- **Tree BFS**: Level order, zigzag, right view.
- **Tree DFS**: All paths, path sum, diameter.
- **Two Heaps**: Median, sliding window median.
- **Subsets**: Combinations, permutations, power set.
- **Modified Binary Search**: Rotated array, search in matrix.
- **Top K Elements**: Heap, quickselect.
- **K-way Merge**: Merge sorted arrays/lists.
- **Topological Sort**: Course schedule, alien dictionary.
- **Union Find**: Connected components, redundant connection.

### Mock Interview Tips

**Before Interview**
- **Practice Platforms**: LeetCode, HackerRank, CodeSignal. Company-tagged problems.
- **Mock Interviews**: Pramp, Interviewing.io. Practice with peers. Get comfortable with pressure.
- **Review Fundamentals**: Don't skip basics. Often hardest questions test fundamentals deeply.

**During Interview**
- **Time Management**: Clarify (5 min), high-level approach (5 min), code (25 min), test (10 min).
- **Write Clean Code**: Meaningful names. Helper functions. Comments for complex logic.
- **Test Your Code**: Walk through with example. Edge cases. Fix bugs found.
- **Handle Stress**: Take a breath. It's okay to pause and think. Interviews are conversations.

**After Solving**
- **Discuss Complexity**: Time and space. Justify your analysis.
- **Optimize**: "Can we do better?" Alternative approaches. Trade-offs.
- **Extensions**: "How would this change if..." Shows broader thinking.

---

# Part 2 · Foundations map

*These are not about remembering topics — they are about connecting them.*

---

## Backend Engineering — Topic Map

### Backend Fundamentals
**Request–Response Cycle**: The flow from client sending a request to server processing and returning a response. Understanding this is critical for debugging and optimization.

**HTTP Methods & Status Codes**: GET (read), POST (create), PUT/PATCH (update), DELETE (remove). Status codes: 2xx (success), 4xx (client error), 5xx (server error). Example: 404 = Not Found, 500 = Internal Server Error.

**REST API Design Principles**: Resource-based URLs, stateless communication, proper HTTP methods, consistent naming. Example: `/users/:id` instead of `/getUserById`.

**Middleware & Request Flow**: Functions that execute between receiving a request and sending a response. Used for logging, authentication, validation. Example: `app.use(authMiddleware)`.

**Authentication vs Authorization**: Authentication = "Who are you?" (login). Authorization = "What can you do?" (permissions). You can be authenticated but not authorized.

**API Versioning**: Managing breaking changes without disrupting clients. Common patterns: `/v1/users`, header-based, or query parameter versioning.

**Idempotent APIs**: Multiple identical requests produce the same result. GET, PUT, DELETE are idempotent. POST is not. Critical for retry logic and avoiding duplicate operations.

**Pagination, Filtering & Sorting**: Handling large datasets efficiently. Pagination: `?page=2&limit=20`. Filtering: `?status=active`. Sorting: `?sortBy=createdAt&order=desc`.

**Data Validation & Sanitization**: Validation checks if data is correct format. Sanitization removes harmful content. Always validate on server even if client validates. Example: email format, SQL injection prevention.

**Error Handling Strategy (Global Error Handling)**: Centralized error catching and consistent error responses. Prevents code duplication and ensures proper logging. Example: Express error middleware.

### Runtime & Concurrency
**Event Loop & Non-Blocking I/O**: Node.js uses single-threaded event loop to handle concurrent operations without threads. I/O operations don't block execution. This is why Node.js is fast for I/O-heavy tasks.

**Async/Await & Promises**: Modern way to handle asynchronous operations. Promises represent future values. Async/await is syntactic sugar over promises for cleaner code. Example: `await fetch()`.

**Thread vs Event-Driven Model**: Threads: multiple execution contexts, higher memory. Event-driven: single thread, event queue, lower memory. Node.js uses event-driven.

**Blocking vs Non-Blocking Operations**: Blocking stops execution until complete (synchronous). Non-blocking continues execution (asynchronous). Example: `fs.readFileSync()` vs `fs.readFile()`.

**Background Jobs & Workers**: Long-running tasks moved out of request-response cycle. Examples: email sending, image processing, report generation. Keeps API responsive.

**Queues (Async Processing)**: FIFO data structure for managing background jobs. Examples: Bull (Redis-based), RabbitMQ. Provides retry logic, priority, and delayed jobs.

### Database & Data Layer
**SQL vs NoSQL (Use-case driven)**: SQL for structured data, complex queries, relationships, transactions. NoSQL for flexible schema, horizontal scaling, high write throughput. No "better" choice, context matters.

**Schema Design & Normalization**: Organizing data to reduce redundancy. 1NF, 2NF, 3NF levels. Trade-off: normalized = less redundancy but more joins. Denormalized = faster reads but update complexity.

**Relationships (1–1, 1–Many, Many–Many)**: One-to-One: user-profile. One-to-Many: user-posts. Many-to-Many: students-courses (needs junction table).

**Indexing & Query Optimization**: Indexes speed up reads but slow writes. Create indexes on frequently queried columns. Use EXPLAIN to analyze queries. Example: index on email for login queries.

**Transactions & ACID**: ACID = Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions), Durability (permanent). Used for operations that must succeed together (e.g., money transfer).

**Isolation Levels (basic understanding)**: Controls how transaction changes are visible to others. Read Uncommitted, Read Committed, Repeatable Read, Serializable. Higher isolation = more consistency but lower concurrency.

**N+1 Query Problem**: Making N additional queries in a loop. Example: fetching 100 users, then querying posts for each user separately = 101 queries. Solution: JOIN or eager loading.

**ORM vs Raw SQL**: ORM provides abstraction, type safety, migrations. Raw SQL gives full control and optimization. Use ORM for CRUD, raw SQL for complex queries.

**Database Migrations**: Version control for database schema. Allows rolling forward/backward. Example: adding a column without manual SQL on production.

**Connection Pooling**: Reusing database connections instead of creating new ones per request. Dramatically improves performance. Configure pool size based on load.

### Caching & Performance
**In-Memory Cache vs Redis**: In-memory (like Node cache): fast, process-specific, lost on restart. Redis: shared across instances, persistent, supports TTL and complex data structures.

**Cache Invalidation Strategies**: Time-based (TTL), event-based (invalidate on update), write-through (update cache on write). "There are only two hard things in Computer Science: cache invalidation and naming things."

**Read-through / Write-through Cache**: Read-through: cache fetches from DB on miss. Write-through: writes go to cache and DB simultaneously. Ensures consistency.

**Rate Limiting**: Restricting number of requests per time window. Prevents abuse and DDoS. Common strategies: token bucket, sliding window. Example: 100 requests/hour per user.

**API Timeout & Retry Strategy**: Set timeouts to prevent hanging. Implement exponential backoff for retries. Example: retry after 1s, 2s, 4s, then fail.

**Circuit Breaker Concept**: Stops calling a failing service temporarily. States: Closed (working), Open (failing, reject requests), Half-Open (testing recovery). Prevents cascade failures.

### Architecture & Design
**Monolith vs Microservices**: Monolith: single deployable unit, simpler to start. Microservices: independent services, scales complexity and teams. Start monolith, split when needed.

**Layered Architecture (Controller / Service / Repo)**: Controller handles HTTP. Service contains business logic. Repository handles data access. Separation allows testing and maintainability.

**Dependency Injection**: Providing dependencies from outside rather than creating inside. Enables testing (mock dependencies) and flexibility. Example: injecting DB connection to service.

**Separation of Concerns**: Each module/function has single responsibility. Business logic shouldn't know about HTTP. Makes code reusable and testable.

**DTO vs Entity**: Entity represents database model. DTO represents data transfer object (API shape). Never expose entities directly—they may contain sensitive fields or internal structure.

**Thin Controller, Fat Service**: Controllers should only handle HTTP and delegate to services. Services contain business logic. Keeps HTTP layer replaceable.

**Feature-based Modular Design**: Organizing by feature rather than by layer. Example: `users/` folder contains user controller, service, repository. Better scalability than `controllers/`, `services/` folders.

### Security (Backend Critical)
**Password Hashing (bcrypt, argon2)**: Never store plain passwords. Hashing is one-way encryption. Bcrypt and argon2 are slow by design (resist brute force). Example: `bcrypt.hash(password, 10)`.

**JWT vs Sessions vs Cookies**: JWT: stateless, token contains data. Sessions: stateful, server stores session. Cookies: storage mechanism. Each has trade-offs for scalability, security, and invalidation.

**Token Expiry & Refresh Flow**: Access tokens short-lived (15min). Refresh tokens long-lived (7 days). When access expires, use refresh to get new access token. Balances security and UX.

**OWASP Top 10 (Backend View)**: Top security risks: Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Logging, SSRF.

**SQL Injection Prevention**: Malicious SQL in user input. Example: `' OR '1'='1`. Prevention: use parameterized queries (prepared statements), never concatenate user input into SQL.

**CSRF, XSS (Backend role)**: CSRF: forged requests from malicious site. Use CSRF tokens. XSS: injecting scripts. Backend role: sanitize input, set security headers, validate content types.

**Secrets Management**: Never commit secrets to code. Use environment variables or secret managers (AWS Secrets Manager, Vault). Rotate secrets regularly.

**Secure File Uploads**: Validate file type (check mime type, not extension). Limit file size. Scan for malware. Store outside web root. Don't trust user-provided filenames.

**Auditing & Activity Logs**: Track who did what and when. Critical for security incidents and debugging. Log authentication, authorization failures, data changes. GDPR: don't log sensitive data.

### Testing & Maintainability
**Unit vs Integration Testing**: Unit tests individual functions in isolation (mock dependencies). Integration tests multiple components together. Both needed—unit for fast feedback, integration for confidence.

**Mocking Strategies**: Replacing dependencies with fake implementations for testing. Example: mock database to test service logic without real DB. Libraries: Jest, Sinon.

**API Contract Testing**: Ensures API matches documented contract (request/response shape). Prevents breaking changes. Tools: Pact, Postman tests.

**Feature Flags**: Toggle features on/off without deployment. Enables gradual rollout, A/B testing, quick rollback. Example: `if (featureFlags.newCheckout) { ... }`.

**Logging Strategy**: Structured logs (JSON) with levels (error, warn, info, debug). Include request ID for tracing. Use log aggregation (ELK, CloudWatch). Don't log sensitive data.

**Debugging Production Issues**: Read logs, check metrics, reproduce locally, use APM tools. Always have rollback plan. Don't debug directly on production—use staging replica.

### Deployment & DevOps Basics
**CI/CD Pipeline Basics**: Continuous Integration: automated testing on every commit. Continuous Deployment: automated deployment after tests pass. Catches bugs early, faster releases.

**Environment Separation (Dev/Staging/Prod)**: Dev for development, Staging mirrors production for testing, Production for users. Never test on production. Use separate databases.

**Health Checks**: Endpoints that report service health. Example: `/health` returns 200 if healthy. Used by load balancers to route traffic away from unhealthy instances.

**Graceful Shutdown**: Properly closing connections when server stops. Finish ongoing requests, close DB connections, stop accepting new requests. Prevents data corruption and failed requests.

**Monitoring & Metrics (conceptual)**: Track response time, error rate, CPU, memory. Set alerts for anomalies. Tools: Prometheus, Grafana, CloudWatch. "You can't improve what you don't measure."

---

## DSA — Thinking Map

### Foundations
**Time & Space Complexity**: Measuring algorithm efficiency. Time: how long it takes. Space: how much memory. Critical for choosing right algorithm at scale.

**Big-O, Big-Ω, Big-Θ**: Big-O (worst case), Big-Ω (best case), Big-Θ (average case). Most used: Big-O. Example: O(n²) for nested loops, O(log n) for binary search.

**Amortized Analysis**: Average time per operation over sequence. Example: ArrayList add() is O(1) amortized, even though resizing is O(n), because resizing is rare.

**Recursion & Call Stack**: Function calling itself. Base case stops recursion. Call stack stores function calls. Stack overflow if too deep. Alternative: iteration or tail recursion.

**Math for DSA (GCD, LCM, Modulo)**: GCD (greatest common divisor) using Euclidean algorithm. LCM = (a × b) / GCD(a,b). Modulo for cyclic patterns, remainders.

**Bit Manipulation**: Operating on individual bits. Fast and memory-efficient. Common: check if power of 2 (`n & (n-1) == 0`), set/clear/toggle bits, XOR for finding unique element.

### Arrays & Strings
**Array Traversal Patterns**: Linear scan, two pointers, sliding window. Know when to use each. Linear for simple operations, two pointers for sorted arrays.

**Sliding Window**: Technique for subarray problems. Fixed or variable size window. Example: longest substring with k distinct characters. O(n) instead of O(n²).

**Two Pointers**: One pointer at start, one at end, move based on condition. Used in sorted arrays. Example: two sum in sorted array, palindrome check.

**Prefix Sum & Difference Array**: Prefix sum: precompute cumulative sums for fast range queries. Difference array: for range updates. Both enable O(1) operations after O(n) preprocessing.

**Kadane's Algorithm**: Finding maximum sum subarray in O(n). Track current sum, reset if negative. Classic DP problem.

**String Manipulation**: Common patterns: reversal, palindrome, anagram, pattern matching. Know string operations complexity (immutable in some languages).

**Frequency Counting**: Using HashMap to count occurrences. Solves anagram, character frequency, duplicates. O(n) time, O(k) space (k = unique elements).

**Matrix Traversals**: Row-wise, column-wise, diagonal, spiral. Know how to navigate 2D arrays. Index manipulation: `matrix[i][j]` to `array[i * cols + j]`.

### Linked List
**Singly & Doubly Linked List**: Singly: one pointer (next). Doubly: two pointers (next, prev). Trade-off: doubly uses more memory but allows backward traversal.

**Fast & Slow Pointer**: Two pointers moving at different speeds. Detects cycles, finds middle, finds kth from end. Classic: Floyd's cycle detection.

**Cycle Detection**: Fast pointer moves 2 steps, slow moves 1. If cycle exists, they meet. Finding start of cycle: reset one pointer to head, move both at same speed.

**Linked List Reversal Patterns**: Iterative (3 pointers: prev, curr, next) or recursive. Common variations: reverse in groups, reverse between positions.

**LRU Cache (DLL + HashMap)**: Doubly Linked List for order (recent to old). HashMap for O(1) access. Remove least recently used when capacity reached. Asked in interviews frequently.

### Stack & Queue
**Stack Implementation**: LIFO (Last In First Out). Array-based or linked list. Operations: push, pop, peek. O(1) for all operations. Use cases: undo, DFS, expression evaluation.

**Queue & Deque**: Queue: FIFO (First In First Out). Deque: double-ended queue (add/remove from both ends). Circular queue solves array-based queue inefficiency.

**Monotonic Stack / Queue**: Stack/queue maintaining increasing or decreasing order. Solves next greater element, sliding window maximum. Pattern: pop elements that violate monotonic property.

**Expression Evaluation**: Infix to postfix conversion, postfix evaluation using stack. Handles operator precedence and parentheses.

**Parentheses Problems**: Matching brackets, valid parentheses, minimum removals. Use stack to track opening brackets, match with closing.

### Trees
**Binary Tree Traversals**: Inorder (left, root, right), Preorder (root, left, right), Postorder (left, right, root), Level-order (BFS). Each has different use cases.

**Binary Search Tree**: Left subtree < root < right subtree. Search, insert, delete in O(log n) average, O(n) worst (unbalanced). Inorder traversal gives sorted order.

**Tree Height & Diameter**: Height: longest path from root to leaf. Diameter: longest path between any two nodes. Recursive calculation using DFS.

**Balanced Trees**: Height difference between subtrees ≤ 1. AVL, Red-Black trees maintain balance for O(log n) operations. Unbalanced BST degrades to O(n).

**Lowest Common Ancestor (LCA)**: Deepest node that is ancestor of both given nodes. Different approaches for binary tree vs BST.

**Tree Views**: Top view, bottom view, left view, right view. Level-order traversal with tracking first/last node at each level or horizontal distance.

**Heap & Priority Queue**: Heap: complete binary tree with heap property (min-heap: parent ≤ children). Priority queue: ADT implemented using heap. O(log n) insert/delete, O(1) peek.

**Trie (Prefix Tree)**: Tree for storing strings. Each node represents character. Used for autocomplete, spell check, prefix matching. Space trade-off for fast prefix operations.

### Graphs
**BFS & DFS**: BFS (Breadth First Search): uses queue, explores level by level, finds shortest path in unweighted graph. DFS (Depth First Search): uses stack/recursion, explores deep before backtracking.

**Cycle Detection (Directed & Undirected)**: Undirected: DFS with parent tracking or Union-Find. Directed: DFS with color states (white, gray, black) or using recursion stack.

**Topological Sorting**: Linear ordering of vertices where edge u→v means u comes before v. Only for DAG (Directed Acyclic Graph). Uses: task scheduling, build systems. Methods: DFS or Kahn's algorithm (BFS).

**Shortest Path (BFS, Dijkstra)**: BFS for unweighted graphs. Dijkstra for weighted graphs with non-negative weights. Uses priority queue. O((V+E) log V).

**Union-Find (DSU)**: Disjoint Set Union. Tracks connected components. Operations: find (which set), union (merge sets). With path compression and union by rank: nearly O(1).

**Connected Components**: Groups of connected vertices. Use DFS/BFS to find all components. Applications: network analysis, friend circles.

**Island Problems**: Count islands, max island size, surrounded regions. Grid-based graph problems. Use DFS/BFS to explore connected land cells.

### Core Algorithms
**Binary Search**: Search in sorted array in O(log n). Template: `while(left ≤ right)`, `mid = left + (right-left)/2`. Variations: finding first/last occurrence, search in rotated array.

**Sorting Algorithms**: Quick Sort O(n log n) average, Merge Sort O(n log n) worst, Heap Sort O(n log n). Know when to use which. Merge Sort is stable, Quick Sort is in-place.

**Hashing**: Map key to index using hash function. Handles collisions (chaining, open addressing). O(1) average for search/insert. Used in HashMaps, Sets. Hash function quality matters.

**Greedy Algorithms (with proof intuition)**: Make locally optimal choice at each step. Works when local optimum leads to global optimum. Examples: activity selection, Huffman coding. Must prove greedy choice property.

**Divide & Conquer**: Break problem into subproblems, solve recursively, combine results. Examples: merge sort, quick sort, binary search. Recurrence relations: Master theorem.

**Backtracking**: Try all possibilities, backtrack when constraint violated. DFS with pruning. Examples: N-Queens, Sudoku, permutations, combinations. Use when you need all solutions.

**Dynamic Programming**: Solve overlapping subproblems once, store results. Key: identify state, recurrence relation, base case. Choose between memoization (top-down) or tabulation (bottom-up).

**Memoization vs Tabulation**: Memoization: recursive + cache (top-down). Tabulation: iterative + table (bottom-up). Memoization is intuitive, tabulation can optimize space.

**Knapsack Pattern**: 0/1 Knapsack, Unbounded Knapsack, Subset Sum. State: `dp[i][w]` = max value using first i items with weight limit w. Many DP problems follow this pattern.

**LIS**: Longest Increasing Subsequence. O(n²) DP or O(n log n) with binary search. State: `dp[i]` = LIS ending at index i. Common variation: LDS, LBS.

**Matrix DP**: 2D DP problems. Examples: unique paths, minimum path sum, edit distance. State: `dp[i][j]` represents subproblem at cell (i,j).

### Meta-Skills (VERY IMPORTANT)
**Pattern Recognition**: Recognizing problem types from keywords. "Contiguous subarray" → sliding window. "All combinations" → backtracking. "Shortest path" → BFS/Dijkstra. This is the key interview skill.

**Edge Case Analysis**: Empty input, single element, duplicates, negative numbers, overflow, null values. Good candidates always mention edge cases before coding.

**Dry Run & Explanation**: Walk through your code with example input. Trace variables. Explain your thought process clearly. Communication matters as much as correctness.

**Trade-off Justification**: "I'm using HashMap for O(1) lookup at the cost of O(n) space." Explain time vs space trade-offs. Shows depth of understanding.

---

## JavaScript + React — Frontend Map

### JavaScript Core
**Execution Context**: Environment where JavaScript code executes. Contains variables, functions, scope chain, this. Two types: Global and Function execution context.

**Call Stack**: Stack data structure tracking function calls. LIFO. JavaScript is single-threaded, so one call stack. Stack overflow occurs when recursion is too deep.

**Scope & Closures**: Scope determines variable accessibility. Closure: function remembering variables from outer scope even after outer function returns. Example: private variables, callbacks.

**Lexical Environment**: Where variables are physically written in code determines scope. Inner functions access outer function variables because of lexical scoping.

**Hoisting**: Variables and functions moved to top of scope during compilation. `var` hoisted with `undefined`, `let`/`const` hoisted but in temporal dead zone. Function declarations fully hoisted.

**this Keyword**: Refers to object calling the function. Value depends on how function is called, not where defined. Arrow functions don't have own `this`, inherit from parent.

**var vs let vs const**: `var`: function-scoped, hoisted. `let`: block-scoped, can reassign. `const`: block-scoped, cannot reassign (but object properties can change). Always prefer `const`, then `let`.

**Equality (== vs ===)**: `==` performs type coercion (loose equality). `===` checks type and value (strict equality). Always use `===` to avoid unexpected coercion bugs.

**Type Coercion**: Automatic type conversion. Example: `"5" + 1 = "51"` (string concatenation), `"5" - 1 = 4` (number subtraction). Source of many bugs.

**Shallow vs Deep Copy**: Shallow copy: copies top level, nested objects still referenced. Deep copy: recursively copies everything. Methods: spread operator (shallow), structuredClone or JSON parse/stringify (deep).

**Prototypes & Inheritance**: JavaScript uses prototypal inheritance. Every object has `__proto__` pointing to prototype. Prototype chain used for property lookup. ES6 classes are syntactic sugar over prototypes.

### Async JavaScript
**Event Loop**: Mechanism handling async operations in single-threaded JavaScript. Call stack → Web APIs → Callback Queue → back to Call Stack when stack is empty.

**Microtask vs Macrotask**: Microtasks (Promises, queueMicrotask) have higher priority than macrotasks (setTimeout, setInterval). Microtask queue emptied completely before next macrotask.

**Promises & Async/Await**: Promise represents eventual completion or failure. States: pending, fulfilled, rejected. Async/await is cleaner syntax for promises. Always handle errors with catch or try/catch.

**Promise Combinators**: `Promise.all()` (all must resolve), `Promise.race()` (first to settle), `Promise.allSettled()` (wait for all, ignore failures), `Promise.any()` (first to fulfill).

**Error Handling in Async Code**: Use `.catch()` for promises or try/catch for async/await. Unhandled promise rejections can crash Node.js. Always handle errors in async code.

**AbortController & Request Cancellation**: Canceling fetch requests or async operations. Example: cancel search request when user types again. Prevents race conditions and memory leaks.

### Browser & Web APIs
**Event Delegation & Bubbling**: Bubbling: event propagates from target to root. Delegation: attaching listener to parent instead of all children. More efficient, handles dynamic elements.

**Debouncing & Throttling**: Debouncing: execute after delay, reset timer on each call (search input). Throttling: execute at most once per time period (scroll handler). Both optimize performance.

**Browser Storage**: LocalStorage (persistent, 5-10MB), SessionStorage (tab session), Cookies (sent with requests, 4KB). Use appropriate storage for use case.

**Cookies vs LocalStorage vs SessionStorage**: Cookies: sent with every request, expire date, domain-specific. LocalStorage: never expires, larger. SessionStorage: tab-scoped. Never store sensitive data unencrypted.

**Fetch API**: Modern way to make HTTP requests. Returns promise. Example: `fetch(url).then(res => res.json())`. Replace old XMLHttpRequest.

**CORS (Frontend Understanding)**: Cross-Origin Resource Sharing. Browsers block requests to different origins for security. Server must send CORS headers. Preflight requests for non-simple requests.

### React Fundamentals
**Component Model**: UI broken into reusable components. Each component has props (input), state (internal data), and returns JSX. Think of components as functions: same input → same output.

**JSX**: JavaScript XML. Syntax extension for writing HTML-like code in JavaScript. Transpiled to `React.createElement()` calls. Expression in `{}`, not statements.

**useState & useEffect**: `useState`: manages component state, triggers re-render on change. `useEffect`: runs side effects (fetch data, subscriptions) after render. Dependency array controls when effect runs.

**Component Lifecycle**: Mounting (component created), Updating (state/props change), Unmounting (component removed). `useEffect` covers all phases: mount (effect), update (effect with deps), unmount (cleanup).

**Controlled vs Uncontrolled Components**: Controlled: React state is source of truth (value + onChange). Uncontrolled: DOM is source of truth (refs). Prefer controlled for validation and predictability.

**Lifting State Up**: Moving state to common parent when multiple components need it. Props flow down, events flow up. Enables data sharing between siblings.

**Keys in Lists**: Unique identifier for list items. Helps React identify which items changed. Never use index as key if list can reorder. Improves performance and prevents bugs.

**Rendering Behavior**: State/props change → component re-renders → children re-render. Understanding this is critical for optimization.

### Advanced React
**Context API**: Share data without prop drilling. Provider supplies value, consumers access it. Use for theme, auth, language. Don't overuse—causes all consumers to re-render.

**Custom Hooks**: Extract reusable logic. Must start with "use". Example: `useFetch`, `useLocalStorage`. Allows sharing stateful logic without HOCs or render props.

**useRef (Advanced Usage)**: Persists value across renders without causing re-render. Access DOM elements. Store mutable values (timers, previous values). Example: `inputRef.current.focus()`.

**useEffect Pitfalls**: Missing dependencies, infinite loops, not cleaning up. Linter helps catch dependency issues. Always clean up subscriptions, timers, listeners.

**React.memo vs useMemo vs useCallback**: `React.memo`: prevents re-render if props unchanged (HOC). `useMemo`: memoizes computed value. `useCallback`: memoizes function. All are optimizations—measure before using.

**Error Boundaries**: Catch JavaScript errors in component tree. Class components with `componentDidCatch`. Doesn't catch errors in event handlers, async code, or SSR. Wrap risky components.

**Memory Leaks in React**: Common causes: not cleaning up effects, holding references to unmounted components, infinite loops. Always return cleanup function from `useEffect`.

### State Management
**Local vs Global State**: Local state: used by single component. Global state: shared across components. Keep state as local as possible, lift up when needed.

**Redux vs Zustand vs Context**: Redux: verbose, mature, DevTools. Zustand: minimal, simple. Context: built-in, good for simple cases. Choose based on complexity and team preference.

**State Colocation**: Keep state close to where it's used. Improves performance (less re-renders) and maintainability. Don't put everything in global state.

**Props Drilling vs Composition**: Props drilling: passing props through many layers. Solutions: Context, composition (children prop), state management library. Composition often better than Context.

### Performance & Optimization
**Virtual DOM & Reconciliation**: React creates virtual DOM (JS object tree). On change, creates new virtual DOM, diffs with old (reconciliation), updates only changed parts of real DOM. Faster than direct DOM manipulation.

**Code Splitting**: Breaking bundle into chunks, loading on demand. Use `React.lazy()` and Suspense. Reduces initial load time. Split by route or heavy components.

**Lazy Loading**: Loading components or data only when needed. `const Component = React.lazy(() => import('./Component'))`. Improves initial load performance.

**Bundle Optimization**: Tree shaking (remove unused code), minification, compression. Use production build. Analyze bundle with webpack-bundle-analyzer.

**Web Vitals**: Core metrics: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift). Measure user experience. Optimize for < 2.5s LCP, < 100ms FID, < 0.1 CLS.

**Re-render Optimization**: Prevent unnecessary re-renders with `React.memo`, `useMemo`, `useCallback`. Move expensive calculations outside render. Use key prop correctly. Profile with React DevTools.

### Application Architecture
**Folder Structure**: Feature-based (group by feature) vs type-based (group by file type). Feature-based scales better. Example: `features/auth/`, `features/posts/`.

**Feature-based Architecture**: Each feature folder contains components, hooks, utils, tests. Self-contained and easy to navigate. Better than separating all components, all hooks, etc.

**Data Fetching Patterns**: Fetch on mount (useEffect), fetch on click, fetch on route change. Libraries: React Query (caching, refetching), SWR (stale-while-revalidate). Handle loading, error, success states.

**Loading / Error / Retry States**: Always handle all states. Loading: spinner/skeleton. Error: error message + retry button. Success: show data. Never leave users in broken state.

**Auth Flow (Frontend)**: Login → store token → send token with requests → refresh token before expiry → logout clears token. Store token in httpOnly cookie (XSS safe) or localStorage (easier but XSS risk).

**RBAC (UI Level)**: Role-Based Access Control. Hide/show UI based on user role. Example: admin sees delete button, user doesn't. Still validate on backend—frontend checks are for UX, not security.

### Frontend Security
**XSS (Frontend role)**: Cross-Site Scripting. Attacker injects malicious script. React escapes by default, but `dangerouslySetInnerHTML` is risky. Sanitize user input, use CSP headers.

**CSRF (Basics)**: Cross-Site Request Forgery. Malicious site sends request as authenticated user. Mitigations: SameSite cookies, CSRF tokens, check Origin/Referer headers.

**Secure Token Handling**: Never store tokens in global variables. Use httpOnly cookies (safest) or localStorage (convenient). Clear on logout. Refresh tokens should be more protected than access tokens.

### Frontend Meta-Skills
**Debugging Skills**: Use browser DevTools (Elements, Console, Network, Sources). React DevTools for component tree and state. Breakpoints, console.log strategically, check network requests.

**Reading Stack Traces**: Bottom is where error originated. Look for your code (not library code). Line numbers point to issue. Source maps help with minified code.

**Explaining Trade-offs**: "I used Context for theme because it's simple and doesn't change often. For user data, I used React Query because it needs caching and refetching." Show you understand implications.

**Explaining React Internals Simply**: "React uses virtual DOM to minimize expensive real DOM updates. When state changes, React diffs the trees and updates only what changed." Simplify complex topics.

