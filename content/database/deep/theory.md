---
id: database-deep-theory
track: theory
---

# Database — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Databases

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### SQL — Core + Advanced

Execution order (NOT the order you write it):
FROM + JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
Knowing this resolves WHERE vs HAVING confusion: HAVING filters AFTER grouping.

JOINs: INNER (matching rows only), LEFT (all left + matching right), RIGHT, FULL OUTER.
Prefer JOINs over correlated subqueries — subqueries can be O(n²).

PostgreSQL advanced:
Window functions: ROW_NUMBER(), RANK(), SUM() OVER(PARTITION BY...) — analytics without collapsing rows.
CTEs (WITH clause): break complex queries into named readable steps.
JSONB: semi-structured data with fast indexing. Use for flexible schemas.
EXPLAIN ANALYZE: shows actual query plan, execution time, row estimates.

### Indexing Strategy

B-Tree index (default): turns O(n) sequential scan → O(log n) index lookup.
Always index: primary keys (auto), foreign keys, frequently filtered/joined columns.

Composite index (col1, col2): leftmost prefix rule — effective for queries on col1 alone, or col1+col2 together. NOT effective for col2 alone.

Covering index: all columns in the query are in the index — no table access ("index-only scan"). Fastest reads.

When NOT to index: small tables (<10k rows), low-cardinality columns (e.g., gender with 2 values), heavily written columns (index maintenance overhead).

EXPLAIN ANALYZE keywords: "Seq Scan" on large table = missing index. "Index Scan" = good.

### ACID & @Transactional

Atomicity: all-or-nothing. Any failure → full rollback. Bank transfer: both debit AND credit commit, or neither does.
Consistency: DB moves from one valid state to another. FK, UNIQUE, CHECK constraints enforced.
Isolation: concurrent transactions don't interfere. PostgreSQL default: READ COMMITTED.
Durability: committed data survives crashes. PostgreSQL WAL (Write-Ahead Log) provides this.

Spring @Transactional:
• Default rollback: RuntimeException or Error. NOT checked exceptions.
• @Transactional(rollbackFor = Exception.class) — rollback on any exception.
• @Transactional(readOnly = true) — skip dirty checks, hint to use read replica.
• Propagation: REQUIRED (join existing tx), REQUIRES_NEW (always start fresh tx).
• GOTCHA: @Transactional on private method DOES NOTHING — Spring AOP only proxies public methods.

### N+1 Problem — Critical

Definition: fetch N entities → N more queries for their related collections = 1 + N total.
Example: findAll() returns 1000 users → user.getOrders().size() fires 1000 extra queries.
Impact: 1001 DB round trips. 8+ second API response. Most common JPA performance bug.

Solutions:
1. JOIN FETCH in JPQL (preferred): "SELECT u FROM User u JOIN FETCH u.orders"
   → loads everything in ONE query
2. @EntityGraph: declarative alternative to JOIN FETCH
3. @BatchSize(size=25): N/25 queries instead of N (better but not ideal)
4. DTO projection: SELECT only needed columns — avoid loading entity + associations

Detection: spring.jpa.show-sql=true → count the queries in console output.

### Practical code

```
// Spring Boot JPA — production patterns

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // FIX N+1: JOIN FETCH loads Order + Items in ONE query
    @Query("""
        SELECT DISTINCT o FROM Order o
        JOIN FETCH o.items
        WHERE o.userId = :userId
        ORDER BY o.createdAt DESC
        """)
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);

    // Pagination — ALWAYS use for list endpoints (never return unbounded lists)
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    // DTO projection — fetch ONLY what's needed (faster than loading full entity)
    @Query("SELECT new com.app.dto.OrderSummary(o.id, o.status, o.totalAmount) " +
           "FROM Order o WHERE o.userId = :userId")
    List<OrderSummary> findSummariesByUser(@Param("userId") Long userId);
}

// ACID bank transfer — @Transactional guarantees atomicity
@Service
@RequiredArgsConstructor
public class TransferService {

    @Transactional // if anything throws → BOTH account changes rollback
    public TransferResult transfer(Long fromId, Long toId, BigDecimal amount) {
        Account from = accountRepo.findByIdForUpdate(fromId)  // pessimistic lock
            .orElseThrow(() -> new ResourceNotFoundException(fromId));
        Account to = accountRepo.findByIdForUpdate(toId)
            .orElseThrow(() -> new ResourceNotFoundException(toId));

        if (from.getBalance().compareTo(amount) < 0)
            throw new InsufficientFundsException(); // triggers rollback

        from.debit(amount);   // exception here → BOTH debit + credit rollback
        to.credit(amount);
        accountRepo.save(from);
        accountRepo.save(to);
        return TransferResult.success(from.getBalance());
    }
}

-- PostgreSQL: detect missing index with EXPLAIN
-- EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 5 AND status = 'PENDING';
-- Before: Seq Scan on orders (rows=500000)  ← very slow
-- CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- After:  Index Scan using idx_orders_user_status (rows=12) ← fast
```

### Tips

- N+1 is THE most common Spring JPA interview question — show JOIN FETCH as the fix and explain why it sends 1 query instead of N+1
- Explain ACID with a bank transfer: atomicity means debit and credit both commit, or neither does — the classic example
- @Transactional on private method = silent no-op. Spring AOP only intercepts public method calls on proxied beans.
- Optimistic locking (@Version) vs pessimistic locking (SELECT FOR UPDATE) — both prevent lost updates, different tradeoffs
