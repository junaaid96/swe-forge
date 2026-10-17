---
id: reverse-engineering-interview-advanced
level: advanced
---

# Reverse Engineering — Interview (Advanced)

> Evasion, protectors, config extraction, and AI-assisted workflows. Pair with RE deep tracks.

## Q1. What are stolen bytes and erased headers, and why do dumpers care?

**Answer:** Advanced packers keep the OEP's first instructions only in the stub (**stolen bytes**) and wipe PE headers in memory after loading. A naive memory dump then won't disassemble cleanly or re-run. Counter: reconstruct the entry bytes from the stub's jump target analysis, rebuild headers from the on-disk file, and remember the goal is *readable code and imports*, not a re-runnable binary.

**Key takeaway:** Dumps serve analysis, not execution — repair headers and entry bytes as needed.

---

## Q2. How do you defeat debugger detection (IsDebuggerPresent, timing, TLS)?

**Answer:** Layered counters: patch the PEB `BeingDebugged` byte and clear `NtGlobalFlag`/heap flags; hook or patch `CheckRemoteDebuggerPresent`; neutralize timing checks by patching thresholds or running free between hardware breakpoints; break on TLS-callback invocation (`LdrpCallTlsInitializers`) since TLS code runs before entry-point breakpoints. Persistent targets get Frida hooks or full emulation instead of a debugger.

**Key takeaway:** Patch what you can, hook what you can't, emulate what resists both.

---

## Q3. The CFG is one giant dispatcher — control-flow flattening. How do you proceed?

**Answer:** Don't hand-read the flattened graph. Determine the dispatcher variable, then recover edges by tracing real executions (code coverage per input), simplifying the trace (dead-code elimination), or symbolically executing the dispatcher to resolve successors. For VM-based protectors (VMProtect-style), reverse the handler table and devirtualize bytecode to an IR — or scope down to behavioral analysis if full devirtualization isn't cost-effective.

**Key takeaway:** Flattened control flow is solved with traces and emulation, not eyeballs.

---

## Q4. Why would malware use direct syscalls, and how do you still analyze it?

**Answer:** User-mode EDR hooks live in `kernel32`/`ntdll` high-level exports; calling `Nt*` stubs — or hand-rolled `syscall` instructions — with the right syscall numbers bypasses those hooks. Analysis still works: kernel telemetry (ETW, Sysmon, kernel callbacks) sees syscalls regardless; memory and behavioral monitoring are unaffected; and statically the syscall numbers map to documented `Nt*` functions.

**Key takeaway:** Direct syscalls dodge user-mode hooks only — kernel telemetry still sees everything.

---

## Q5. Extract a C2 URL from an XOR-encoded blob without running the malware.

**Answer:** Locate the decode loop (repeating-key XOR over a buffer, called before a networking API), read the blob bytes, length, and key from the binary, reimplement the loop in a few lines of Python (or a Ghidra script / Unicorn emulation), and decode offline. Publish the offset, key, algorithm, and resulting IOCs. Never detonate just to read a string you can compute.

**Key takeaway:** Crypto parameters + offline reimplementation beats execution for config extraction.

---

## Q6. How are AI agents changing reverse engineering workflows?

**Answer:** Agents now do first-pass triage at scale: summarizing binaries, proposing function names, explaining obfuscated regions, and driving disassemblers through APIs. Tools like [REA](https://github.com/morluto/rea) (Reverse Engineer Anything) expose RE capabilities — native analysis via Ghidra/IDA/Hopper, JS/Electron, .NET, APK, firmware — through MCP so an agent can investigate a target and return findings with evidence. The analyst's job shifts to verification: agents hallucinate, so every AI claim still needs a breakpoint, a trace, or a reimplementation behind it.

**Key takeaway:** Agents accelerate orientation; humans still own verification.
