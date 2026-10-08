---
id: cs-fundamentals-interview-basics
level: basics
---

# CS Fundamentals — Interview (Basics)

> Quick-fire fundamentals that come up in screening rounds. Pair with CS Fundamentals Deep (theory / internals).

## Q1. What does Atomicity (the A in ACID) guarantee?

**Answer:** A transaction is all-or-nothing: either every statement in it commits, or none of its changes become visible. If anything fails midway (an error, a crash, a constraint violation), the database rolls back the partial work. The classic example is a bank transfer: the debit and the credit happen together or not at all.

**Key takeaway:** Atomicity is about partial failure, not concurrency — isolation (the I) is what handles concurrent transactions.

---

## Q2. TCP vs UDP — what's the difference and when do you use each?

**Answer:** TCP is connection-oriented: a handshake, then a reliable, ordered byte stream with retransmission, flow control and congestion control. UDP sends independent datagrams with no delivery, ordering or duplicate guarantees, but no handshake or head-of-line blocking either.

- **TCP:** HTTP/1.1 and HTTP/2, databases, SSH — anything that needs every byte in order.
- **UDP:** DNS lookups, VoIP, video calls, games, and QUIC (which HTTP/3 runs on, adding its own reliability per stream).

**Key takeaway:** TCP trades latency for reliability; UDP gives you raw speed and lets the application decide what reliability it needs.

---

## Q3. Process vs thread?

**Answer:** A process is an isolated program instance with its own virtual address space, file descriptors and resources. Threads live inside a process and share its heap, globals and open files, but each has its own stack, registers and program counter. Threads are cheaper to create and switch between, and communicate through shared memory — which is exactly why they need synchronization (locks, atomics) to avoid races. Processes communicate via IPC (pipes, sockets, shared memory segments), and a crash in one doesn't take down the others.

**Key takeaway:** Processes give isolation; threads give cheap sharing, and shared mutable state is the price.

---

## Q4. Explain the CAP theorem in one or two sentences.

**Answer:** In a distributed data store, when a network partition happens you must choose between **consistency** (every read sees the latest write, or gets an error) and **availability** (every request gets a non-error response, possibly stale). Since partitions can't be ruled out, real systems are effectively CP (e.g., etcd, ZooKeeper, single-leader SQL with synchronous failover) or AP (e.g., Cassandra, DynamoDB with eventual consistency) during a partition. PACELC extends it: *else*, when there's no partition, you trade latency against consistency.

**Key takeaway:** CAP is a choice you make only during a partition; the everyday trade-off is latency vs consistency.

---

## Q5. Why prefer RS256 (with JWKS) over a shared HS256 secret for JWTs across microservices?

**Answer:** HS256 is symmetric: every service that verifies tokens needs the same secret, and any service holding it can also *mint* valid tokens, so one leak compromises everything. With RS256 (or ES256), only the identity provider holds the private signing key; services verify with the public key fetched from the issuer's JWKS endpoint, identified by the token's `kid`, which also makes key rotation painless.

**Key takeaway:** Asymmetric signing confines the power to issue tokens to one place; verification keys can be public.
