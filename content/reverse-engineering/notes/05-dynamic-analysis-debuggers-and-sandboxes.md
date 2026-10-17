# 5. Dynamic Analysis — Debuggers, Monitors and Sandboxes

Dynamic analysis watches the binary **run**: real API calls, real decrypted strings, real network traffic. It's the antidote to packing and obfuscation — but only inside isolation.

> **Asked as:** "Static analysis shows nothing useful — packed sample, no imports. What now?"

---

## Debugger essentials

| Tool | Platform | Use for |
|---|---|---|
| x64dbg | Windows | User-mode debugging, unpacking, patching |
| WinDbg | Windows | Kernel, crash dumps, time-travel (TTD) |
| GDB + GEF/pwndbg | Linux | ELF debugging, exploit dev |
| LLDB | macOS | Mach-O work |

**Breakpoint types:**

- **Software (INT3/`0xCC`)** — unlimited, but modifies code bytes. Detected by integrity checks and CRC loops.
- **Hardware (DR0–DR3)** — only 4, but invisible to code checksums. Use for anti-debug targets and data watchpoints (break on *read/write* of an address).
- **Memory breakpoints** — guard pages on a whole region; slow but catch-all for unpacked writes ("break when the stub writes the payload").

**Core moves:** run to entry → step over library calls, step into suspicious ones → dump memory regions → set breakpoints on revealing APIs (`CreateRemoteThread`, `WinHttpConnect`, `CryptDecrypt`) and read arguments off the stack/registers.

---

## Behavioral monitors (no debugger needed)

- **ProcMon** — file + registry + process activity with stack traces. Filter by process name; watch for persistence writes (`Run` keys, Startup folder, cron, systemd).
- **Wireshark / FakeNet** — capture C2 attempts. FakeNet-NG simulates servers so offline malware still reveals its protocol.
- **API monitors** (API Monitor, Frida stalker) — log calls with arguments. Frida also lets you *hook and alter* behavior without patching bytes.
- **Sandboxes** (Cuckoo, ANY.RUN, Joe) — automated detonation with screenshots, dropped files, network PCAP. Great triage; assume advanced samples detect them.

---

## The unpacking run (standard drill)

1. Break at entry; note the stub section (high entropy, few imports).
2. Set a memory-write breakpoint on the `.text` region (or hardware breakpoint on `VirtualProtect` returning RX).
3. Run — the stub decrypts the real code in memory. When execution jumps to the Original Entry Point (OEP), you're looking at the real binary.
4. Dump the process (x64dbg Scylla plugin), rebuild the import table, save as `unpacked.exe`.
5. Restart analysis statically on the dump.

---

## Anti-analysis you'll meet

VM/sandbox checks (registry keys, MAC addresses, `cpuid` hypervisor bit, mouse inactivity), timing checks (`rdtsc` deltas expose single-stepping), debugger checks (`IsDebuggerPresent`, `NtGlobalFlag`, `CheckRemoteDebuggerPresent`), and stalling (sleep 10 minutes to outlast sandboxes). Counter: patch checks, hook APIs with Frida, accelerate sleeps, or analyze statically what dynamic can't reach.

---

## Key takeaway

Dynamic analysis converts packed mysteries into observable behavior: breakpoint the revealing APIs, monitor files/registry/network, and always detonate on snapshots. When malware fights back with anti-analysis, that's itself a finding — document the tricks.
