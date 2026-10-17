# 1. Reverse Engineering Fundamentals — Workflow, Lab and Triage

Reverse engineering (RE) is reading a finished program **backwards**: from bytes to behavior. Malware analysts, vulnerability researchers, interoperability developers and CTF players all use the same core loop — **triage → static analysis → dynamic analysis → document**.

> **Asked as:** "Walk me through how you analyze a suspicious binary you've never seen before."

---

## Static vs dynamic analysis

| | Static | Dynamic |
|---|---|---|
| Executes the binary? | No | Yes, in isolation |
| Sees | Headers, strings, imports, disassembly, decompiled logic | API calls, files, registry, network, memory |
| Defeated by | Packing, encryption, obfuscation | VM detection, timing checks, sandbox evasion |
| Tools | Ghidra, IDA, Binary Ninja, `strings`, Capa | x64dbg, GDB, ProcMon, Wireshark, sandboxes |

Use static first (fast, safe), then dynamic to confirm what static couldn't resolve. Neither alone is enough against real malware.

---

## The 10-minute triage workflow

1. **Hash it.** `sha256sum sample.bin` — then search the hash in VirusTotal / MalwareBazaar. Known sample? Your job just got easier.
2. **Identify it.** `file sample.bin` gives format + architecture. Check magic bytes yourself — extensions lie.
3. **Read headers.** PE sections/imports or ELF program headers. Note section names, entropy, TLS callbacks, weird characteristics.
4. **Strings first pass.** `strings -n 6 sample.bin | less` — URLs, IPs, registry keys, PDB paths, error messages, crypto constants.
5. **Capability scan.** Capa (FLARE) matches known behaviors (persistence, injection, crypto) to rules — a huge head start.
6. **Decide:** plain binary → deep static; packed/encrypted → unpack or go dynamic; **never execute outside isolation**.

```bash
sha256sum suspicious.exe
file suspicious.exe
strings -n 6 suspicious.exe | grep -iE "http|\\\\.dll|mutex|cmd" | head -30
capa suspicious.exe
```

---

## Lab setup that won't burn you

- **VM with snapshots** (VirtualBox/VMware/KVM): Windows 10/11 guest for PE, Linux for ELF. Snapshot **before** every detonation.
- **Host-only or no network.** Malware phones home and spreads. Use INetSim/fake DNS if you need to observe C2 behavior safely.
- **No shared folders, no guest additions clipboard** to the host during live analysis.
- **Separate analysis VM from daily driver.** Ideally a dedicated hypervisor host.
- Keep Ghidra/IDA project files — your annotations are the deliverable.

---

## Legal and ethical lines

Only reverse what you have the **right** to reverse: your own binaries, malware samples, CTF targets, software whose license permits it (many EULAs forbid RE — check your jurisdiction's interoperability/security-research exceptions). Never use RE skills to crack licenses, bypass DRM for piracy, or weaponize findings. Report vulnerabilities through coordinated disclosure.

---

## Key takeaway

Triage is a habit, not a tool: hash → identify → headers → strings → capabilities → isolated execution. Ten disciplined minutes up front saves hours of staring at assembly later.
