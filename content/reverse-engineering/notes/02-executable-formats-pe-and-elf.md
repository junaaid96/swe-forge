# 2. Executable Formats — PE and ELF

Every binary analysis starts with the container format. The headers tell you **where code lives, what the binary needs, and whether it's lying to you**.

> **Asked as:** "What do you look at first in a PE header? How is ELF different?"

---

## PE (Windows) in one picture

```text
DOS header          "MZ", e_lfanew → offset of NT headers
NT headers          Signature "PE\0\0" + File header + Optional header
  File header       Machine (x64/ARM64), #sections, characteristics (DLL? stripped?)
  Optional header   EntryPoint, ImageBase, Subsystem (GUI/CUI), DataDirectories
Section headers     .text .data .rdata ... (name, size, raw offset, characteristics)
Sections            Actual code and data
```

**What matters to an analyst:**

- **Entry point** — where execution starts. Points outside `.text`? Suspicious (TLS callbacks and packers redirect it).
- **Sections** — normal: `.text` (code, RX), `.data` (RW), `.rdata` (R), `.reloc`. Weird names (`.upx0`, `.themida`), RWX permissions, or virtual-size ≫ raw-size all smell of packing.
- **Imports (IAT)** — the DLL functions it calls. `VirtualAlloc` + `WriteProcessMemory` + `CreateRemoteThread` = injection. `WinHttp*`/`WSA*` = networking. Few imports + `LoadLibraryA`/`GetProcAddress` = runtime API resolution (hiding intent).
- **Entropy** — per-section Shannon entropy near 8.0 = compressed/encrypted. Legit code sits around 5–7.
- **Data directories** — import/export tables, resources (icons, embedded PEs in `.rsrc`!), TLS table, certificates (a signature proves origin, not safety).

**Quick tools:** Detect It Easy (compiler/packer ID), CFF Explorer, `objdump`/`llvm-objdump`, Capa.

---

## ELF (Linux) essentials

```text
ELF header          Magic 7F E L F, class (64-bit), machine (x86-64/AArch64), entry
Program headers     LOAD segments (what the loader maps), INTERP, DYNAMIC, NOTE
Section headers     .text .rodata .data .symtab .strtab (often stripped in malware)
```

**What matters:**

- **INTERP** (`/lib64/ld-linux-x86-64.so.2`) — dynamically linked; absent means static (bigger, self-contained, harder to fingerprint via imports).
- **DYNAMIC + symbol tables** — imported libc functions reveal behavior, same idea as the IAT. Stripped binaries lose `.symtab` — then you rely on disassembly.
- **Segments vs sections** — the loader maps *segments*; sections are for linking/debugging. Malware can strip or fake section headers entirely — trust program headers.
- **Entry point + constructors** — `.init_array` runs before `main`, the ELF equivalent of TLS callbacks for hiding startup code.

**Quick tools:** `readelf -h -l -S`, `objdump -d -M intel`, `rabin2 -I` (radare2), Ghidra's Symbol Tree.

---

## Packers, cryptors, protectors

A **packer** compresses the original binary and prepends a stub that decompresses it at runtime (UPX, ASPack). A **cryptor** encrypts it (adds key management). A **protector** (Themida, VMProtect) adds anti-debug, virtualization, licensing. Tell-tale signs: 2–3 sections with odd names, tiny import table, high entropy, entry point in the last section.

Your response ladder: standard unpacker (`upx -d`) → run-to-OEP + dump + import rebuild → scripted/emulated unpacking → analyze the unpacked payload, never the stub.

---

## Key takeaway

Headers are the binary's résumé — sections, imports and entropy let you judge packed-vs-plain and capable-of-what in minutes. PE: trust section characteristics + IAT. ELF: trust program headers, distrust stripped sections.
