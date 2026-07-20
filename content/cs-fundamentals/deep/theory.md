---
id: cs-fundamentals-deep-theory
track: theory
---

# CS Fundamentals — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Networking Fundamentals

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### The journey of a browser request

1) DNS resolves api.example.com → IP
2) TCP handshake to port 443
3) TLS handshake
4) HTTP request
5) Load balancer → service → DB
6) Response reverse path

Debugging starts here: which hop failed?

### TCP vs UDP

TCP: reliable, ordered, congestion-controlled — HTTP, databases, most APIs.
UDP: no connection guarantee — video, gaming, DNS often uses UDP.

HTTP/3 uses QUIC (UDP-based) but restores reliability in userspace.

### HTTP versions and connections

HTTP/1.1: persistent connections.
HTTP/2: multiplexing over one TCP connection.
Keep-alive and connection pools matter for service-to-service calls.

Timeouts: connect vs read vs overall. Retries only when idempotent.

### Load balancers, proxies, CDN

L4 vs L7 load balancing. Reverse proxies terminate TLS, route by path/host.
CDN: edge caches for static assets.

Know X-Forwarded-For trust boundaries and health checks.

### Practical debugging

• dig/nslookup for DNS
• curl -v for TLS/HTTP headers
• Distinguish client timeout vs server 5xx vs LB 502

### Practical code

```
dig api.example.com
curl -v https://api.example.com/health

HttpClient.newBuilder()
  .connectTimeout(Duration.ofSeconds(2))
  .build();
```

### Tips

- Separate DNS, TCP, TLS, and app-layer failures when debugging.
- Set aggressive connect timeouts; bound total retries.
- Know whether your LB health check hits /health correctly.
- CDN caches are part of your system — purge strategy matters.

## Operating Systems Basics

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Process vs thread

Process: isolated address space, heavy to create.
Thread: shares memory inside a process — cheap communication, easy races.

Backends are multi-threaded processes. Containers isolate processes with cgroups/namespaces.

### CPU scheduling and blocking

Runnable vs blocked (waiting on I/O/lock).
High latency + low CPU often means blocking/waiting, not compute starvation.

### Memory

Stack vs heap. GC languages: allocation churn → GC pauses.
RSS vs heap metrics. OOMKilled in Kubernetes = limit hit.
Bound caches or you leak.

### Files, sockets, FDs

Everything is a file descriptor on Unix: files, sockets, pipes.
Too many open connections → FD exhaustion. Tune ulimit; fix leaks; pool clients.

### Why backends care

Connection pools, thread pools, container CPU throttling, page cache vs disk I/O — OS fundamentals explain production incidents.

### Practical code

```
ps aux | grep java
ls -l /proc/<pid>/fd | wc -l
free -h
ulimit -n
```

### Tips

- Latency + low CPU → look for blocking I/O or lock waits.
- Always bound caches and pools — OS will OOM you otherwise.
- FD leaks look like random connection failures under load.
- Container limits change what enough CPU means — watch throttling.
