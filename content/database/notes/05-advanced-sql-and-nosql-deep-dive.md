# Advanced SQL, Warehousing & NoSQL Deep Dive

The first four database guides cover modelling, indexing, transactions and scaling. This one fills the gaps that senior interviews like to probe: analytical SQL (window functions, CTEs), warehouse modelling, the practical behaviour of MongoDB, Redis and Cassandra, and the failure modes of replication.

---

## 1. Analytical SQL

### 1.1 Window functions

A window function computes over a set of rows related to the current row **without collapsing them** like `GROUP BY` does.

```sql
SELECT
  employee_id, department_id, salary,
  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn,   -- 1,2,3,4
  RANK()       OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk,  -- 1,2,2,4
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS drnk, -- 1,2,2,3
  salary - LAG(salary) OVER (PARTITION BY department_id ORDER BY hired_at) AS raise_vs_prev,
  SUM(salary)  OVER (ORDER BY hired_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
  AVG(amount)  OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM employees;

-- Classic: top 3 earners per department
SELECT * FROM (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS r FROM employees e
) t WHERE r <= 3;
```

> **Asked as:** "ROW_NUMBER vs RANK vs DENSE_RANK?" · "Find the second-highest salary per department." · "Compute a running total."

### 1.2 CTEs and recursive CTEs

```sql
WITH monthly AS (                      -- readable, reusable sub-result
  SELECT date_trunc('month', created_at) AS m, SUM(total) AS revenue FROM orders GROUP BY 1
)
SELECT m, revenue, revenue - LAG(revenue) OVER (ORDER BY m) AS growth FROM monthly;

WITH RECURSIVE chain AS (              -- org chart: everyone under manager 42
  SELECT id, manager_id, name, 1 AS depth FROM employees WHERE id = 42
  UNION ALL
  SELECT e.id, e.manager_id, e.name, c.depth + 1
  FROM employees e JOIN chain c ON e.manager_id = c.id
)
SELECT * FROM chain;
```

### 1.3 Subqueries, joins, EXISTS and IN

- A **correlated** subquery references the outer row and conceptually runs per row; modern planners often rewrite it as a semi-join, but check the plan.
- `EXISTS` stops at the first match and is the natural "is there any" check. `IN (subquery)` is fine when the list is small or the planner turns it into a semi-join.
- **`NOT IN` with NULLs is a trap:** if the subquery returns any `NULL`, `x NOT IN (...)` is never true. Use `NOT EXISTS`.
- `WHERE` filters rows **before** grouping; `HAVING` filters groups **after** aggregation.

```sql
-- customers with no orders: correct even if orders.customer_id has NULLs
SELECT c.* FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

### 1.4 Plans, index types and partitioning

| Plan node | Meaning |
|---|---|
| Seq Scan | read the whole table (fine for small tables or low selectivity) |
| Index Scan | walk the index, fetch matching heap rows |
| Index Only Scan | answer from a **covering index** without touching the table |
| Bitmap Heap Scan | collect matching row locations from one or more indexes, then read pages in order |

PostgreSQL index types: **B-tree** (default; equality and ranges), **Hash** (equality only), **GIN** (arrays, JSONB, full-text), **GiST** (geometric, ranges, nearest neighbour), **BRIN** (huge, naturally ordered tables). Also **partial** (`WHERE deleted_at IS NULL`), **composite** (leftmost-prefix rule) and **covering** (`INCLUDE (col)`) indexes. Keep statistics fresh with `ANALYZE`; `VACUUM` reclaims dead MVCC tuples. Planner hints exist in MySQL/Oracle (`FORCE INDEX`, optimizer hints) but are a last resort.

**Partitioning** splits a big table by **range** (dates), **list** (region) or **hash** (spread evenly). Queries that filter on the partition key benefit from **partition pruning**, and old partitions can be dropped instantly.

---

## 2. Design patterns for real systems

| Pattern | Notes |
|---|---|
| **Star schema** | central fact table (sales: keys + measures) surrounded by denormalised dimensions (date, product, store). Fast, simple analytics |
| **Snowflake schema** | dimensions normalised into sub-dimensions. Less redundancy, more joins |
| **SCD Type 1** | overwrite the attribute; no history |
| **SCD Type 2** | new row per change with `valid_from`, `valid_to`, `is_current`; full history |
| **SCD Type 3** | extra column for the previous value; limited history |
| **Soft delete** | `deleted_at` instead of `DELETE`; add a partial index on active rows and remember unique constraints |
| **Audit columns / tables** | `created_at/by`, `updated_at/by`; trigger-based or CDC-based history tables |
| **UUID vs auto-increment** | UUIDs can be generated anywhere (distributed inserts, no enumeration) but random v4 UUIDs fragment B-tree indexes; prefer **UUIDv7/ULID** (time-ordered) or `BIGINT` identity for single-primary databases |

---

## 3. Concurrency in practice

- **Lock types:** shared (read) vs exclusive (write); row-level vs table-level; **intent locks** let the engine check table-level compatibility cheaply.
- **Optimistic locking:** a `version` column; `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?` and retry if zero rows changed. Best when conflicts are rare.
- **Pessimistic locking:** `SELECT ... FOR UPDATE` (or `FOR UPDATE SKIP LOCKED` for job queues). Best when conflicts are frequent or expensive.
- **Deadlocks:** two transactions wait on each other's locks. Prevent with a consistent lock order and short transactions; the database detects the cycle and aborts one, so the application must retry.
- **MVCC:** readers see a snapshot and never block writers; PostgreSQL keeps old row versions until `VACUUM`.

---

## 4. MongoDB

- **Document model:** BSON documents; **embed** data read together and bounded in size (order + line items), **reference** data that is shared or unbounded (user ← comments). Enforce structure with JSON Schema validation.
- **Aggregation pipeline:**

```js
db.orders.aggregate([
  { $match: { status: 'paid', createdAt: { $gte: ISODate('2026-01-01') } } },
  { $group: { _id: '$customerId', spent: { $sum: '$total' }, orders: { $sum: 1 } } },
  { $sort: { spent: -1 } },
  { $limit: 10 },
  { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
]);
```

- **Indexes:** single-field, compound (ESR rule: Equality, Sort, Range), multikey (arrays), text, geospatial (`2dsphere`), hashed (for hashed sharding), TTL. Inspect with `explain()` and `$indexStats`.
- **Replica sets:** one primary, several secondaries, automatic election on failure. **Read preference** (`primary`, `secondaryPreferred`, `nearest`) trades freshness for load; **write concern** (`w: 'majority'`) trades latency for durability.
- **Sharding:** data split into chunks by **shard key**, routed by `mongos`. The shard key is the critical decision: high cardinality, even distribution, and present in most queries, or every query becomes scatter-gather.

## 5. Redis

| Structure | Typical use |
|---|---|
| String | cache entries, counters (`INCR`), distributed locks (`SET key val NX PX 30000`) |
| Hash | object fields (session, user profile) |
| List | queues, recent items (`LPUSH` + `LTRIM`) |
| Set | unique members, tags, set algebra |
| Sorted set | leaderboards, rate-limit windows, priority queues |
| Bitmap / HyperLogLog | daily active flags / approximate unique counts in ~12 KB |
| Stream | append-only log with consumer groups (lightweight Kafka) |

- **Pub/Sub** is fire-and-forget: offline subscribers miss messages. Use Streams when you need persistence and acknowledgements.
- **Caching:** `maxmemory-policy` (`allkeys-lru`, `allkeys-lfu`, `volatile-ttl`), TTLs with jitter, cache-aside / write-through / write-behind patterns.
- **Transactions:** `MULTI`/`EXEC` queue commands atomically (no rollback); `WATCH` adds optimistic locking; **Lua scripts** run atomically on the server for check-and-set logic.
- **Persistence:** **RDB** snapshots (compact, fast restarts, can lose minutes) vs **AOF** append-only log (`everysec` loses at most ~1s) vs both (hybrid).

## 6. Cassandra

- **Wide-column store:** a **partition key** decides which node holds the data; **clustering columns** sort rows inside the partition. Data that is read together must share a partition.
- **Query-first modelling:** no joins and limited secondary indexes, so you create one table per query pattern and **denormalise** on purpose.
- **AP with tunable consistency:** choose per query (`ONE`, `QUORUM`, `ALL`). `R + W > RF` gives read-your-writes.
- **Write path:** commit log + **memtable**, flushed to immutable **SSTables**; **compaction** merges SSTables and purges tombstones. Writes are cheap; reads may touch several SSTables, and too many tombstones hurt latency.

---

## 7. Replication and sharding failure modes

- **Primary–replica (master–slave):** writes to the primary, reads from replicas. **Asynchronous** replication is fast but can lose recent writes on failover and causes **replication lag** (read-your-writes violations; route a user's reads to the primary right after they write). **Synchronous** replication is durable but adds latency.
- **Multi-primary (master–master):** any node accepts writes, so conflicts need resolution: last-write-wins (clock-dependent, loses data), application merge, or CRDTs.
- **Failover:** automatic failover needs a quorum to avoid **split-brain** (two primaries accepting writes). **Fencing** (tokens, STONITH: "shoot the other node in the head") guarantees the old primary can't keep writing.
- **Sharding keys:** hash (even spread, no range scans), range (range scans, hotspot risk on monotonic keys), directory/lookup (flexible, extra hop). **Resharding** is painful, which is why **consistent hashing with virtual nodes** is used to move only ~1/N of keys when a node joins.
- **Cross-shard work:** scatter-gather queries fan out to every shard; avoid them with denormalisation. Cross-shard transactions need **2PC** (blocking coordinator) or **sagas** with compensating actions.

## 8. Performance toolbox

- Find slow queries: `pg_stat_statements`, slow query log, **pt-query-digest** (MySQL).
- **Connection pools:** size ≈ cores × 2 + effective spindles as a starting point, not hundreds. Tune idle timeout and max lifetime; watch for pool exhaustion (requests waiting on a connection look like DB slowness). PgBouncer for many short-lived clients.
- **Read-heavy:** replicas, caching, materialised views. **Write-heavy:** batching, partitioning, append-only designs, fewer indexes. **CQRS** separates the two models when they diverge.
- **Bulk operations:** `COPY` in PostgreSQL, multi-row `INSERT`, `bulkWrite` in MongoDB, and commit in batches rather than per row.
