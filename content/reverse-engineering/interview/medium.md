---
id: reverse-engineering-interview-medium
level: medium
---

# Reverse Engineering — Interview (Medium)

> Reading code and behavior: conventions, tooling workflows, breakpoints, injection. Pair with RE notes 3–5.

## Q1. x86-64 calling conventions — where are the arguments?

**Answer:** System V (Linux/macOS): RDI, RSI, RDX, RCX, R8, R9, then stack. Windows x64: RCX, RDX, R8, R9, then stack. Return value in RAX on both. So on Linux, `RDI` at function entry is arg 1; whatever lands in `EAX` before `ret` is the result.

**Key takeaway:** RDI-first on Linux, RCX-first on Windows, EAX out on both.

---

## Q2. The import table shows only LoadLibraryA and GetProcAddress. What does that mean?

**Answer:** The binary resolves its real APIs at runtime — typically iterating a hashed/obfuscated name list — to hide its capabilities from static analysis (API hashing). Counter statically by reimplementing the hash over candidate API names; counter dynamically by breaking on `GetProcAddress` and logging its string argument.

**Key takeaway:** Runtime API resolution hides intent — log or reimplement the resolver to reveal it.

---

## Q3. Walk me through your Ghidra workflow on a stripped binary.

**Answer:** Auto-analyze → check imports (capabilities) and strings (URLs, errors, keys) → locate `main` from the entry point and rename it → cross-reference interesting strings to find the deciding logic → rename functions/variables as understanding grows → fix signatures so the decompiler output is clean → verify key hypotheses dynamically (breakpoint or reimplementation script).

**Key takeaway:** Orient (imports/strings) → navigate (xrefs) → comprehend (rename) → verify (runtime).

---

## Q4. Hardware vs software breakpoints — when does it matter?

**Answer:** Software breakpoints patch code with `0xCC` (INT3) — unlimited, but visible to integrity checks and CRC loops. Hardware breakpoints use debug registers DR0–DR3 — only four, but they don't modify bytes, so they defeat self-checksumming code, and they double as data watchpoints (break on read/write of an address). Against anti-debug targets, always prefer hardware.

**Key takeaway:** Self-checking code demands hardware breakpoints; they don't touch bytes.

---

## Q5. How does process injection work, and how do you detect it?

**Answer:** Classic chain: `OpenProcess` → `VirtualAllocEx` → `WriteProcessMemory` → `CreateRemoteThread`. Stealthier variants: process hollowing (suspended legit process, unmap, rewrite image), APC injection, mapping via `NtMapViewOfSection`. Detection: RWX/unbacked executable memory regions, disk-vs-memory image mismatches, Sysmon Event 8 (CreateRemoteThread) and Event 10 (process access), EDR memory scans.

**Key takeaway:** Injection = allocate → write → execute remotely; memory anomalies betray it.

---

## Q6. A packed sample shows nothing statically. What is your unpacking run?

**Answer:** Break at entry → set a memory-write breakpoint on the code region (or break on `VirtualProtect` granting execute) → run until the stub jumps to the Original Entry Point → dump the process → rebuild imports (e.g. Scylla) → restart analysis on the dump. If standard tools fail, emulate or trace the stub to find the OEP.

**Key takeaway:** Run to OEP, dump, rebuild imports, then analyze the payload — never the stub.
