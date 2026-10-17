---
id: reverse-engineering-deep-pitfalls
track: pitfalls
---

# Reverse Engineering — Deep: Pitfalls

> Anti-analysis techniques and the analyst mistakes that waste hours — or cause incidents.

---

## Anti-debugging greatest hits

| Trick | How it works | Counter |
|---|---|---|
| `IsDebuggerPresent` | Reads PEB `BeingDebugged` | Patch PEB byte / hook API |
| `NtGlobalFlag` / heap flags | Loader sets debug flags when debugged | Clear flags in PEB + heap |
| `CheckRemoteDebuggerPresent` | Kernel-side debug-port query | Hook or patch return |
| Timing (`rdtsc`, `GetTickCount`) | Single-stepping takes "too long" | Patch thresholds, run free between breakpoints |
| TLS callbacks | Code runs *before* the entry-point breakpoint | Break on `LdrpCallTlsInitializers` / set entry at TLS |
| Debug-port detach | `NtSetInformationThread(ThreadHideFromDebugger)` | Kernel debugging or emulation |
| INT3 scanning | CRC/hash of own code detects `0xCC` | Hardware breakpoints (DRx) |

Seeing several of these together is itself a verdict: legitimate software rarely needs all of them.

---

## Anti-VM / anti-sandbox

Registry keys (`VMware`, `VirtualBox`, `QEMU`), MAC prefixes, `cpuid` hypervisor bit, absent mouse movement, small disk/RAM, stalling sleeps (10+ minutes to outlast automated sandboxes), and "human interaction" gates (require a click or scroll). Counters: harden the VM (scrub identifiers), accelerate time (hook sleep APIs), simulate input, or sidestep to static + forced-path execution (Frida) for the evasive branch.

---

## Obfuscation that burns beginners

- **String encryption** — no useful strings ≠ no behavior. Find the decrypt routine (called early, loops with XOR/ADD), breakpoint after it, dump memory.
- **API hashing** — imports resolved by hash (`LoadLibrary` + `GetProcAddress` in a loop over a hash table). Resolve by computing the same hash over candidate API names, or log `GetProcAddress` arguments dynamically.
- **Control-flow flattening / virtualization** — the decompiler shows one giant dispatcher. Don't hand-read it: trace execution, then simplify (dead-code elimination on the trace) or devirtualize handler-by-handler for high-value targets.
- **Stolen bytes / erased headers** — dumped memory that won't re-run. You don't need re-runnable dumps for analysis — you need readable code and imports.

---

## Analyst OPSEC mistakes

1. **Detonating on hardware you care about.** One missed snapshot, one bridged network adapter — that's the incident report. Isolate first, always.
2. **Uploading client/victim data to public sandboxes.** Submissions are often shared. Hashes and metadata can leak victim identity — check policy before uploading.
3. **Trusting the stub.** Reporting "this binary does nothing" when you analyzed packed code without unpacking.
4. **No notes.** Six hours of renaming lost because the Ghidra project wasn't saved/exported. Version your notes; export annotated databases.
5. **Tool-output worship.** Capa/strings/VirusTotal verdicts are leads, not conclusions. Verify the one claim your report depends on.

---

## Key takeaway

Anti-analysis is a conversation: each trick has a standard counter, and stacking counters is the job. The unforced errors — no isolation, no notes, trusting packed code — are what actually end careers. Discipline first, cleverness second.
