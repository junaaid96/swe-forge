---
id: reverse-engineering-deep-theory
track: theory
---

# Reverse Engineering — Deep: Theory

> The program-analysis foundations behind disassemblers and decompilers: control flow, dataflow, and how packers abuse the loader.

---

## Control-flow graphs and basic blocks

A disassembler splits code into **basic blocks** (straight-line instruction runs ending in a jump/branch) connected as a **control-flow graph (CFG)**. Every `if`, loop and `switch` is a CFG shape:

- `cmp` + conditional jump with a join point = if/else diamond.
- A back edge (jump to an earlier block) = loop; the block before it holding the counter init is the preheader.
- Jump tables (`jmp [base + index*8]`) = dense `switch`; bounds-checked index first or it's a vulnerability.

**Flattened CFGs** (all blocks dispatching through one central switch on a state variable) are the signature of control-flow-flattening obfuscators — and of some VM-based protectors. Recovery means resolving the dispatcher: emulate or symbolically execute to rebuild the original edges.

---

## Dataflow: reaching definitions and use-def chains

Dataflow answers *"where did the value in RAX come from?"* A **reaching definition** analysis tracks, per program point, which writes could have produced each register's value. Decompilers use this to:

- Propagate constants and fold dead branches.
- Recover variables from stack slots and registers.
- Resolve **indirect calls** (`call rax`) by finding the definition of `rax` — a jump table, vtable load, or import.

When Ghidra shows `UNRECOVERED_JUMPTABLE`, the dataflow failed: help it by constraining the index range or marking the table bounds manually.

---

## Calling conventions and ABI edge cases

Beyond the standard register orders, reversers hit: **fastcall variants** in 32-bit code (MSVC `__fastcall` = ECX/EDX, Borland = EAX/ECX/EDX), **thiscall** (`this` in ECX), stack cleanup direction (`cdecl` caller-cleans vs `stdcall` callee-cleans — mismatches corrupt the stack and are real bugs), and **custom internal conventions** in optimized/oldly code. Ghidra's default x86-64 model mis-guesses these; fixing the function signature fixes the whole decompilation subtree.

---

## How packers abuse the loader

A packer rewrites the binary so *decompression precedes the program's own code*:

1. Original sections compressed/encrypted; import table reduced to `LoadLibraryA` + `GetProcAddress`.
2. A **stub section** becomes the entry point; it allocates RWX memory, decodes the payload, resolves imports manually, fixes relocations, then jumps to the **Original Entry Point (OEP)**.
3. Anti-dump tricks: stolen bytes (OEP's first instructions live only in the stub), API redirection, erasing headers in memory.

This is why "run to OEP, dump, rebuild imports" works — and why protectors that *virtualize* (translate x86 into a custom bytecode VM, like VMProtect) can't be "unpacked" the same way: you must devirtualize handler by handler, or settle for behavioral analysis.

---

## Key takeaway

Disassemblers are dataflow engines with a UI: CFGs for structure, reaching definitions for values, ABI models for boundaries. Obfuscation attacks exactly these three — so defeating it means repairing them, manually or with emulation.
