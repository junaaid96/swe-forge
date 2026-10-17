---
id: reverse-engineering-interview-basics
level: basics
---

# Reverse Engineering — Interview (Basics)

> Core vocabulary: workflow, formats, tools, and safe habits. Pair with RE notes 1–2.

## Q1. What is reverse engineering, and what is static vs dynamic analysis?

**Answer:** RE recovers a program's behavior and logic from its compiled form. **Static analysis** examines code without running it (headers, strings, disassembly); **dynamic analysis** executes it in isolation and observes behavior (API calls, files, network). Static is fast and safe but fails on packing/encryption; dynamic defeats packing but can be evaded by anti-analysis checks.

**Key takeaway:** Static first for orientation, dynamic to confirm what static can't resolve.

---

## Q2. Why is assembly important for reverse engineering?

**Answer:** Compiled binaries have no source — assembly is the ground truth of what executes. You read data flow (which register carries the argument? what lands in EAX before `ret`?) and control flow (branches, loops) to reconstruct logic. Decompilers help, but obfuscated, packed, or hand-written code must be read raw.

**Key takeaway:** You read assembly for data flow + control flow, not to write it.

---

## Q3. PE vs ELF — what do you check first in each?

**Answer:** **PE (Windows):** entry point location, section names/characteristics (odd names, RWX, high entropy), and the import table (which DLL functions it calls). **ELF (Linux):** program headers (LOAD segments — what actually maps), INTERP (dynamic vs static linking), and imported symbols. In both, entropy near 8 bits/byte means packing or encryption.

**Key takeaway:** Sections + imports + entropy give you packed-vs-plain and capable-of-what in minutes.

---

## Q4. What do `strings` and the import table tell you?

**Answer:** Strings reveal URLs, IPs, file paths, registry keys, PDB paths, and error messages — instant hypotheses about behavior. Imports reveal *capabilities*: networking APIs, crypto APIs, process/memory APIs (`VirtualAlloc`, `CreateRemoteThread`), persistence APIs. Few imports plus `LoadLibrary`/`GetProcAddress` means the binary resolves APIs at runtime to hide intent.

**Key takeaway:** Strings suggest behavior; imports prove capability. Hidden imports are themselves a finding.

---

## Q5. What is a packer? How do you recognize UPX?

**Answer:** A packer compresses/encrypts the real program and prepends a stub that restores it at runtime. Signs: 2–3 oddly named sections (UPX uses `UPX0`/`UPX1`), tiny import table, high entropy, entry point in the last section. Standard UPX reverses with `upx -d`; modified packers need run-to-OEP + dump + import rebuild.

**Key takeaway:** Never analyze the stub as if it were the program — unpack first.

---

## Q6. How do you safely handle a suspicious binary?

**Answer:** Never execute on hardware you care about. Triage statically first (hash, file type, headers, strings, reputation lookup), then detonate only in an isolated VM with snapshots and host-only/no network. Don't upload victim data to public sandboxes without checking policy, and document every step.

**Key takeaway:** Isolate first, snapshot before detonation, treat uploads as disclosures.
