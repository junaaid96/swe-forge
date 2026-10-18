---
title: File storage
emoji: 📁
blurb: Dropbox-style sync with uploads, sharing and versioning.
order: 6
rubric:
  - dimension: Requirements
    points:
      - Covers upload/download/sync/share/versioning and offline behavior
      - States consistency (last-writer-wins vs conflict files) and durability
  - dimension: API
    points:
      - Defines resumable uploads (chunked), deltas and share links
      - Explains sync protocol (cursors, polling vs push)
  - dimension: Data model
    points:
      - Separates metadata from blob storage with content addressing
      - Explains chunking, dedupe and version chains
  - dimension: Scale & reliability
    points:
      - Scales metadata and blob tiers independently to exabytes
      - Handles partial failures (resume, checksums, retries)
  - dimension: Trade-offs
    points:
      - Compares sync strategies (delta vs full-file)
      - Names the metadata bottleneck and hot-file edge cases
---

## Brief

Design a Dropbox-style file storage and sync service: desktop/mobile clients sync files, share links with permissions, and keep 30 days of version history. 100M users, 500PB stored, files up to 50GB, sync should feel instant on typical broadband.

Cover requirements, the upload/sync protocol, metadata vs blob storage, sharing, conflicts, and durability.

## Model answer

### Requirements

Functional: upload/download/resumable transfer, bidirectional sync, share links (view/edit, expiry, password), 30-day versions, trash/restore. Non-functional: 11-nines blob durability (via replication/erasure coding), sync latency dominated by bandwidth not protocol, offline edits merge on return. Conflicts resolve to "conflicted copy" files, never silent overwrites.

### API

- `POST /uploads {name, size, checksum}` → `201 {uploadId}`; `PUT /uploads/{id}/chunks/{n}` (4–8MB chunks, parallel, resumable); `POST /uploads/{id}/commit`.
- `GET /sync?cursor` → delta entries (added/modified/deleted) + new cursor; clients long-poll or use push tickles.
- `POST /shares {path, permission, expiresAt, password?}` → link; `GET /versions/{path}` + restore.
- Every chunk carries a checksum; commit verifies the whole-file hash.

### Data model

Metadata DB: `files(path, user_id, version, size, mtime, chunk_list, etag)`, `shares`, `versions` (immutable chain with GC after 30 days). Blobs: content-addressed chunks (`sha256 → bytes`) in object storage — identical chunks dedupe across users. Shard metadata by user; blobs need no sharding logic (flat keyspace).

### Scale estimates

500PB with ~2x replication/erasure overhead ≈ 1EB raw. Average file 1MB → 500B files is unrealistic; real mix skews large, but metadata still reaches billions of rows — shard by user_id, cache hot paths. Sync traffic: deltas only; a 1KB edit re-uploads one chunk, not the file. Bandwidth, not IOPS, is the budget.

### Architecture

Clients → API fleet → metadata service (sharded Postgres/CockroachDB) + blob store (S3-style). Uploads go direct-to-blob via signed URLs (data plane bypasses app servers). Sync: clients poll deltas; a notification fan-out (per-user mailbox) tickles clients for near-instant sync. Share links resolve through the API for permission checks, then redirect to signed blob URLs. Background GC reaps unreferenced chunks (mark-and-sweep with grace periods).

### Trade-offs

- Delta sync (rsync-style) vs chunk re-upload: deltas save bandwidth on large edits but complicate clients; fixed chunks are simpler and dedupe-friendly.
- Strong vs eventual metadata: per-user operations are strongly consistent (single shard); cross-user shares are eventual.
- Conflict files vs OT/CRDT: files are opaque bytes, so last-writer-wins + conflicted copies beats merge complexity.
- At 10x: metadata shard count and GC scan time — split hot users, tier cold versions to cheaper storage, parallelize the sweeper.
