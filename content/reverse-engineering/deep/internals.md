---
id: reverse-engineering-deep-internals
track: internals
---

# Reverse Engineering — Deep: Internals

> OS internals malware lives on: Windows process machinery, injection techniques, persistence, and ELF loading.

---

## Windows: the structures malware touches

- **PEB / TEB** — per-process/per-thread blocks reachable via `FS:[0x30]`/`GS:[0x60]`. `BeingDebugged` flag, heap flags and `NtGlobalFlag` live here — the classic `IsDebuggerPresent` just reads a byte.
- **Ntdll as the syscall gate** — user-mode APIs bottom out in `ntdll.dll` stubs ending in `syscall`. Malware calling `Nt*` directly (direct syscalls) bypasses user-mode hooks that EDRs plant in `kernel32`/`ntdll` high-level exports.
- **APIs as behavior vocabulary** — memorize the greatest hits: `VirtualAllocEx`/`WriteProcessMemory`/`CreateRemoteThread` (injection), `SetWindowsHookEx` (keylogging), `CryptEncrypt`/`CryptDecrypt` (ransomware), `WinHttp*`/`WSAConnect` (C2), `RegSetValueEx` + `Run` keys (persistence).

---

## Process injection, concretely

**Classic DLL injection:** `OpenProcess` → `VirtualAllocEx` → `WriteProcessMemory` (DLL path) → `CreateRemoteThread(LoadLibraryW)`. Loud — every EDR watches this chain.

**Process hollowing:** `CreateProcess(SUSPENDED)` of a legit binary → `NtUnmapViewOfSection` → write malicious image → `SetThreadContext` to new entry → `ResumeThread`. The PEB image path says `svchost.exe`; memory says otherwise. Detectors compare disk vs memory (`Malfind`-style scans).

**APC / Early-bird:** queue an Asynchronous Procedure Call to a suspended thread so the payload runs before the entry point — defeats entry-point breakpoints.

**Thread execution hijacking & mapping:** `SetThreadContext` rip-redirection, or `NtMapViewOfSection` with local+remote views (no `WriteProcessMemory` call at all — "atom bombing" and "mapping injection" variants).

Interview framing: *"How would you detect injection?"* — memory permission anomalies (RWX private regions), unbacked executable memory, parent/child and image-path mismatches, EDR telemetry (Sysmon Event 8/10).

---

## Persistence mechanisms (Windows + Linux)

| OS | Mechanism | Artifact |
|---|---|---|
| Windows | Run/RunOnce keys | `HKCU\...\Run` |
| Windows | Scheduled tasks / services | `schtasks`, `services.msc` |
| Windows | Startup folder, WMI subscriptions, COM hijack | File system, `root\subscription` |
| Linux | cron, systemd units, `.bashrc`/profile | `/etc/cron*`, `~/.config/systemd` |
| Linux | LD_PRELOAD, shared-object hijack | `/etc/ld.so.preload` |
| Both | Bootkit / rootkit (kernel) | Out of scope for user-mode RE |

---

## ELF loading: what the loader does before main

`execve` → kernel maps the interpreter (`INTERP`) → `ld-linux` maps LOAD segments, resolves `DT_NEEDED` libraries, processes relocations (GOT/PLT for lazy binding), runs `.init_array`, then jumps to entry. Malware hooks each stage: `LD_PRELOAD` libraries, constructors, GOT overwrites (before RELRO), and statically-linked binaries that skip the loader dance entirely.

---

## Key takeaway

Internals turn API soup into a story: injection = allocate → write → execute remotely; persistence = a launch trigger + a payload path; loading = the steps before `main` where stealth lives. Learn the dozen structures and calls above and most malware reads like plain prose.
